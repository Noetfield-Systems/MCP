import {test} from 'node:test';
import assert from 'node:assert/strict';
import {operationSignature,sourceDiff} from '../src/openapi-watch.mjs';
const tools=[
 {name:'get_order',url:'https://api.example.org/v1/order/{id}?token=SECRET_VALUE',method:'GET',
  params:[{name:'id',in:'path',type:'string',required:true}]},
 {name:'list_items',url:'https://api.example.org/v1/items',method:'GET',params:[]}
];
test('stable OpenAPI fingerprint excludes URL query secrets and does not leak source response values',()=>{
 const p=operationSignature({tools});
 assert.match(p.hash,/^[a-f0-9]{64}$/);
 assert.doesNotMatch(JSON.stringify(p),/SECRET_VALUE|token=/);
 assert.equal(sourceDiff(p,operationSignature({tools})).drift,false);
});
test('source drift labels changed, added and removed operations independently',()=>{
 const first=operationSignature({tools});
 const second=operationSignature({tools:[
 {...tools[0],params:[...tools[0].params,{name:'lang',in:'query',type:'string',required:false}]},
 {name:'get_health',url:'https://api.example.org/v2/health',params:[]}]});
 const d=sourceDiff(first,second);
 assert.equal(d.drift,true);
 assert.deepEqual(d.added,['get_health']);
 assert.deepEqual(d.removed,['list_items']);
 assert.deepEqual(d.modified,['get_order']);
});
test('the contract signature refuses malformed or oversized source inventories',()=>{
 assert.throws(()=>operationSignature({tools:'invalid'}),/INVALID_OPENAPI_PREVIEW/);
 assert.throws(()=>operationSignature({tools:Array.from({length:101},()=>tools[0])}),/INVALID_OPENAPI_PREVIEW/);
});
