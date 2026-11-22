import express from 'express';
import {randomUUID} from 'node:crypto';
import {q,ownedServer} from './db.mjs';
import {toolUrl,validatedTarget} from './security.mjs';
import {guardedManagedGet} from './oauth.mjs';
import {recordActivation} from './activation.mjs';
import {resolveOpenapiInput,openapiPreview} from './openapi.mjs';
import {runReadOnlySuite,sourceSignature,contractDifference,curateSourceTools} from './source-lab.mjs';

const bad=(res,code,error)=>res.status(code).json({error});
function publicUrl(value,kind){
 if(typeof value!=='string'||!value||value.length>1200)throw Error('PUBLIC_'+kind+'_URL_REQUIRED');
 let url;try{url=new URL(value);}catch{throw Error('INVALID_PUBLIC_URL');}
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)
   throw Error('PUBLIC_URL_WITHOUT_CREDENTIALS_REQUIRED');
 validatedTarget(url.href);return url.href;
}
async function liveSignature(specUrl,baseUrl){
 const {document}=await resolveOpenapiInput({spec_url:specUrl});
 return sourceSignature(openapiPreview(document,baseUrl));
}
const errorCode=error=>{
 const value=String(error?.message||'');
 return /^(PUBLIC_|INVALID_|OPENAPI_|HTTPS_|NO_GET_|UNSUPPORTED_)/.test(value)?
  value.slice(0,90):'PUBLIC_OPENAPI_SOURCE_UNAVAILABLE';
};
export function operationsRouter(auth){
 const router=express.Router();
 router.post('/api/servers/:id/test-suite',auth,async(req,res)=>{
  const owned=await ownedServer(req.params.id,req.user.id);
  if(!owned)return bad(res,404,'SERVER_NOT_FOUND');
  const {rows}=await q('SELECT id,server_id,name,method,url,params FROM tools WHERE server_id=$1 ORDER BY name',[owned.id]);
  const names=req.body?.tool_names;
  if(names!==undefined&&(!Array.isArray(names)||!names.length||names.length>8||
    names.some(x=>typeof x!=='string')||new Set(names).size!==names.length))
     return bad(res,400,'INVALID_TEST_TOOL_SELECTION');
  const tools=names?rows.filter(t=>names.includes(t.name)):rows;
  if(!tools.length||tools.length>8||names&&tools.length!==names.length)
    return bad(res,400,'SELECT_1_TO_8_OWNED_TOOLS');
  let receipt;
  try{
   receipt=await runReadOnlySuite(tools,req.body?.samples||{},async(tool,args)=>{
     return guardedManagedGet(owned,req.user,toolUrl(tool,args));
   });
  }catch(error){return bad(res,400,String(error.message||'INVALID_TEST_SUITE').slice(0,100));}
  const runId=randomUUID();
  await q("INSERT INTO integration_test_runs(id,server_id,account_id,published_revision,draft_changed,tool_count,passed_count,status,results) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)",
   [runId,owned.id,req.user.id,owned.published_revision||null,owned.has_unpublished_changes===true,
    receipt.total,receipt.passed,receipt.status,JSON.stringify(receipt.results)]);
  if(receipt.passed>0)await recordActivation('tool_test_succeeded',req.user.id,owned.id);
  return res.json({run_id:runId,server_slug:owned.slug,published_revision:owned.published_revision||null,
    draft_changed:owned.has_unpublished_changes===true,...receipt});
 });
 router.get('/api/servers/:id/test-runs',auth,async(req,res)=>{
  const owned=await ownedServer(req.params.id,req.user.id);
  if(!owned)return bad(res,404,'SERVER_NOT_FOUND');
  const {rows}=await q('SELECT id,published_revision,draft_changed,tool_count,passed_count,status,results,created_at FROM integration_test_runs WHERE server_id=$1 AND account_id=$2 ORDER BY created_at DESC LIMIT 20',[owned.id,req.user.id]);
  return res.json({runs:rows,disclaimer:'Real upstream GET receipts, not client installations. No arguments, URLs, raw responses or secrets are stored.'});
 });
 router.post('/api/servers/:id/contract-watch',auth,async(req,res)=>{
  const owned=await ownedServer(req.params.id,req.user.id);
  if(!owned)return bad(res,404,'SERVER_NOT_FOUND');
  let specUrl,baseUrl,signature;
  try{
   specUrl=publicUrl(req.body?.spec_url,'SPEC');
   baseUrl=publicUrl(req.body?.base_url,'BASE');
   signature=await liveSignature(specUrl,baseUrl);
  }catch(error){return bad(res,400,errorCode(error));}
  await q("INSERT INTO source_contract_watches(server_id,owner_id,spec_url,base_url,baseline_signature,last_fingerprint,checked_at,changes_seen) VALUES($1,$2,$3,$4,$5::jsonb,$6,now(),0) ON CONFLICT(server_id) DO UPDATE SET spec_url=excluded.spec_url,base_url=excluded.base_url,baseline_signature=excluded.baseline_signature,last_fingerprint=excluded.last_fingerprint,checked_at=now(),changes_seen=0",
   [owned.id,req.user.id,specUrl,baseUrl,JSON.stringify(signature),signature.fingerprint]);
  return res.status(201).json({status:'baseline_pinned',server_slug:owned.slug,
   baseline_fingerprint:signature.fingerprint,supported_get_operations:signature.count,
   note:'Verified source fetch; manual checks only, not a scheduled monitor.'});
 });
 router.get('/api/servers/:id/contract-watch',auth,async(req,res)=>{
  const owned=await ownedServer(req.params.id,req.user.id);
  if(!owned)return bad(res,404,'SERVER_NOT_FOUND');
  const {rows}=await q('SELECT spec_url,base_url,baseline_signature,last_fingerprint,checked_at,changes_seen FROM source_contract_watches WHERE server_id=$1 AND owner_id=$2',[owned.id,req.user.id]);
  const row=rows[0];
  return res.json({watch:row?{spec_url:row.spec_url,base_url:row.base_url,
   baseline_fingerprint:row.baseline_signature?.fingerprint||null,last_fingerprint:row.last_fingerprint,
   checked_at:row.checked_at,changes_seen:row.changes_seen}:null,
   schedule:'manual_only',note:'The next upstream request occurs only when Check is explicitly invoked.'});
 });
 router.post('/api/servers/:id/contract-watch/check',auth,async(req,res)=>{
  const owned=await ownedServer(req.params.id,req.user.id);
  if(!owned)return bad(res,404,'SERVER_NOT_FOUND');
  const {rows}=await q('SELECT spec_url,base_url,baseline_signature FROM source_contract_watches WHERE server_id=$1 AND owner_id=$2',[owned.id,req.user.id]);
  const saved=rows[0];if(!saved)return bad(res,404,'CONTRACT_BASELINE_NOT_FOUND');
  let current;
  try{current=await liveSignature(saved.spec_url,saved.base_url);}
  catch(error){return bad(res,502,errorCode(error));}
  const delta=contractDifference(saved.baseline_signature,current);
  await q('UPDATE source_contract_watches SET last_fingerprint=$1,checked_at=now(),changes_seen=changes_seen+$2 WHERE server_id=$3 AND owner_id=$4',
   [current.fingerprint,delta.changed?1:0,owned.id,req.user.id]);
  return res.json({checked:true,status:delta.changed?'drift_detected':'unchanged',...delta,
   checked_at:new Date().toISOString(),note:'Pinned baseline comparison; no automatic repair, publishing or provider guarantee.'});
 });
 router.post('/api/servers/:id/curate-openapi',auth,async(req,res)=>{
  const owned=await ownedServer(req.params.id,req.user.id);
  if(!owned)return bad(res,404,'SERVER_NOT_FOUND');
  let preview;
  try{
   const spec=publicUrl(req.body?.spec_url,'SPEC'),base=publicUrl(req.body?.base_url,'BASE');
   const {document}=await resolveOpenapiInput({spec_url:spec});
   preview=openapiPreview(document,base);
  }catch(error){return bad(res,400,errorCode(error));}
  let suggestion;
  try{suggestion=curateSourceTools(preview,Number(req.body?.max)||5);}
  catch(error){return bad(res,400,String(error.message||'INVALID_CURATION').slice(0,90));}
  return res.json({...suggestion,total_supported:preview.tools.length,
    note:'This is a deterministic shortlist only; the existing import flow requires explicit tool selection.'});
 });
 return router;
}
