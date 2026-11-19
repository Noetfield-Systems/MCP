import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateOrderAcceptance} from '../src/order-acceptance.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('fulfillment demands separately documented source-backed delivery and customer acceptance',()=>{
 for(const input of [undefined,{},{
  delivery_reference:'released build evidence',
  accepted_by:'Authorized customer'},
 {delivery_reference:'release-2026-11-18',
  customer_acceptance_reference:'pending',accepted_by:'Customer'}]){
  assert.throws(()=>validateOrderAcceptance(input));
 }
 const approved=validateOrderAcceptance({delivery_reference:'release-2026-11-18-accepted-client-test',
  customer_acceptance_reference:'customer-email-msg-reference-9ca2',accepted_by:'Customer technical lead'});
 assert.equal(approved.delivery_reference,'release-2026-11-18-accepted-client-test');
 assert.equal(approved.customer_acceptance_reference,'customer-email-msg-reference-9ca2');
 assert.equal(approved.accepted_by,'Customer technical lead');
});
test('admin-only fulfill endpoint updates paid orders with real acceptance references',()=>{
 const s=read('src/expansion.mjs'),db=read('src/db.mjs'),operator=read('public/operator.js');
 assert.match(s,/router\.post\('\/api\/admin\/pilot-orders\/:id\/fulfill',operator/);
 assert.match(s,/validateOrderAcceptance\(req.body\)/);
 assert.match(s,/status='paid' AND stripe_checkout_session_id IS NOT NULL/);
 assert.match(s,/customer_acceptance_reference=\$3/);
 assert.match(db,/ADD COLUMN IF NOT EXISTS customer_acceptance_reference/);
 assert.match(db,/ADD COLUMN IF NOT EXISTS accepted_at/);
 assert.match(operator,/Customer sign-off reference/);
 assert.match(operator,/data-acceptance="delivery_reference"/);
 assert.match(operator,/data-acceptance="customer_acceptance_reference"/);
 assert.doesNotMatch(s,/status='fulfilled'.*WHERE id=\$1 AND status='paid' RETURNING id,status/);
});
test('actual backup restore script cannot connect to production and CI uses isolated PostgreSQL service',()=>{
 const script=read('scripts/isolated-postgres-restore-drill.mjs');
 const workflow=read('.github/workflows/disposable-postgres-restore.yml');
 assert.match(script,/REFUSING_NONLOCAL_OR_NON_DISPOSABLE_POSTGRES/);
 assert.match(script,/pg_dump/);assert.match(script,/pg_restore/);
 assert.match(script,/production_restore_performed:false/);
 assert.match(workflow,/postgres:18/);
 assert.match(workflow,/isolated-postgres-restore-drill\.mjs/);
});
