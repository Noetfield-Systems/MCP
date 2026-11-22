import express from 'express';
import {createHash} from 'node:crypto';
import {q,pool,ownedServer} from './db.mjs';
import {validatedTarget} from './security.mjs';
import {resolveOpenapiInput,openapiPreview} from './openapi.mjs';
import {operationSignature} from './openapi-watch.mjs';

// Safe draft repair only: publisher-visible versions remain immutable until the
// owner has tested and explicitly republished the amended draft.
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const norm=value=>Array.isArray(value)?value:[];
export function draftFingerprint(tools){
 if(!Array.isArray(tools)||tools.length>100)throw Error('INVALID_DRAFT_TOOLS');
 return sha(tools.map(t=>({name:t.name,description:t.description,method:t.method,
  url:t.url,params:norm(t.params)})).sort((a,b)=>String(a.name).localeCompare(String(b.name))));
}
export function repairPlan(draft,sourceTools){
 if(!Array.isArray(draft)||!Array.isArray(sourceTools)||draft.length>100||sourceTools.length>100)
  throw Error('INVALID_REPAIR_INPUT');
 const remote=new Map(sourceTools.filter(t=>t?.method==='GET').map(t=>[t.name,t]));
 const proposed=[];
 for(const current of draft){
  const next=remote.get(current.name);
  if(!next||current.method!=='GET')continue;
  const diff={
   endpoint_changed:current.url!==next.url,
   description_changed:current.description!==next.description,
   parameter_schema_changed:JSON.stringify(norm(current.params))!==JSON.stringify(norm(next.params))
  };
  if(Object.values(diff).some(Boolean))
   proposed.push({tool_name:current.name,changes:diff,action:'update_owned_draft_get_tool'});
 }
 return {draft_sha256:draftFingerprint(draft),candidates:proposed,
  excluded_existing_tools:draft.length-[...draft].filter(t=>remote.has(t.name)).length,
  note:'A repair proposal does not execute a tool, alter a published snapshot, prove compatibility or accept a new API contract.'};
}
function validSelection(value){
 return Array.isArray(value)&&value.length>=1&&value.length<=5&&
  value.every(x=>typeof x==='string'&&/^[a-z][a-z0-9_]{1,59}$/.test(x))&&
  new Set(value).size===value.length;
}
async function fetchSource(spec,base){
 // The baseline URL was pinned from an unauthenticated, validated public HTTPS
 // URL. Validate again before each network operation.
 validatedTarget(spec);validatedTarget(base);
 const {document}=await resolveOpenapiInput({spec_url:spec});
 return openapiPreview(document,base);
}
async function watchFor(ownerId,serverId){
 const r=await q('SELECT spec_url,base_url FROM openapi_spec_baselines WHERE owner_id=$1 AND server_id=$2',[ownerId,serverId]);
 return r.rows[0]||null;
}
const safeError=error=>{
 const code=String(error?.message||'');
 return /^(INVALID_|PUBLIC_|OPENAPI_|HTTPS_|NO_GET_|UNSUPPORTED_)/.test(code)?code.slice(0,90):'REPAIR_SOURCE_UNAVAILABLE';
};
export function safeRepairRouter(auth){
 const router=express.Router();
 router.post('/api/lab/servers/:id/repair-preview',auth,async(req,res)=>{
  const owned=await ownedServer(req.params.id,req.user.id);
  if(!owned)return res.status(404).json({error:'SERVER_NOT_FOUND'});
  const watch=await watchFor(req.user.id,owned.id);
  if(!watch)return res.status(404).json({error:'PIN_OPENAPI_BASELINE_FIRST'});
  let current;
  try{current=await fetchSource(watch.spec_url,watch.base_url);}
  catch(error){return res.status(502).json({error:safeError(error)});}
  const {rows}=await q('SELECT name,description,method,url,params FROM tools WHERE server_id=$1 ORDER BY name',[owned.id]);
  const plan=repairPlan(rows,current.tools);
  res.setHeader('Cache-Control','no-store');
  return res.json({...plan,source_sha256:operationSignature(current).hash,
   published_revision_unchanged:owned.published_revision,
   tool_count:rows.length,required_steps_after_apply:['run_source_test_lab','inspect_response_contract','explicit_publish'],
   status:'preview_only'});
 });
 router.post('/api/lab/servers/:id/repair-draft',auth,async(req,res)=>{
  const owned=await ownedServer(req.params.id,req.user.id);
  if(!owned)return res.status(404).json({error:'SERVER_NOT_FOUND'});
  const selected=req.body?.selected_tool_names,
    expectedSource=req.body?.expected_source_sha256,expectedDraft=req.body?.expected_draft_sha256;
  if(!validSelection(selected)||![expectedSource,expectedDraft].every(x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)))
   return res.status(400).json({error:'EXPLICIT_TOOL_SELECTION_AND_PREVIEW_HASHES_REQUIRED'});
  const watch=await watchFor(req.user.id,owned.id);
  if(!watch)return res.status(404).json({error:'PIN_OPENAPI_BASELINE_FIRST'});
  let current;
  try{current=await fetchSource(watch.spec_url,watch.base_url);}
  catch(error){return res.status(502).json({error:safeError(error)});}
  if(operationSignature(current).hash!==expectedSource)
   return res.status(409).json({error:'OPENAPI_SOURCE_CHANGED_SINCE_PREVIEW'});
  const proposedByName=new Map(current.tools.filter(t=>t.method==='GET').map(t=>[t.name,t]));
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const own=await client.query('SELECT id,published_revision FROM servers WHERE id=$1 AND owner_id=$2 FOR UPDATE',[owned.id,req.user.id]);
   if(!own.rows.length){await client.query('ROLLBACK');return res.status(404).json({error:'SERVER_NOT_FOUND'});}
   const rows=(await client.query('SELECT name,description,method,url,params FROM tools WHERE server_id=$1 ORDER BY name FOR UPDATE',[owned.id])).rows;
   const plan=repairPlan(rows,current.tools);
   if(plan.draft_sha256!==expectedDraft){
    await client.query('ROLLBACK');return res.status(409).json({error:'OWNED_DRAFT_CHANGED_SINCE_PREVIEW'});
   }
   const eligible=new Set(plan.candidates.map(x=>x.tool_name));
   if(selected.some(name=>!eligible.has(name)||!proposedByName.has(name))){
    await client.query('ROLLBACK');return res.status(409).json({error:'SELECTED_REPAIR_NO_LONGER_APPLIES'});
   }
   for(const name of selected){
    const t=proposedByName.get(name);
    validatedTarget(t.url);
    if(t.method!=='GET'||!Array.isArray(t.params)||t.params.length>18)
      throw Error('UNSAFE_REPAIR_OPERATION');
    await client.query("UPDATE tools SET description=$1,url=$2,params=$3::jsonb WHERE server_id=$4 AND name=$5 AND method='GET'",
      [t.description,t.url,JSON.stringify(t.params),owned.id,name]);
   }
   await client.query("UPDATE servers SET has_unpublished_changes=(status='published'),updated_at=now() WHERE id=$1",[owned.id]);
   await client.query('COMMIT');
   res.setHeader('Cache-Control','no-store');
   return res.json({status:'owner_approved_draft_updated',
    updated_tool_names:selected,updated_count:selected.length,
    active_published_revision_unchanged:own.rows[0].published_revision,
    needs_source_retest:true,needs_explicit_publish:true,
    note:'Only draft tools were updated. No hosted customer endpoint, external provider account or live MCP published snapshot changed.'});
  }catch(error){
   await client.query('ROLLBACK').catch(()=>{});
   return res.status(409).json({error:safeError(error)});
  }finally{client.release();}
 });
 return router;
}
