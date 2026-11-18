import express from 'express';
import {randomUUID} from 'node:crypto';
import {q} from './db.mjs';

export const OPPORTUNITY_TRACKS=Object.freeze([
  {id:'api_business',name:'API owner / business',audience:'Business',goal:'Connect an existing public API to agent clients and qualify a scoped build.'},
  {id:'web3_builder',name:'Web3 / crypto data builder',audience:'Crypto-native',goal:'Create read-only onchain intelligence tools and safe market-data MCP integrations.'},
  {id:'agency_partner',name:'Agency / implementation partner',audience:'Partners',goal:'Co-deliver client integrations under a transparent project scope.'},
  {id:'developer_contributor',name:'Developer / contributor',audience:'Builders',goal:'Build audited tools, templates, docs and integration test cases.'},
  {id:'community_distribution',name:'Developer community / distribution',audience:'Growth',goal:'Run developer demos, workshops, technical content and genuine referral distribution.'},
  {id:'strategic_partner',name:'Strategic or ecosystem partner',audience:'Partnerships',goal:'Discuss technology, distribution or program collaboration without an implied financial offer.'}
]);
export const OPPORTUNITY_STAGES=Object.freeze(['new','contacted','qualified','collaborating','closed']);
export class OpportunityError extends Error{
  constructor(code){super(code);this.code=code;}
}
const bounded=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
const allowedSources=new Set(['direct','organic','github','referral','community','social','web3','partner','other']);
const optionalUrl=(raw,hosts=null)=>{
  const value=bounded(raw,400);
  if(!value)return '';
  let u;try{u=new URL(value);}catch{throw new OpportunityError('VALID_HTTPS_URL_REQUIRED');}
  if(u.protocol!=='https:'||u.username||u.password||!u.hostname||u.hostname==='localhost'
     ||!u.hostname.includes('.')||u.hostname.endsWith('.internal')||u.hostname.endsWith('.local')
     ||(hosts&&!hosts.has(u.hostname.toLowerCase())))throw new OpportunityError('PUBLIC_HTTPS_URL_REQUIRED');
  u.hash='';return u.href.slice(0,400);
};
export function validateOpportunity(raw){
  const d=raw&&typeof raw==='object'?raw:{};
  if(d.contact_consent!==true)throw new OpportunityError('CONTACT_CONSENT_REQUIRED');
  const track=bounded(d.track,60);
  if(!OPPORTUNITY_TRACKS.some(t=>t.id===track))throw new OpportunityError('INVALID_OPPORTUNITY_TRACK');
  const contact_name=bounded(d.contact_name,120),email=bounded(d.email,180).toLowerCase();
  if(contact_name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new OpportunityError('VALID_CONTACT_NAME_AND_EMAIL_REQUIRED');
  const project_brief=bounded(d.project_brief,2400);
  if(project_brief.length<30)throw new OpportunityError('SPECIFIC_PROJECT_BRIEF_REQUIRED');
  const source=bounded(d.source,40).toLowerCase();
  return {
    track,contact_name,email,
    organization:bounded(d.organization,160),
    website:optionalUrl(d.website),
    github_url:optionalUrl(d.github_url,new Set(['github.com','www.github.com'])),
    project_brief,
    source:allowedSources.has(source)?source:'other',
    updates_consent:d.updates_consent===true,
    contact_consent:true
  };
}
export function opportunityRouter({operator}){
  const router=express.Router();
  // In-instance burst guard + global IP throttle. No user-agent fingerprints,
  // speculative identity inference, reward farming, or browser cookies.
  const buckets=new Map();
  router.get('/api/opportunities/tracks',(_req,res)=>res.json({tracks:OPPORTUNITY_TRACKS,
    note:'All tracks accept real contact requests. No hiring, paid bounties, investment or approval are promised.'}));
  router.post('/api/opportunities',async(req,res)=>{
    if(req.body?.nickname)return res.status(202).json({received:true,kind:'ignored_spam'});
    const key=req.ip||'unknown',now=Date.now(),prior=buckets.get(key);
    const bucket=prior&&prior.until>now?prior:{n:0,until:now+600000};
    if(bucket.n>=8)return res.status(429).json({error:'OPPORTUNITY_RATE_LIMIT'});
    bucket.n+=1;buckets.set(key,bucket);
    if(buckets.size>5000)for(const [k,b] of buckets)if(b.until<now)buckets.delete(k);
    let input;try{input=validateOpportunity(req.body);}catch(e){
      return res.status(400).json({error:e instanceof OpportunityError?e.code:'INVALID_OPPORTUNITY'});
    }
    try{
      const {rows}=await q(`INSERT INTO opportunity_applications
        (id,email,contact_name,track,organization,website,github_url,project_brief,source,contact_consent,updates_consent)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT(email,track) DO UPDATE SET
          contact_name=excluded.contact_name,organization=excluded.organization,
          website=excluded.website,github_url=excluded.github_url,
          project_brief=excluded.project_brief,source=excluded.source,
          contact_consent=excluded.contact_consent,updates_consent=excluded.updates_consent,
          updated_at=now()
        RETURNING id,track,status,created_at`,
        [randomUUID(),input.email,input.contact_name,input.track,input.organization,
         input.website,input.github_url,input.project_brief,input.source,
         input.contact_consent,input.updates_consent]);
      // A received application is not a qualified contact, signed deal,
      // compensation, investment or successful payment.
      res.status(202).json({received:true,reference:rows[0].id,track:rows[0].track,
        status:rows[0].status,paid:false,promise_of_work:false});
    }catch(e){
      console.error('foundry_opportunity_write_failed',e?.code||'UNKNOWN');
      return res.status(500).json({error:'OPPORTUNITY_SUBMISSION_FAILED'});
    }
  });
  router.get('/api/admin/opportunities',operator,async(_req,res)=>{
    const [list,totals]=await Promise.all([
      q(`SELECT id,email,contact_name,track,organization,website,github_url,project_brief,
        source,contact_consent,updates_consent,status,created_at,updated_at
        FROM opportunity_applications ORDER BY updated_at DESC LIMIT 150`),
      q(`SELECT track,status,count(*)::int AS count FROM opportunity_applications
        GROUP BY track,status ORDER BY track,status`)
    ]);
    res.json({applications:list.rows,counts:totals.rows,
      note:'Verified stored form records only, no inferred customers, hires, partners or revenue.'});
  });
  router.patch('/api/admin/opportunities/:id',operator,async(req,res)=>{
    if(!OPPORTUNITY_STAGES.includes(req.body?.status))
      return res.status(400).json({error:'INVALID_OPPORTUNITY_STATUS'});
    const {rows}=await q(`UPDATE opportunity_applications SET status=$1,updated_at=now()
        WHERE id=$2 RETURNING id,track,status,updated_at`,
        [req.body.status,req.params.id]);
    if(!rows.length)return res.status(404).json({error:'OPPORTUNITY_NOT_FOUND'});
    res.json({application:rows[0],payment_collected:false});
  });
  return router;
}
