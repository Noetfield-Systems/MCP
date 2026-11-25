import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=async p=>readFile(new URL('../'+p,import.meta.url),'utf8');

test('API-owner landing offers fixed-scope Quickstart and genuine quote alternatives',async()=>{
 const page=await read('public/solutions.html');
 assert.match(page,/CA\$199/);
 assert.match(page,/Up to three read-only GET tools/i);
 assert.match(page,/href="https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+"/);
 assert.match(page,/href="\/#agent-launch"/);
 assert.match(page,/href="\/readiness"/);
 assert.match(page,/Customer acceptance and successful paid order records are separate/i);
 assert.equal((page.match(/<details>/g)||[]).length,4);
 assert.equal((page.match(/<\/details>/g)||[]).length,4);
});
test('FAQ structured data corresponds to visible, truthful FAQ questions',async()=>{
 const page=await read('public/solutions.html');
 const tags=[...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
 assert.ok(tags.length>=1);
 const faq=tags.map(t=>JSON.parse(t[1])).find(x=>x['@type']==='FAQPage');
 assert.ok(faq);
 assert.equal(faq.mainEntity.length,4);
 for(const question of faq.mainEntity){
  assert.equal(question['@type'],'Question');
  assert.ok(page.includes(question.name));
  assert.ok(question.acceptedAnswer.text.length>60);
 }
 assert.ok(!page.includes('1000+ paying customers'));
 assert.ok(!page.includes('guaranteed real earnings'));
});
test('buyer FAQ has responsive, keyboard-visible styling with no cross-venture branding',async()=>{
 const css=await read('public/growth.css');
 assert.match(css,/\.foundry-buyer-faq/);
 assert.match(css,/:focus-within/);
 const page=await read('public/solutions.html');
 assert.match(page,/class="growth-section foundry-buyer-faq"/);
 assert.ok(!page.includes('Noetfield Systems Inc. owns all ventures'));
});
