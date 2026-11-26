// Read-only reconciliation of existing scoped Foundry orders. No charge creation,
// customer export, balance payout or assumptions about standalone Payment Links.
const safeMinor=n=>Number.isSafeInteger(n)&&n>=0;
const idOf=x=>typeof x==='string'?x:x?.id;
const currencies=new Set(['cad','usd']);
export async function reconcileOrder(row,stripe){
 const currency=String(row.currency||'').toLowerCase();
 const fail=reason=>({state:reason,currency});
 if(!stripe)return fail('PROVIDER_NOT_CONFIGURED');
 if(!currencies.has(currency)||!safeMinor(row.amount_cents)||!/^cs_live_[A-Za-z0-9]+$/.test(row.stripe_checkout_session_id||'')||!/^pi_[A-Za-z0-9]+$/.test(row.stripe_payment_intent_id||''))return fail('MISSING_LIVE_SOURCE_BINDING');
 try{
  const s=await stripe.checkout.sessions.retrieve(row.stripe_checkout_session_id);
  if(s.id!==row.stripe_checkout_session_id||s.livemode!==true||s.mode!=='payment'||s.payment_status!=='paid'||s.amount_total!==row.amount_cents||s.currency!==currency||s.metadata?.foundry_pilot_order_id!==row.id||s.metadata?.product!=='mcp-foundry'||idOf(s.payment_intent)!==row.stripe_payment_intent_id)return fail('SESSION_MISMATCH');
  const p=await stripe.paymentIntents.retrieve(row.stripe_payment_intent_id,{expand:['latest_charge.balance_transaction']});
  const c=p.latest_charge;
  if(p.id!==row.stripe_payment_intent_id||p.livemode!==true||p.status!=='succeeded'||p.amount_received!==row.amount_cents||p.currency!==currency||!c||typeof c!=='object'||c.livemode!==true||c.paid!==true||c.captured!==true||c.amount_captured!==row.amount_cents||c.currency!==currency||idOf(c.payment_intent)!==p.id||!safeMinor(c.amount_refunded)||c.amount_refunded>row.amount_cents)return fail('CHARGE_MISMATCH');
  if(typeof c.disputed!=='boolean'||c.disputed)return fail('DISPUTED_OR_UNKNOWN');
  const b=c.balance_transaction;
  const gross=row.amount_cents,refund=c.amount_refunded;
  // The original charge balance transaction does not include subsequent
  // refund/dispute adjustments; never infer post-refund net settlement.
  const feeKnown=refund===0&&b&&typeof b==='object'&&b.currency===currency&&b.amount===gross&&safeMinor(b.fee)&&Number.isSafeInteger(b.net)&&b.net===gross-b.fee;
  return {state:'PROVIDER_LIVE_CHARGE_MATCHED',currency,gross_minor:gross,refunded_minor:refund,
   retained_charge_minor:gross-refund,processor_fee_minor:feeKnown?b.fee:null,
   processor_net_minor:feeKnown?b.net:null,processor_balance_state:feeKnown&&['available','pending'].includes(b.status)?b.status:null,
   accepted_delivery_documented:row.status==='fulfilled'&&!!row.accepted_at&&!!row.delivery_reference&&!!row.customer_acceptance_reference};
 }catch{return fail('PROVIDER_READ_FAILED');}
}
export async function reconcileOrders(rows,stripe,{limit=25}={}){
 const sample=rows.slice(0,limit),results=[];
 // Bounded sequential reads; no parallel rate-limit storm.
 for(const row of sample)results.push(await reconcileOrder(row,stripe));
 const groups=new Map(),reasons={};
 for(const r of results){
  if(r.state!=='PROVIDER_LIVE_CHARGE_MATCHED'){reasons[r.state]=(reasons[r.state]||0)+1;continue;}
  const g=groups.get(r.currency)||{currency:r.currency.toUpperCase(),matched_orders:0,documented_accepted_orders:0,gross_minor:0,refunded_minor:0,retained_charge_minor:0,processor_fee_minor:0,processor_net_minor:0,fee_unknown_orders:0,available_balance_orders:0};
  g.matched_orders++;g.documented_accepted_orders+=Number(r.accepted_delivery_documented);
  for(const k of ['gross_minor','refunded_minor','retained_charge_minor'])g[k]+=r[k];
  if(r.processor_fee_minor===null){g.fee_unknown_orders++;}else{g.processor_fee_minor+=r.processor_fee_minor;g.processor_net_minor+=r.processor_net_minor;}
  if(r.processor_balance_state==='available')g.available_balance_orders++;
  groups.set(r.currency,g);
 }
 for(const g of groups.values())if(g.fee_unknown_orders){g.processor_fee_minor=null;g.processor_net_minor=null;}
 const matched=results.filter(r=>r.state==='PROVIDER_LIVE_CHARGE_MATCHED').length;
 return {schema:'foundry.provider-reconciliation.v1',observed_at:new Date().toISOString(),state:!stripe?'PROVIDER_NOT_CONFIGURED':rows.length>limit?'PARTIAL_BOUNDED_SAMPLE':matched!==sample.length?'PARTIAL_UNVERIFIED':sample.length?'SCOPED_CHARGES_MATCHED':'NO_SCOPED_ORDERS_OBSERVED',
  inspected_orders:sample.length,matched_orders:matched,unverified_orders:sample.length-matched,unverified_reasons:reasons,currency_groups:[...groups.values()],
  scope:'non-fixture scoped pilot orders only, latest 25 within 30-day completion window; standalone links and subscriptions excluded',
  bank_settled_revenue:null,contribution_margin:null,customer_records_included:false,read_only:true};
}
