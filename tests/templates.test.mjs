import test from 'node:test';
import assert from 'node:assert/strict';
import {STARTER_TEMPLATES,publicTemplates,findTemplate} from '../src/templates.mjs';
import {validatedTarget,toolUrl} from '../src/security.mjs';

test('live-source starter catalog contains only guarded HTTPS GET tools',()=>{
 assert.equal(STARTER_TEMPLATES.length,3);
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
 assert.equal(publicTemplates().length,3);
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
