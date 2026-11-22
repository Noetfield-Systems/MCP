import express from 'express';
import {q} from './db.mjs';

// This is an attribution-to-observed-activation funnel, never a device-level
// install count, signed buyer contract or verified sale.
const asCount=value=>Number.isSafeInteger(Number(value))&&Number(value)>=0?Number(value):0;
export function channelFunnel(raw={}){
 const referrals=asCount(raw.referrals),published=asCount(raw.published),used=asCount(raw.used),
   returning=asCount(raw.returning),recent=asCount(raw.recent);
 return {kind:'observed_referral_activation',
   referred_signups:referrals,
   referred_accounts_with_published_server:Math.min(published,referrals),
   referred_accounts_with_successful_recorded_tool_calls:Math.min(used,referrals),
   referred_accounts_used_on_multiple_days:Math.min(returning,used,referrals),
   referred_signups_last_30d:Math.min(recent,referrals),
   attribution:'signup referral code; no cross-site tracking',
   note:'Observed server publishing and calls can include internal QA or test traffic. They do not prove a human buyer, unique external organization, installed AI host, paid customer, or revenue.'};
}
export function channelRouter(auth){
 const router=express.Router();
 router.get('/api/growth/channel',auth,async(req,res)=>{
  const result=await q(\`WITH referred AS (
   SELECT gr.invitee_id,gr.created_at,
     EXISTS(SELECT 1 FROM servers s WHERE s.owner_id=gr.invitee_id AND s.status='published') AS has_publication,
     EXISTS(SELECT 1 FROM servers s JOIN tool_events te ON te.server_id=s.id
       WHERE s.owner_id=gr.invitee_id AND te.success=true) AS has_success,
     (SELECT count(DISTINCT date_trunc('day',te.created_at))::int FROM servers s
       JOIN tool_events te ON te.server_id=s.id
       WHERE s.owner_id=gr.invitee_id AND te.success=true) AS active_days
   FROM growth_referrals gr
   JOIN accounts a ON a.id=gr.invitee_id
   WHERE gr.inviter_id=$1 AND a.email NOT LIKE '%@foundry.invalid'
  ) SELECT count(*)::int AS referrals,
   count(*) FILTER (WHERE has_publication)::int AS published,
   count(*) FILTER (WHERE has_success)::int AS used,
   count(*) FILTER (WHERE active_days>=2)::int AS returning,
   count(*) FILTER (WHERE created_at>now()-interval '30 days')::int AS recent
   FROM referred\`,[req.user.id]);
  res.setHeader('Cache-Control','no-store');
  return res.json({...channelFunnel(result.rows[0]),
    measured_at:new Date().toISOString(),source:'account-scoped PostgreSQL referral, published-server and tool-events records'});
 });
 return router;
}
