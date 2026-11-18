import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('simulated persona review answers exactly 100 distinct numbered questions',()=>{
  const doc=readFileSync(new URL('../docs/UX-100-QUESTION-REVIEW.md',import.meta.url),'utf8');
  const numbers=[...doc.matchAll(/^(\d+)\. \*\*([^\n]+)\*\*/gm)];
  assert.equal(numbers.length,100,'100 answered user questions');
  assert.deepEqual(numbers.map(m=>Number(m[1])),Array.from({length:100},(_,i)=>i+1),'question numbering continuous');
  const roles=[...doc.matchAll(/^## \d\d · /gm)];
  assert.equal(roles.length,10,'ten distinct explicitly simulated personas');
  const answers=[...doc.matchAll(/\*\*Answer — (SHIPPED|PARTIAL|NOT_YET|IMPROVED|NEXT):\*\* (.+)/g)];
  assert.equal(answers.length,100,'each question has one explicit answer');
  assert.ok(answers.every(m=>m[2].trim().length>48),'nontrivial evidence-based answers');
  assert.match(doc,/not interviews with ten real people/i,'no claim of actual human research');
});

test('premium landing has truthful FAQ, a gateway status and accessible navigation',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 assert.match(html,/<main id="main">/);
 assert.match(html,/class="skip-link" href="#main"/);
 assert.match(html,/aria-expanded="false"/);
 assert.match(html,/id="hero-gateway"/);
 assert.equal((html.match(/class="faq-item"/g)||[]).length,10);
 assert.match(html,/href="\/premium.css"/);
 assert.match(html,/id="catalog-search"/);
 assert.doesNotMatch(html,/10,000 active customers|\$[0-9,]+ in sales/i);
});
