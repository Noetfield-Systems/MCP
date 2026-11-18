import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const base=(process.env.FOUNDRY_BASE_URL||'https://mcp-foundry-web-production.up.railway.app').replace(/\/$/,'');
const run=async()=>{
  const health=await fetch(base+'/healthz',{signal:AbortSignal.timeout(12000)});
  assert.equal(health.status,200,'health endpoint HTTP 200');
  const h=await health.json();assert.equal(h.ok,true,'PostgreSQL reachable');
  const page=await fetch(base+'/',{signal:AbortSignal.timeout(12000)});
  assert.equal(page.status,200,'website HTTP 200');
  const body=await page.text();assert.ok(body.includes('MCP FOUNDRY')||body.includes('MCP Foundry'),'actual web interface served');
  const docs=await fetch(base+'/developers',{signal:AbortSignal.timeout(12000)});
  assert.equal(docs.status,200,'customer-facing developer guide HTTP 200');
  const docsHTML=await docs.text();
  assert.ok(docsHTML.includes('Official Registry')&&docsHTML.includes('Streamable HTTP'),'published install and SDK guide');
  for(const route of ['/solutions','/web3','/collaborate']){
    const response=await fetch(base+route,{signal:AbortSignal.timeout(12000)});
    assert.equal(response.status,200,route+' independent commercial landing page live');
    const text=await response.text();
    assert.match(text,/<main id="main"/,'real accessible main content for '+route);
    assert.match(text,/MCP.*FOUNDRY/,'standalone Foundry brand on '+route);
  }
  const starters=await fetch(base+'/api/templates',{signal:AbortSignal.timeout(12000)});
  assert.equal(starters.status,200);
  const examples=(await starters.json()).templates;
  assert.ok(examples.some(t=>t.id==='dexscreener_market'&&t.tool_count===2),'real read-only Web3 source template');
  assert.ok(examples.some(t=>t.id==='world_bank_countries'),'official public business data starter');
  const roles=await fetch(base+'/api/opportunities/tracks',{signal:AbortSignal.timeout(12000)});
  assert.equal(roles.status,200);
  assert.equal((await roles.json()).tracks.length,6,'six independently classifiable business/developer pathways');
  const denied=await fetch(base+'/api/admin/opportunities',{signal:AbortSignal.timeout(12000)});
  assert.equal(denied.status,403,'partner applications remain private and operator-scoped');
  const invalid=await fetch(base+'/api/opportunities',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({track:'web3_builder',contact_consent:false,project_brief:'not consented'}),
    signal:AbortSignal.timeout(12000)});
  assert.equal(invalid.status,400,'no nonconsented partner lead accepted');
  const robots=await fetch(base+'/robots.txt',{signal:AbortSignal.timeout(12000)});
  assert.equal(robots.status,200,'robots indexing metadata HTTP 200');
  const cat=await fetch(base+'/api/catalog',{signal:AbortSignal.timeout(12000)});
  assert.equal(cat.status,200,'directory API HTTP 200');
  assert.ok(Array.isArray((await cat.json()).servers),'directory returns real server list');
  const manifestResponse=await fetch(base+'/server.json',{signal:AbortSignal.timeout(12000)});
  assert.equal(manifestResponse.status,200,'official manifest HTTP 200');
  const expected=JSON.parse(readFileSync(new URL('../server.json',import.meta.url),'utf8'));
  assert.deepEqual(await manifestResponse.json(),expected,'live manifest byte-equivalent JSON to repository canonical metadata');
  assert.equal(expected.remotes[0].url,base+'/mcp/foundry','remote URL matches deployed MCP endpoint');
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
