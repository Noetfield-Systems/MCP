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
   const starter=await post('/api/servers/from-template',{template_id:'github_profile'});
   assert.equal(starter.tools_added,1);
   assert.equal(starter.server.status,'draft');
   const starterResult=result(await client.callTool({name:'test_readonly_tool',arguments:{server_id:starter.server.id,tool_name:'read_github_profile',arguments_json:JSON.stringify(starter.sample_args)}}));
   assert.equal(starterResult.ok,true,'starter does a live source-backed GET');
   assert.ok(starterResult.response.includes('Noetfield-Systems'));
   const slug='smoke-'+suffix;
   const server=result(await client.callTool({name:'create_server',arguments:{name:'Disposable Conformance '+suffix,slug,description:'Temporary real MCP integration check'}})).server;
   assert.ok(server.id);
   const add=result(await client.callTool({name:'add_readonly_tool',arguments:{server_id:server.id,name:'foundry_status',description:'Fetch the public MCP Foundry GitHub repository metadata',url:'https://api.github.com/repos/Noetfield-Systems/MCP',params:[]}}));
   assert.equal(add.status,'draft');
   const test=result(await client.callTool({name:'test_readonly_tool',arguments:{server_id:server.id,tool_name:'foundry_status',arguments_json:'{}'}}));
   assert.equal(test.ok,true);assert.ok(test.response.includes('Noetfield-Systems/MCP'));
   const published=result(await client.callTool({name:'publish_server',arguments:{server_id:server.id,visibility:'private'}}));
   assert.equal(published.status,'published');
   privateClient=await makeClient('/mcp/'+slug,key.secret);
   const pubTools=await privateClient.listTools();assert.ok(pubTools.tools.some(t=>t.name==='foundry_status'));
   const value=await privateClient.callTool({name:'foundry_status',arguments:{}});
   assert.equal(value.isError,undefined);assert.ok(value.content[0].text.includes('Noetfield-Systems/MCP'));
   const usage=result(await client.callTool({name:'get_server_usage',arguments:{server_id:server.id}})).usage;
   assert.ok(usage.calls>=1&&usage.successes>=1,'real persisted invocation observed');
   const anonymous=await fetch(base+'/api/servers',{signal:AbortSignal.timeout(8000)});
   assert.equal(anonymous.status,401,'private workspace needs authentication');
   console.log(JSON.stringify({result:'PASS',host:base,authentication:'bearer-key',created_server:true,starter_template:'PASS',lead_consent_validation:'PASS',read_only_tool_test:'PASS',private_mcp_connect:'PASS',real_tool_invocation:'PASS',stored_usage:'PASS',test_account:true,external_customer:false}));
 }finally{if(privateClient)await privateClient.close();await client.close();}
}finally{
 if(created){
  try{const deleted=await post('/api/account',{password},'DELETE');assert.equal(deleted.deleted,true);console.log('TEST_FIXTURE_ACCOUNT_DELETED');}
  catch(e){console.error('TEST_FIXTURE_CLEANUP_ERROR',String(e));process.exitCode=1;}
 }
}
