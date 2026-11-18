import express from 'express';
import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {pool,q,ownedServer} from './db.mjs';
import {validatedTarget} from './security.mjs';

const secretPattern=/^[A-Za-z0-9~+/_=.-]{10,6000}$/;
export function upstreamEncryptionReady(){
 return /^[0-9a-f]{64}$/i.test(process.env.FOUNDRY_UPSTREAM_ENCRYPTION_KEY||'');
}
function key(){
 if(!upstreamEncryptionReady())throw Error('UPSTREAM_ENCRYPTION_NOT_CONFIGURED');
 return Buffer.from(process.env.FOUNDRY_UPSTREAM_ENCRYPTION_KEY,'hex');
}
export function allowedBearer(value){
 return typeof value==='string'&&secretPattern.test(value);
}
export function normalizedHost(value){
 if(typeof value!=='string'||value.length>250)throw Error('INVALID_UPSTREAM_HOST');
 const u=validatedTarget(value);
 if(u.pathname!=='/'||u.search||u.hash)throw Error('UPSTREAM_HOST_ORIGIN_ONLY');
 return u.hostname.toLowerCase();
}
const aad=(serverId,hostname)=>Buffer.from('foundry:upstream-bearer:'+serverId+':'+hostname);
export function encryptUpstreamKey(value,serverId,hostname){
 if(!allowedBearer(value))throw Error('INVALID_UPSTREAM_API_KEY');
 const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key(),iv);
 c.setAAD(aad(serverId,hostname));
 const body=Buffer.concat([c.update(value,'utf8'),c.final()]);
 return 'v1.'+[iv,c.getAuthTag(),body].map(v=>v.toString('base64url')).join('.');
}
export function decryptUpstreamKey(ciphertext,serverId,hostname){
 if(typeof ciphertext!=='string')throw Error('INVALID_UPSTREAM_CIPHERTEXT');
 const pieces=ciphertext.split('.');
 if(pieces.length!==4||pieces[0]!=='v1')throw Error('INVALID_UPSTREAM_CIPHERTEXT');
 const [iv,tag,body]=pieces.slice(1).map(x=>Buffer.from(x,'base64url'));
 if(iv.length!==12||tag.length!==16||body.length<10||body.length>6500)throw Error('INVALID_UPSTREAM_CIPHERTEXT');
 const c=createDecipheriv('aes-256-gcm',key(),iv);
 c.setAAD(aad(serverId,hostname));c.setAuthTag(tag);
 const raw=Buffer.concat([c.update(body),c.final()]).toString('utf8');
 if(!allowedBearer(raw))throw Error('INVALID_UPSTREAM_API_KEY');
 return raw;
}
export function upstreamKeyRouter({auth}){
 const router=express.Router();
 const fail=(res,status,error)=>res.status(status).json({error});
 router.get('/api/servers/:id/upstream-key',auth,async(req,res)=>{
  const server=await ownedServer(req.params.id,req.user.id);
  if(!server)return fail(res,404,'SERVER_NOT_FOUND');
  const result=await q('SELECT hostname,created_at,updated_at FROM server_upstream_keys WHERE server_id=$1',[server.id]);
  res.json({configured:result.rows.length>0,hostname:result.rows[0]?.hostname||null,
   encryption_ready:upstreamEncryptionReady(),requires_private_endpoint:true,
   note:'A customer-owned upstream key is encrypted at rest and is never returned to the browser.'});
 });
 router.post('/api/servers/:id/upstream-key',auth,async(req,res)=>{
  const server=await ownedServer(req.params.id,req.user.id);
  if(!server)return fail(res,404,'SERVER_NOT_FOUND');
  if(!upstreamEncryptionReady())return fail(res,503,'UPSTREAM_ENCRYPTION_NOT_CONFIGURED');
  let hostname,cipher;
  try{
   hostname=normalizedHost(req.body?.upstream_origin);
   cipher=encryptUpstreamKey(req.body?.api_key,server.id,hostname);
  }catch{return fail(res,400,'INVALID_UPSTREAM_KEY_OR_HOST');}
  const c=await pool.connect();
  try{
   await c.query('BEGIN');
   const locked=await c.query('SELECT id FROM servers WHERE id=$1 AND owner_id=$2 FOR UPDATE',[server.id,req.user.id]);
   if(!locked.rowCount){await c.query('ROLLBACK');return fail(res,404,'SERVER_NOT_FOUND');}
   const oauth=await c.query('SELECT 1 FROM server_oauth_bindings WHERE server_id=$1',[server.id]);
   if(oauth.rowCount){await c.query('ROLLBACK');return fail(res,409,'OAUTH_AND_BYOK_CONFLICT');}
   const tools=await c.query('SELECT url FROM tools WHERE server_id=$1',[server.id]);
   if(tools.rows.some(t=>new URL(t.url).hostname.toLowerCase()!==hostname)){
    await c.query('ROLLBACK');return fail(res,409,'ALL_TOOLS_MUST_USE_UPSTREAM_HOST');
   }
   await c.query(`INSERT INTO server_upstream_keys(server_id,hostname,token_cipher)
     VALUES($1,$2,$3)
     ON CONFLICT(server_id) DO UPDATE SET hostname=excluded.hostname,token_cipher=excluded.token_cipher,updated_at=now()`,
     [server.id,hostname,cipher]);
   // A credential change deliberately unpublishes: source authorization must be retested before a new live revision.
   await c.query("UPDATE servers SET status='draft',visibility='private',has_unpublished_changes=false,updated_at=now() WHERE id=$1",[server.id]);
   await c.query('COMMIT');
   return res.json({configured:true,hostname,visibility:'private',status:'draft',requires_republish:true,
    note:'Test one owned draft tool, then publish a private endpoint. The key is never returned.'});
  }catch(e){await c.query('ROLLBACK');return fail(res,500,'UPSTREAM_KEY_SAVE_FAILED');}finally{c.release();}
 });
 router.delete('/api/servers/:id/upstream-key',auth,async(req,res)=>{
  const server=await ownedServer(req.params.id,req.user.id);
  if(!server)return fail(res,404,'SERVER_NOT_FOUND');
  const c=await pool.connect();
  try{
   await c.query('BEGIN');
   await c.query('SELECT id FROM servers WHERE id=$1 FOR UPDATE',[server.id]);
   const removed=await c.query('DELETE FROM server_upstream_keys WHERE server_id=$1',[server.id]);
   if(removed.rowCount)await c.query("UPDATE servers SET status='draft',has_unpublished_changes=false,updated_at=now() WHERE id=$1",[server.id]);
   await c.query('COMMIT');
   res.json({revoked:removed.rowCount>0,status:removed.rowCount?'draft':server.status,requires_republish:!!removed.rowCount});
  }catch{await c.query('ROLLBACK');return fail(res,500,'UPSTREAM_KEY_REVOKE_FAILED');}finally{c.release();}
 });
 return router;
}
