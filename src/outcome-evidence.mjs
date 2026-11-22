import express from 'express';
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

export function outcomeEvidenceRouter({operator}){
 const router=express.Router();
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
