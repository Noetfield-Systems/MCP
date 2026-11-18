// Independent real public-API buyer/crypto starter acceptance.
// Disposable fixture account is always deleted; never count it as a customer.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';

const base=(process.env.FOUNDRY_BASE_URL||'https://mcp-foundry-web-production.up.railway.app').replace(/\/$/,'');
const id=randomUUID(),email='conformance-market-'+id.slice(0,12)+'@foundry.invalid';
const password='Foundry-Market!'+randomUUID();
let cookie='',created=false;

async function json(path,{method='GET',data}={}){
 const response=await fetch(base+path,{method,credentials:'omit',
  headers:{...(cookie?{cookie}:{}),...(data!==undefined?{'Content-Type':'application/json'}:{})},
  body:data===undefined?undefined:JSON.stringify(data),
  signal:AbortSignal.timeout(15000)});
 if(!cookie&&response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];
 const out=await response.json().catch(()=>({}));
 if(response.status<200||response.status>=300)throw Error(path+': '+response.status+' '+JSON.stringify(out).slice(0,160));
 return out;
}
async function externalManaged(server,toolName,args){
 const client=new Client({name:'foundry-vertical-real-acceptance',version:'0.1.0'});
 const transport=new StreamableHTTPClientTransport(new URL(base+'/mcp/'+server.slug));
 try{
  await client.connect(transport);
  const listed=await client.listTools();
  assert.ok(listed.tools.some(t=>t.name===toolName),'published '+toolName+' visible');
  const result=await client.callTool({name:toolName,arguments:args});
  assert.ok(!result.isError,'real external MCP call succeeded: '+JSON.stringify(result.content).slice(0,250));
  const body=result.content?.find(c=>c.type==='text')?.text||'';
  assert.ok(body.length>10&&['{','['].includes(body.trim()[0]),'actual upstream JSON from '+toolName);
  return {bytes:Buffer.byteLength(body),tool:toolName};
 }finally{await client.close();}
}
try{
 const signup=await json('/api/auth/register',{method:'POST',data:{email,password}});
 created=true;assert.equal(signup.account.email,email);
 const cases=[
  {id:'world_bank_countries',name:'country_facts',args:{country:'CA'},contains:'Canada'},
  {id:'dexscreener_market',name:'latest_token_profiles',args:{},contains:'chainId'}
 ];
 const receipts=[];
 for(const test of cases){
  const made=await json('/api/servers/from-template',{method:'POST',data:{template_id:test.id}});
  const server=made.server;assert.equal(made.template_id,test.id);
  const detail=await json('/api/servers/'+server.id);
  const tool=detail.tools.find(t=>t.name===test.name);
  assert.ok(tool,'real source tool for '+test.id);
  const response=await json('/api/tools/'+tool.id+'/test',{method:'POST',data:{args:test.args}});
  assert.equal(response.ok,true,'live HTTPS upstream source test');
  assert.ok(response.response.includes(test.contains),'real provider data for '+test.name);
  const published=await json('/api/servers/'+server.id+'/publish',{method:'POST',data:{visibility:'public'}});
  assert.equal(published.server.status,'published');
  const call=await externalManaged(server,test.name,test.args);
  const usage=await json('/api/servers/'+server.id+'/diagnostics');
  assert.ok(usage.summary.calls>=1&&usage.summary.success>=1,'managed client invocation was recorded');
  receipts.push({template:test.id,upstream_source_test:'PASS',managed_mcp_call:'PASS',returned_bytes:call.bytes});
 }
 console.log(JSON.stringify({result:'PASS',type:'REAL_BUSINESS_AND_WEB3_MCP',tests:receipts,
    test_fixture:true,external_customer:false,paid_order:false}));
}finally{
 if(created){
  try{const removed=await json('/api/account',{method:'DELETE',data:{password}});
   assert.equal(removed.deleted,true);console.log('MARKET_FIXTURE_ACCOUNT_DELETED');}
  catch(error){console.error('MARKET_FIXTURE_ACCOUNT_CLEANUP_FAILED',String(error));process.exitCode=1;}
 }
}
