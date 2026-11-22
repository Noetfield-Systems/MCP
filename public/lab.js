const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={server:null,report:null};
const formatDate=x=>x?new Date(x).toLocaleString('en-CA',{dateStyle:'medium',timeStyle:'short'}):'Not recorded';
function reportStatus(text,error=false){$('owner-feedback').textContent=text;$('owner-feedback').classList.toggle('launch-error',error);}
function testStatus(text,error=false){$('test-results').textContent=text;$('test-results').classList.toggle('launch-error',error);}
async function api(path,options={}){
 const response=await fetch(path,{cache:'no-store',credentials:'same-origin',...options});
 const body=await response.json().catch(()=>({error:'NON_JSON_RESPONSE'}));
 if(!response.ok)throw Error(body.error||('HTTP_'+response.status));
 return body;
}
function prepareDistribution(server){
 const root=$('distribution-output');root.replaceChildren();
 if(server.status!=='published'||server.visibility!=='public'){
  root.textContent='This server is not publicly published. Do not share private API keys or unpublished definitions.';return;
 }
 const urls=[['Public Integration Passport','/passport?server='+encodeURIComponent(server.slug)],
  ['MCP client installation','/connect?server='+encodeURIComponent(server.slug)],
  ['Public configuration Doctor','/doctor?server='+encodeURIComponent(server.slug)]];
 const heading=document.createElement('h3');heading.textContent='Publicly shareable assets';root.append(heading);
 for(const [text,url] of urls){const p=document.createElement('p'),link=document.createElement('a');link.className='launch-link';link.href=url;link.textContent=text;p.append(link);root.append(p);}
 const snippet='<a href="'+location.origin+'/connect?server='+encodeURIComponent(server.slug)+'">Use with AI</a>';
 const pre=document.createElement('pre');pre.textContent=snippet;root.append(pre);
 const button=document.createElement('button');button.className='launch-button alt';button.type='button';button.textContent='Copy website link HTML';
 button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(snippet);button.textContent='Copied';}catch{button.textContent='Copy the HTML above manually';}});
 root.append(button);
}
function renderTools(tools){
 const box=$('tool-lab');box.replaceChildren();
 for(const t of tools){
  const row=document.createElement('div');row.className='launch-tool';
  const check=document.createElement('input');check.type='checkbox';check.className='lab-select';check.dataset.tool=t.id;
  check.setAttribute('aria-label','Select '+t.name);
  const info=document.createElement('div'),title=document.createElement('strong');title.textContent=t.name;
  const description=document.createElement('small');description.textContent=t.description;
  const required=document.createElement('small');required.textContent='Required parameters: '+((t.params||[]).filter(x=>x.required).map(x=>x.name).join(', ')||'none');
  info.append(title,description,required);
  const label=document.createElement('label');label.className='launch-field';label.textContent='JSON argument object';
  const input=document.createElement('textarea');input.dataset.args=t.id;input.value='{}';input.spellcheck=false;input.setAttribute('aria-label','Arguments for '+t.name);label.append(input);
  row.append(check,info,label);box.append(row);
 }
}
function renderDrift(checks){
 const root=$('drift-output');root.replaceChildren();
 const latest=new Map();
 for(const c of checks){if(!latest.has(c.tool_id))latest.set(c.tool_id,c);}
 const warnings=[...latest.values()].filter(x=>x.drift&&x.outcome==='passed');
 if(!warnings.length){root.textContent=checks.length?'No unaccepted schema changes in the most recent test for each tool.':'No prior checks; the first successful test establishes a baseline.';return;}
 const h=document.createElement('h3');h.textContent=warnings.length+' observed schema change(s)';root.append(h);
 for(const c of warnings){
  const wrap=document.createElement('div');wrap.style.marginBottom='22px';
  const strong=document.createElement('strong');strong.textContent=c.tool_name;wrap.append(strong);
  const prior=document.createElement('pre');prior.textContent='Accepted structure:\n'+JSON.stringify(c.accepted_shape,null,2);
  const current=document.createElement('pre');current.textContent='Latest observed structure:\n'+JSON.stringify(c.shape,null,2);
  const button=document.createElement('button');button.type='button';button.className='launch-button alt';button.textContent='Accept this new structure';
  button.addEventListener('click',async()=>{
   button.disabled=true;
   try{
    await api('/api/lab/servers/'+encodeURIComponent(state.server.id)+'/baselines/'+encodeURIComponent(c.tool_id)+'/accept',{
     method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expected_schema_hash:c.schema_hash})
    });
    reportStatus('Owner accepted the latest source schema baseline. Published MCP tools were not modified.');
    await loadDetails();
   }catch(e){reportStatus('Baseline was not accepted: '+e.message,true);button.disabled=false;}
  });
  const hint=document.createElement('p');hint.className='launch-small';hint.textContent='This does not change a published server revision. Inspect the change before accepting.';
  wrap.append(prior,current,hint,button);root.append(wrap);
 }
}
async function loadDetails(){
 const id=$('owner-server').value;state.server=null;state.report=null;
 $('run-tests').disabled=true;$('rank-tools').disabled=true;$('reload-owner').disabled=!id;
 $('tool-lab').replaceChildren();
 if(!id){$('owner-report').textContent='Select a server';$('distribution-output').textContent='Choose a server';$('drift-output').textContent='Choose a server';return;}
 reportStatus('Reading tenant-scoped records from PostgreSQL…');
 try{
  const d=await api('/api/lab/servers/'+encodeURIComponent(id));
  state.server=d.server;state.report=d;
  const stats=d.external_calls_30d||{};
  $('owner-report').innerHTML='<h3>'+esc(d.server.name)+'</h3>'+
   '<p><span class="launch-badge">'+esc(d.server.status)+'</span> <span class="launch-badge">'+esc(d.server.visibility)+'</span> <span class="launch-badge">Revision '+esc(d.server.published_revision??'none')+'</span></p>'+
   '<div class="launch-stats"><div class="launch-stat"><strong>'+esc(stats.calls??0)+'</strong><small>Recorded MCP calls / 30d</small></div>'+
   '<div class="launch-stat"><strong>'+esc(stats.succeeded??0)+'</strong><small>Successful invocations (test traffic possible)</small></div>'+
   '<div class="launch-stat"><strong>'+esc(d.checks.length)+'</strong><small>Owner check receipts shown</small></div></div>'+
   '<p class="launch-small">These counts are not unique customers or payments.</p>'+
   (d.doctor.issues.length?'<h3>Owner Doctor findings</h3><ul>'+
    d.doctor.issues.map(x=>'<li><strong>'+esc(x.code)+'</strong>: '+esc(x.remedy)+'</li>').join('')+'</ul>':
    '<p>No issues identified in the recorded owner evidence.</p>')+
   (d.checks.length?'<h3>Recent owner checks</h3><ul>'+d.checks.slice(0,12).map(c=>
    '<li>'+esc(c.tool_name)+' · '+esc(c.outcome)+' · '+esc(c.duration_ms)+'ms'+
    (c.error_code?' · '+esc(c.error_code):'')+
    (c.drift?' · <strong class="launch-error">Contract changed</strong>':'')+
    ' · '+esc(formatDate(c.created_at))+'</li>').join('')+'</ul>':
    '<p>No persisted owner check receipts yet.</p>');
  renderTools(d.tools);renderDrift(d.checks);prepareDistribution(d.server);
  $('run-tests').disabled=d.tools.length===0;$('rank-tools').disabled=d.tools.length===0;
  reportStatus('Select one to five GET tools, supply any required JSON arguments, then run real source checks.');
 }catch(e){reportStatus('Could not load evidence: '+e.message,true);}
}
async function listServers(){
 reportStatus('Loading your existing Foundry servers…');
 try{
  const d=await api('/api/servers'),select=$('owner-server');select.replaceChildren();
  const prompt=document.createElement('option');prompt.value='';prompt.textContent='Choose a server';select.append(prompt);
  for(const s of d.servers){const o=document.createElement('option');o.value=s.id;o.textContent=s.name+' — '+s.status;select.append(o);}
  reportStatus(d.servers.length?d.servers.length+' server(s) found. Select one.':'No server exists; create one using Agent Launch.');
  const wanted=new URLSearchParams(location.search).get('id');
  if(wanted&&d.servers.some(s=>s.id===wanted))select.value=wanted;
  else if(d.servers.length===1)select.value=d.servers[0].id;
  if(select.value)await loadDetails();
 }catch(e){reportStatus('Sign in through Studio, then retry. '+e.message,true);}
}
async function runTests(){
 if(!state.server)return;
 const inputs=[...document.querySelectorAll('.lab-select:checked')];
 if(inputs.length===0||inputs.length>5){testStatus('Select one to five GET tools.',true);return;}
 let checks;
 try{checks=inputs.map(input=>{
  const args=JSON.parse(document.querySelector('[data-args="'+input.dataset.tool+'"]').value);
  if(!args||Array.isArray(args)||typeof args!=='object')throw Error('Each argument field must contain a JSON object');
  return {tool_id:input.dataset.tool,args};
 });}catch(e){testStatus('Invalid arguments: '+e.message,true);return;}
 const btn=$('run-tests');btn.disabled=true;testStatus('Executing bounded live GET checks…');
 try{
  const r=await api('/api/lab/servers/'+encodeURIComponent(state.server.id)+'/checks',{method:'POST',
   headers:{'Content-Type':'application/json'},body:JSON.stringify({checks})});
  $('test-results').innerHTML='<h3>Persistent owner checks recorded</h3><ul>'+r.results.map(c=>
   '<li><strong>'+esc(c.tool_name)+'</strong> · '+esc(c.outcome)+' · '+esc(c.duration_ms)+'ms · '+
   esc(c.contract_status)+(c.error_code?' · '+esc(c.error_code):'')+'</li>').join('')+'</ul>'+
   '<p class="launch-small">Independent MCP host compatibility remains untested by this tool.</p>';
  await loadDetails();
 }catch(e){testStatus('Tests failed: '+e.message,true);}
 finally{btn.disabled=false;}
}
async function curate(){
 if(!state.report?.tools)return;
 const btn=$('rank-tools');btn.disabled=true;
 try{
  const d=await api('/api/lab/curate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tools:state.report.tools})});
  $('test-results').innerHTML='<h3>Heuristic tool shortlist</h3><ol>'+
   d.suggestions.map(x=>'<li><strong>'+esc(x.name)+'</strong> · '+esc(x.score)+'/100'+(x.manual_review?' · manual review required':'')+
    '<small> '+esc(x.reasons.join(' · '))+'</small></li>').join('')+'</ol>'+
   '<p class="launch-small">These deterministic suggestions do not import, edit, approve, test or publish tools.</p>';
 }catch(e){testStatus('Curation unavailable: '+e.message,true);}
 finally{btn.disabled=false;}
}
$('load-servers').addEventListener('click',listServers);
$('owner-server').addEventListener('change',loadDetails);
$('reload-owner').addEventListener('click',loadDetails);
$('run-tests').addEventListener('click',runTests);
$('rank-tools').addEventListener('click',curate);
