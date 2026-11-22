import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewShape,curateTools,doctorReport} from '../src/verification-lab.mjs';

const server={
 status:'published',visibility:'public',published_snapshot:{tools:[{name:'get_item',description:'Read items',method:'GET',params:[]}]},
 has_unpublished_changes:false,published_revision:2
};

test('response contract records only structural keys and value types',()=>{
 const secret='secret@example.com';
 const value=reviewShape(JSON.stringify({account:{email:secret,balance:75},reviews:[{body:'private text',rating:5}]}));
 assert.equal(value.kind,'object');
 assert.deepEqual(value.keys,['account','reviews']);
 assert.deepEqual(value.children.account.keys,['balance','email']);
 assert.equal(value.children.account.children.email.kind,'string');
 assert.ok(!JSON.stringify(value).includes(secret));
 assert.ok(!JSON.stringify(value).includes('private text'));
 assert.equal(reviewShape('not-json').kind,'non_json');
});

test('schema extraction limits keys and nested traversal',()=>{
 const huge=Object.fromEntries(Array.from({length:150},(_,i)=>['field_'+i,'private']));
 const shape=reviewShape(JSON.stringify(huge));
 assert.equal(shape.keys.length,45);
 const arr=reviewShape(JSON.stringify([{id:1,body:'private'}]));
 assert.equal(arr.kind,'array');
 assert.deepEqual(arr.item.keys,['body','id']);
});

test('tool curation supports real business tasks without mutating source or implying approval',()=>{
 const items=curateTools([
   {name:'delete_data',description:'Delete every record',params:[]},
   {name:'get_product_reviews',description:'Read published product reviews',params:[]},
   {name:'get_difficult',description:'Read something',params:[{required:true},{required:true}]}
 ]);
 assert.equal(items[0].name,'get_product_reviews');
 assert.equal(items.at(-1).name,'delete_data');
 assert.equal(items.at(-1).manual_review,true);
 assert.ok(items[0].score>items[1].score);
 assert.throws(()=>curateTools({unexpected:1}),/INVALID_CURATION_INPUT/);
});

test('owner doctor uses observed error categories without misrepresenting certification',()=>{
 const report=doctorReport(server,{errors:[{error_code:'UPSTREAM_TIMEOUT',calls:2}],checks:[{outcome:'passed',created_at:'2026-11-22',drift:true}]});
 assert.equal(report.independent_certification,false);
 assert.equal(report.runtime_mcp_probe,'not_performed_by_this_report');
 assert.equal(report.configuration_ready,true);
 assert.deepEqual(report.issues.map(x=>x.code),['UPSTREAM_TIMEOUT','CONTRACT_DRIFT_DETECTED']);
 assert.equal(report.latest_owner_check.outcome,'passed');
 const draft=doctorReport({...server,status:'draft',has_unpublished_changes:true});
 assert.equal(draft.configuration_ready,false);
 assert.ok(draft.issues.some(x=>x.code==='NOT_PUBLISHED'));
});
