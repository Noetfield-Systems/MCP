import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import assert from 'node:assert/strict';

const base=(process.env.FOUNDRY_BASE_URL||'https://mcp-foundry-web-production.up.railway.app').replace(/\/$/,'');
const run=async()=>{
  const health=await fetch(base+'/healthz',{signal:AbortSignal.timeout(12000)});
  assert.equal(health.status,200,'health endpoint HTTP 200');
  const h=await health.json();assert.equal(h.ok,true,'PostgreSQL reachable');
  const page=await fetch(base+'/',{signal:AbortSignal.timeout(12000)});
  assert.equal(page.status,200,'website HTTP 200');
  const body=await page.text();assert.ok(body.includes('MCP FOUNDRY')||body.includes('MCP Foundry'),'actual web interface served');
  const cat=await fetch(base+'/api/catalog',{signal:AbortSignal.timeout(12000)});
  assert.equal(cat.status,200,'directory API HTTP 200');
  assert.ok(Array.isArray((await cat.json()).servers),'directory returns real server list');
  const client=new Client({name:'foundry-live-smoke',version:'0.1.0'},{versionNegotiation:{mode:'auto'}});
  const transport=new StreamableHTTPClientTransport(new URL(base+'/mcp/foundry'));
  try{
    await client.connect(transport);
    const listed=await client.listTools();
    assert.ok(listed.tools.some(t=>t.name==='search_servers'),'official SDK discovers Foundry server tools');
    const response=await client.callTool({name:'search_servers',arguments:{query:'nonexistent-smoke-search'}});
    assert.ok(Array.isArray(response.content),'actual MCP response content');
    assert.ok(!response.isError,'MCP directory tool succeeds');
    console.log(JSON.stringify({result:'PASS',endpoint:base+'/mcp/foundry',protocol:client.getProtocolEra?.(),tools:listed.tools.map(t=>t.name),health:'PASS',directory:'PASS'}));
  }finally{await client.close();}
};
let last;
for(let attempt=1;attempt<=8;attempt++){
  try{await run();process.exit(0);}catch(e){last=e;console.error('attempt',attempt,String(e?.message||e));if(attempt<8)await new Promise(resolve=>setTimeout(resolve,12000));}
}
console.error('FAIL',String(last?.message||last));process.exit(1);
