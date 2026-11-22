import {test} from 'node:test';
import assert from 'node:assert/strict';
import {repairPlan,draftFingerprint} from '../src/repair-draft.mjs';
const before=[{name:'get_item',method:'GET',url:'https://api.example.net/old?api_key=SENSITIVE',
 description:'Old read',params:[{name:'id',type:'string',in:'path',required:true}]},
 {name:'get_status',method:'GET',url:'https://api.example.net/status',description:'Check status',params:[]}];
const after=[{name:'get_item',method:'GET',url:'https://api.example.net/v2/item/{id}',description:'New read',
 params:[{name:'id',type:'string',in:'path',required:true}]}];
test('safe draft repair detects source differences but cannot silently create new tools',()=>{
 const p=repairPlan(before,after);
 assert.deepEqual(p.candidates.map(x=>x.tool_name),['get_item']);
 assert.equal(p.candidates[0].changes.endpoint_changed,true);
 assert.equal(p.candidates[0].changes.description_changed,true);
 assert.equal(p.excluded_existing_tools,1);
 assert.equal(p.candidates[0].action,'update_owned_draft_get_tool');
 assert.equal(p.candidates[0].published_snapshot_updated,undefined);
});
test('repair metadata emits no raw API URL, query credential or sensitive description',()=>{
 const p=repairPlan(before,after);
 assert.doesNotMatch(JSON.stringify(p),/SENSITIVE|api\.example\.net|Old read/);
 assert.match(p.draft_sha256,/^[0-9a-f]{64}$/);
});
test('unchanged and write-like tools are never silently repaired',()=>{
 const same=repairPlan(before,before);
 assert.equal(same.candidates.length,0);
 const writes=repairPlan([{...before[0],method:'POST'}],after);
 assert.equal(writes.candidates.length,0);
});
test('draft fingerprint includes the current draft and is stable within the same revision',()=>{
 const a=draftFingerprint(before),b=draftFingerprint(structuredClone(before));
 assert.equal(a,b);
 assert.notEqual(a,draftFingerprint([...before,{name:'new',method:'GET',description:'new',url:'https://api.example.net/new',params:[]}]));
 assert.throws(()=>repairPlan({},[]),/INVALID_REPAIR_INPUT/);
});
