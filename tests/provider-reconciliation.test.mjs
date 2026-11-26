import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileOrder,reconcileOrders} from '../src/provider-reconciliation.mjs';
const row={id:'order-fixture',amount_cents:19900,currency:'cad',status:'fulfilled',stripe_checkout_session_id:'cs_live_example',stripe_payment_intent_id:'pi_example',accepted_at:'2026-11-25',delivery_reference:'delivery',customer_acceptance_reference:'acceptance'};
function fixture({session={},intent={},charge={},balance={}}={}){
 const calls=[];
 const stripe={checkout:{sessions:{retrieve:async id=>{calls.push(id);return {id,livemode:true,mode:'payment',payment_status:'paid',amount_total:19900,currency:'cad',metadata:{foundry_pilot_order_id:row.id,product:'mcp-foundry'},payment_intent:row.stripe_payment_intent_id,...session};}}},
 paymentIntents:{retrieve:async id=>{calls.push(id);return {id,livemode:true,status:'succeeded',amount_received:19900,currency:'cad',latest_charge:{livemode:true,paid:true,captured:true,amount_captured:19900,currency:'cad',payment_intent:id,amount_refunded:0,disputed:false,balance_transaction:{currency:'cad',amount:19900,fee:600,net:19300,status:'available',...balance},...charge},...intent};}}};
 return {stripe,calls};
}
test('provider-bound live payment and fees, distinct from bank payout',async()=>{
 const {stripe}=fixture();const r=await reconcileOrders([row],stripe);
 assert.equal(r.state,'SCOPED_CHARGES_MATCHED');assert.equal(r.currency_groups[0].processor_net_minor,19300);assert.equal(r.currency_groups[0].documented_accepted_orders,1);assert.equal(r.bank_settled_revenue,null);assert.ok(!JSON.stringify(r).includes(row.stripe_payment_intent_id));
});
test('test-mode, wrong merchant order, wrong amount and dispute are not recognized',async()=>{
 for(const options of [{session:{livemode:false}},{session:{metadata:{foundry_pilot_order_id:'other'}}},{intent:{amount_received:1}},{charge:{disputed:true}}]){
  const r=await reconcileOrder(row,fixture(options).stripe);assert.notEqual(r.state,'PROVIDER_LIVE_CHARGE_MATCHED');
 }
});
test('partial refund is observed but net and fee unknown',async()=>{
 const r=await reconcileOrders([row],fixture({charge:{amount_refunded:9900}}).stripe);
 assert.equal(r.currency_groups[0].retained_charge_minor,10000);assert.equal(r.currency_groups[0].processor_net_minor,null);
});
test('currency mismatch does not combine settlement fee',async()=>{
 const r=await reconcileOrder(row,fixture({balance:{currency:'usd'}}).stripe);
 assert.equal(r.state,'PROVIDER_LIVE_CHARGE_MATCHED');assert.equal(r.processor_fee_minor,null);
});
test('missing provider and bounded coverage remain explicit',async()=>{
 assert.equal((await reconcileOrders([row],null)).state,'PROVIDER_NOT_CONFIGURED');
 const {stripe,calls}=fixture();const r=await reconcileOrders([row,row],stripe,{limit:1});
 assert.equal(r.state,'PARTIAL_BOUNDED_SAMPLE');assert.equal(calls.length,2);
 assert.equal((await reconcileOrders([],stripe)).state,'NO_SCOPED_ORDERS_OBSERVED');
});
test('source failures and missing bindings do not become zero revenue',async()=>{
 const r=await reconcileOrders([row],{checkout:{sessions:{retrieve:async()=>{throw Error('provider');}}}});
 assert.equal(r.state,'PARTIAL_UNVERIFIED');assert.equal(r.currency_groups.length,0);assert.equal(r.bank_settled_revenue,null);
 assert.equal((await reconcileOrder({...row,stripe_checkout_session_id:'cs_test_x'},fixture().stripe)).state,'MISSING_LIVE_SOURCE_BINDING');
});
