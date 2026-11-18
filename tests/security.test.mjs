import test from 'node:test';
import assert from 'node:assert/strict';
import {validatedTarget,toolUrl,specTools,passwordHash,passwordMatches} from '../src/security.mjs';

test('public HTTPS host required, internal and literal IP blocked',()=>{
  assert.equal(validatedTarget('https://api.example.com/v1').hostname,'api.example.com');
  for(const candidate of ['http://example.com','https://localhost/path','https://127.0.0.1','https://[::1]','https://api.example.com:8080/test','https://x.internal']) assert.throws(()=>validatedTarget(candidate));
});
test('tools cannot redirect through agent-provided arguments',()=>{
 const tool={url:'https://api.example.com/products/{id}',params:[{name:'id',in:'path',required:true,type:'string'},{name:'category',in:'query',required:false,type:'string'}]};
 const u=new URL(toolUrl(tool,{id:'a/b',category:'house & home'}));
 assert.equal(u.hostname,'api.example.com');
 assert.equal(u.searchParams.get('category'),'house & home');
 assert.ok(u.pathname.includes('a%2Fb'));
 assert.throws(()=>toolUrl(tool,{}));
});
test('OpenAPI import only recognizes GET operations',()=>{
 const openapi={openapi:'3.1.0',paths:{'/products':{get:{operationId:'ListProducts',summary:'List products',parameters:[{name:'limit',in:'query',schema:{type:'integer'}}]},post:{operationId:'createProduct'}},'/secret':{post:{operationId:'steal'}}}};
 const result=specTools(openapi,'https://api.example.com/');
 assert.equal(result.length,1);
 assert.equal(result[0].name,'listproducts');
 assert.equal(result[0].params[0].type,'integer');
 assert.equal(result[0].url,'https://api.example.com/products');
});
test('password verifier rejects wrong passwords',()=>{
 const hash=passwordHash('correct strong passphrase');
 assert.equal(passwordMatches('correct strong passphrase',hash),true);
 assert.equal(passwordMatches('incorrect strong passphrase',hash),false);
 assert.throws(()=>passwordHash('short'));
});
