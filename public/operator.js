const $=s=>document.querySelector(s);
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let operatorToken=null;
async function operatorRequest(method,path,data){
 if(!operatorToken)throw new Error('Operator token required');
 const response=await fetch(path,{
  method,headers:{Authorization:'Bearer '+operatorToken,...(data?{'Content-Type':'application/json'}:{})},
  body:data?JSON.stringify(data):undefined,credentials:'omit'
 });
 let result;try{result=await response.json();}catch{throw Error('Non-JSON service response');}
 if(!response.ok)throw Error((result.error||'OPERATION_FAILED').replaceAll('_',' '));
 return result;
}
function stageSelect(lead){
 return '<select data-lead="'+escapeHtml(lead.id)+'" class="input operator-stage">'+['new','contacted','qualified','closed'].map(s=>'<option value="'+s+'"'+(s===lead.status?' selected':'')+'>'+s+'</option>').join('')+'</select>';
}
function displayStats(d){
 const data=[
  ['Registered workspaces',d.accounts],['Published servers',d.servers.published],
  ['7-day tool calls',d.observed_7d_calls.calls],['Pilot requests',d.pilot_leads.reduce((total,r)=>total+Number(r.count),0)]
 ];
 $('#operator-stats').innerHTML=data.map(([label,value])=>'<div class="usage-card"><b>'+escapeHtml(value)+'</b><small>'+escapeHtml(label)+'</small></div>').join('');
}
function displayFunnel(f){
  const points=[
    ['Created accounts',f.accounts_created],
    ['Started template',f.template_started],
    ['Created a server',f.created_server],
    ['Added a tool',f.added_tool],
    ['Ran a successful live test',f.first_live_test],
    ['Published MCP server',f.published],
    ['Executed a managed tool',f.executed_managed_tool],
    ['Submitted an implementation enquiry',f.scoped_pilot_enquiries]
  ];
  const max=Math.max(1,...points.map(item=>Number(item[1])||0));
  $('#operator-funnel').innerHTML='<div class="funnel-grid">'+points.map(([name,count])=>'<div class="funnel-item"><div class="funnel-heading"><strong>'+escapeHtml(name)+'</strong><b>'+escapeHtml(count)+'</b></div><div class="funnel-track"><span style="width:'+Math.max(0,Math.min(100,Math.round((Number(count)||0)/max*100)))+'%"></span></div></div>').join('')+'</div><p class="hint">Rolling 30-day distinct account events; stages are not a linear cohort. Tool calls represent real upstream executions, not unique buyers. Revenue is not inferred from enquiry counts.</p>';
}
function displayLeads(leads){
 const tbody=$('#operator-leads');
 if(!leads.length){tbody.innerHTML='<tr><td colspan="5">No consented implementation requests have been received yet. This is a real empty state, not an estimate.</td></tr>';return;}
 tbody.innerHTML=leads.map(lead=>{
 const received=new Date(lead.created_at).toLocaleDateString('en-CA',{year:'numeric',month:'short',day:'numeric'});
 const email=encodeURIComponent(lead.email);
 return '<tr><td><strong>'+escapeHtml(lead.contact_name)+'</strong><small><a href="mailto:'+email+'">'+escapeHtml(lead.email)+'</a></small></td><td>'+escapeHtml(lead.company||'—')+'<small>'+escapeHtml(lead.website||'No URL provided')+'</small></td><td class="brief">'+escapeHtml(lead.project_brief)+'</td><td>'+escapeHtml(received)+'</td><td>'+stageSelect(lead)+'</td></tr>';
 }).join('');
}
const opportunityStages=['new','contacted','qualified','collaborating','closed'];
function displayOpportunities(people,counts){
 const total=counts.reduce((n,r)=>n+Number(r.count),0);
 const byTrack={};
 for(const entry of counts)byTrack[entry.track]=(byTrack[entry.track]||0)+Number(entry.count);
 const labels={api_business:'API businesses',web3_builder:'Web3 builders',agency_partner:'Agencies',
  developer_contributor:'Developers',community_distribution:'Communities',strategic_partner:'Strategic'};
 $('#opportunity-track-counts').innerHTML='<div class="funnel-grid">'+
  Object.entries(labels).map(([track,label])=>'<div class="funnel-item"><div class="funnel-heading"><strong>'+escapeHtml(label)+'</strong><b>'+escapeHtml(byTrack[track]||0)+'</b></div><div class="funnel-track"><span style="width:'+Math.min(100,Math.round(100*(byTrack[track]||0)/Math.max(1,total)))+'%"></span></div></div>').join('')+
  '</div><p class="hint">'+total+' stored proposal(s), not accepted partnerships, unique people, signed contracts or paid orders.</p>';
 $('#operator-opportunities').innerHTML=people.length?people.map(p=>{
  const received=new Date(p.created_at).toLocaleDateString('en-CA',{year:'numeric',month:'short',day:'numeric'});
  const email=encodeURIComponent(p.email);
  const status='<select class="input operator-stage" data-opportunity="'+escapeHtml(p.id)+'">'+
   opportunityStages.map(stage=>'<option value="'+stage+'"'+(p.status===stage?' selected':'')+'>'+stage+'</option>').join('')+'</select>';
  return '<tr><td><strong>'+escapeHtml(p.contact_name)+'</strong><small><a href="mailto:'+email+'">'+escapeHtml(p.email)+'</a></small></td>'+
   '<td>'+escapeHtml(labels[p.track]||p.track)+'<small>Source: '+escapeHtml(p.source)+'</small></td>'+
   '<td class="brief">'+escapeHtml(p.organization||'Independent builder')+'<small>'+escapeHtml(p.project_brief)+'</small>'+
   (p.github_url?'<small>'+escapeHtml(p.github_url)+'</small>':'')+'</td>'+
   '<td>'+escapeHtml(received)+'</td><td>'+status+'</td></tr>';
 }).join(''):'<tr><td colspan="5">No collaboration proposals submitted. No partners are inferred from an empty pipeline.</td></tr>';
}
function displayOrders(orders){
 const table=$('#operator-orders');
 table.innerHTML=orders.length?orders.map(o=>{
  const paid=['paid','fulfilled'].includes(o.status);
  const amount=new Intl.NumberFormat('en-CA',{style:'currency',currency:o.currency.toUpperCase()}).format(o.amount_cents/100);
  return '<tr><td><strong>'+escapeHtml(o.id.slice(0,8))+'…</strong><small>'+escapeHtml(o.offer_type||'custom')+' · '+escapeHtml(o.description)+'</small></td><td>'+escapeHtml(o.contact_name)+'<small>'+escapeHtml(o.email)+'</small></td><td>'+escapeHtml(amount)+'</td><td>'+escapeHtml(o.status)+'</td><td>'+(o.status==='paid'?'<button class="btn btn-outline btn-small" data-fulfill="'+escapeHtml(o.id)+'">Mark fulfilled</button>':paid?'Verified by webhook':'Not paid')+'</td></tr>';
 }).join(''):'<tr><td colspan="5">No scoped orders created. Enquiries are not sales.</td></tr>';
}
async function load(){
 const [stats,leads,funnel,orders,opportunities]=await Promise.all([
  operatorRequest('GET','/api/admin/overview'),
  operatorRequest('GET','/api/admin/pilot-interest'),
  operatorRequest('GET','/api/admin/funnel'),
  operatorRequest('GET','/api/admin/pilot-orders'),
  operatorRequest('GET','/api/admin/opportunities')
 ]);
 displayStats(stats);displayLeads(leads.leads);displayFunnel(funnel);displayOrders(orders.orders);displayOpportunities(opportunities.applications,opportunities.counts);
 $('#order-lead-id').innerHTML=leads.leads.map(l=>'<option value="'+escapeHtml(l.id)+'">'+escapeHtml(l.contact_name)+' — '+escapeHtml(l.company||l.email)+'</option>').join('');
 $('#operator-order-form button[type=submit]').disabled=!leads.leads.length;
 $('#operator-action-feedback').textContent='Observed as of '+new Date().toLocaleString();
}
$('#operator-form').addEventListener('submit',async event=>{
 event.preventDefault();const button=event.currentTarget.querySelector('button');
 button.disabled=true;
 try{
  operatorToken=$('#operator-token').value.trim();
  await load();
  $('#operator-token').value='';
  $('#operator-signin').classList.add('hidden');
  $('#operator-dashboard').classList.remove('hidden');
 }catch(error){
  operatorToken=null;$('#operator-feedback').textContent=error.message;
 }finally{button.disabled=false;}
});
$('#operator-refresh').addEventListener('click',async()=>{try{await load();}catch(error){$('#operator-action-feedback').textContent=error.message;}});
$('#operator-lock').addEventListener('click',()=>{
 operatorToken=null;$('#operator-dashboard').classList.add('hidden');
 $('#operator-signin').classList.remove('hidden');$('#operator-feedback').textContent='Operator desk locked.';
});
document.addEventListener('change',async event=>{
 const target=event.target.closest('[data-lead]');
 if(!target)return;
 const previous=target.dataset.previous||'';
 try{
  await operatorRequest('PATCH','/api/admin/pilot-interest/'+encodeURIComponent(target.dataset.lead),{status:target.value});
  $('#operator-action-feedback').textContent='Lead stage saved. This is not a payment event.';
  await load();
 }catch(error){
  $('#operator-action-feedback').textContent=error.message;
  if(previous)target.value=previous;
 }
});

const offerPresets={
 quickstart:{amount:19900,scope:'Public API Quickstart: one supported public HTTPS API, up to three GET tools, one live source test and basic client handoff.'},
 launch:{amount:79900,scope:'API Agent Launch: one eligible public HTTPS API, up to five curated GET tools, two agreed source tests, a compatible client handoff and shareable docs install link.'},
 private:{amount:149900,scope:'Private API Launch: buyer-specific authorization, exact host, client and accepted deliverables to be agreed before payment.'},
 care:{amount:null,scope:'Managed Care: explicit upstream checks, bounded support hours, renewal term and response window defined by written scope.'},
 agency:{amount:null,scope:'Agency delivery: separately scoped client API integration and independently accepted handoff.'},
 custom:{amount:null,scope:''}
};
function chooseOffer(){
 const offer=offerPresets[$('#order-offer').value];if(!offer)return;
 if(offer.amount)$('#order-amount').value=String(offer.amount);
 $('#order-scope').value=offer.scope;
}
$('#order-offer').addEventListener('change',chooseOffer);

chooseOffer();
$('#operator-order-form').addEventListener('submit',async event=>{
 event.preventDefault();
 const button=event.currentTarget.querySelector('button[type=submit]');button.disabled=true;
 const status=$('#operator-order-feedback');
 try{
  const amount=Number($('#order-amount').value);
  const result=await operatorRequest('POST','/api/admin/pilot-orders',{lead_id:$('#order-lead-id').value,
    amount_cents:amount,currency:$('#order-currency').value,offer_type:$('#order-offer').value,description:$('#order-scope').value.trim()});
  status.textContent='Quote created; no payment collected. Share the exact buyer link:';
  const link=document.createElement('a');link.href=result.share_url;link.textContent=result.share_url;link.target='_blank';link.rel='noopener noreferrer';
  status.append(document.createTextNode(' '),link);
  await load();
 }catch(error){status.textContent='Unable to create quote: '+error.message;}
 finally{button.disabled=false;}
});
document.addEventListener('click',async event=>{
 const target=event.target.closest('[data-fulfill]');if(!target)return;
 target.disabled=true;
 try{await operatorRequest('POST','/api/admin/pilot-orders/'+encodeURIComponent(target.dataset.fulfill)+'/fulfill',{});
  $('#operator-order-feedback').textContent='Signed-payment order marked fulfilled. This is an operator status, not a refund or new transaction.';
  await load();
 }catch(error){$('#operator-order-feedback').textContent='Fulfillment failed: '+error.message;}finally{target.disabled=false;}
});

document.addEventListener('change',async event=>{
 const node=event.target.closest('[data-opportunity]');if(!node)return;
 const status=$('#opportunity-action-feedback');node.disabled=true;
 try{
  const response=await operatorRequest('PATCH','/api/admin/opportunities/'+encodeURIComponent(node.dataset.opportunity),{status:node.value});
  status.textContent='Opportunity moved to '+response.application.status+'. No contract or payment has been inferred.';
  await load();
 }catch(error){status.textContent='Could not update opportunity: '+error.message;try{await load();}catch{}}
 finally{node.disabled=false;}
});
