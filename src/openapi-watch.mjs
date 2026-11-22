import express from 'express';
import {createHash} from 'node:crypto';
import {q,ownedServer} from './db.mjs';
import {validatedTarget} from './security.mjs';
import {resolveOpenapiInput,openapiPreview} from './openapi.mjs';
import {curateTools} from './verification-lab.mjs';

const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function publicSourceURL(raw){
 if(typeof raw!=='string'||!raw.trim()||raw.length>1200)throw Error('PUBLIC_HTTPS_URL_REQUIRED');
 let url;try{url=new URL(raw);}catch{throw Error('PUBLIC_HTTPS_URL_REQUIRED');}
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)
   throw Error('PUBLIC_URL_MUST_NOT_CONTAIN_CREDENTIALS');
 validatedTarget(url.href);return url.href;
}
export function operationSignature(preview){
 if(!Array.isArray(preview?.tools)||preview.tools.length>100)throw Error('INVALID_OPENAPI_PREVIEW');
 const operations=preview.tools.map(tool=>{
  const url=new URL(tool.url);
  return {name:String(tool.name).slice(0,60),method:'GET',path:url.pathname,
   params:(Array.isArray(tool.params)?tool.params:[]).map(p=>({
    name:String(p.name).slice(0,64),in:p.in,type:p.type,required:p.required===true
   })).sort((a,b)=>a.name.localeCompare(b.name))};
 }).sort((a,b)=>a.name.localeCompare(b.name));
 return {hash:hash(operations),operations,total:operations.length};
}
export function sourceDiff(baseline,current){
 if(!Array.isArray(baseline?.operations)||!Array.isArray(current?.operations))throw Error('SOURCE_SIGNATURE_REQUIRED');
 const prev=new Map(baseline.operations.map(x=>[x.name,JSON.stringify(x)]));
 const next=new Map(current.operations.map(x=>[x.name,JSON.stringify(x)]));
 return {drift:baseline.hash!==current.hash,
  added:[...next.keys()].filter(x=>!prev.has(x)),
  removed:[...prev.keys()].filter(x=>!next.has(x)),
  modified:[...next.keys()].filter(x=>prev.has(x)&&prev.get(x)!==next.get(x)),
  baseline_sha256:baseline.hash,checked_sha256:current.hash};
}
async function readSource(specUrl,baseUrl){
 const {document}=await resolveOpenapiInput({spec_url:specUrl});
 return openapiPreview(document,baseUrl);
}
const safeError=e=>{
 const code=String(e?.message||'');
 return /^(PUBLIC_|INVALID_|OPENAPI_|HTTPS_|NO_GET_|UNSUPPORTED_)/.test(code)?code.slice(0,80):'OPENAPI_SOURCE_UNAVAILABLE';
};
export function openapiWatchRouter(auth){
 const router=express.Router();
 const owned=async(req,res)=>{
  const server=await ownedServer(req.params.id,req.user.id);
  if(!server){res.status(404).json({error:'SERVER_NOT_FOUND'});return null;}
  return server;
 };
 router.get('/api/lab/servers/:id/openapi-watch',auth,async(req,res)=>{
  const server=await owned(req,res);if(!server)return;
  const {rows}=await q('SELECT spec_url,base_url,baseline_signature,last_sha256,checked_at,drift_observations FROM openapi_spec_baselines WHERE server_id=$1 AND owner_id=$2',[server.id,req.user.id]);
  const x=rows[0];
  res.setHeader('Cache-Control','no-store');
  return res.json({watch:x?{spec_url:x.spec_url,base_url:x.base_url,
   baseline_sha256:x.baseline_signature.hash,last_sha256:x.last_sha256,
   checked_at:x.checked_at,drift_observations:x.drift_observations}:null,
   mode:'manual_source_recheck',note:'This does not schedule background fetches or imply API uptime.'});
 });
 router.post('/api/lab/servers/:id/openapi-watch',auth,async(req,res)=>{
  const server=await owned(req,res);if(!server)return;
  let specUrl,baseUrl,signature;
  try{
   specUrl=publicSourceURL(req.body?.spec_url);
   baseUrl=publicSourceURL(req.body?.base_url);
   signature=operationSignature(await readSource(specUrl,baseUrl));
  }catch(e){return res.status(400).json({error:safeError(e)});}
  await q("INSERT INTO openapi_spec_baselines(server_id,owner_id,spec_url,base_url,baseline_signature,last_sha256,checked_at,drift_observations) VALUES($1,$2,$3,$4,$5::jsonb,$6,now(),0) ON CONFLICT(server_id) DO UPDATE SET spec_url=excluded.spec_url,base_url=excluded.base_url,baseline_signature=excluded.baseline_signature,last_sha256=excluded.last_sha256,checked_at=now(),drift_observations=0",
   [server.id,req.user.id,specUrl,baseUrl,JSON.stringify(signature),signature.hash]);
  return res.status(201).json({status:'pinned',total_supported:signature.total,baseline_sha256:signature.hash,
   statement:'A real public OpenAPI spec was fetched. A pinned contract does not equal a working MCP client integration.'});
 });
 router.post('/api/lab/servers/:id/openapi-watch/check',auth,async(req,res)=>{
  const server=await owned(req,res);if(!server)return;
  const {rows}=await q('SELECT spec_url,base_url,baseline_signature FROM openapi_spec_baselines WHERE server_id=$1 AND owner_id=$2',[server.id,req.user.id]);
  const watch=rows[0];if(!watch)return res.status(404).json({error:'OPENAPI_BASELINE_NOT_FOUND'});
  let current;try{current=operationSignature(await readSource(watch.spec_url,watch.base_url));}
  catch(e){return res.status(502).json({error:safeError(e)});}
  const diff=sourceDiff(watch.baseline_signature,current);
  await q('UPDATE openapi_spec_baselines SET last_sha256=$1,checked_at=now(),drift_observations=drift_observations+$2 WHERE server_id=$3 AND owner_id=$4',
    [current.hash,diff.drift?1:0,server.id,req.user.id]);
  return res.json({status:diff.drift?'drift_detected':'matches_pinned_baseline',...diff,
    note:'Contract shape only; no automatic draft, publish, repair or notification.'});
 });
 router.post('/api/lab/servers/:id/curate-openapi',auth,async(req,res)=>{
  const server=await owned(req,res);if(!server)return;
  let preview;try{
   preview=await readSource(publicSourceURL(req.body?.spec_url),publicSourceURL(req.body?.base_url));
  }catch(e){return res.status(400).json({error:safeError(e)});}
  const proposals=preview.tools.slice(0,30);
  return res.json({suggestions:curateTools(proposals),
   supported_get_operations:preview.tools.length,considered:proposals.length,
   method:'deterministic_heuristics',note:'Recommendations are not imported, tested or published. Use selected-tool import to act.'});
 });
 return router;
}
