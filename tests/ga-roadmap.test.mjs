import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('GA ledger preserves exactly 100 canonical Strategy V3 ranked priorities',()=>{
 const canonical=read('docs/STRATEGY-PRIORITIES-2026-11-18.fa.md');
 const ledger=read('docs/GA-100-EXECUTION-LEDGER.md');
 const actions=canonical.split('\n').map(line=>{
  const m=line.match(/^\|\s*(\d{1,3})\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*$/);
  return m?{rank:Number(m[1]),title:m[2].trim()}:null;
 }).filter(Boolean);
 assert.equal(actions.length,100);
 for(const a of actions){
  const matches=ledger.split('\n').filter(line=>line.startsWith('| '+a.rank+' | '));
  assert.equal(matches.length,1,'missing/duplicated rank '+a.rank);
  assert.ok(matches[0].includes(a.title),'title drift at rank '+a.rank);
 }
});

test('release roadmap separates commercial receipt from release and points to incident',()=>{
 const plan=read('docs/GA-RELEASE-EXECUTION-2026-11-18.md');
 const readme=read('README.md');
 assert.match(plan,/issues\/47/);
 assert.match(plan,/Technical GA/);
 assert.match(plan,/payment.*acceptance/i);
 assert.match(plan,/30 concrete upgrades/);
 assert.match(readme,/GA-100-EXECUTION-LEDGER\.md/);
 assert.match(readme,/GA-RELEASE-EXECUTION-2026-11-18\.md/);
});
