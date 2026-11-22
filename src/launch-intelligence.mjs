// Public, evidence-tiered launch intelligence. This module never asserts a client installation
// or customer identity from a tool-call count. No upstream secrets or tool URLs are exposed.
const cleanText=(v,max=400)=>typeof v==='string'?v.trim().slice(0,max):'';
export const validPublicSlug=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{2,48}$/.test(s);
const count=v=>Number.isFinite(Number(v))?Math.max(0,Math.trunc(Number(v))):0;
const date=v=>v&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():null;
export const publicTools=s=>{
 const value=s?.published_snapshot?.tools;
 return Array.isArray(value)?value:[];
};
const namedTools=s=>publicTools(s).map(t=>({
 name:cleanText(t.name,80),
 description:cleanText(t.description,280),
 method:t.method==='GET'?'GET':'UNSUPPORTED',
 parameters:Array.isArray(t.params)?t.params.map(p=>({
   name:cleanText(p.name,64),type:cleanText(p.type,32),
   required:p.required===true
 })):[],
}));
// Every public statement is restricted to evidence actually available from this server.
export function integrationPassport(server,metrics={},root=''){
 if(server?.status!=='published'||server?.visibility!=='public'||!validPublicSlug(server.slug))
   throw Error('PUBLIC_PUBLISHED_SERVER_REQUIRED');
 const rev=count(server.published_revision);
 const calls=count(metrics.calls),success=count(metrics.successes);
 const base=String(root).replace(/\/$/,'');
 return {
   product:'MCP Foundry',kind:'integration_passport',slug:server.slug,
   name:cleanText(server.name,120),description:cleanText(server.description,400),
   protocol:'MCP Streamable HTTP',access:'public',published_revision:rev||null,
   updated_at:date(server.updated_at),
   tools:namedTools(server),
   endpoint:base+'/mcp/'+server.slug,
   install_page:base+'/connect?server='+encodeURIComponent(server.slug),
   doctor_page:base+'/doctor?server='+encodeURIComponent(server.slug),
   passport_page:base+'/passport?server='+encodeURIComponent(server.slug),
   evidence:{
     level:'published_definition',
     recorded_calls_30d:calls,
     recorded_successes_30d:Math.min(success,calls),
     last_recorded_success_at:date(metrics.last_success_at),
     classification:'Recorded calls may include automated tests. Neither customer count nor independent host installation is established.',
     independent_review:'not_established',
     host_compatibility:'not_established'
   },
   generated_at:new Date().toISOString(),
   disclosure:'Published definition and recorded invocation counts only; not a third-party security certification, endorsement, SLA, partner approval or proof of paying customers.'
 };
}
const guidance={
 UPSTREAM_TIMEOUT:'Inspect source latency and reduce result size; retest the exact tool and inputs.',
 UPSTREAM_RATE_LIMIT:'Review provider quotas, scheduling and safe retry/backoff before increasing demand.',
 UPSTREAM_ACCESS_DENIED:'Check provider authorization and private server configuration; never expose credentials.',
 AUTHORIZATION_REQUIRED:'Reconnect the authorized credential and retest from the intended account.',
 UPSTREAM_NOT_FOUND:'Compare the provider API route and resource identifiers with current source documentation.',
 UPSTREAM_SERVER_ERROR:'Check provider status and response behavior; preserve the last working published revision.',
 UPSTREAM_NETWORK_ERROR:'Check DNS, TLS, provider availability and egress policy.',
 INVALID_TOOL_ARGUMENTS:'Review required parameters and published input schema.',
 UPSTREAM_POLICY_BLOCK:'Confirm the destination is a permitted public HTTPS API; do not bypass network safeguards.',
 RESPONSE_TOO_LARGE:'Narrow the response or paginate the upstream data.',
 QUOTA_EXCEEDED:'Inspect current usage and applicable tool quotas.',
 TOOL_EXECUTION_ERROR:'Reproduce this exact tool invocation and inspect owner-only diagnostics.'
};
export function integrationDoctor(server,metrics={},errorCounts=[]){
 if(server?.status!=='published'||server?.visibility!=='public'||!validPublicSlug(server.slug))
   throw Error('PUBLIC_PUBLISHED_SERVER_REQUIRED');
 const tools=publicTools(server),checks=[],issues=[];
 const add=(id,pass,detail)=>{checks.push({id,status:pass?'pass':'attention',detail});if(!pass)issues.push(id);};
 add('published_revision',count(server.published_revision)>0,'Checks a durable published revision, not the editable draft.');
 add('has_published_tools',tools.length>0,'Requires at least one tool in the published snapshot.');
 add('read_only_methods',tools.every(t=>t.method==='GET'),'This release supports public HTTPS GET tools only.');
 add('defined_input_schema',tools.every(t=>Array.isArray(t.params)&&t.params.length<=18),'Tool parameters must be explicitly defined and bounded.');
 add('unique_tool_names',new Set(tools.map(t=>t.name)).size===tools.length,'Tool names must be unique inside one server.');
 const calls=count(metrics.calls), successes=count(metrics.successes),failures=Math.max(0,calls-successes);
 const p95=metrics.p95_ms==null?null:count(metrics.p95_ms);
 if(calls>=5&&successes/calls<.9)issues.push('observed_failure_rate');
 if(calls>=5&&p95!==null&&p95>6000)issues.push('observed_high_latency');
 const recommendations=[];
 if(issues.includes('observed_failure_rate'))recommendations.push('Investigate repeated failed executions using owner-only diagnostics and rerun the affected tool.');
 if(issues.includes('observed_high_latency'))recommendations.push('Inspect upstream latency and pagination; benchmark p95 against the customer workflow.');
 const errorSummary=Array.isArray(errorCounts)?errorCounts.slice(0,8).map(e=>({
   code:cleanText(e.error_code||'TOOL_EXECUTION_ERROR',64),
   count:count(e.calls)
 })):[];
 for(const e of errorSummary)if(recommendations.length<8)
   recommendations.push(guidance[e.code]||guidance.TOOL_EXECUTION_ERROR);
 if(!calls)recommendations.push('No recorded managed-tool calls in this window. Execute a real tool from a compatible MCP host to establish a runtime receipt.');
 if(!issues.length&&calls)recommendations.push('Recorded traffic looks consistent with the published definition; a real external host test is still required for independent compatibility.');
 return {
   kind:'mcp_doctor',slug:server.slug,
   assessment:issues.some(i=>checks.some(c=>c.id===i))?'definition_attention':
     issues.length?'observed_attention':'definition_pass',
   checks,observations:{
     window:'rolling_30_days',recorded_calls:calls,
     recorded_successes:Math.min(successes,calls),recorded_failures:failures,
     p95_ms:calls?p95:null,
     last_recorded_success_at:date(metrics.last_success_at),
     errors:errorSummary
   },
   recommendations:recommendations.slice(0,10),
   tool_count:tools.length,
   boundary:'Read-only definition analysis and observed invocation records; does not call arbitrary URLs, probe credentials, certify live uptime or prove a specific client installation.',
   generated_at:new Date().toISOString()
 };
}
