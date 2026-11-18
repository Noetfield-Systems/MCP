import express from 'express';
import {randomBytes,createHash,createCipheriv,createDecipheriv} from 'node:crypto';
import {q,pool,ownedServer} from './db.mjs';
import {safeGet} from './security.mjs';

const hash=s=>createHash('sha256').update(s).digest('hex');
const b64=b=>b.toString('base64url');
const githubTokenUrl='https://github.com/login/oauth/access_token';
const githubAuthUrl='https://github.com/login/oauth/authorize';
const getConfig=()=>{
 const clientId=process.env.GITHUB_OAUTH_CLIENT_ID||'';
 const secret=process.env.GITHUB_OAUTH_CLIENT_SECRET||'';
 const origin=process.env.PUBLIC_URL||'';
 const cipher=process.env.FOUNDRY_OAUTH_ENCRYPTION_KEY||'';
 return {clientId,secret,origin,cipher,configured:!!(clientId&&secret&&/^https:\/\/[^/]+$/.test(origin)&&/^[0-9a-f]{64}$/i.test(cipher))};
};
function key(){
 const raw=process.env.FOUNDRY_OAUTH_ENCRYPTION_KEY||'';
 if(!/^[a-f0-9]{64}$/i.test(raw))throw Error('OAUTH_KEY_NOT_CONFIGURED');
 return Buffer.from(raw,'hex');
}
export function encryptToken(value,accountId){
 if(typeof value!=='string'||!value||value.length>6000)throw Error('OAUTH_INVALID_SECRET');
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);
 cipher.setAAD(Buffer.from('github:'+accountId));
 const body=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
 return 'v1.'+b64(iv)+'.'+b64(cipher.getAuthTag())+'.'+b64(body);
}
export function decryptToken(payload,accountId){
 if(typeof payload!=='string')throw Error('OAUTH_INVALID_CIPHERTEXT');
 const bits=payload.split('.');
 if(bits.length!==4||bits[0]!=='v1')throw Error('OAUTH_INVALID_CIPHERTEXT');
 const iv=Buffer.from(bits[1],'base64url'),tag=Buffer.from(bits[2],'base64url'),body=Buffer.from(bits[3],'base64url');
 if(iv.length!==12||tag.length!==16||body.length>6500)throw Error('OAUTH_INVALID_CIPHERTEXT');
 const cipher=createDecipheriv('aes-256-gcm',key(),iv);cipher.setAAD(Buffer.from('github:'+accountId));cipher.setAuthTag(tag);
 return Buffer.concat([cipher.update(body),cipher.final()]).toString('utf8');
}
export function pkcePair(){
 const verifier=b64(randomBytes(32));const challenge=b64(createHash('sha256').update(verifier).digest());
 return {verifier,challenge};
}
export async function exchangeGithub(form){
 const cfg=getConfig();if(!cfg.configured)throw Error('OAUTH_PROVIDER_NOT_CONFIGURED');
 const body=new URLSearchParams({...form,client_id:cfg.clientId,client_secret:cfg.secret});
 const r=await fetch(githubTokenUrl,{method:'POST',redirect:'error',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body,signal:AbortSignal.timeout(9000)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok||data.error||typeof data.access_token!=='string'||data.access_token.length<10||data.access_token.length>6000)throw Error('OAUTH_TOKEN_EXCHANGE_FAILED');
 return data;
}
async function saveConnection(id,tokens){
 const expires=tokens.expires_in?new Date(Date.now()+Number(tokens.expires_in)*1000):null;
 await q(`INSERT INTO oauth_connections(account_id,provider,access_cipher,refresh_cipher,scopes,expires_at)
 VALUES($1,'github',$2,$3,$4,$5)
 ON CONFLICT(account_id,provider) DO UPDATE SET access_cipher=excluded.access_cipher,
 refresh_cipher=excluded.refresh_cipher,scopes=excluded.scopes,expires_at=excluded.expires_at,updated_at=now()`,
 [id,encryptToken(tokens.access_token,id),tokens.refresh_token?encryptToken(tokens.refresh_token,id):null,
 String(tokens.scope||'').slice(0,250),expires]);
}
export async function githubAccessToken(ownerId){
 const {rows}=await q("SELECT access_cipher,refresh_cipher,expires_at FROM oauth_connections WHERE account_id=$1 AND provider='github'",[ownerId]);
 if(!rows.length)throw Error('GITHUB_CONNECTION_REQUIRED');
 const c=rows[0];
 if(!c.expires_at||new Date(c.expires_at).getTime()>Date.now()+60000)return decryptToken(c.access_cipher,ownerId);
 if(!c.refresh_cipher)throw Error('GITHUB_RECONNECT_REQUIRED');
 const currentRefresh=decryptToken(c.refresh_cipher,ownerId);
 const data=await exchangeGithub({grant_type:'refresh_token',refresh_token:currentRefresh});
 await saveConnection(ownerId,data);
 return data.access_token;
}
export async function guardedManagedGet(server,principal,target){
 const {rows}=await q('SELECT provider FROM server_oauth_bindings WHERE server_id=$1',[server.id]);
 if(!rows.length)return safeGet(target);
 if(rows[0].provider!=='github')throw Error('UNKNOWN_OAUTH_PROVIDER');
 if(server.visibility!=='private'||principal?.id!==server.owner_id)throw Error('OAUTH_OWNER_AUTH_REQUIRED');
 const u=new URL(target);
 if(u.hostname!=='api.github.com'||u.protocol!=='https:')throw Error('OAUTH_PROVIDER_HOST_MISMATCH');
 const access=await githubAccessToken(server.owner_id);
 return safeGet(target,{authorization:'Bearer '+access});
}
export function oauthRouter({auth}){
 const router=express.Router();
 const status=(req,res)=>res.status(503).json({error:'GITHUB_OAUTH_NOT_CONFIGURED',
    required:['GITHUB_OAUTH_CLIENT_ID','GITHUB_OAUTH_CLIENT_SECRET','FOUNDRY_OAUTH_ENCRYPTION_KEY','PUBLIC_URL']});
 router.get('/api/oauth/github/status',auth,async(req,res)=>{
  const {rows}=await q("SELECT scopes,expires_at,updated_at FROM oauth_connections WHERE account_id=$1 AND provider='github'",[req.user.id]);
  const bindings=await q("SELECT s.id,s.slug,s.name FROM server_oauth_bindings b JOIN servers s ON s.id=b.server_id WHERE s.owner_id=$1 AND b.provider='github'",[req.user.id]);
  res.json({provider:'github',configured:getConfig().configured,connected:rows.length>0,scopes:rows[0]?.scopes||'',expires_at:rows[0]?.expires_at||null,
   servers:bindings.rows,note:'Only private, owner-authenticated GET tools to api.github.com may use a connected token.'});
 });
 router.post('/api/oauth/github/start',auth,async(req,res)=>{
  const cfg=getConfig();if(!cfg.configured)return status(req,res);
  const {verifier,challenge}=pkcePair(),state=b64(randomBytes(32));
  const callback=cfg.origin+'/api/oauth/github/callback';
  await q("INSERT INTO oauth_flows(state_hash,account_id,provider,verifier_cipher,expires_at) VALUES($1,$2,'github',$3,now()+interval '10 minutes')",
    [hash(state),req.user.id,encryptToken(verifier,req.user.id)]);
  const url=new URL(githubAuthUrl);
  for(const [k,v] of Object.entries({client_id:cfg.clientId,redirect_uri:callback,scope:'read:user',state,code_challenge:challenge,code_challenge_method:'S256',allow_signup:'false'}))url.searchParams.set(k,v);
  res.json({authorize_url:url.href,expires_in_seconds:600,provider:'github',permissions_requested:'read:user'});
 });
 router.get('/api/oauth/github/callback',auth,async(req,res)=>{
  const cfg=getConfig();if(!cfg.configured)return status(req,res);
  const state=String(req.query.state||''),code=String(req.query.code||'');
  if(!/^[a-zA-Z0-9_-]{32,100}$/.test(state)||!code||code.length>500)return res.redirect(303,'/oauth?error=invalid_response');
  const flow=await q("DELETE FROM oauth_flows WHERE state_hash=$1 AND account_id=$2 AND provider='github' AND expires_at>now() RETURNING verifier_cipher",[hash(state),req.user.id]);
  if(!flow.rowCount)return res.redirect(303,'/oauth?error=expired_or_replayed');
  try{
   const verifier=decryptToken(flow.rows[0].verifier_cipher,req.user.id);
   const tokens=await exchangeGithub({code,redirect_uri:cfg.origin+'/api/oauth/github/callback',code_verifier:verifier});
   await saveConnection(req.user.id,tokens);
   res.setHeader('Cache-Control','no-store');
   return res.redirect(303,'/oauth?connected=1');
  }catch(e){console.error('github_oauth_callback_failed',e?.code||'TOKEN_EXCHANGE_ERROR');return res.redirect(303,'/oauth?error=exchange_failed');}
 });
 router.delete('/api/oauth/github',auth,async(req,res)=>{
  const c=await pool.connect();try{
   await c.query('BEGIN');
   await c.query(`UPDATE servers SET status='draft',updated_at=now()
      WHERE owner_id=$1 AND id IN (SELECT server_id FROM server_oauth_bindings WHERE provider='github')`,[req.user.id]);
   await c.query("DELETE FROM server_oauth_bindings USING servers WHERE server_oauth_bindings.server_id=servers.id AND servers.owner_id=$1 AND server_oauth_bindings.provider='github'",[req.user.id]);
   const out=await c.query("DELETE FROM oauth_connections WHERE account_id=$1 AND provider='github'",[req.user.id]);
   await c.query('COMMIT');
   res.json({disconnected:out.rowCount>0,endpoints_returned_to_draft:true,remote_github_revocation_required:true});
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 });
 router.post('/api/servers/:id/github-oauth',auth,async(req,res)=>{
  const server=await ownedServer(req.params.id,req.user.id);if(!server)return res.status(404).json({error:'SERVER_NOT_FOUND'});
  const {rows}=await q("SELECT 1 FROM oauth_connections WHERE account_id=$1 AND provider='github'",[req.user.id]);
  if(!rows.length)return res.status(409).json({error:'CONNECT_GITHUB_FIRST'});
  const c=await pool.connect();try{
   await c.query('BEGIN');
   await c.query("UPDATE servers SET status='draft',visibility='private',updated_at=now() WHERE id=$1 AND owner_id=$2",[server.id,req.user.id]);
   await c.query("INSERT INTO server_oauth_bindings(server_id,provider) VALUES($1,'github') ON CONFLICT(server_id) DO NOTHING",[server.id]);
   await c.query('COMMIT');res.json({bound:true,server_id:server.id,status:'draft',visibility:'private',allowed_upstream_host:'api.github.com',requires_republish:true});
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 });
 router.delete('/api/servers/:id/github-oauth',auth,async(req,res)=>{
  const server=await ownedServer(req.params.id,req.user.id);if(!server)return res.status(404).json({error:'SERVER_NOT_FOUND'});
  const c=await pool.connect();try{
   await c.query('BEGIN');
   const out=await c.query("DELETE FROM server_oauth_bindings WHERE server_id=$1 AND provider='github'",[server.id]);
   await c.query("UPDATE servers SET status='draft',updated_at=now() WHERE id=$1",[server.id]);
   await c.query('COMMIT');res.json({unbound:out.rowCount>0,status:'draft',requires_republish:true});
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 });
 return router;
}
