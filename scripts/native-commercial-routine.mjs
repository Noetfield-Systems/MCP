import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const repo='Noetfield-Systems/MCP';
const root='https://mcp-foundry-web-production.up.railway.app';
const marker='<!-- foundry:commercial-health:v1 -->';
const query='is:public is:issue is:open in:title,body "MCP" "public API"';
const payment=/https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+/;
async function read(fetcher,url,headers={}){
 try{const r=await fetcher(url,{headers,redirect:'error',signal:AbortSignal.timeout(15000)});const txt=await r.text();let data=null;try{data=JSON.parse(txt);}catch{}return {ok:r.ok,status:r.status,text:txt.slice(0,300000),data};}catch{return {ok:false,status:null,text:'',data:null};}
}
export function classifyDemand(items){
 return [...new Set((Array.isArray(items)?items:[]).filter(x=>Number.isSafeInteger(x.id)&&!x.pull_request&&/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/\d+$/.test(x.html_url??'')&&!x.html_url.startsWith('https://github.com/Noetfield-Systems/')&&/\bmcp\b/i.test(x.title+' '+String(x.body??'').slice(0,2000))&&/public (?:https )?api|openapi|rest api/i.test(x.title+' '+String(x.body??'').slice(0,2000))&&/integrat|convert|build|support|expose|connect/i.test(x.title+' '+String(x.body??'').slice(0,2000))).map(x=>x.id))].length;
}
export async function observe({fetcher=fetch,token='',now=new Date()}={}){
 const [h,s,r,t,c]=await Promise.all(['/healthz','/solutions','/readiness','/api/opportunities/tracks','/api/catalog'].map(p=>read(fetcher,root+p)));
 const checks={health:h.ok&&h.data?.ok===true,solutions:s.ok&&/Public API Quickstart/i.test(s.text),readiness:r.ok&&/readiness/i.test(r.text),offer:s.ok&&/CA\$199/.test(s.text)&&payment.test(s.text),intake_tracks:t.ok&&t.data?.tracks?.some(x=>x.id==='api_business')===true,catalog:c.ok&&Array.isArray(c.data?.servers)};
 const q=await read(fetcher,'https://api.github.com/search/issues?'+new URLSearchParams({q:query,sort:'updated',per_page:'20'}),{accept:'application/vnd.github+json','user-agent':'Foundry-commercial-health',...(token?{authorization:'Bearer '+token}:{})});
 const search_ok=q.ok&&Array.isArray(q.data?.items)&&q.data.incomplete_results!==true;
 const demand_count=search_ok?classifyDemand(q.data.items):null;
 const next_action=!Object.values(checks).every(Boolean)?'REPAIR_EXISTING_CUSTOMER_PATH':!search_ok?'RETRY_PUBLIC_RESEARCH':demand_count?'QUALIFY_SUPPORTED_PUBLIC_API_USE_CASE':'EXPAND_RELEVANT_RESEARCH';
 return {schema:'foundry.commercial-health.v1',observed_at:now.toISOString(),checks,status:{health:h.status,solutions:s.status,readiness:r.status,intake:t.status,catalog:c.status},search_ok,demand_count,next_action,payment_verified:false,delivery_verified:false};
}
// A real external SDK invocation; no accounts, credentials, purchases or customer impersonation.
export async function verifyPublicMcp({connect}={}){
 let client;
 try{
  if(!connect){
   const {Client,StreamableHTTPClientTransport}=await import('@modelcontextprotocol/client');
   connect=async()=>{const c=new Client({name:'foundry-native-commercial-proof',version:'1.0.0'});try{await c.connect(new StreamableHTTPClientTransport(new URL(root+'/mcp/foundry')));return c;}catch(e){await c.close().catch(()=>{});throw e;}};
  }
  client=await connect();
  const listing=await client.listTools();
  if(!Array.isArray(listing.tools)||!listing.tools.some(t=>t.name==='search_servers'))return {state:'FAIL',reason:'TOOL_NOT_DISCOVERED'};
  const result=await client.callTool({name:'search_servers',arguments:{query:'nonexistent-smoke-search'}});
  if(result?.isError||!Array.isArray(result?.content))return {state:'FAIL',reason:'TOOL_CALL_FAILED'};
  return {state:'PASS',endpoint:root+'/mcp/foundry',tool:'search_servers',content_items:result.content.length,classification:'AUTOMATED_EXTERNAL_CLIENT_TEST_NOT_CUSTOMER'};
 }catch{return {state:'FAIL',reason:'SDK_CONNECTION_OR_CALL_FAILED'};}
 finally{if(client)await client.close().catch(()=>{});}
}
export async function executeNativeAction(r,{verify=verifyPublicMcp}={}){
 if(!Object.values(r.checks).every(Boolean))return {...r,public_mcp_proof:{state:'SKIPPED_UNHEALTHY_SURFACE'}};
 const proof=await verify();
 return {...r,public_mcp_proof:proof,next_action:proof.state==='PASS'?r.next_action:'REPAIR_EXISTING_CUSTOMER_PATH'};
}
export function proofBundle(r){
 const p=r.public_mcp_proof??{state:'NOT_RUN'};
 return {schema:'foundry.buyer-proof.v1',observed_at:r.observed_at,offer:{name:'Public API Quickstart',price_cad:199,scope:'One eligible public HTTPS API, up to three read-only GET tools, live upstream test and client handoff',landing:root+'/solutions',readiness:root+'/readiness'},live_external_client:p,customer_payment_verified:false,customer_delivery_verified:false};
}
export function body(r){return [marker,'### Daily commercial surface check','Observed: '+r.observed_at,...Object.entries(r.checks).map(([k,v])=>'- '+k+': '+(v?'PASS':'FAIL')),'Next action: '+r.next_action,'Public technical demand signal count: '+(r.demand_count??'unknown'),'External SDK test: '+(r.public_mcp_proof?.state??'NOT_RUN')+' (automated, not customer usage)','Offer check is HTML/link presence only. No checkout session, customer message, payment, private lead read or delivery was performed.'].join('\n');}
export async function persist(r,{fetcher=fetch,token,repository=repo}={}){
 if(!token||repository!==repo)throw Error('repository credential required');
 const base='https://api.github.com/repos/'+repo,headers={accept:'application/vnd.github+json','user-agent':'Foundry-commercial-health',authorization:'Bearer '+token,'content-type':'application/json'};
 async function call(path,opts={}){const x=await fetcher(base+path,{...opts,headers,redirect:'error',signal:AbortSignal.timeout(15000)});if(!x.ok)throw Error('github_http_'+x.status);return x.json();}
 let found,done=false;
 for(let page=1;page<=20;page++){const xs=await call('/issues/4/comments?per_page=100&page='+page);if(!Array.isArray(xs))throw Error('invalid_comments');found=xs.find(x=>x.user?.login==='github-actions[bot]'&&x.body?.startsWith(marker));if(found||xs.length<100){done=true;break;}}
 if(!done)throw Error('comment_lookup_limit');
 if(found&&!Number.isSafeInteger(found.id))throw Error('invalid_id');
 const x=await call(found?'/issues/comments/'+found.id:'/issues/4/comments',{method:found?'PATCH':'POST',body:JSON.stringify({body:body(r)})});if(!Number.isSafeInteger(x.id))throw Error('missing_receipt');
 return {id:x.id,state:found?'UPDATED':'CREATED'};
}
async function main(){const token=process.env.GITHUB_TOKEN??'';const r=await executeNativeAction(await observe({token}));await mkdir('dist',{recursive:true});await writeFile('dist/commercial-health.json',JSON.stringify(r,null,2)+'\n');await writeFile('dist/buyer-proof.json',JSON.stringify(proofBundle(r),null,2)+'\n');console.log(JSON.stringify({checks:r.checks,public_mcp_proof:r.public_mcp_proof,next_action:r.next_action,receipt:await persist(r,{token,repository:process.env.GITHUB_REPOSITORY})}));}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
