import express from 'express';
import {createHash,timingSafeEqual} from 'node:crypto';
import {q} from './db.mjs';

// An operator-only source-backed investor evidence readout; observations are
// not audited customers, processor-settled revenue or financial statements.
const integer=v=>Number.isSafeInteger(Number(v))&&Number(v)>=0?Number(v):0;
export function summarizeOutcomes(rows){
 const a=rows?.accounts||{},s=rows?.servers||{},t=rows?.traffic||{},l=rows?.leads||{},lab=rows?.lab||{};
 const orders=Array.isArray(rows?.orders)?rows.orders.map(o=>({
   currency:String(o.currency||'').toUpperCase(),status:String(o.status||''),
   order_count:integer(o.order_count),recorded_amount_minor_units:integer(o.amount_cents)
 })):[];
 return {
  evidence_tier:'internal_postgresql_event_counts',
  measured_at:new Date().toISOString(),period:'rolling_30_days_except_all_time_counts',
  acquisition:{registered_accounts_all_time:integer(a.registered_accounts),
    stored_consent_based_enquiries_all_time:integer(l.stored_enquiries)},
  activation:{published_servers_all_time:integer(s.published_servers),
    distinct_owner_accounts_with_published_servers:integer(s.publisher_accounts)},
  usage:{observed_tool_calls_30d:integer(t.calls),observed_successes_30d:integer(t.successes),
    observed_active_servers_30d:integer(t.active_servers),observed_authenticated_principals_30d:integer(t.authenticated_principals),
    successful_servers_on_two_or_more_days_30d:integer(rows?.retention?.reused_servers),
    observed_p95_ms_30d:t.calls?integer(t.p95_ms):null},
  quality:{owner_initiated_test_receipts_30d:integer(lab.receipts),
    owner_test_passes_30d:integer(lab.passes)},
  finance:{recorded_order_status_groups:orders,
    processor_reconciled_revenue:null,refund_reconciliation:null,gross_margin:null,
    note:'Internal order statuses and amounts are NOT a Stripe/bank reconciliation or proof of settled revenue.'},
  important_boundaries:[
   'Accounts and source invocations are not independently identified external organizations.',
   'Some recorded invocations may be automated tests; tool-call counts are not customers.',
   'Internal test accounts ending in @foundry.invalid are excluded from the core account and usage metrics.',
   'Pilot enquiries are not contracted customers and published endpoints are not installations.',
   'Infrastructure and labor costs are not available in this snapshot; margin is intentionally unknown.'
  ]
 };
}

export function nativePaymentEvidence(rows){
 const amounts=Array.isArray(rows)?rows.map(row=>{
  const currency=String(row.currency||'').toUpperCase();
  if(!['CAD','USD'].includes(currency))throw Error('INVALID_NATIVE_CURRENCY');
  const count=Number(row.order_count),fulfilled=Number(row.fulfilled_count),minor=Number(row.amount_cents);
  if(![count,fulfilled,minor].every(x=>Number.isSafeInteger(x)&&x>=0)||fulfilled>count)throw Error('INVALID_NATIVE_PAYMENT_AGGREGATE');
  return {currency,source_recorded_paid_orders:count,source_recorded_accepted_orders:fulfilled,source_recorded_gross_minor:minor};
 }):[];
 return {schema:'sina.foundry.payment-evidence.v1',source:'MCP_FOUNDRY_PILOT_ORDER_LEDGER',
  generated_at:new Date().toISOString(),currency_groups:amounts,
  evidence_state:'SOURCE_RECORDED_CHECKOUT_PAYMENT_NOT_PROVIDER_RECONCILED',
  provider_reconciled_revenue:null,provider_live_mode_confirmed:false,
  standalone_payment_link_included:false,customer_records_included:false,read_only:true};
}

export function nativeEvidenceAuthorized(header,expected){
 if(typeof expected!=='string'||expected.length<40||expected.length>512)return false;
 if(typeof header!=='string'||!/^Bearer /i.test(header)||header.length>519)return false;
 const supplied=header.slice(7);
 if(!supplied)return false;
 const digest=x=>createHash('sha256').update(x).digest();
 return timingSafeEqual(digest(supplied),digest(expected));
}

export function outcomeEvidenceRouter({operator}){
 const router=express.Router();
 router.get('/api/integrations/founder/payment-evidence',async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  const expected=process.env.FOUNDRY_PORTFOLIO_READ_TOKEN||'';
  if(expected.length<40||expected.length>512)return res.status(503).json({error:'NATIVE_EVIDENCE_TOKEN_NOT_CONFIGURED'});
  if(!nativeEvidenceAuthorized(req.get('authorization'),expected))return res.status(403).json({error:'NATIVE_EVIDENCE_AUTH_REQUIRED'});
  try{
   const result=await q("SELECT o.currency,count(*)::int order_count,count(*) FILTER (WHERE o.status='fulfilled' AND o.accepted_at IS NOT NULL AND o.customer_acceptance_reference IS NOT NULL AND o.delivery_reference IS NOT NULL)::int fulfilled_count,coalesce(sum(o.amount_cents),0)::bigint amount_cents FROM pilot_orders o JOIN pilot_leads l ON l.id=o.lead_id WHERE o.status IN ('paid','fulfilled') AND o.stripe_checkout_session_id IS NOT NULL AND o.stripe_payment_intent_id IS NOT NULL AND o.completed_at IS NOT NULL AND l.email NOT LIKE '%@foundry.invalid' GROUP BY o.currency ORDER BY o.currency");
   return res.json(nativePaymentEvidence(result.rows));
  }catch(e){return res.status(503).json({error:'NATIVE_PAYMENT_EVIDENCE_UNAVAILABLE'});}
 });

 router.get('/api/admin/investor-evidence',operator,async(_req,res)=>{
  const [accounts,servers,traffic,retention,leads,lab,orders]=await Promise.all([
   q("SELECT count(*)::int registered_accounts FROM accounts WHERE email NOT LIKE '%@foundry.invalid'"),
   q("SELECT count(*)::int published_servers,count(DISTINCT s.owner_id)::int publisher_accounts FROM servers s JOIN accounts a ON a.id=s.owner_id WHERE a.email NOT LIKE '%@foundry.invalid' AND s.status='published'"),
   q("SELECT count(*)::int calls,count(*) FILTER (WHERE te.success)::int successes,count(DISTINCT te.server_id)::int active_servers,count(DISTINCT te.account_id)::int authenticated_principals,coalesce(round(percentile_cont(0.95) WITHIN GROUP (ORDER BY te.duration_ms)),0)::int p95_ms FROM tool_events te JOIN servers s ON s.id=te.server_id JOIN accounts a ON a.id=s.owner_id WHERE a.email NOT LIKE '%@foundry.invalid' AND te.created_at>now()-interval '30 days'"),
   q("SELECT count(*)::int reused_servers FROM (SELECT te.server_id FROM tool_events te JOIN servers s ON s.id=te.server_id JOIN accounts a ON a.id=s.owner_id WHERE te.success=true AND a.email NOT LIKE '%@foundry.invalid' AND te.created_at>now()-interval '30 days' GROUP BY te.server_id HAVING count(DISTINCT date_trunc('day',te.created_at))>=2) t"),
   q("SELECT count(*)::int stored_enquiries FROM pilot_leads"),
   q("SELECT count(*)::int receipts,count(*) FILTER (WHERE r.outcome='passed')::int passes FROM integration_test_receipts r JOIN servers s ON s.id=r.server_id JOIN accounts a ON a.id=s.owner_id WHERE a.email NOT LIKE '%@foundry.invalid' AND r.created_at>now()-interval '30 days'"),
   q("SELECT currency,status,count(*)::int order_count,coalesce(sum(amount_cents),0)::bigint amount_cents FROM pilot_orders GROUP BY currency,status ORDER BY currency,status")
  ]);
  res.setHeader('Cache-Control','no-store');
  res.json(summarizeOutcomes({accounts:accounts.rows[0],servers:servers.rows[0],
    traffic:traffic.rows[0],retention:retention.rows[0],leads:leads.rows[0],
    lab:lab.rows[0],orders:orders.rows}));
 });
 return router;
}
