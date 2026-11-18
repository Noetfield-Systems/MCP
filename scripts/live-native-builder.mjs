import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';

const base=(process.env.FOUNDRY_BASE_URL||'https://mcp-foundry-web-production.up.railway.app').replace(/\/$/,'');
const suffix=randomUUID().slice(0,12).toLowerCase();
const email='conformance-'+suffix+'@foundry.invalid';
const password='Conformance!'+randomUUID();
let cookie='',created=false;
const post=async(path,body,method='POST')=>{
 const response=await fetch(base+path,{
  method,headers:{'content-type':'application/json',...(cookie?{cookie}:{} )},
  body:JSON.stringify(body),signal:AbortSignal.timeout(14000)
 });
 const raw=await response.text();let data;
 try{data=JSON.parse(raw);}catch{data={error:raw.slice(0,300)};}
 if(!response.ok)throw Error(method+' '+path+' HTTP '+response.status+': '+(data.error||'unknown'));
 if(!cookie&&response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];
 return data;
};
const result=r=>{
 assert.ok(!r.isError,JSON.stringify(r.content||r));
 return r.structuredContent||JSON.parse(r.content[0].text);
};
const makeClient=async(path,secret)=>{
 const client=new Client({name:'mcp-foundry-conformance',version:'0.1.0'});
 const transport=new StreamableHTTPClientTransport(new URL(base+path),{requestInit:{headers:{Authorization:'Bearer '+secret}}});
 await client.connect(transport);
 return client;
};
try{
 const templatesResponse=await fetch(base+'/api/templates',{signal:AbortSignal.timeout(10000)});
 assert.equal(templatesResponse.status,200);
 const templateList=await templatesResponse.json();
 assert.ok(templateList.templates.some(t=>t.id==='github_profile'),'public starter catalog present');
 const invalidLead=await fetch(base+'/api/pilot-interest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'test@foundry.invalid',contact_name:'Test',project_brief:'No contact consent supplied.'})});
 assert.equal(invalidLead.status,400,'unconsented lead rejected without storing');
 const register=await post('/api/auth/register',{email,password});assert.equal(register.account.email,email);created=true;
 const key=await post('/api/keys',{label:'E2E conformance disposable key'});
 assert.ok(key.secret.startsWith('fdy_'));
 const client=await makeClient('/mcp/foundry',key.secret);
 let privateClient;
 try{
   const tools=await client.listTools();const names=tools.tools.map(t=>t.name);
   for(const n of ['search_servers','create_server','list_my_servers','add_readonly_tool','import_openapi','test_readonly_tool','publish_server','get_server_usage']) assert.ok(names.includes(n),'missing '+n);
   assert.ok(names.includes('open_foundry_app'),'MCP Apps host tool discoverable');
   const appTool=tools.tools.find(t=>t.name==='open_foundry_app');
   assert.equal(appTool._meta?.ui?.resourceUri,'ui://mcp-foundry/studio.html');
   const appResult=await client.callTool({name:'open_foundry_app',arguments:{}});
   assert.ok(!appResult.isError,'host app launch tool');
   const resources=await client.listResources();
   assert.ok(resources.resources.some(r=>r.uri==='ui://mcp-foundry/studio.html'),'MCP Apps resource list');
   const view=await client.readResource({uri:'ui://mcp-foundry/studio.html'});
   const html=view.contents?.[0]?.text||'';
   assert.ok(html.includes('MCP FOUNDRY')&&html.includes('Public directory'),'self-contained embedded Foundry View');
   const starter=await post('/api/servers/from-template',{template_id:'hacker_news'});
   assert.equal(starter.tools_added,1);
   assert.equal(starter.server.status,'draft');
   const renamed=await post('/api/servers/'+starter.server.id,{name:'HN Reader '+suffix,description:'Live operator lifecycle smoke'},'PATCH');
   assert.ok(renamed.server.name.includes('HN Reader'));
   const starterResult=result(await client.callTool({name:'test_readonly_tool',arguments:{server_id:starter.server.id,tool_name:'top_story_ids',arguments_json:JSON.stringify(starter.sample_args)}}));
   assert.equal(starterResult.ok,true,'starter does a live source-backed GET');
   assert.ok(Array.isArray(JSON.parse(starterResult.response))&&JSON.parse(starterResult.response).length>0);
   const slug='smoke-'+suffix;
   const server=result(await client.callTool({name:'create_server',arguments:{name:'Disposable Conformance '+suffix,slug,description:'Temporary real MCP integration check'}})).server;
   assert.ok(server.id);
   const add=result(await client.callTool({name:'add_readonly_tool',arguments:{server_id:server.id,name:'max_hn_item',description:'Fetch current maximum public Hacker News item identifier',url:'https://hacker-news.firebaseio.com/v0/maxitem.json',params:[]}}));
   assert.equal(add.status,'draft');
   const test=result(await client.callTool({name:'test_readonly_tool',arguments:{server_id:server.id,tool_name:'max_hn_item',arguments_json:'{}'}}));
   assert.equal(test.ok,true);assert.ok(Number.isInteger(Number(test.response))&&Number(test.response)>0);
   const published=result(await client.callTool({name:'publish_server',arguments:{server_id:server.id,visibility:'private'}}));
   assert.equal(published.status,'published');
   privateClient=await makeClient('/mcp/'+slug,key.secret);
   const pubTools=await privateClient.listTools();assert.ok(pubTools.tools.some(t=>t.name==='max_hn_item'));
   const value=await privateClient.callTool({name:'max_hn_item',arguments:{}});
   assert.equal(value.isError,undefined);assert.ok(Number.isInteger(Number(value.content[0].text))&&Number(value.content[0].text)>0);
   const usage=result(await client.callTool({name:'get_server_usage',arguments:{server_id:server.id}})).usage;
   assert.ok(usage.calls>=1&&usage.successes>=1,'real persisted invocation observed');
   const stopped=await post('/api/servers/'+server.id+'/unpublish',{});
   assert.equal(stopped.status,'draft');
   const disabled=await fetch(base+'/mcp/'+slug,{method:'GET',signal:AbortSignal.timeout(8000)});
   assert.equal(disabled.status,404,'unpublished managed endpoint not available');
   const republished=result(await client.callTool({name:'publish_server',arguments:{server_id:server.id,visibility:'private'}}));
   assert.equal(republished.status,'published');
   const removed=await post('/api/tools/'+add.tool.id,{},'DELETE');
   assert.equal(removed.deleted,true,'owned tool removed');
   const starterDeleted=await post('/api/servers/'+starter.server.id,{},'DELETE');
   assert.equal(starterDeleted.deleted,true,'owned starter server removed');
   const observed=await fetch(base+'/api/me/activation',{headers:{cookie},signal:AbortSignal.timeout(10000)});
   assert.equal(observed.status,200,'own activation history HTTP 200');
   const activation=await observed.json();
   assert.ok(activation.completed.template_started,'starter creation recorded');
   assert.ok(activation.completed.server_created,'native MCP server creation recorded');
   assert.ok(activation.completed.server_published,'native MCP publish recorded');
   assert.ok(activation.completed.tool_test_succeeded,'real upstream test recorded');
   assert.ok(activation.completed.api_key_created,'key creation recorded');
   assert.ok(activation.successful_managed_calls>=1,'managed tool invocation recorded');
   const anonymous=await fetch(base+'/api/servers',{signal:AbortSignal.timeout(8000)});
   assert.equal(anonymous.status,401,'private workspace needs authentication');
   const operatorDenied=await fetch(base+'/api/admin/pilot-interest',{signal:AbortSignal.timeout(8000)});
   assert.ok([403,503].includes(operatorDenied.status),'anonymous lead access denied');
   const adminFunnel=await fetch(base+'/api/admin/funnel',{signal:AbortSignal.timeout(8000)});
   assert.ok([403,503].includes(adminFunnel.status),'commercial funnel requires private operator authentication');
   console.log(JSON.stringify({result:'PASS',host:base,authentication:'bearer-key',created_server:true,starter_template:'PASS',edit_unpublish_delete:'PASS',operator_scope:'PASS',verified_activation:'PASS',lead_consent_validation:'PASS',read_only_tool_test:'PASS',private_mcp_connect:'PASS',real_tool_invocation:'PASS',stored_usage:'PASS',test_account:true,external_customer:false}));
 }finally{if(privateClient)await privateClient.close();await client.close();}
}finally{
 if(created){
  try{const deleted=await post('/api/account',{password},'DELETE');assert.equal(deleted.deleted,true);console.log('TEST_FIXTURE_ACCOUNT_DELETED');}
  catch(e){console.error('TEST_FIXTURE_CLEANUP_ERROR',String(e));process.exitCode=1;}
 }
}
