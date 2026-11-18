import express from 'express';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {q,pool,ownedServer} from './db.mjs';
import {validatedTarget} from './security.mjs';
import {publishDraftServer} from './publication.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const str=(v,max=200)=>typeof v==='string'?v.trim().slice(0,max):'';
const fail=(res,code,error)=>res.status(code).json({error});
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const categories=['developer-tools','data','productivity','finance','research','commerce','operations','other'];
const roles=['viewer','editor'];

export async function attachReferral(inviteeId,code){
 if(!uuid(inviteeId)||!/^fdy-[a-zA-Z0-9_-]{8,28}$/.test(code||''))return false;
 const ref=(await q('SELECT owner_id FROM growth_links WHERE code=$1',[code])).rows[0];
 if(!ref||ref.owner_id===inviteeId)return false;
 await q('INSERT INTO growth_referrals(invitee_id,inviter_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[inviteeId,ref.owner_id]);
 return true;
}
export async function snapshotServer(serverId){
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const lock=await client.query('SELECT id FROM servers WHERE id=$1 FOR UPDATE',[serverId]);
  if(!lock.rowCount)throw Error('SERVER_NOT_FOUND');
  const tools=(await client.query('SELECT name,description,method,url,params FROM tools WHERE server_id=$1 ORDER BY name',[serverId])).rows;
  if(!tools.length)throw Error('ADD_A_TOOL_FIRST');
  const n=await client.query('SELECT coalesce(max(version),0)+1 AS next FROM server_revisions WHERE server_id=$1',[serverId]);
  const version=Number(n.rows[0].next);
  await client.query('INSERT INTO server_revisions(id,server_id,version,snapshot) VALUES($1,$2,$3,$4)',[randomUUID(),serverId,version,JSON.stringify({tools})]);
  await client.query('COMMIT');return version;
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
export async function applyPilotWebhook(client,event){
 if(!['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','charge.refunded'].includes(event.type))return false;
 const s=event.data?.object||{};
 if(event.type==='charge.refunded'){
  if(!s.refunded||!s.payment_intent)return false;
  await client.query("UPDATE pilot_orders SET status='refunded',updated_at=now() WHERE stripe_payment_intent_id=$1 AND status IN ('paid','fulfilled')",[s.payment_intent]);
  return true;
 }
 const id=s.metadata?.foundry_pilot_order_id;
 if(!uuid(id)||s.mode!=='payment')return false;
 const item=await client.query('SELECT id,amount_cents,currency,stripe_checkout_session_id,status FROM pilot_orders WHERE id=$1 FOR UPDATE',[id]);
 if(!item.rowCount)return false;
 const order=item.rows[0];
 // Do not trust success-page visits or client-submitted event payloads: this is
 // only called after Stripe signature verification and event id deduplication.
 if(order.stripe_checkout_session_id!==s.id)return false;
 if(event.type==='checkout.session.async_payment_failed'){
   if(order.status==='checkout_pending')await client.query("UPDATE pilot_orders SET status='failed',updated_at=now() WHERE id=$1",[id]);
   return true;
 }
 if(s.payment_status!=='paid'||s.amount_total!==order.amount_cents||s.currency!==order.currency)return false;
 if(['offered','checkout_pending','failed'].includes(order.status))
   await client.query("UPDATE pilot_orders SET status='paid',stripe_payment_intent_id=$2,completed_at=now(),updated_at=now() WHERE id=$1",[id,s.payment_intent||null]);
 return true;
}
export function expansionRouter({auth,operator,stripe}){
 const router=express.Router();
 router.get('/api/growth/me',auth,async(req,res)=>{
  const id=req.user.id,code='fdy-'+randomBytes(12).toString('base64url');
  await q('INSERT INTO growth_links(owner_id,code) VALUES($1,$2) ON CONFLICT(owner_id) DO NOTHING',[id,code]);
  const [link,referrals,activated]=await Promise.all([
   q('SELECT code FROM growth_links WHERE owner_id=$1',[id]),
   q('SELECT count(*)::int AS n FROM growth_referrals WHERE inviter_id=$1',[id]),
   q("SELECT count(DISTINCT gr.invitee_id)::int n FROM growth_referrals gr JOIN servers s ON s.owner_id=gr.invitee_id JOIN tool_events te ON te.server_id=s.id WHERE gr.inviter_id=$1 AND te.success",[id])
  ]);
  const base=(process.env.PUBLIC_URL||('https://'+req.get('host'))).replace(/\/$/,'');
  res.json({invite_url:base+'/?ref='+encodeURIComponent(link.rows[0].code),referrals:referrals.rows[0].n,activated_referrals:activated.rows[0].n,kind:'observed_signups_not_payments',incentives:false});
 });
 router.get('/api/marketplace',async(req,res)=>{
  const term=str(req.query.q,80),category=str(req.query.category,40);
  const {rows}=await q(`SELECT s.slug,s.name,s.description,l.tagline,l.category,l.docs_url,l.verified_at,l.updated_at,
    jsonb_array_length(s.published_snapshot->'tools')::int AS tools
    FROM marketplace_listings l JOIN servers s ON s.id=l.server_id
    WHERE s.visibility='public' AND s.status='published' AND s.published_snapshot IS NOT NULL
      AND ($1='' OR s.name ILIKE '%'||$1||'%' OR l.tagline ILIKE '%'||$1||'%')
      AND ($2='' OR l.category=$2)
    ORDER BY l.verified_at DESC NULLS LAST,l.updated_at DESC LIMIT 60`,[term,category]);
  res.json({listings:rows,categories,stats:{published:rows.length},note:'Real, owner-published integrations only; publisher verification is separate from tool execution'});
 });
 router.get('/api/marketplace/:slug',async(req,res)=>{
  const {rows}=await q(`SELECT s.slug,s.name,s.description,l.tagline,l.category,l.docs_url,l.readme,l.verified_at,l.updated_at
    FROM marketplace_listings l JOIN servers s ON s.id=l.server_id
    WHERE s.slug=$1 AND s.visibility='public' AND s.status='published'`,[req.params.slug]);
  if(!rows.length)return fail(res,404,'LISTING_NOT_FOUND');
  const snapshot=(await q('SELECT published_snapshot FROM servers WHERE slug=$1',[req.params.slug])).rows[0]?.published_snapshot;
  const tools=(snapshot?.tools||[]).map(t=>({name:t.name,description:t.description,params:t.params}));
  res.json({listing:rows[0],tools});
 });
 router.put('/api/servers/:id/listing',auth,async(req,res)=>{
  const server=await ownedServer(req.params.id,req.user.id);
  if(!server)return fail(res,404,'SERVER_NOT_FOUND');
  if(server.status!=='published'||server.visibility!=='public')return fail(res,409,'PUBLISH_PUBLIC_SERVER_FIRST');
  const category=str(req.body?.category,40),tagline=str(req.body?.tagline,150),
   readme=str(req.body?.readme,4000),docsUrl=str(req.body?.docs_url,600);
  if(!categories.includes(category)||tagline.length<8||readme.length<30)return fail(res,400,'LISTING_CONTENT_REQUIRED');
  if(docsUrl){try{validatedTarget(docsUrl);}catch{return fail(res,400,'PUBLIC_HTTPS_DOCS_REQUIRED');}}
  const {rows}=await q(`INSERT INTO marketplace_listings(server_id,category,tagline,readme,docs_url)
    VALUES($1,$2,$3,$4,$5) ON CONFLICT(server_id) DO UPDATE SET category=excluded.category,
    tagline=excluded.tagline,readme=excluded.readme,docs_url=excluded.docs_url,updated_at=now()
    RETURNING category,tagline,readme,docs_url,verified_at,updated_at`,[server.id,category,tagline,readme,docsUrl]);
  res.json({listing:rows[0],slug:server.slug,status:'published_unverified',payment_collected:false});
 });
 router.delete('/api/servers/:id/listing',auth,async(req,res)=>{
  const server=await ownedServer(req.params.id,req.user.id);if(!server)return fail(res,404,'SERVER_NOT_FOUND');
  const out=await q('DELETE FROM marketplace_listings WHERE server_id=$1',[server.id]);
  res.json({removed:out.rowCount>0});
 });
 router.get('/api/servers/:id/revisions',auth,async(req,res)=>{
  const server=await ownedServer(req.params.id,req.user.id);if(!server)return fail(res,404,'SERVER_NOT_FOUND');
  const {rows}=await q('SELECT id,version,created_at,jsonb_array_length(snapshot->\'tools\') AS tools FROM server_revisions WHERE server_id=$1 ORDER BY version DESC LIMIT 50',[server.id]);
  res.json({revisions:rows,active_revision:server.published_revision,has_unpublished_changes:server.has_unpublished_changes,note:'Restoring changes only draft tools. The active published endpoint remains unchanged until republished.'});
 });
 router.post('/api/servers/:id/revisions/:revisionId/restore',auth,async(req,res)=>{
  const server=await ownedServer(req.params.id,req.user.id);if(!server)return fail(res,404,'SERVER_NOT_FOUND');
  const c=await pool.connect();
  try{
   await c.query('BEGIN');await c.query('SELECT id FROM servers WHERE id=$1 AND owner_id=$2 FOR UPDATE',[server.id,req.user.id]);
   const {rows}=await c.query('SELECT snapshot,version FROM server_revisions WHERE id=$1 AND server_id=$2',[req.params.revisionId,server.id]);
   if(!rows.length){await c.query('ROLLBACK');return fail(res,404,'REVISION_NOT_FOUND');}
   const tools=rows[0].snapshot?.tools||[];
   if(!Array.isArray(tools)||tools.length>50||!tools.length)throw Error('INVALID_SNAPSHOT');
   await c.query('DELETE FROM tools WHERE server_id=$1',[server.id]);
   for(const tool of tools){
    validatedTarget(tool.url);
    await c.query('INSERT INTO tools(id,server_id,name,description,url,params) VALUES($1,$2,$3,$4,$5,$6)',
       [randomUUID(),server.id,tool.name,tool.description,tool.url,JSON.stringify(tool.params)]);
   }
   await c.query("UPDATE servers SET has_unpublished_changes=(status='published'),updated_at=now() WHERE id=$1",[server.id]);
   await c.query('COMMIT');
   res.json({restored:rows[0].version,tools:tools.length,status:server.status,active_revision:server.published_revision,requires_republish:true});
  }catch(e){await c.query('ROLLBACK');return fail(res,500,'REVISION_RESTORE_FAILED');}finally{c.release();}
 });
 router.get('/api/team/servers',auth,async(req,res)=>{
  const {rows}=await q(`SELECT s.id,s.name,s.slug,s.status,m.role,s.owner_id
    FROM server_members m JOIN servers s ON s.id=m.server_id WHERE m.account_id=$1 ORDER BY m.created_at DESC LIMIT 100`,[req.user.id]);
  res.json({servers:rows});
 });
 router.get('/api/team/servers/:id',auth,async(req,res)=>{
  const {rows}=await q('SELECT s.id,s.name,s.slug,s.status,s.description,s.visibility,m.role FROM server_members m JOIN servers s ON s.id=m.server_id WHERE m.account_id=$1 AND m.server_id=$2',[req.user.id,req.params.id]);
  if(!rows.length)return fail(res,404,'TEAM_SERVER_NOT_FOUND');
  const tools=(await q('SELECT id,name,description,method,params FROM tools WHERE server_id=$1 ORDER BY name',[req.params.id])).rows;
  res.json({server:rows[0],tools});
 });
 router.get('/api/team/invitations',auth,async(req,res)=>{
  const {rows}=await q(`SELECT i.id,i.role,i.created_at,i.expires_at,s.name,s.slug
    FROM server_invitations i JOIN servers s ON s.id=i.server_id
    WHERE i.invitee_id=$1 AND i.status='pending' AND i.expires_at>now()
    ORDER BY i.created_at DESC`,[req.user.id]);res.json({invitations:rows});
 });
 router.post('/api/servers/:id/invitations',auth,async(req,res)=>{
  const owner=await ownedServer(req.params.id,req.user.id);if(!owner)return fail(res,404,'SERVER_NOT_FOUND');
  const target=req.body?.account_id,role=str(req.body?.role,10);
  if(!uuid(target)||target===req.user.id||!roles.includes(role))return fail(res,400,'VALID_MEMBER_ID_AND_ROLE_REQUIRED');
  const account=await q('SELECT id FROM accounts WHERE id=$1',[target]);if(!account.rowCount)return fail(res,404,'TARGET_ACCOUNT_NOT_FOUND');
  const {rows}=await q('INSERT INTO server_invitations(id,server_id,inviter_id,invitee_id,role) VALUES($1,$2,$3,$4,$5) RETURNING id,role,expires_at',
   [randomUUID(),owner.id,req.user.id,target,role]);
  res.status(201).json({invitation:rows[0],sent_via_email:false,note:'The invitee can see this invitation in their own logged-in Foundry workspace.'});
 });
 router.post('/api/team/invitations/:id/accept',auth,async(req,res)=>{
  const c=await pool.connect();try{
   await c.query('BEGIN');
   const {rows}=await c.query("SELECT * FROM server_invitations WHERE id=$1 AND invitee_id=$2 AND status='pending' AND expires_at>now() FOR UPDATE",[req.params.id,req.user.id]);
   if(!rows.length){await c.query('ROLLBACK');return fail(res,404,'INVITATION_NOT_FOUND');}
   const x=rows[0];
   await c.query('INSERT INTO server_members(server_id,account_id,role) VALUES($1,$2,$3) ON CONFLICT(server_id,account_id) DO UPDATE SET role=excluded.role',[x.server_id,req.user.id,x.role]);
   await c.query("UPDATE server_invitations SET status='accepted' WHERE id=$1",[x.id]);
   await c.query('COMMIT');res.json({accepted:true,server_id:x.server_id,role:x.role});
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 });
 router.get('/api/servers/:id/members',auth,async(req,res)=>{
  const server=await ownedServer(req.params.id,req.user.id);if(!server)return fail(res,404,'SERVER_NOT_FOUND');
  const {rows}=await q('SELECT account_id,role,created_at FROM server_members WHERE server_id=$1 ORDER BY created_at',[server.id]);
  res.json({members:rows});
 });
 router.delete('/api/servers/:id/members/:accountId',auth,async(req,res)=>{
  const server=await ownedServer(req.params.id,req.user.id);if(!server)return fail(res,404,'SERVER_NOT_FOUND');
  const out=await q('DELETE FROM server_members WHERE server_id=$1 AND account_id=$2',[server.id,req.params.accountId]);
  res.json({removed:out.rowCount>0});
 });
 router.post('/api/team/servers/:id/publish',auth,async(req,res)=>{
  const {rows}=await q("SELECT s.id,s.slug,s.status FROM server_members m JOIN servers s ON s.id=m.server_id WHERE m.account_id=$1 AND m.server_id=$2 AND m.role='editor'",[req.user.id,req.params.id]);
  if(!rows.length)return fail(res,403,'TEAM_EDITOR_REQUIRED');
  const count=await q('SELECT count(*)::int AS n FROM tools WHERE server_id=$1',[rows[0].id]);
  if(!count.rows[0].n)return fail(res,400,'ADD_A_TOOL_FIRST');
  const current=(await q('SELECT visibility FROM servers WHERE id=$1',[rows[0].id])).rows[0];
  let published;try{published=await publishDraftServer(rows[0].id,current?.visibility||'public');}
  catch(e){return fail(res,409,e.message||'PUBLISH_FAILED');}
  res.json({published:true,slug:rows[0].slug,published_revision:published.version,collaborator_role:'editor'});
 });
 router.get('/api/admin/pilot-orders',operator,async(_req,res)=>{
  const {rows}=await q(`SELECT o.id,o.lead_id,o.offer_type,o.amount_cents,o.currency,o.description,o.status,o.created_at,o.completed_at,
  l.contact_name,l.company,l.email FROM pilot_orders o JOIN pilot_leads l ON l.id=o.lead_id ORDER BY o.created_at DESC LIMIT 100`);
  res.json({orders:rows,revenue_claims:'Only Stripe signed webhook-confirmed paid orders count'});
 });
 router.post('/api/admin/pilot-orders',operator,async(req,res)=>{
  const lead=req.body?.lead_id,amount=req.body?.amount_cents,currency=str(req.body?.currency,3).toLowerCase(),description=str(req.body?.description,300),offer_type=str(req.body?.offer_type,30).toLowerCase()||'custom';
  if(!uuid(lead)||!Number.isInteger(amount)||amount<1000||amount>2500000||!['cad','usd'].includes(currency)||!['quickstart','launch','private','care','agency','custom'].includes(offer_type)||description.length<20)return fail(res,400,'VALID_SCOPED_ORDER_REQUIRED');
  const token=randomBytes(32).toString('base64url');
  try{
   const {rows}=await q('INSERT INTO pilot_orders(id,lead_id,payment_token_hash,amount_cents,currency,description,offer_type) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,amount_cents,currency,status,offer_type',[randomUUID(),lead,hash(token),amount,currency,description,offer_type]);
   const base=(process.env.PUBLIC_URL||('https://'+req.get('host'))).replace(/\/$/,'');
   res.status(201).json({order:rows[0],share_url:base+'/order/'+token,payment_collected:false});
  }catch(e){return fail(res,e.code==='23503'?404:500,e.code==='23503'?'LEAD_NOT_FOUND':'ORDER_CREATE_FAILED');}
 });
 router.get('/order/:token',(_req,res)=>res.sendFile('order.html',{root:new URL('../public/',import.meta.url).pathname}));
 router.get('/api/orders/:token',async(req,res)=>{
  const t=str(req.params.token,128);if(!/^[a-zA-Z0-9_-]{32,80}$/.test(t))return fail(res,404,'ORDER_NOT_FOUND');
  const {rows}=await q('SELECT id,offer_type,amount_cents,currency,description,status,created_at,completed_at FROM pilot_orders WHERE payment_token_hash=$1',[hash(t)]);
  if(!rows.length)return fail(res,404,'ORDER_NOT_FOUND');
  res.json({order:rows[0],checkout_available:!!(stripe&&process.env.STRIPE_WEBHOOK_SECRET),receipt_verified:['paid','fulfilled'].includes(rows[0].status)});
 });
 router.post('/api/orders/:token/checkout',async(req,res)=>{
  if(!stripe||!process.env.STRIPE_WEBHOOK_SECRET)return fail(res,503,'CHECKOUT_CONFIGURATION_REQUIRED');
  const t=str(req.params.token,128);if(!/^[a-zA-Z0-9_-]{32,80}$/.test(t))return fail(res,404,'ORDER_NOT_FOUND');
  const {rows}=await q(`SELECT o.*,l.email FROM pilot_orders o JOIN pilot_leads l ON l.id=o.lead_id
    WHERE o.payment_token_hash=$1`,[hash(t)]);
  if(!rows.length)return fail(res,404,'ORDER_NOT_FOUND');
  const order=rows[0];
  if(!['offered','checkout_pending'].includes(order.status))return fail(res,409,'ORDER_NOT_PAYABLE');
  try{
   const base=(process.env.PUBLIC_URL||('https://'+req.get('host'))).replace(/\/$/,'');
   const session=await stripe.checkout.sessions.create({
    mode:'payment',customer_email:order.email,
    line_items:[{price_data:{currency:order.currency,unit_amount:order.amount_cents,
       product_data:{name:'MCP Foundry — scoped integration delivery',description:order.description.slice(0,300)}},quantity:1}],
    metadata:{foundry_pilot_order_id:order.id,product:'mcp-foundry',offer_type:order.offer_type||'custom'},
    client_reference_id:order.id,
    success_url:base+'/order/'+t+'?checkout=returned',
    cancel_url:base+'/order/'+t+'?checkout=cancelled',
    billing_address_collection:'required'
   },{idempotencyKey:'foundry-pilot-'+order.id+'-v1'});
   await q(`UPDATE pilot_orders SET status='checkout_pending',stripe_checkout_session_id=$2,updated_at=now()
     WHERE id=$1 AND status IN ('offered','checkout_pending')`,[order.id,session.id]);
   res.json({url:session.url,checkout_session_id:session.id,payment_collected:false});
  }catch(e){console.error('foundry_pilot_checkout_failed',e?.code||e?.type||'UNKNOWN');return fail(res,502,'CHECKOUT_UNAVAILABLE');}
 });
 router.post('/api/admin/pilot-orders/:id/fulfill',operator,async(req,res)=>{
  const {rows}=await q("UPDATE pilot_orders SET status='fulfilled',updated_at=now() WHERE id=$1 AND status='paid' RETURNING id,status,completed_at",[req.params.id]);
  if(!rows.length)return fail(res,409,'SIGNED_PAYMENT_REQUIRED_BEFORE_FULFILLMENT');
  res.json({order:rows[0]});
 });
 return router;
}
