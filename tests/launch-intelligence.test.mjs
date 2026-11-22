import {test} from 'node:test';
import assert from 'node:assert/strict';
import {integrationPassport,integrationDoctor,validPublicSlug,publicTools} from '../src/launch-intelligence.mjs';
const one={
 id:'123',slug:'public-example',status:'published',visibility:'public',name:'Example API',
 description:'Public API integration',published_revision:3,updated_at:'2026-11-21T12:00:00Z',
 published_snapshot:{tools:[
 {name:'find_items',description:'Read public items',method:'GET',url:'https://api.example.com/v1/search?token=SENSITIVE_SHOULD_NOT_LEAK',params:[{name:'q',type:'string',required:true}]},
 {name:'find_more',description:'Read public metadata',method:'GET',url:'https://api.example.com/v1/meta',params:[]}
 ]}
};
test('public passport contains exact published revision and only declared tool metadata',()=>{
 const p=integrationPassport(one,{calls:4,successes:3,last_success_at:'2026-11-21T13:00:00Z'},'https://foundry.example');
 assert.equal(p.published_revision,3);
 assert.equal(p.tools.length,2);
 assert.equal(p.endpoint,'https://foundry.example/mcp/public-example');
 assert.equal(p.evidence.recorded_calls_30d,4);
 assert.equal(p.evidence.independent_review,'not_established');
 assert.match(p.evidence.classification,/automated tests/);
 assert.doesNotMatch(JSON.stringify(p),/SENSITIVE_SHOULD_NOT_LEAK|api\.example\.com/);
 assert.match(p.install_page,/connect\?server=public-example/);
});
test('private or draft identities fail closed and cannot produce a public passport',()=>{
 for(const change of [{visibility:'private'},{status:'draft'},{slug:'../private'}]){
  assert.throws(()=>integrationPassport({...one,...change},{}),/PUBLIC_PUBLISHED_SERVER_REQUIRED/);
  assert.throws(()=>integrationDoctor({...one,...change},{}),/PUBLIC_PUBLISHED_SERVER_REQUIRED/);
 }
});
test('doctor reports definition and observed reliability separately',()=>{
 const d=integrationDoctor(one,{calls:10,successes:7,p95_ms:7000,last_success_at:'2026-11-21T14:00:00Z'},[{error_code:'UPSTREAM_TIMEOUT',calls:3}]);
 assert.equal(d.assessment,'observed_attention');
 assert.equal(d.checks.every(x=>x.status==='pass'),true);
 assert.equal(d.observations.recorded_failures,3);
 assert.equal(d.observations.p95_ms,7000);
 assert.ok(d.recommendations.some(s=>/latency|p95/i.test(s)));
 assert.ok(d.recommendations.some(s=>/source latency|reduce result size/i.test(s)));
 assert.doesNotMatch(JSON.stringify(d),/api\.example\.com|SENSITIVE_SHOULD_NOT_LEAK/);
});
test('doctor marks invalid published snapshots but does not execute upstream network calls',()=>{
 const s={...one,published_revision:null,published_snapshot:{tools:[{name:'bad',method:'POST',params:null},{name:'bad',method:'POST',params:[]}]}};
 const d=integrationDoctor(s,{calls:0,successes:0},[]);
 assert.equal(d.assessment,'definition_attention');
 assert.ok(d.checks.filter(x=>x.status==='attention').length>=3);
 assert.equal(d.observations.recorded_calls,0);
 assert.match(d.boundary,/does not call arbitrary URLs/);
});
test('counts are bounded and cannot pretend paid traffic or client compatibility',()=>{
 const p=integrationPassport(one,{calls:-10,successes:8000},'https://example.test/');
 assert.equal(p.evidence.recorded_calls_30d,0);
 assert.equal(p.evidence.recorded_successes_30d,0);
 assert.equal(p.evidence.host_compatibility,'not_established');
 assert.equal(validPublicSlug('public-example'),true);
 assert.equal(validPublicSlug('private--x'),true);
 assert.equal(validPublicSlug('https://x'),false);
 assert.equal(publicTools({published_snapshot:null}).length,0);
});
