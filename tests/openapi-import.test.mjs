import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseOpenapi,openapiPreview,resolveOpenapiInput} from '../src/openapi.mjs';

const sample=readFileSync(new URL('../public/examples/hacker-news.openapi.yaml',import.meta.url),'utf8');
test('YAML public example imports exactly two real read-only GET operations',()=>{
 const parsed=parseOpenapi(sample);
 const preview=openapiPreview(parsed,'https://hacker-news.firebaseio.com');
 assert.equal(preview.found,2);
 assert.deepEqual(preview.tools.map(x=>x.name),['get_latest_item_id','list_top_story_ids']);
 assert.ok(preview.tools.every(x=>x.url.startsWith('https://hacker-news.firebaseio.com/v0/')));
});
test('supports JSON source, object payload and Swagger 2 input',()=>{
 const source={openapi:'3.1.0',paths:{'/books':{get:{operationId:'get_books',summary:'Read books'},post:{operationId:'create_book'}}}};
 assert.equal(openapiPreview(parseOpenapi(JSON.stringify(source)),'https://api.example.com').found,1);
 assert.equal(openapiPreview(parseOpenapi(source),'https://api.example.com').found,1);
 assert.equal(openapiPreview(parseOpenapi('swagger: \"2.0\"\npaths:\n  /status:\n    get:\n      operationId: get_status'),'https://api.example.com').found,1);
});
test('invalid YAML syntax, unsafe YAML aliases and duplicate YAML keys reject',()=>{
 assert.throws(()=>parseOpenapi('openapi: 3.1.0\npaths: [not-an-object]'),/OPENAPI_PATHS_REQUIRED/);
 assert.throws(()=>parseOpenapi('openapi: 3.1.0\npaths: {}\npaths: {}'),/INVALID_OPENAPI_YAML/);
 assert.throws(()=>parseOpenapi('openapi: 3.1.0\npaths: &x {}\nshadow: *x'),/INVALID_OPENAPI_YAML/);
});
test('over-sized specification and non-OpenAPI text fail before storage',()=>{
 assert.throws(()=>parseOpenapi('x'.repeat(262145)),/OPENAPI_DOCUMENT_TOO_LARGE/);
 assert.throws(()=>parseOpenapi('Not a specification'),/INVALID_OPENAPI_YAML|OPENAPI_PATHS_REQUIRED|INVALID_OPENAPI_DOCUMENT/);
 assert.throws(()=>parseOpenapi('{"paths":{}}'),/OPENAPI_VERSION_REQUIRED/);
});
test('preview refuses internal and non-HTTPS hosts',()=>{
 const doc=parseOpenapi(sample);
 for(const url of ['http://example.com','https://localhost','https://127.0.0.1','https://x.internal'])assert.throws(()=>openapiPreview(doc,url));
});
test('source loader accepts file/paste and blocks conflicting remote document inputs',async()=>{
 const x=await resolveOpenapiInput({document_text:sample});
 assert.equal(x.origin,'pasted_or_uploaded_document');
 const p=openapiPreview(x.document,'https://hacker-news.firebaseio.com');
 assert.equal(p.found,2);
 await assert.rejects(()=>resolveOpenapiInput({spec_url:'https://example.com/openapi.yaml',document_text:sample}),/CHOOSE_SPEC_URL_OR_DOCUMENT/);
 await assert.rejects(()=>resolveOpenapiInput({spec_url:'http://localhost/spec.yaml'}));
});
