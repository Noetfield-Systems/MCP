import express from 'express';
import {q,ownedServer} from './db.mjs';

export function agencyLabel(input){
 if(input==null||input==='')return '';
 if(typeof input!=='string')throw Error('CLIENT_LABEL_MUST_BE_TEXT');
 const value=input.trim();
 if(value.length>80||/[\x00-\x1f\x7f<>]/.test(value))throw Error('CLIENT_LABEL_INVALID');
 return value;
}
export function agencySummary(rows){
 const groups=new Map();
 for(const row of rows){
  const label=row.agency_client_label||'Unassigned';
  const item=groups.get(label)||{label,servers:0,published:0,recorded_calls_30d:0,recorded_successes_30d:0};
  item.servers++;
  if(row.status==='published')item.published++;
  item.recorded_calls_30d+=Number(row.calls_30d)||0;
  item.recorded_successes_30d+=Number(row.successes_30d)||0;
  groups.set(label,item);
 }
 return [...groups.values()].sort((a,b)=>b.servers-a.servers||a.label.localeCompare(b.label));
}
export function agencyRouter(auth){
 const router=express.Router();
 router.get('/api/agency/portfolio',auth,async(req,res)=>{
  const {rows}=await q("SELECT s.id,s.name,s.slug,s.description,s.status,s.visibility,s.published_revision,s.agency_client_label,s.has_unpublished_changes,s.updated_at, "+
   "coalesce(t.tool_count,0)::int AS tool_count,coalesce(u.calls_30d,0)::int AS calls_30d,coalesce(u.successes_30d,0)::int AS successes_30d,u.last_success_at,coalesce(m.members,0)::int AS member_count "+
   "FROM servers s "+
   "LEFT JOIN LATERAL (SELECT count(*)::int AS tool_count FROM tools WHERE server_id=s.id) t ON true "+
   "LEFT JOIN LATERAL (SELECT count(*)::int AS calls_30d,count(*) FILTER(WHERE success)::int AS successes_30d,max(created_at) FILTER(WHERE success) AS last_success_at FROM tool_events WHERE server_id=s.id AND created_at>now()-interval '30 days') u ON true "+
   "LEFT JOIN LATERAL (SELECT count(*)::int AS members FROM server_members WHERE server_id=s.id) m ON true "+
   "WHERE s.owner_id=$1 ORDER BY s.agency_client_label,s.created_at DESC LIMIT 200",[req.user.id]);
  res.setHeader('Cache-Control','no-store');
  return res.json({scope:'owner_only',servers:rows,groups:agencySummary(rows),total_owned_servers:rows.length,
   note:'Client labels are manually entered internal portfolio groups, not verified client companies, paid contracts, or transferred server ownership. Recorded calls can include automated tests.'});
 });
 router.patch('/api/agency/servers/:id/client-label',auth,async(req,res)=>{
  const server=await ownedServer(req.params.id,req.user.id);
  if(!server)return res.status(404).json({error:'SERVER_NOT_FOUND'});
  let label;try{label=agencyLabel(req.body?.client_label);}
  catch(error){return res.status(400).json({error:error.message});}
  const {rows}=await q('UPDATE servers SET agency_client_label=$1,updated_at=now() WHERE id=$2 AND owner_id=$3 RETURNING id,slug,agency_client_label',[label,server.id,req.user.id]);
  res.setHeader('Cache-Control','no-store');
  return res.json({server:rows[0],source:'owner_supplied_label',ownership_transferred:false});
 });
 return router;
}
