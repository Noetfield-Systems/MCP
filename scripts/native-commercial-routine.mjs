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
export function body(r){return [marker,'### Daily commercial surface check','Observed: '+r.observed_at,...Object.entries(r.checks).map(([k,v])=>'- '+k+': '+(v?'PASS':'FAIL')),'Next action: '+r.next_action,'Public technical demand signal count: '+(r.demand_count??'unknown'),'Offer check is HTML/link presence only. No checkout session, customer message, payment, private lead read or delivery was performed.'].join('\n');}
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
async function main(){const token=process.env.GITHUB_TOKEN??'';const r=await observe({token});await mkdir('dist',{recursive:true});await writeFile('dist/commercial-health.json',JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({checks:r.checks,next_action:r.next_action,receipt:await persist(r,{token,repository:process.env.GITHUB_REPOSITORY})}));}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
