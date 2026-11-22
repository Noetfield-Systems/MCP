import express from 'express';
import {randomUUID,createHash} from 'node:crypto';
import {q,ownedServer} from './db.mjs';
import {toolUrl} from './security.mjs';
import {guardedManagedGet} from './oauth.mjs';
import {classifyToolError} from './diagnostics.mjs';

// Foundry's owner-initiated checks are evidence of a specific upstream GET,
// not independent MCP host compatibility or third-party certification.
const slugPattern=/^[a-z][a-z0-9-]{2,48}$/;
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const okName=value=>typeof value==='string'&&/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/.test(value);
const limited=(value,n=120)=>typeof value==='string'?value.slice(0,n):'';
export const isPublicSlug=value=>typeof value==='string'&&slugPattern.test(value);

export function reviewShape(body){
  let value;try{value=JSON.parse(body);}catch{return {kind:'non_json',keys:[]};}
  const walk=(node,depth)=>{
    if(node===null)return {kind:'null'};
    if(Array.isArray(node))return {kind:'array',item:depth<2&&node.length?walk(node[0],depth+1):null};
    if(typeof node!=='object')return {kind:typeof node};
    const keys=Object.keys(node).filter(okName).sort().slice(0,45);
    return {kind:'object',keys,children:depth<2?Object.fromEntries(keys.slice(0,20).map(k=>[k,walk(node[k],depth+1)])):null};
  };
  return walk(value,0);
}

export function curateTools(proposals){
  if(!Array.isArray(proposals)||proposals.length>30)throw Error('INVALID_CURATION_INPUT');
  const scored=proposals.filter(x=>x&&okName(x.name)).map((x,index)=>{
    const desc=limited(x.description,280).toLowerCase(),name=x.name.toLowerCase();
    let score=20,why=[];
    if(/^(get|list|search|find|lookup|fetch)_/.test(name)){score+=20;why.push('Clear read-only discovery task');}
    if(/order|product|customer|review|inventory|pricing|transaction|quote|status|search/.test(name+' '+desc)){
      score+=25;why.push('Direct business decision or user task');
    }
    const required=Array.isArray(x.params)?x.params.filter(p=>p?.required).length:0;
    score-=Math.min(30,required*8);
    if(required===0){score+=12;why.push('Low-friction first call');}
    if(desc.length>=22){score+=8;why.push('Documented purpose');}
    if(/delete|write|create|update|purchase|refund|transfer|execute/.test(name)){score-=50;why.push('Write-like naming; requires manual review');}
    return {name:x.name,score:Math.max(0,Math.min(100,score)),reasons:why,
      manual_review:/delete|write|create|update|purchase|refund|transfer|execute/.test(name),index};
  });
  return scored.sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,5).map(({index,...item})=>item);
}

export function makePassport(server){
  if(server?.status!=='published'||server?.visibility!=='public'||!isPublicSlug(server.slug)||
      !server.published_snapshot||!Array.isArray(server.published_snapshot.tools))throw Error('PASSPORT_NOT_PUBLIC');
  const tools=server.published_snapshot.tools.filter(x=>x&&okName(x.name)).map(t=>({
    name:t.name,description:limited(t.description,280),method:'GET',
    input_parameters:Array.isArray(t.params)?t.params.slice(0,18).filter(p=>okName(p.name))
      .map(p=>({name:p.name,required:p.required===true,type:['string','number','boolean','integer'].includes(p.type)?p.type:'string'})):[]
  }));
  return {name:limited(server.name,120),description:limited(server.description,400),slug:server.slug,
    published_revision:server.published_revision??null,published_at_or_updated_at:server.updated_at,
    access:'public',protocol:'MCP Streamable HTTP',published_tools:tools,
    mcp_endpoint:'/mcp/'+server.slug,
    install_url:'/connect?server='+encodeURIComponent(server.slug),
    passport_url:'/passport?server='+encodeURIComponent(server.slug),
    evidence:{publication:'recorded_in_foundry_database',external_host_execution:'not_certified_by_passport',
      independent_provider_approval:'not_claimed'},
    caveat:'Published tool definitions are not proof of a successful third-party host installation or customer adoption.'};
}

const remedyMap={
  QUOTA_EXCEEDED:'Review execution limits and legitimate client usage; avoid unbounded retry loops.',
  AUTHORIZATION_REQUIRED:'Reauthorize the upstream connection and verify that this server remains private where required.',
  UPSTREAM_RATE_LIMIT:'Reduce call frequency or review the upstream provider rate limit.',
  UPSTREAM_SERVER_ERROR:'Inspect upstream provider health and retry a single bounded request.',
  UPSTREAM_NOT_FOUND:'Confirm the product or resource identifier and API route.',
  UPSTREAM_ACCESS_DENIED:'Check the upstream permissions; never paste a token into a diagnostic report.',
  UPSTREAM_NETWORK_ERROR:'Validate DNS and HTTPS availability at the upstream provider.',
  UPSTREAM_TIMEOUT:'Reduce payload and check upstream response time; request only essential fields.',
  RESPONSE_TOO_LARGE:'Use pagination or return a smaller upstream response below the response-size limit.',
  INVALID_TOOL_ARGUMENTS:'Review required path/query parameters and the published tool schema.',
  UPSTREAM_POLICY_BLOCK:'Use an approved public HTTPS host and do not rely on redirects or private IPs.',
  TOOL_EXECUTION_ERROR:'Reproduce the failure with a bounded read-only test and inspect the upstream contract.'
};
export function doctorReport(server,{errors=[],checks=[]}={}){
  const published=server.status==='published'&&Boolean(server.published_snapshot);
  const tools=published&&Array.isArray(server.published_snapshot.tools)?server.published_snapshot.tools.length:0;
  const problems=[];
  if(!published)problems.push({code:'NOT_PUBLISHED',remedy:'Test and publish a server revision from Studio.'});
  if(published&&!tools)problems.push({code:'NO_PUBLISHED_TOOLS',remedy:'Publish a revision with at least one supported GET tool.'});
  if(server.has_unpublished_changes)problems.push({code:'DRAFT_DIFFERS_FROM_LIVE',remedy:'Live clients still use the last published revision; review and explicitly publish your changes.'});
  for(const e of errors.slice(0,5))if(e.error_code&&Number(e.calls)>0)
    problems.push({code:e.error_code,observed_calls:Number(e.calls),remedy:remedyMap[e.error_code]||remedyMap.TOOL_EXECUTION_ERROR});
  if(checks.some(c=>c.drift===true))problems.push({code:'CONTRACT_DRIFT_DETECTED',remedy:'Review the latest owner-initiated response schema and accept a new baseline only after verifying the change.'});
  return {scope:'foundry_published_config_and_observed_owner_events',runtime_mcp_probe:'not_performed_by_this_report',
    independent_certification:false,configuration_ready:published&&tools>0,
    issues:problems,latest_owner_check:checks[0]?{outcome:checks[0].outcome,at:checks[0].created_at}:null};
}

export function launchSuiteRouter({auth}){
  const router=express.Router();
  const error=(res,status,code)=>res.status(status).json({error:code});
  const owned=async(req,res)=>{
    const server=await ownedServer(req.params.id,req.user.id);
    if(!server){error(res,404,'SERVER_NOT_FOUND');return null;}
    return server;
  };
  router.get('/api/passports/:slug',async(req,res)=>{
    if(!isPublicSlug(req.params.slug))return error(res,404,'PASSPORT_NOT_FOUND');
    const {rows}=await q("SELECT slug,name,description,status,visibility,published_snapshot,published_revision,updated_at,has_unpublished_changes FROM servers WHERE slug=$1 AND visibility='public' AND status='published' AND published_snapshot IS NOT NULL",[req.params.slug]);
    if(!rows.length)return error(res,404,'PASSPORT_NOT_FOUND');
    res.setHeader('Cache-Control','public,max-age=60');
    return res.json({passport:makePassport(rows[0])});
  });
  router.get('/api/doctor/:slug',async(req,res)=>{
    if(!isPublicSlug(req.params.slug))return error(res,404,'SERVER_NOT_FOUND');
    const {rows}=await q("SELECT slug,name,status,visibility,published_snapshot,has_unpublished_changes FROM servers WHERE slug=$1 AND status='published' AND visibility='public' AND published_snapshot IS NOT NULL",[req.params.slug]);
    if(!rows.length)return error(res,404,'SERVER_NOT_FOUND');
    res.setHeader('Cache-Control','no-store');
    return res.json({slug:req.params.slug,report:doctorReport(rows[0]),note:'Public configuration inspection only; no external MCP handshake was attempted.'});
  });
  router.post('/api/launch/curate',auth,(req,res)=>{
    try{return res.json({suggestions:curateTools(req.body?.tools),method:'deterministic_heuristics',
      note:'Recommendations are not imported, tested or published. Review supported GET tools in Studio before acting.'});}
    catch{return error(res,400,'INVALID_CURATION_INPUT');}
  });
  router.get('/api/launch/servers/:id',auth,async(req,res)=>{
    const server=await owned(req,res);if(!server)return;
    const [tools,checks,errors,external]=await Promise.all([
      q('SELECT id,name,description,params FROM tools WHERE server_id=$1 ORDER BY name',[server.id]),
      q('SELECT id,tool_id,tool_name,outcome,error_code,duration_ms,schema_hash,baseline_hash,drift,created_at FROM integration_test_receipts WHERE server_id=$1 ORDER BY created_at DESC LIMIT 30',[server.id]),
      q("SELECT error_code,count(*)::int AS calls FROM tool_events WHERE server_id=$1 AND success=false AND created_at>now()-interval '30 days' GROUP BY error_code ORDER BY calls DESC LIMIT 5",[server.id]),
      q("SELECT count(*)::int AS calls,count(*) FILTER (WHERE success)::int AS succeeded,count(DISTINCT date_trunc('day',created_at))::int AS active_days FROM tool_events WHERE server_id=$1 AND created_at>now()-interval '30 days'",[server.id])
    ]);
    res.setHeader('Cache-Control','no-store');
    return res.json({server:{id:server.id,slug:server.slug,name:server.name,status:server.status,visibility:server.visibility,published_revision:server.published_revision,has_unpublished_changes:server.has_unpublished_changes},
      tools:tools.rows,checks:checks.rows,external_calls_30d:external.rows[0],
      doctor:doctorReport(server,{errors:errors.rows,checks:checks.rows}),
      caveat:'Owner-initiated test receipts are not third-party host executions. Managed tool executions are not unique users or verified sales.'});
  });
  router.post('/api/launch/servers/:id/checks',auth,async(req,res)=>{
    const server=await owned(req,res);if(!server)return;
    const suite=req.body?.checks;
    if(!Array.isArray(suite)||suite.length<1||suite.length>5)return error(res,400,'TEST_SUITE_MUST_HAVE_1_TO_5_CASES');
    if(suite.some(x=>!x||typeof x.tool_id!=='string'||!x.args||typeof x.args!=='object'||
      Array.isArray(x.args)||JSON.stringify(x.args).length>1500))return error(res,400,'INVALID_TEST_CASE');
    const count=await q("SELECT count(*)::int AS n FROM integration_test_receipts WHERE server_id=$1 AND created_at>now()-interval '24 hours'",[server.id]);
    if(count.rows[0].n+suite.length>40)return error(res,429,'DAILY_TEST_BUDGET_REACHED');
    const results=[];
    for(const entry of suite){
      const {rows}=await q('SELECT id,name,params,url,method FROM tools WHERE id=$1 AND server_id=$2',[entry.tool_id,server.id]);
      if(!rows.length)return error(res,404,'TOOL_NOT_FOUND');
      const tool=rows[0],started=Date.now();
      let outcome='passed',code=null,shape=null,fingerprint=null,baselineHash=null,drift=false;
      try{
        const target=toolUrl(tool,entry.args);
        const result=await guardedManagedGet(server,req.user,target);
        shape=reviewShape(result.body);fingerprint=sha(shape);
        await q("INSERT INTO integration_contract_baselines(tool_id,server_id,shape,schema_hash) VALUES($1,$2,$3::jsonb,$4) ON CONFLICT(tool_id) DO NOTHING",
          [tool.id,server.id,JSON.stringify(shape),fingerprint]);
        const baseline=await q('SELECT schema_hash FROM integration_contract_baselines WHERE tool_id=$1',[tool.id]);
        baselineHash=baseline.rows[0].schema_hash;drift=baselineHash!==fingerprint;
      }catch(e){outcome='failed';code=classifyToolError(e);}
      const duration=Math.max(0,Date.now()-started);
      const id=randomUUID();
      await q('INSERT INTO integration_test_receipts(id,server_id,tool_id,tool_name,outcome,error_code,duration_ms,shape,schema_hash,baseline_hash,drift) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11)',
        [id,server.id,tool.id,tool.name,outcome,code,duration,shape?JSON.stringify(shape):null,fingerprint,baselineHash,drift]);
      results.push({id,tool_id:tool.id,tool_name:tool.name,outcome,error_code:code,duration_ms:duration,
        contract_status:outcome==='failed'?'untested':drift?'changed':'matches_baseline',
        baseline_hash:baselineHash,current_schema_hash:fingerprint,source:'owner_initiated_upstream_GET'});
    }
    res.setHeader('Cache-Control','no-store');
    return res.json({results,all_passed:results.every(r=>r.outcome==='passed'&&r.contract_status==='matches_baseline'),
      independent_host_compatibility:'not_tested',note:'No upstream URLs, arguments, response bodies or access tokens were stored.'});
  });
  router.post('/api/launch/servers/:id/baselines/:toolId/accept',auth,async(req,res)=>{
    const server=await owned(req,res);if(!server)return;
    const tool=await q('SELECT id FROM tools WHERE id=$1 AND server_id=$2',[req.params.toolId,server.id]);
    if(!tool.rows.length)return error(res,404,'TOOL_NOT_FOUND');
    const checks=await q("SELECT shape,schema_hash,created_at FROM integration_test_receipts WHERE tool_id=$1 AND server_id=$2 AND outcome='passed' ORDER BY created_at DESC LIMIT 1",[req.params.toolId,server.id]);
    if(!checks.rows.length||!checks.rows[0].schema_hash)return error(res,409,'NO_SUCCESSFUL_CONTRACT_CHECK');
    if(req.body?.expected_schema_hash!==checks.rows[0].schema_hash)return error(res,409,'LATEST_SCHEMA_HASH_REQUIRED');
    await q("INSERT INTO integration_contract_baselines(tool_id,server_id,shape,schema_hash,accepted_at) VALUES($1,$2,$3::jsonb,$4,now()) ON CONFLICT(tool_id) DO UPDATE SET shape=excluded.shape,schema_hash=excluded.schema_hash,accepted_at=now()",
      [req.params.toolId,server.id,JSON.stringify(checks.rows[0].shape),checks.rows[0].schema_hash]);
    return res.json({accepted:true,schema_hash:checks.rows[0].schema_hash,source:'explicit_owner_action',note:'Baseline accepted; no published server revision was changed.'});
  });
  return router;
}
