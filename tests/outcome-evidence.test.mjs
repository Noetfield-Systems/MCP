import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeOutcomes} from '../src/outcome-evidence.mjs';

test('private investor metrics preserve provenance instead of inventing customers or payouts',()=>{
 const result=summarizeOutcomes({
  accounts:{registered_accounts:3},servers:{published_servers:2,publisher_accounts:1},
  traffic:{calls:20,successes:18,active_servers:2,authenticated_principals:1,p95_ms:140},
  retention:{reused_servers:1},leads:{stored_enquiries:4},lab:{receipts:7,passes:6},
  orders:[{currency:'cad',status:'offered',order_count:3,amount_cents:'59700'},
          {currency:'cad',status:'paid',order_count:1,amount_cents:'19900'}]
 });
 assert.equal(result.acquisition.registered_accounts_all_time,3);
 assert.equal(result.activation.distinct_owner_accounts_with_published_servers,1);
 assert.equal(result.usage.observed_tool_calls_30d,20);
 assert.equal(result.usage.successful_servers_on_two_or_more_days_30d,1);
 assert.equal(result.quality.owner_initiated_test_receipts_30d,7);
 assert.equal(result.finance.recorded_order_status_groups.length,2);
 assert.equal(result.finance.processor_reconciled_revenue,null);
 assert.equal(result.finance.gross_margin,null);
 assert.ok(result.important_boundaries.some(x=>/not.*customers|not.*independently/i.test(x)));
 assert.ok(!JSON.stringify(result).includes('email'));
});

test('empty database produces bounded zeroes and unknown financial outcomes',()=>{
 const value=summarizeOutcomes();
 assert.equal(value.acquisition.registered_accounts_all_time,0);
 assert.equal(value.usage.observed_tool_calls_30d,0);
 assert.equal(value.usage.observed_p95_ms_30d,null);
 assert.deepEqual(value.finance.recorded_order_status_groups,[]);
 assert.equal(value.finance.refund_reconciliation,null);
});

test('money is separated by currency and payment status and never summed as revenue',()=>{
 const r=summarizeOutcomes({orders:[
  {currency:'cad',status:'offered',order_count:'4',amount_cents:'20000'},
  {currency:'usd',status:'paid',order_count:'1',amount_cents:'10000'}
 ]});
 assert.deepEqual(r.finance.recorded_order_status_groups.map(x=>x.currency),['CAD','USD']);
 assert.equal(r.finance.recorded_order_status_groups[0].status,'offered');
 assert.equal(r.finance.recorded_order_status_groups[1].status,'paid');
 assert.equal(r.finance.processor_reconciled_revenue,null);
});
