import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runReadOnlySuite,sanitizeSamples,sourceSignature,contractDifference,curateSourceTools} from '../src/source-lab.mjs';
const makeTools=()=>[{name:'find_item',method:'GET',url:'https://api.example.test/v1/items/{q}',description:'Search public items',
 params:[{name:'q',in:'path',type:'string',required:true}]},
 {name:'list_items',method:'GET',url:'https://api.example.test/v1/items',description:'List available items',params:[]}];
test('strict samples reject secrets and nested arguments without persisting input',()=>{
 assert.throws(()=>sanitizeSamples({find_item:{api_key:'secret'}}),/SECRETS_NOT_ALLOWED/);
 assert.throws(()=>sanitizeSamples({find_item:{q:{nested:true}}}),/INVALID_SAMPLE_VALUE/);
 assert.deepEqual(sanitizeSamples({find_item:{q:'alpha'}}),{find_item:{q:'alpha'}});
});
test('test lab executes actual injected GETs, classifies failures and emits no input or body',async()=>{
 const results=await runReadOnlySuite(makeTools(),{find_item:{q:'sensitive-input'}},async(tool,args)=>{
  if(tool.name==='list_items')throw Error('Upstream returned HTTP 429');
  assert.equal(args.q,'sensitive-input');
  return {body:'some public response'};
 });
 assert.equal(results.passed,1);assert.equal(results.failed,1);
 assert.equal(results.results[1].error_code,'UPSTREAM_RATE_LIMIT');
 assert.match(results.results[0].response_sha256,/^[a-f0-9]{64}$/);
 assert.doesNotMatch(JSON.stringify(results),/sensitive-input|some public response/);
});
test('test lab forbids write methods and unbounded batches',async()=>{
 await assert.rejects(()=>runReadOnlySuite([{name:'do_write',method:'POST'}],{},async()=>{}),/READ_ONLY/);
 await assert.rejects(()=>runReadOnlySuite([],{},async()=>{}),/REQUIRES_1_TO_8/);
});
test('source signatures and drift distinguish additions, removals and modifications',()=>{
 const v1=sourceSignature({tools:makeTools()});
 const changed=makeTools();changed[0].params=[...changed[0].params,{name:'page',in:'query',type:'integer',required:false}];
 changed.push({name:'get_health',url:'https://api.example.test/health',description:'Health status',params:[]});
 const v2=sourceSignature({tools:changed});
 const diff=contractDifference(v1,v2);
 assert.equal(diff.changed,true);
 assert.deepEqual(diff.added,['get_health']);
 assert.deepEqual(diff.modified,['find_item']);
 assert.deepEqual(diff.removed,[]);
 assert.equal(contractDifference(v1,sourceSignature({tools:makeTools()})).changed,false);
});
test('source fingerprint excludes URL query secret values',()=>{
 const a=makeTools();a[0].url='https://api.example.test/path?key=SECRET1';
 const x=sourceSignature({tools:a});assert.doesNotMatch(JSON.stringify(x),/SECRET1|key=/);
});
test('heuristic curator is deterministic and labels scope honestly',()=>{
 const preview={tools:makeTools()};
 const x=curateSourceTools(preview,1);assert.equal(x.recommended.length,1);
 assert.equal(x.method,'bounded_heuristic_not_llm');
 assert.equal(x.other_count,1);
 assert.equal(curateSourceTools(preview,1).recommended[0].name,x.recommended[0].name);
});
