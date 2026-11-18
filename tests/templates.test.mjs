import test from 'node:test';
import assert from 'node:assert/strict';
import {STARTER_TEMPLATES,publicTemplates,findTemplate} from '../src/templates.mjs';
import {validatedTarget,toolUrl} from '../src/security.mjs';

test('live-source starter catalog contains only guarded HTTPS GET tools',()=>{
 assert.equal(STARTER_TEMPLATES.length,5);
 const ids=new Set();
 for(const starter of STARTER_TEMPLATES){
   assert.ok(!ids.has(starter.id));ids.add(starter.id);
   assert.ok(starter.tools.length>0);
   for(const tool of starter.tools){
     assert.equal(tool.method,'GET');
     const checked=validatedTarget(tool.url);
     assert.equal(checked.protocol,'https:');
     const rendered=toolUrl(tool,starter.sampleArgs);
     const actual=validatedTarget(rendered);
     assert.ok(!actual.pathname.includes('%7B')&&!actual.pathname.includes('%7D'));
   }
 }
 assert.equal(publicTemplates().length,5);
 assert.equal(findTemplate('nonexistent'),null);
});
test('starter API metadata avoids invented customer evidence',()=>{
 const listing=publicTemplates();
 for(const t of listing){
   assert.equal(typeof t.source,'string');
   assert.equal(typeof t.description,'string');
   assert.ok(!Object.hasOwn(t,'rating'));
   assert.ok(!Object.hasOwn(t,'customers'));
   assert.ok(!Object.hasOwn(t,'revenue'));
 }
});

test('two independent market starters have real source-backed, parameterized tools',()=>{
 const web3=findTemplate('dexscreener_market'),business=findTemplate('world_bank_countries');
 assert.equal(web3.tools.length,2);
 assert.equal(business.tools.length,1);
 assert.equal(web3.tools[0].url,'https://api.dexscreener.com/token-profiles/latest/v1');
 assert.equal(toolUrl(web3.tools[1],web3.sampleArgs),'https://api.dexscreener.com/latest/dex/search?q=SOL%2FUSDC');
 assert.equal(toolUrl(business.tools[0],business.sampleArgs),'https://api.worldbank.org/v2/country/CA?format=json');
 assert.ok(publicTemplates().every(t=>t.tool_count>=1&&!('customers' in t)&&!('revenue' in t)));
});
