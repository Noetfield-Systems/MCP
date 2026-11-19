import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prospectSeed,prospectStages,validateProspectPatch} from '../src/prospects.mjs';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('CRM contains exactly twenty distinct real named organizations, with public source and outreach evidence',()=>{
 assert.equal(prospectSeed.length,20);
 assert.equal(new Set(prospectSeed.map(p=>p.slug)).size,20);
 for(const p of prospectSeed){
  assert.match(p.company,/.+/);
  assert.match(p.api_docs,/^https:\/\//);
  assert.match(p.contact,/^https:\/\//);
  assert.ok(p.evidence.length>=2,p.company+' needs independent evidence');
  assert.ok(p.evidence.every(x=>x.startsWith('https://')));
  assert.ok(p.pitch.length>100,p.company+' needs a real tailored outreach note');
  assert.match(p.mcp_status,/.+/);
  assert.ok(['P1','P2','P3'].includes(p.priority));
 }
});

test('research CRM is distinct from opt-in customer leads, protected by operator authorization',()=>{
 const source=read('src/prospects.mjs');
 const db=read('src/db.mjs');
 const server=read('src/server.mjs');
 assert.match(db,/CREATE TABLE IF NOT EXISTS prospect_accounts/);
 assert.match(source,/ON CONFLICT \(id\) DO NOTHING/);
 assert.match(source,/router\.get\('\/api\/admin\/prospects',operator/);
 assert.match(source,/router\.patch\('\/api\/admin\/prospects\/:id',operator/);
 assert.match(source,/router\.get\('\/api\/admin\/prospects\.csv',operator/);
 assert.doesNotMatch(source,/INSERT INTO pilot_leads/);
 assert.match(server,/seedProspectAccounts\(\)/);
});

test('contacted stage requires contact receipt, and research never implies sending',()=>{
 const prior={contact_receipt:''};
 assert.throws(()=>validateProspectPatch({stage:'contacted'},prior),/CONTACT_RECEIPT_REQUIRED/);
 assert.throws(()=>validateProspectPatch({stage:'proposal'},prior),/CONTACT_RECEIPT_REQUIRED/);
 const valid=validateProspectPatch({stage:'contacted',contact_receipt:'sent-email-123',next_action:'Follow up'},prior);
 assert.equal(valid.stage,'contacted');
 assert.equal(valid.contact_receipt,'sent-email-123');
 assert.ok(prospectStages.includes('not_fit'));
 assert.throws(()=>validateProspectPatch({stage:'paying_client'},prior),/INVALID_PROSPECT_STAGE/);
});

test('public service blueprints use truthful labels and link into existing commercial routes',()=>{
 const page=read('public/blueprints.html');
 assert.equal((page.match(/class="bp-card"/g)||[]).length,10);
 assert.match(page,/not completed client projects/);
 assert.match(page,/href="\/#implementation"/);
 assert.match(page,/href="\/readiness"/);
 assert.match(read('public/solutions.html'),/href="\/blueprints"/);
 assert.match(read('public/sitemap.xml'),/mcp-foundry-web-production\.up\.railway\.app\/blueprints/);
 assert.match(read('public/operator.html'),/id="operator-prospects"/);
 assert.match(read('public/operator.js'),/operatorRequest\('GET','\/api\/admin\/prospects'\)/);
});
