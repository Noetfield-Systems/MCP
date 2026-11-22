import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewShape,curateTools,makePassport,doctorReport,isPublicSlug} from '../src/launch-suite.mjs';

const published=()=>({
  slug:'catalog-sample',name:'Catalog Sample',description:'Public product facts',
  status:'published',visibility:'public',published_revision:3,
  updated_at:'2026-11-22T00:00:00Z',has_unpublished_changes:false,
  published_snapshot:{tools:[{name:'get_product',description:'Read product facts',
    method:'GET',url:'https://private-example.test/products/{id}?token=SECRET_NEVER_PUBLISH',
    params:[{name:'id',in:'path',type:'string',required:true}]}]}
});

test('public passport reveals published tool schema and never exposes upstream URLs or private metadata',()=>{
 const p=makePassport(published());
 assert.equal(p.slug,'catalog-sample');
 assert.equal(p.published_revision,3);
 assert.equal(p.published_tools[0].name,'get_product');
 assert.equal(p.published_tools[0].input_parameters[0].name,'id');
 assert.equal(p.install_url,'/connect?server=catalog-sample');
 assert.equal(p.evidence.external_host_execution,'not_certified_by_passport');
 assert.ok(!JSON.stringify(p).includes('SECRET_NEVER_PUBLISH'));
 assert.ok(!JSON.stringify(p).includes('private-example.test'));
});

test('private and draft passports cannot be published',()=>{
 for(const values of [{visibility:'private'},{status:'draft'},{published_snapshot:null},{slug:'invalid/slug'}]){
  assert.throws(()=>makePassport({...published(),...values}),/PASSPORT_NOT_PUBLIC/);
 }
 assert.equal(isPublicSlug('a-b'),true);
 assert.equal(isPublicSlug('evil/route'),false);
});

test('response shape strips values and only exposes safe bounded structure',()=>{
 const secret='sample@example.net';
 const obj=reviewShape(JSON.stringify({email:secret,reviews:[{rating:5,body:'My private text'}],id:28}));
 assert.equal(obj.kind,'object');
 assert.deepEqual(obj.keys,['email','id','reviews']);
 assert.equal(obj.children.email.kind,'string');
 assert.ok(!JSON.stringify(obj).includes(secret));
 assert.ok(!JSON.stringify(obj).includes('private text'));
 assert.deepEqual(reviewShape('not json'),{kind:'non_json',keys:[]});
 assert.equal(reviewShape('[{"a":1}]').item.keys[0],'a');
 const huge=Object.fromEntries(Array.from({length:100},(_,i)=>['field_'+i,i]));
 assert.equal(reviewShape(JSON.stringify(huge)).keys.length,45);
});

test('curation ranks a usable GET tool above write-like methods and never treats heuristics as verification',()=>{
 const results=curateTools([
  {name:'delete_everything',description:'Delete orders'},
  {name:'get_product_reviews',description:'Get published review ratings for a product',params:[]},
  {name:'list_orders',description:'List orders',params:[]},
  {name:'get_complex_data',description:'Some complex data',params:[{required:true},{required:true}]}
 ]);
 assert.equal(results[0].name,'get_product_reviews');
 assert.ok(results.find(x=>x.name==='delete_everything').manual_review);
 assert.ok(results.find(x=>x.name==='delete_everything').score<results[0].score);
 assert.equal(Object.hasOwn(results[0],'index'),false);
 assert.throws(()=>curateTools('not a list'),/INVALID_CURATION_INPUT/);
});

test('doctor separates stored configuration evidence, owner checks and independent external acceptance',()=>{
 const ok=doctorReport(published());
 assert.equal(ok.configuration_ready,true);
 assert.equal(ok.independent_certification,false);
 assert.equal(ok.runtime_mcp_probe,'not_performed_by_this_report');
 assert.equal(ok.issues.length,0);
 const bad=doctorReport({...published(),has_unpublished_changes:true},{
  errors:[{error_code:'UPSTREAM_TIMEOUT',calls:4}],checks:[{outcome:'passed',created_at:'2026-11-22',drift:true}]
 });
 assert.deepEqual(bad.issues.map(x=>x.code),['DRAFT_DIFFERS_FROM_LIVE','UPSTREAM_TIMEOUT','CONTRACT_DRIFT_DETECTED']);
 assert.equal(bad.latest_owner_check.outcome,'passed');
 assert.equal(doctorReport({...published(),status:'draft'}).configuration_ready,false);
});
