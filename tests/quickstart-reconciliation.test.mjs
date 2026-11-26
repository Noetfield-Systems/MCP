import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileQuickstart} from '../src/quickstart-reconciliation.mjs';
import {commercialOffers} from '../src/agent-commerce.mjs';
const url=commercialOffers().offers[0].purchase.url;
const link={id:'plink_123',url,livemode:true,active:true};
const session={id:'cs_live_1',payment_link:link.id,livemode:true,mode:'payment',currency:'cad',amount_subtotal:19900,amount_total:19900,payment_status:'paid',payment_intent:'pi_123'};
function fixture({links=[link],sessions=[session],has_more=false,charge={}}={}){
 return {paymentLinks:{list:async()=>({data:links,has_more:false})},checkout:{sessions:{list:async args=>{assert.equal(args.payment_link,link.id);return {data:sessions,has_more};}}},paymentIntents:{retrieve:async id=>({id,livemode:true,status:'succeeded',currency:'cad',amount_received:19900,latest_charge:{livemode:true,paid:true,captured:true,disputed:false,currency:'cad',payment_intent:id,amount_captured:19900,amount_refunded:0,balance_transaction:{currency:'cad',amount:19900,fee:600,net:19300},...charge}})}};
}
test('exact live merchant link and captured charge',async()=>{
 const r=await reconcileQuickstart(fixture());assert.equal(r.state,'COMPLETE_SCOPED_WINDOW');assert.equal(r.verified_charge_count,1);assert.equal(r.processor_net_minor,19300);assert.equal(r.bank_settled_revenue,null);assert.ok(!JSON.stringify(r).includes('pi_123'));
});
test('wrong merchant or test link remains unknown',async()=>{
 for(const links of [[{...link,url:'https://buy.stripe.com/other'}],[{...link,livemode:false}]])assert.equal((await reconcileQuickstart(fixture({links}))).verified_charge_count,null);
});
test('refund and disputed amounts are not misclassified',async()=>{
 const refund=await reconcileQuickstart(fixture({charge:{amount_refunded:10000}}));assert.equal(refund.retained_charge_minor,9900);assert.equal(refund.processor_net_minor,null);
 const dispute=await reconcileQuickstart(fixture({charge:{disputed:true}}));assert.equal(dispute.state,'PARTIAL_UNVERIFIED');assert.equal(dispute.verified_charge_count,0);
});
test('duplicates, test sessions, scoped orders and wrong amounts do not double count',async()=>{
 const r=await reconcileQuickstart(fixture({sessions:[session,session,{...session,livemode:false},{...session,metadata:{foundry_pilot_order_id:'order'}},{...session,amount_subtotal:1}]}));
 assert.equal(r.verified_charge_count,1);assert.equal(r.scoped_order_excluded,1);assert.equal(r.unverified_paid_sessions,3);
});
test('bounded sample and empty scope are distinct from missing provider',async()=>{
 assert.equal((await reconcileQuickstart(fixture({has_more:true}))).state,'PARTIAL_BOUNDED_SAMPLE');
 assert.equal((await reconcileQuickstart(fixture({sessions:[]}))).verified_charge_count,0);
 assert.equal((await reconcileQuickstart(null)).verified_charge_count,null);
});
