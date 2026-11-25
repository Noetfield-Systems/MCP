import test from 'node:test';
import assert from 'node:assert/strict';
import {nativePaymentEvidence,nativeEvidenceAuthorized} from '../src/outcome-evidence.mjs';
test('native payment evidence is aggregate and distinct from provider reconciliation',()=>{
 const d=nativePaymentEvidence([{currency:'cad',order_count:2,fulfilled_count:1,amount_cents:'39800',email:'not exported'}]);
 assert.deepEqual(d.currency_groups,[{currency:'CAD',source_recorded_paid_orders:2,source_recorded_accepted_orders:1,source_recorded_gross_minor:39800}]);
 assert.equal(d.provider_reconciled_revenue,null);
 assert.equal(d.provider_live_mode_confirmed,false);
 assert.equal(d.standalone_payment_link_included,false);
 assert.equal(d.customer_records_included,false);
 assert.throws(()=>nativePaymentEvidence([{currency:'cad',order_count:1,fulfilled_count:2,amount_cents:'19900'}]));
});
test('dedicated read-only identity does not accept missing or incorrect token',()=>{
 const token='x'.repeat(48);
 assert.equal(nativeEvidenceAuthorized('Bearer '+token,token),true);
 assert.equal(nativeEvidenceAuthorized(token,token),false);
 assert.equal(nativeEvidenceAuthorized('Bearer wrong',token),false);
 assert.equal(nativeEvidenceAuthorized('Bearer '+token,''),false);
});
