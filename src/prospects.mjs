import express from 'express';
import {readFileSync} from 'node:fs';
import {q} from './db.mjs';

// Source-controlled only publicly documented business contacts. This data is research,
// not customer consent, and never populates the consented pilot_leads table.
// Optional commercial research must never prevent the core customer app from starting.
export function loadProspectResearch(source=new URL('../data/researched-prospects.json',import.meta.url),reader=readFileSync){
  try{
    const parsed=JSON.parse(reader(source,'utf8'));
    if(!parsed||!Array.isArray(parsed.prospects))throw Error('INVALID_PROSPECT_RESEARCH');
    return parsed;
  }catch(error){
    console.error('prospect_research_unavailable',String(error?.code||error?.message||'UNKNOWN'));
    return {as_of:null,prospects:[]};
  }
}
export const research=loadProspectResearch();
export const prospectStages=Object.freeze(['researched','qualified','contacted','replied','discovery','proposal','won','lost','not_fit']);
export const prospectSeed=Object.freeze(research.prospects);
const knownIds=new Set(prospectSeed.map(p=>p.slug));
const bounded=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';

export async function seedProspectAccounts(){
  for(const p of prospectSeed){
    await q(`INSERT INTO prospect_accounts (id,company,segment,api_docs_url,contact_url,contact_email,mcp_status,
      evidence,proposed_task,offer,rank,research_as_of,next_action)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13)
      ON CONFLICT (id) DO NOTHING`,
      [p.slug,p.company,p.segment,p.api_docs,p.contact,p.contact_email,p.mcp_status,JSON.stringify(p.evidence),
       p.task,p.offer,p.rank,research.as_of,'Review public API scope and validate the specific gap; send only a tailored proposal if appropriate.']);
  }
}
export function validateProspectPatch(raw,previous){
  const p=raw&&typeof raw==='object'?raw:{};
  const stage=bounded(p.stage,30);
  if(!prospectStages.includes(stage))throw Error('INVALID_PROSPECT_STAGE');
  const notes=bounded(p.operator_notes,4000);
  const nextAction=bounded(p.next_action,500);
  const receipt=bounded(p.contact_receipt,800);
  // Recording "contacted" or later requires an explicit trace such as a sent-message ID.
  // Notes and a company website are not proof that outreach happened.
  if(['contacted','replied','discovery','proposal','won'].includes(stage) &&
      !(receipt||previous.contact_receipt))throw Error('CONTACT_RECEIPT_REQUIRED');
  return {stage,operator_notes:notes,next_action:nextAction,contact_receipt:receipt||previous.contact_receipt||''};
}
export function prospectRouter({operator}){
  const router=express.Router();
  router.get('/api/admin/prospects',operator,async(_req,res)=>{
    const {rows}=await q('SELECT * FROM prospect_accounts ORDER BY rank,id');
    const details=new Map(prospectSeed.map(p=>[p.slug,p]));
    res.json({as_of:research.as_of,prospects:rows.map(r=>({...r,technical_hypothesis:details.get(r.id)?.hypothesis||'',
      outreach_subject:details.get(r.id)?.subject||'',outreach_draft:details.get(r.id)?.pitch||'',
      public_tools:details.get(r.id)?.tools||[]})),note:'Research targets only. No verified prospects contacted, no client work or revenue implied.'});
  });
  router.patch('/api/admin/prospects/:id',operator,async(req,res)=>{
    if(!knownIds.has(req.params.id))return res.status(404).json({error:'UNKNOWN_RESEARCHED_PROSPECT'});
    const current=await q('SELECT * FROM prospect_accounts WHERE id=$1',[req.params.id]);
    if(!current.rows.length)return res.status(404).json({error:'PROSPECT_NOT_FOUND'});
    let next;
    try{next=validateProspectPatch(req.body,current.rows[0]);}
    catch(e){return res.status(400).json({error:e.message});}
    const hadReceipt=Boolean(current.rows[0].contact_receipt);
    const {rows}=await q(`UPDATE prospect_accounts SET stage=$1,operator_notes=$2,next_action=$3,
      contact_receipt=$4,last_contact_at=CASE WHEN $5::boolean THEN now() ELSE last_contact_at END,
      updated_at=now() WHERE id=$6 RETURNING id,company,stage,contact_receipt,next_action,updated_at,last_contact_at`,
      [next.stage,next.operator_notes,next.next_action,next.contact_receipt,!hadReceipt&&Boolean(next.contact_receipt),req.params.id]);
    return res.json({prospect:rows[0],payment_collected:false,outreach_sent_by_foundry:false});
  });
  router.get('/api/admin/prospects.csv',operator,async(_req,res)=>{
    const {rows}=await q('SELECT id,company,segment,api_docs_url,contact_url,contact_email,mcp_status,proposed_task,offer,rank,stage,next_action,operator_notes,contact_receipt,last_contact_at FROM prospect_accounts ORDER BY rank,id');
    const fields=['id','company','segment','api_docs_url','contact_url','contact_email','mcp_status','proposed_task','offer','rank','stage','next_action','operator_notes','contact_receipt','last_contact_at'];
    const quote=v=>'"'+String(v??'').replace(/"/g,'""').replace(/^[=+@\-\t\r]/,'\x27$&')+'"';
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition','attachment; filename="foundry-researched-prospects.csv"');
    res.send([fields.join(','),...rows.map(row=>fields.map(f=>quote(row[f])).join(','))].join('\r\n')+'\r\n');
  });
  return router;
}
