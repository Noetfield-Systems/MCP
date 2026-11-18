import express from 'express';
import Stripe from 'stripe';
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {q,initDb,requireAuth,ownedServer,pool} from './db.mjs';
import {token,sha,passwordHash,passwordMatches,validatedTarget,specTools,toolUrl,safeGet,enforceOrigin,throttle} from './security.mjs';
import {managedMcp,foundryMcp} from './mcp.mjs';
import {publicTemplates,findTemplate} from './templates.mjs';

const app=express(),port=Number(process.env.PORT||3000);
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public');
const stripe=process.env.STRIPE_SECRET_KEY?new Stripe(process.env.STRIPE_SECRET_KEY,{apiVersion:'2026-10-28.endive'}):null;
app.disable('x-powered-by');app.set('trust proxy',1);
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'");next();});
app.use(throttle());
const j=(res,code,error)=>res.status(code).json({error});
const string=(v,max=240)=>typeof v==='string'?v.trim().slice(0,max):'';
const validSlug=s=>/^[a-z][a-z0-9-]{2,48}$/.test(s)&&s!=='foundry';
const cookie=(res,value)=>res.cookie('mcpf_session',value,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:14*86400*1000});
const auth=(...args)=>requireAuth(...args);
const readKey=async(raw)=>{if(!raw?.startsWith('fdy_'))return null;const {rows}=await q('SELECT a.id,a.email,a.plan FROM api_keys k JOIN accounts a ON a.id=k.owner_id WHERE k.token_hash=$1 AND k.revoked_at IS NULL',[sha(raw)]);return rows[0]||null;};

app.get('/healthz',async(_req,res)=>{try{await q('SELECT 1');res.json({ok:true,product:'MCP Foundry',store:'postgres',protocol:'2026-07-28'});}catch{res.status(503).json({ok:false,error:'DATABASE_UNAVAILABLE'});}});
app.get('/api/status',(_req,res)=>res.json({product:'MCP Foundry',protocol:'2026-07-28',features:{builder:true,openapi:true,directory:true,managed_mcp:true,billing_configured:!!(stripe&&process.env.STRIPE_PRICE_ID&&process.env.STRIPE_WEBHOOK_SECRET)}}));

// Mount MCP endpoints BEFORE JSON body parsing. The official SDK owns HTTP content parsing.
app.all('/mcp/foundry',async(req,res,next)=>{
  try{
    const bearer=req.get('authorization')?.replace(/^Bearer /i,'');
    const principal=await readKey(bearer);
    return foundryMcp(principal)(req,res,next);
  }catch(error){next(error);}
});
app.all('/mcp/:slug',async(req,res,next)=>{
  try{
    const {rows}=await q("SELECT s.*,a.plan AS owner_plan FROM servers s JOIN accounts a ON a.id=s.owner_id WHERE s.slug=$1 AND s.status='published'",[req.params.slug]);
    const server=rows[0];if(!server)return j(res,404,'SERVER_NOT_FOUND');
    const key=req.get('authorization')?.replace(/^Bearer /i,'');
    const principal=await readKey(key);
    if(server.visibility!=='public'&&principal?.id!==server.owner_id)return j(res,401,'MCP_API_KEY_REQUIRED');
    const tools=(await q('SELECT * FROM tools WHERE server_id=$1 ORDER BY name',[server.id])).rows;
    return managedMcp(server,tools,principal)(req,res,next);
  }catch(e){next(e);}
});

app.post('/api/stripe/webhook',express.raw({type:'application/json'}),async(req,res)=>{
  if(!stripe||!process.env.STRIPE_WEBHOOK_SECRET)return j(res,503,'BILLING_NOT_CONFIGURED');
  let event;try{event=stripe.webhooks.constructEvent(req.body,req.get('stripe-signature')||'',process.env.STRIPE_WEBHOOK_SECRET);}catch{return j(res,400,'INVALID_WEBHOOK_SIGNATURE');}
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const done=await client.query('INSERT INTO billing_events(event_id) VALUES($1) ON CONFLICT DO NOTHING RETURNING event_id',[event.id]);
    if(done.rowCount===0){await client.query('COMMIT');return res.json({received:true,duplicate:true});}
    if(event.type==='checkout.session.completed'){
      const s=event.data.object;
      if(s.mode==='subscription'&&s.customer&&s.client_reference_id){
        await client.query('UPDATE accounts SET stripe_customer_id=$1 WHERE id=$2 AND (stripe_customer_id IS NULL OR stripe_customer_id=$1)',[s.customer,s.client_reference_id]);
      }
    }
    if(['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted'].includes(event.type)){
      const s=event.data.object;
      const active=event.type!=='customer.subscription.deleted'&&['active','trialing'].includes(s.status);
      await client.query('UPDATE accounts SET plan=$1 WHERE stripe_customer_id=$2',[active?'pro':'free',s.customer]);
    }
    await client.query('COMMIT');return res.json({received:true});
  }catch(e){await client.query('ROLLBACK');return j(res,500,'WEBHOOK_WRITE_FAILED');}finally{client.release();}
});

app.use(express.json({limit:'300kb'}));
app.use('/api',enforceOrigin);
app.post('/api/auth/register',async(req,res)=>{
  const email=string(req.body?.email,180).toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return j(res,400,'VALID_EMAIL_REQUIRED');
  let hash;try{hash=passwordHash(req.body?.password);}catch(e){return j(res,400,e.message);}
  const uid=randomUUID(),sid=token();
  try{await q('INSERT INTO accounts(id,email,password_hash) VALUES($1,$2,$3)',[uid,email,hash]);
    await q("INSERT INTO sessions(token_hash,account_id,expires_at) VALUES($1,$2,now()+interval '14 days')",[sha(sid),uid]);
    cookie(res,sid);res.status(201).json({account:{id:uid,email,plan:'free'}});
  }catch(e){return j(res,e.code==='23505'?409:500,e.code==='23505'?'EMAIL_ALREADY_EXISTS':'REGISTER_FAILED');}
});
app.post('/api/auth/login',async(req,res)=>{
 const email=string(req.body?.email,180).toLowerCase(),password=req.body?.password;
 if(typeof password!=='string')return j(res,400,'INVALID_LOGIN');
 const {rows}=await q('SELECT * FROM accounts WHERE email=$1',[email]);
 if(!rows.length||!passwordMatches(password,rows[0].password_hash))return j(res,401,'INVALID_LOGIN');
 const sid=token();await q("INSERT INTO sessions(token_hash,account_id,expires_at) VALUES($1,$2,now()+interval '14 days')",[sha(sid),rows[0].id]);
 cookie(res,sid);res.json({account:{id:rows[0].id,email,plan:rows[0].plan}});
});
app.post('/api/auth/logout',async(req,res)=>{
 const sid=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('mcpf_session='))?.slice('mcpf_session='.length);
 if(sid)await q('DELETE FROM sessions WHERE token_hash=$1',[sha(sid)]);
 res.clearCookie('mcpf_session',{path:'/'});res.json({ok:true});
});
app.get('/api/me',auth,(req,res)=>res.json({account:req.user}));
app.delete('/api/account',auth,async(req,res)=>{
  // Account owner must re-enter the password. This also makes temporary live
  // conformance accounts safely removable without leaving test traffic behind.
  if(typeof req.body?.password!=='string')return j(res,400,'PASSWORD_REQUIRED');
  const {rows}=await q('SELECT password_hash FROM accounts WHERE id=$1',[req.user.id]);
  if(!rows.length||!passwordMatches(req.body.password,rows[0].password_hash))return j(res,403,'INVALID_PASSWORD');
  await q('DELETE FROM accounts WHERE id=$1',[req.user.id]);
  res.clearCookie('mcpf_session',{path:'/'});
  res.json({deleted:true});
});
app.get('/api/templates',(_req,res)=>res.json({templates:publicTemplates(),kind:'live-public-api-onboarding',note:'Templates are API examples, not customer or marketplace listings'}));

app.post('/api/pilot-interest',async(req,res)=>{
  const email=string(req.body?.email,180).toLowerCase();
  const contact_name=string(req.body?.contact_name,120);
  const company=string(req.body?.company,160);
  const website=string(req.body?.website,300);
  const project_brief=string(req.body?.project_brief,2000);
  // Honeypot is ignored without creating any stored prospect record.
  if(req.body?.nickname)return res.status(202).json({received:true});
  if(req.body?.contact_consent!==true)return j(res,400,'CONTACT_CONSENT_REQUIRED');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!contact_name||project_brief.length<20)return j(res,400,'NAME_EMAIL_AND_PROJECT_BRIEF_REQUIRED');
  if(website){try{const parsed=new URL(website);if(parsed.protocol!=='https:')return j(res,400,'HTTPS_WEBSITE_REQUIRED');}catch{return j(res,400,'VALID_WEBSITE_REQUIRED');}}
  try{
    const {rows}=await q(`INSERT INTO pilot_leads(id,email,contact_name,company,website,project_brief,marketing_consent)
      VALUES($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT(email) DO UPDATE SET contact_name=excluded.contact_name,company=excluded.company,
      website=excluded.website,project_brief=excluded.project_brief,marketing_consent=excluded.marketing_consent,
      updated_at=now()
      RETURNING id,created_at`,
      [randomUUID(),email,contact_name,company,website,project_brief,req.body?.marketing_consent===true]);
    return res.status(202).json({received:true,reference:rows[0].id,kind:'pilot_enquiry',payment_collected:false});
  }catch(error){console.error('pilot_lead_write_failed',error?.code||'UNKNOWN');return j(res,503,'ENQUIRY_SAVE_UNAVAILABLE');}
});
// Admin access is an independent operator secret: public account emails
// are not verified identities and must never authorize lead data access.
const operator=(req,res,next)=>{
 const expected=process.env.FOUNDRY_ADMIN_TOKEN||'';
 if(expected.length<40)return j(res,503,'OPERATOR_TOKEN_NOT_CONFIGURED');
 const token=req.get('authorization')?.replace(/^Bearer /i,'')||'';
 const a=Buffer.from(sha(token),'hex'),b=Buffer.from(sha(expected),'hex');
 if(!token||token.length>512||!timingSafeEqual(a,b))return j(res,403,'OPERATOR_AUTH_REQUIRED');
 next();
};
app.get('/api/admin/pilot-interest',operator,async(req,res)=>{
  const {rows}=await q('SELECT id,contact_name,email,company,website,project_brief,marketing_consent,status,created_at,updated_at FROM pilot_leads ORDER BY updated_at DESC LIMIT 100');
  res.json({leads:rows});
});
app.patch('/api/admin/pilot-interest/:id',operator,async(req,res)=>{
  const allowed=new Set(['new','contacted','qualified','closed']);
  if(!allowed.has(req.body?.status))return j(res,400,'INVALID_LEAD_STATUS');
  const {rows}=await q('UPDATE pilot_leads SET status=$1,updated_at=now() WHERE id=$2 RETURNING id,status,updated_at',[req.body.status,req.params.id]);
  if(!rows.length)return j(res,404,'LEAD_NOT_FOUND');
  res.json({lead:rows[0]});
});
app.get('/api/admin/overview',operator,async(req,res)=>{
  const [leads,accounts,servers,events]=await Promise.all([
    q('SELECT status,count(*)::int AS count FROM pilot_leads GROUP BY status ORDER BY status'),
    q('SELECT count(*)::int AS n FROM accounts'),
    q("SELECT count(*)::int total,count(*) FILTER (WHERE status='published')::int published FROM servers"),
    q("SELECT count(*)::int AS calls,count(*) FILTER(WHERE success)::int AS successes FROM tool_events WHERE created_at>now()-interval '7 days'")
  ]);
  res.json({pilot_leads:leads.rows,accounts:accounts.rows[0].n,servers:servers.rows[0],observed_7d_calls:events.rows[0]});
});
app.get('/api/catalog',async(req,res)=>{
 const term=string(req.query.q,100);const {rows}=await q("SELECT s.slug,s.name,s.description,s.updated_at,count(t.id)::int AS tool_count FROM servers s LEFT JOIN tools t ON t.server_id=s.id WHERE s.status='published' AND s.visibility='public' AND (s.name ILIKE $1 OR s.description ILIKE $1) GROUP BY s.id ORDER BY s.updated_at DESC LIMIT 50",['%'+term+'%']);
 res.json({servers:rows});
});
app.get('/api/servers',auth,async(req,res)=>{
 const {rows}=await q('SELECT s.*,count(t.id)::int AS tool_count FROM servers s LEFT JOIN tools t ON t.server_id=s.id WHERE s.owner_id=$1 GROUP BY s.id ORDER BY s.created_at DESC',[req.user.id]);res.json({servers:rows});
});
app.post('/api/servers',auth,async(req,res)=>{
 const name=string(req.body?.name,100),slug=string(req.body?.slug,49).toLowerCase(),description=string(req.body?.description,400);
 if(!name||!validSlug(slug))return j(res,400,'VALID_NAME_AND_SLUG_REQUIRED');
 const count=await q('SELECT count(*)::int AS n FROM servers WHERE owner_id=$1',[req.user.id]);
 if(req.user.plan!=='pro'&&count.rows[0].n>=2)return j(res,403,'FREE_SERVER_LIMIT_REACHED');
 try{const {rows}=await q("INSERT INTO servers(id,owner_id,slug,name,description) VALUES($1,$2,$3,$4,$5) RETURNING *",[randomUUID(),req.user.id,slug,name,description]);res.status(201).json({server:rows[0]});}
 catch(e){return j(res,e.code==='23505'?409:500,e.code==='23505'?'SLUG_TAKEN':'SERVER_CREATE_FAILED');}
});
app.post('/api/servers/from-template',auth,async(req,res)=>{
  const template=findTemplate(string(req.body?.template_id,80));
  if(!template)return j(res,404,'STARTER_TEMPLATE_NOT_FOUND');
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await client.query('SELECT id FROM accounts WHERE id=$1 FOR UPDATE',[req.user.id]);
    const count=await client.query('SELECT count(*)::int n FROM servers WHERE owner_id=$1',[req.user.id]);
    if(req.user.plan!=='pro'&&count.rows[0].n>=2){
      await client.query('ROLLBACK');return j(res,403,'FREE_SERVER_LIMIT_REACHED');
    }
    const id=randomUUID(),slug=template.id.replace(/_/g,'-')+'-'+randomUUID().slice(0,8);
    const created=await client.query("INSERT INTO servers(id,owner_id,slug,name,description) VALUES($1,$2,$3,$4,$5) RETURNING *",
      [id,req.user.id,slug,template.name,template.description]);
    for(const tool of template.tools){
      validatedTarget(tool.url);
      await client.query('INSERT INTO tools(id,server_id,name,description,url,params) VALUES($1,$2,$3,$4,$5,$6)',
        [randomUUID(),id,tool.name,tool.description,tool.url,JSON.stringify(tool.params)]);
    }
    await client.query('COMMIT');
    res.status(201).json({server:created.rows[0],template_id:template.id,sample_args:template.sampleArgs,tools_added:template.tools.length,source:template.source});
  }catch(error){await client.query('ROLLBACK');console.error('template_create_failed',error?.code||'UNKNOWN');j(res,500,'TEMPLATE_CREATE_FAILED');}
  finally{client.release();}
});
app.patch('/api/servers/:id',auth,async(req,res)=>{
 const server=await ownedServer(req.params.id,req.user.id);if(!server)return j(res,404,'SERVER_NOT_FOUND');
 const name=string(req.body?.name,100),description=string(req.body?.description,400);
 if(!name)return j(res,400,'SERVER_NAME_REQUIRED');
 const {rows}=await q('UPDATE servers SET name=$1,description=$2,updated_at=now() WHERE id=$3 AND owner_id=$4 RETURNING *',
 [name,description,server.id,req.user.id]);
 res.json({server:rows[0]});
});
app.delete('/api/servers/:id',auth,async(req,res)=>{
 const {rows}=await q('DELETE FROM servers WHERE id=$1 AND owner_id=$2 RETURNING id,slug',[req.params.id,req.user.id]);
 if(!rows.length)return j(res,404,'SERVER_NOT_FOUND');
 res.json({deleted:true,server:rows[0],endpoint_revoked:true});
});
app.get('/api/servers/:id',auth,async(req,res)=>{
 const server=await ownedServer(req.params.id,req.user.id);if(!server)return j(res,404,'SERVER_NOT_FOUND');
 const tools=(await q('SELECT * FROM tools WHERE server_id=$1 ORDER BY name',[server.id])).rows;res.json({server,tools});
});
function validateTool(input){
 const name=string(input?.name,60).toLowerCase(),description=string(input?.description,280),url=string(input?.url,1500);
 if(!/^[a-z][a-z0-9_]{1,59}$/.test(name)||!description)return 'INVALID_TOOL_NAME_OR_DESCRIPTION';
 try{validatedTarget(url);}catch(e){return e.message;}
 if(input.method&&input.method!=='GET')return 'ONLY_GET_SUPPORTED';
 if(!Array.isArray(input.params)||input.params.length>18)return 'INVALID_PARAMS';
 for(const p of input.params)if(!/^[a-zA-Z_][\w-]{0,63}$/.test(p.name)||!['path','query'].includes(p.in)||!['string','integer','number','boolean'].includes(p.type))return 'INVALID_PARAM_SCHEMA';
 return null;
}
app.post('/api/servers/:id/tools',auth,async(req,res)=>{
 const server=await ownedServer(req.params.id,req.user.id);if(!server)return j(res,404,'SERVER_NOT_FOUND');
 const err=validateTool(req.body);if(err)return j(res,400,err);
 const count=await q('SELECT count(*)::int AS n FROM tools WHERE server_id=$1',[server.id]);
 if(req.user.plan!=='pro'&&count.rows[0].n>=10)return j(res,403,'FREE_TOOL_LIMIT_REACHED');
 try{const {rows}=await q('INSERT INTO tools(id,server_id,name,description,url,params) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[randomUUID(),server.id,req.body.name.toLowerCase(),req.body.description,req.body.url,JSON.stringify(req.body.params)]);
  await q('UPDATE servers SET status=$1,updated_at=now() WHERE id=$2',['draft',server.id]);res.status(201).json({tool:rows[0]});
 }catch(e){return j(res,e.code==='23505'?409:500,e.code==='23505'?'DUPLICATE_TOOL_NAME':'TOOL_SAVE_FAILED');}
});
app.post('/api/servers/:id/import-openapi',auth,async(req,res)=>{
 const server=await ownedServer(req.params.id,req.user.id);if(!server)return j(res,404,'SERVER_NOT_FOUND');
 let entries;try{entries=specTools(req.body?.document,req.body?.baseUrl);}catch(e){return j(res,400,e.message);}
 if(!entries.length)return j(res,400,'NO_GET_OPERATIONS_FOUND');
 let added=0;
 const existing=await q('SELECT count(*)::int n FROM tools WHERE server_id=$1',[server.id]);
 const capacity=Math.max(0,(req.user.plan==='pro'?50:10)-existing.rows[0].n);
 for(const tool of entries.slice(0,capacity)){
   if(validateTool(tool))continue;
   const out=await q('INSERT INTO tools(id,server_id,name,description,url,params) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(server_id,name) DO NOTHING RETURNING id',[randomUUID(),server.id,tool.name,tool.description,tool.url,JSON.stringify(tool.params)]);
   added+=out.rowCount;
   if(added>= (req.user.plan==='pro'?50:10))break;
 }
 if(added)await q("UPDATE servers SET status='draft',updated_at=now() WHERE id=$1",[server.id]);
 res.json({found:entries.length,added});
});
app.post('/api/servers/:id/unpublish',auth,async(req,res)=>{
 const server=await ownedServer(req.params.id,req.user.id);if(!server)return j(res,404,'SERVER_NOT_FOUND');
 await q("UPDATE servers SET status='draft',updated_at=now() WHERE id=$1",[server.id]);
 res.json({status:'draft',endpoint_disabled:true,slug:server.slug});
});
app.post('/api/servers/:id/publish',auth,async(req,res)=>{
 const server=await ownedServer(req.params.id,req.user.id);if(!server)return j(res,404,'SERVER_NOT_FOUND');
 const count=await q('SELECT count(*)::int AS n FROM tools WHERE server_id=$1',[server.id]);
 if(!count.rows[0].n)return j(res,400,'ADD_A_TOOL_FIRST');
 const visibility=req.body?.visibility==='private'?'private':'public';
 const {rows}=await q("UPDATE servers SET status='published',visibility=$1,updated_at=now() WHERE id=$2 RETURNING *",[visibility,server.id]);
 res.json({server:rows[0],endpoint:(process.env.PUBLIC_URL||('https://'+req.get('host'))).replace(/\/$/,'')+'/mcp/'+server.slug});
});
app.patch('/api/tools/:id',auth,async(req,res)=>{
 const {rows}=await q('SELECT t.*,s.owner_id FROM tools t JOIN servers s ON s.id=t.server_id WHERE t.id=$1 AND s.owner_id=$2',[req.params.id,req.user.id]);
 const tool=rows[0];if(!tool)return j(res,404,'TOOL_NOT_FOUND');
 const input={name:req.body?.name??tool.name,description:req.body?.description??tool.description,
   url:req.body?.url??tool.url,method:'GET',params:req.body?.params??tool.params};
 const error=validateTool(input);if(error)return j(res,400,error);
 try{
   const updated=await q('UPDATE tools SET name=$1,description=$2,url=$3,params=$4 WHERE id=$5 RETURNING *',
     [input.name,input.description,input.url,JSON.stringify(input.params),tool.id]);
   await q("UPDATE servers SET status='draft',updated_at=now() WHERE id=$1",[tool.server_id]);
   res.json({tool:updated.rows[0],server_status:'draft'});
 }catch(e){j(res,e.code==='23505'?409:500,e.code==='23505'?'DUPLICATE_TOOL_NAME':'TOOL_UPDATE_FAILED');}
});
app.delete('/api/tools/:id',auth,async(req,res)=>{
 const {rows}=await q('DELETE FROM tools t USING servers s WHERE t.id=$1 AND t.server_id=s.id AND s.owner_id=$2 RETURNING t.id,t.server_id',[req.params.id,req.user.id]);
 if(!rows.length)return j(res,404,'TOOL_NOT_FOUND');
 await q("UPDATE servers SET status='draft',updated_at=now() WHERE id=$1",[rows[0].server_id]);
 res.json({deleted:true,tool_id:rows[0].id,server_status:'draft'});
});
app.post('/api/tools/:id/test',auth,async(req,res)=>{
 const {rows}=await q('SELECT t.*,s.owner_id FROM tools t JOIN servers s ON s.id=t.server_id WHERE t.id=$1 AND s.owner_id=$2',[req.params.id,req.user.id]);const tool=rows[0];if(!tool)return j(res,404,'TOOL_NOT_FOUND');
 const started=Date.now();try{const source=toolUrl(tool,req.body?.args||{}),data=await safeGet(source);res.json({ok:true,source,duration_ms:Date.now()-started,response:data.body.slice(0,16000)});}
 catch(e){res.status(422).json({ok:false,error:e.message,duration_ms:Date.now()-started});}
});
app.get('/api/servers/:id/usage',auth,async(req,res)=>{
 const server=await ownedServer(req.params.id,req.user.id);if(!server)return j(res,404,'SERVER_NOT_FOUND');
 const {rows}=await q("SELECT count(*)::int AS calls,count(*) FILTER(WHERE success)::int AS successes,coalesce(round(avg(duration_ms)),0)::int AS avg_ms,count(DISTINCT date_trunc('day',created_at))::int AS active_days FROM tool_events WHERE server_id=$1 AND created_at>now()-interval '30 days'",[server.id]);res.json({usage:rows[0]});
});
app.get('/api/keys',auth,async(req,res)=>{
 const {rows}=await q('SELECT id,prefix,label,created_at,revoked_at FROM api_keys WHERE owner_id=$1 ORDER BY created_at DESC',[req.user.id]);res.json({keys:rows});
});
app.post('/api/keys',auth,async(req,res)=>{
 const secret='fdy_'+token(),prefix=secret.slice(0,12);
 const {rows}=await q('INSERT INTO api_keys(id,owner_id,token_hash,prefix,label) VALUES($1,$2,$3,$4,$5) RETURNING id,prefix,label,created_at',[randomUUID(),req.user.id,sha(secret),prefix,string(req.body?.label,50)||'Developer key']);
 res.status(201).json({key:rows[0],secret});
});
app.delete('/api/keys/:id',auth,async(req,res)=>{
 const out=await q('UPDATE api_keys SET revoked_at=now() WHERE id=$1 AND owner_id=$2',[req.params.id,req.user.id]);res.json({revoked:out.rowCount>0});
});
app.get('/api/billing',auth,(req,res)=>res.json({plan:req.user.plan,checkout_available:!!(stripe&&process.env.STRIPE_PRICE_ID&&process.env.STRIPE_WEBHOOK_SECRET)}));
app.post('/api/billing/checkout',auth,async(req,res)=>{
 if(!stripe||!process.env.STRIPE_PRICE_ID||!process.env.STRIPE_WEBHOOK_SECRET)return j(res,503,'BILLING_NOT_CONFIGURED');
 try{
 const base=(process.env.PUBLIC_URL||('https://'+req.get('host'))).replace(/\/$/,'');
 const customer=req.user.stripe_customer_id?{customer:req.user.stripe_customer_id}:{customer_email:req.user.email};
 const session=await stripe.checkout.sessions.create({...customer,mode:'subscription',line_items:[{price:process.env.STRIPE_PRICE_ID,quantity:1}],client_reference_id:req.user.id,success_url:base+'/?billing=success',cancel_url:base+'/?billing=cancel'});
 res.json({url:session.url,checkout_session_id:session.id});
 }catch(e){return j(res,502,'CHECKOUT_UNAVAILABLE');}
});
app.get('/server.json',(_req,res)=>res.json({name:'io.github.Noetfield-Systems/mcp-foundry',description:'Discover published public MCP servers and their tools',version:'0.1.0',remotes:[{type:'streamable-http',url:(process.env.PUBLIC_URL||'http://localhost:'+port)+'/mcp/foundry'}]}));
app.get('/.well-known/mcp/server.json',(req,res)=>res.redirect(307,'/server.json'));
app.use(express.static(ROOT,{extensions:['html'],maxAge:'5m'}));
app.use((err,req,res,next)=>{console.error('request_error',err?.message);if(res.headersSent)return next(err);return j(res,500,'INTERNAL_ERROR');});
await initDb();
app.listen(port,'0.0.0.0',()=>console.log(JSON.stringify({event:'listening',product:'mcp-foundry',port,protocol:'2026-07-28'})));
