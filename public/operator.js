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
async function load(){
 const [stats,leads,funnel]=await Promise.all([
  operatorRequest('GET','/api/admin/overview'),
  operatorRequest('GET','/api/admin/pilot-interest'),
  operatorRequest('GET','/api/admin/funnel')
 ]);
 displayStats(stats);displayLeads(leads.leads);displayFunnel(funnel);
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
