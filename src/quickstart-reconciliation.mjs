// Exact source-owned payment link, no checkout creation or buyer data export.
import {commercialOffers} from './agent-commerce.mjs';
const money=n=>Number.isSafeInteger(n)&&n>=0;
const idOf=x=>typeof x==='string'?x:x?.id;
const empty=state=>({schema:'foundry.quickstart-reconciliation.v1',state,scope:'checkout sessions created in the last 30 days for exact Quickstart link; bounded latest 25 completed sessions',currency:'CAD',verified_charge_count:null,gross_charge_minor:null,refund_minor:null,retained_charge_minor:null,processor_net_minor:null,bank_settled_revenue:null,delivery_verified:false,customer_records_included:false,read_only:true});
export async function reconcileQuickstart(stripe,{now=Date.now()}={}){
 if(!stripe)return empty('PROVIDER_NOT_CONFIGURED');
 const offer=commercialOffers().offers.find(x=>x.id==='public-api-quickstart');
 try{
  let link=null,cursor;
  for(let i=0;i<5;i++){
   const page=await stripe.paymentLinks.list({limit:100,...(cursor?{starting_after:cursor}:{})});
   if(!Array.isArray(page.data)||typeof page.has_more!=='boolean')return empty('INVALID_LINK_RESPONSE');
   const matches=page.data.filter(x=>x.url===offer.purchase.url&&x.livemode===true&&/^plink_[A-Za-z0-9]+$/.test(x.id));
   if(matches.length>1)return empty('AMBIGUOUS_LINK');
   if(matches.length){link=matches[0];break;}
   if(!page.has_more)return empty('LINK_NOT_FOUND_IN_MERCHANT');
   cursor=page.data.at(-1)?.id;
   if(!cursor)return empty('INVALID_LINK_CURSOR');
  }
  if(!link)return empty('LINK_SCAN_INCOMPLETE');
  const page=await stripe.checkout.sessions.list({payment_link:link.id,status:'complete',created:{gte:Math.floor(now/1000)-30*86400},limit:26});
  if(!Array.isArray(page.data)||typeof page.has_more!=='boolean')return empty('INVALID_SESSION_RESPONSE');
  const r={...empty('LINK_SESSIONS_OBSERVED'),link_active:link.active===true,verified_charge_count:0,gross_charge_minor:0,refund_minor:0,retained_charge_minor:0,processor_net_minor:0,unverified_paid_sessions:0,unpaid_sessions:0,fee_unknown_count:0,scoped_order_excluded:0};
  const seen=new Set();
  for(const s of page.data.slice(0,25)){
   if(s?.metadata?.foundry_pilot_order_id){r.scoped_order_excluded++;continue;}
   if(s?.payment_status!=='paid'){r.unpaid_sessions++;continue;}
   const pid=idOf(s.payment_intent);
   if(s.livemode!==true||s.mode!=='payment'||idOf(s.payment_link)!==link.id||s.currency!=='cad'||s.amount_subtotal!==offer.price_minor||!money(s.amount_total)||s.amount_total===0||!/^pi_[A-Za-z0-9]+$/.test(pid||'')||seen.has(pid)){r.unverified_paid_sessions++;continue;}
   seen.add(pid);
   try{
    const p=await stripe.paymentIntents.retrieve(pid,{expand:['latest_charge.balance_transaction']});
    const c=p.latest_charge;
    if(p.id!==pid||p.livemode!==true||p.status!=='succeeded'||p.currency!=='cad'||p.amount_received!==s.amount_total||!c||typeof c!=='object'||c.livemode!==true||c.paid!==true||c.captured!==true||c.disputed!==false||c.currency!=='cad'||idOf(c.payment_intent)!==pid||c.amount_captured!==s.amount_total||!money(c.amount_refunded)||c.amount_refunded>s.amount_total){r.unverified_paid_sessions++;continue;}
    r.verified_charge_count++;r.gross_charge_minor+=s.amount_total;r.refund_minor+=c.amount_refunded;r.retained_charge_minor+=s.amount_total-c.amount_refunded;
    const b=c.balance_transaction;
    if(c.amount_refunded===0&&b&&typeof b==='object'&&b.currency==='cad'&&b.amount===s.amount_total&&money(b.fee)&&Number.isSafeInteger(b.net)&&b.net===b.amount-b.fee)r.processor_net_minor+=b.net;
    else r.fee_unknown_count++;
   }catch{r.unverified_paid_sessions++;}
  }
  if(r.fee_unknown_count)r.processor_net_minor=null;
  r.state=page.has_more||page.data.length>25?'PARTIAL_BOUNDED_SAMPLE':r.unverified_paid_sessions?'PARTIAL_UNVERIFIED':'COMPLETE_SCOPED_WINDOW';
  return r;
 }catch{return empty('PROVIDER_READ_FAILED');}
}
