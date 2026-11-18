import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(file)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('fresh PostgreSQL bootstrap creates pilot_orders before altering it',()=>{
  const source=read('src/db.mjs');
  const created=source.indexOf('CREATE TABLE IF NOT EXISTS pilot_orders (');
  const altered=source.indexOf('ALTER TABLE pilot_orders ADD COLUMN IF NOT EXISTS offer_type');
  const indexed=source.indexOf('CREATE INDEX IF NOT EXISTS pilot_orders_offer_idx');
  assert.ok(created>=0,'pilot_orders DDL is present');
  assert.ok(altered>created,'offer_type migration must follow CREATE TABLE');
  assert.ok(indexed>altered,'offer index must follow offer column');
});

test('readiness assessment has real consented enquiry, not an invented purchase',()=>{
  const html=read('public/readiness.html');
  const script=read('public/readiness.js');
  assert.match(html,/id="readiness-assessment"/);
  assert.match(html,/id="rdy-enquiry"/);
  assert.match(html,/name="contact_consent" required/);
  assert.match(html,/name="marketing_consent"/);
  assert.match(html,/12-point API-to-Agent launch checklist/);
  assert.match(html,/Print \/ Save as PDF/);
  assert.match(html,/src="\/readiness.js"/);
  assert.match(script,/fetch\('\/api\/pilot-interest'/);
  assert.match(script,/service_package:assessment\?\.result\.offer\|\|'custom'/);
  assert.match(script,/if\(!resp\.ok \|\| !data\.received \|\| !data\.reference\)/);
});

test('customer readiness link is discoverable without a fake signup gate',()=>{
  assert.match(read('public/solutions.html'),/href="\/readiness"/);
  assert.match(read('public/sitemap.xml'),/https:\/\/mcp-foundry-web-production\.up\.railway\.app\/readiness/);
  const script=read('public/readiness.js');
  assert.doesNotMatch(script,/localStorage|sessionStorage/);
  assert.match(script,/contact_consent:fd\.has\('contact_consent'\)/);
});
