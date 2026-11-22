import {createHash} from 'node:crypto';
import {classifyToolError} from './diagnostics.mjs';

const clean=(value,max=240)=>typeof value==='string'?value.slice(0,max):'';
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const numeric=v=>Number.isFinite(Number(v))?Math.max(0,Math.trunc(Number(v))):0;
export function sanitizeSamples(samples){
 if(samples==null)return {};
 if(!samples||typeof samples!=='object'||Array.isArray(samples))throw Error('SAMPLES_OBJECT_REQUIRED');
 if(Object.keys(samples).length>8)throw Error('TOO_MANY_SAMPLE_SETS');
 const out={};
 for(const [name,args] of Object.entries(samples)){
  if(!/^[a-z][a-z0-9_]{1,59}$/.test(name))throw Error('INVALID_TEST_TOOL_NAME');
  if(!args||typeof args!=='object'||Array.isArray(args))throw Error('INVALID_SAMPLE_ARGUMENTS');
  const entries=Object.entries(args);
  if(entries.length>18)throw Error('TOO_MANY_SAMPLE_ARGUMENTS');
  out[name]={};
  for(const [key,val] of entries){
   if(!/^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$/.test(key))throw Error('INVALID_SAMPLE_PARAMETER');
   if(/token|password|secret|api[-_]?key|authorization/i.test(key))throw Error('SECRETS_NOT_ALLOWED_IN_TEST_SAMPLES');
   if(!['string','number','boolean'].includes(typeof val)||typeof val==='string'&&val.length>300||
      typeof val==='number'&&!Number.isFinite(val))throw Error('INVALID_SAMPLE_VALUE');
   out[name][key]=val;
  }
 }
 return out;
}
// A live, user-triggered GET test. The callback supplies actual upstream I/O.
// The receipt never stores input arguments, request URLs, tokens, or response bodies.
export async function runReadOnlySuite(tools,samples,invoke){
 if(!Array.isArray(tools)||tools.length<1||tools.length>8)throw Error('TEST_SUITE_REQUIRES_1_TO_8_TOOLS');
 if(typeof invoke!=='function')throw Error('TEST_EXECUTOR_REQUIRED');
 const input=sanitizeSamples(samples);
 const receipts=[];
 for(const tool of tools){
  if(tool.method!=='GET')throw Error('READ_ONLY_TESTS_ONLY');
  const started=Date.now();
  try{
   const response=await invoke(tool,input[tool.name]||{});
   receipts.push({tool_name:clean(tool.name,60),passed:true,duration_ms:Math.max(0,Date.now()-started),
     response_sha256:typeof response?.body==='string'?digest(response.body):null,error_code:null});
  }catch(error){
   receipts.push({tool_name:clean(tool.name,60),passed:false,duration_ms:Math.max(0,Date.now()-started),
     response_sha256:null,error_code:classifyToolError(error)});
  }
 }
 const passed=receipts.filter(r=>r.passed).length;
 return {kind:'live_upstream_test',total:receipts.length,passed,failed:receipts.length-passed,
   status:passed===receipts.length?'pass':'fail',results:receipts,
   disclaimer:'Upstream GET tests only. Not proof of external MCP host installation or customer adoption.'};
}
// Canonical, intentionally credential-free OpenAPI shape: provider URLs may
// contain access tokens in query strings, so never store their query values.
export function sourceSignature(preview){
 if(!Array.isArray(preview?.tools)||preview.tools.length>100)throw Error('INVALID_SOURCE_PREVIEW');
 const operations=preview.tools.map(tool=>{
  const url=new URL(tool.url);
  if(url.protocol!=='https:')throw Error('HTTPS_SOURCE_REQUIRED');
  const params=(Array.isArray(tool.params)?tool.params:[]).map(p=>({
   name:clean(p.name,64),in:clean(p.in,16),type:clean(p.type,32),required:p.required===true
  })).sort((a,b)=>a.name.localeCompare(b.name));
  return {name:clean(tool.name,60),operation:'GET',route:url.pathname,params};
 }).sort((a,b)=>a.name.localeCompare(b.name));
 return {fingerprint:digest(operations),operations,count:operations.length};
}
export function contractDifference(baseline,current){
 const prior=baseline?.operations,now=current?.operations;
 if(!Array.isArray(prior)||!Array.isArray(now))throw Error('SOURCE_SIGNATURE_REQUIRED');
 const before=new Map(prior.map(x=>[x.name,JSON.stringify(x)]));
 const after=new Map(now.map(x=>[x.name,JSON.stringify(x)]));
 return {changed:baseline.fingerprint!==current.fingerprint,
   added:[...after.keys()].filter(x=>!before.has(x)),
   removed:[...before.keys()].filter(x=>!after.has(x)),
   modified:[...after.keys()].filter(x=>before.has(x)&&before.get(x)!==after.get(x)),
   baseline_fingerprint:baseline.fingerprint,current_fingerprint:current.fingerprint};
}
// A transparent deterministic prioritizer, not an AI assessment.
export function curateSourceTools(preview,max=5){
 if(!Array.isArray(preview?.tools)||!Number.isInteger(max)||max<1||max>10)throw Error('INVALID_CURATION_INPUT');
 const scored=preview.tools.map(t=>{
  const name=String(t.name||'').toLowerCase(),desc=String(t.description||'').toLowerCase();
  const required=(t.params||[]).filter(x=>x.required===true).length;
  const keywords=['search','find','list','get','read','retrieve','lookup','status','details'];
  const matches=keywords.filter(w=>name.includes(w)||desc.includes(w));
  const points=20+Math.min(20,matches.length*7)-Math.min(12,required*3)-
    (/delete|update|write|purchase|charge/i.test(name)?18:0);
  return {name:clean(t.name,60),description:clean(t.description,280),
    required_parameters:required,score:Math.max(0,points),
    reasons:[matches.length?'Common read/discovery use case':'Specialized read operation',
      required?'Requires '+required+' input parameter(s)':'No required parameters'],
    method:'GET'};
 }).sort((a,b)=>b.score-a.score||a.required_parameters-b.required_parameters||a.name.localeCompare(b.name));
 return {kind:'deterministic_tool_curation',method:'bounded_heuristic_not_llm',
   recommended:scored.slice(0,max),other_count:Math.max(0,scored.length-max),
   caveat:'Scores prioritize initial usability and must not be represented as customer demand or functional API verification.'};
}
