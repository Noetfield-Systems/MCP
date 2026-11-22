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


/* Public OpenAPI contract/watch and selected GET import. Does not replace the
 existing real source-response Test Lab or automatically publish anything. */
const specOut=value=>{$('spec-watch-output').textContent=typeof value==='string'?value:JSON.stringify(value,null,2);};
function specServer(){
 const id=$('owner-server').value;
 if(!state.server||!id||state.server.id!==id)throw Error('SELECT_AN_OWNED_SERVER_FIRST');
 return encodeURIComponent(id);
}
const specInput=()=>({spec_url:$('spec-watch-url').value.trim(),base_url:$('spec-watch-base').value.trim()});
async function refreshPublicSpec(){
 if(!state.server)return;
 try{
  const result=await api('/api/lab/servers/'+specServer()+'/openapi-watch');
  if(result.watch){
   $('spec-watch-url').value=result.watch.spec_url;
   $('spec-watch-base').value=result.watch.base_url;
   specOut(result.watch);
  }else specOut('No pinned public OpenAPI baseline for this server.');
 }catch(e){specOut('OpenAPI baseline unavailable: '+e.message);}
}
let openapiRecommendations=[];
$('spec-watch-pin').addEventListener('click',async()=>{
 const button=$('spec-watch-pin');button.disabled=true;specOut('Fetching public OpenAPI and pinning a versioned baseline…');
 try{const result=await api('/api/lab/servers/'+specServer()+'/openapi-watch',{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(specInput())
 });specOut(result);}
 catch(e){specOut('Baseline not recorded: '+e.message);}
 finally{button.disabled=false;}
});
$('spec-watch-check').addEventListener('click',async()=>{
 const button=$('spec-watch-check');button.disabled=true;specOut('Re-fetching published OpenAPI source…');
 try{specOut(await api('/api/lab/servers/'+specServer()+'/openapi-watch/check',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}));}
 catch(e){specOut('Contract check not confirmed: '+e.message);}
 finally{button.disabled=false;}
});
$('spec-watch-curate').addEventListener('click',async()=>{
 const button=$('spec-watch-curate');button.disabled=true;openapiRecommendations=[];
 $('spec-curated-list').replaceChildren();$('spec-watch-import').disabled=true;specOut('Inspecting publicly documented GET operations…');
 try{
  const result=await api('/api/lab/servers/'+specServer()+'/curate-openapi',{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(specInput())});
  openapiRecommendations=result.suggestions||[];
  for(const tool of openapiRecommendations){
   const row=document.createElement('label'),checkbox=document.createElement('input'),name=document.createElement('span');
   row.className='launch-tool';
   checkbox.type='checkbox';checkbox.checked=!tool.manual_review;checkbox.value=tool.name;checkbox.className='spec-tool-choice';
   name.textContent=tool.name+' · score '+tool.score+' · '+(tool.reasons||[]).join(', ');
   row.append(checkbox,name);$('spec-curated-list').append(row);
  }
  $('spec-watch-import').disabled=!openapiRecommendations.length;
  specOut({supported_get_operations:result.supported_get_operations,considered:result.considered,
    suggestions:openapiRecommendations.length,method:result.method,note:result.note});
 }catch(e){specOut('Curation failed: '+e.message);}finally{button.disabled=false;}
});
$('spec-watch-import').addEventListener('click',async()=>{
 const selected=[...document.querySelectorAll('.spec-tool-choice:checked')].map(x=>x.value);
 if(!selected.length){specOut('Select at least one supported GET operation.');return;}
 const button=$('spec-watch-import');button.disabled=true;
 try{
  const input={spec_url:specInput().spec_url,baseUrl:specInput().base_url,selected_tool_names:selected};
  const result=await api('/api/servers/'+specServer()+'/import-openapi',{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
  specOut({import_result:result,note:'Tools added only to the editable draft; explicit tests and publish remain separate.'});
  await loadDetails();
 }catch(e){specOut('Selected import not confirmed: '+e.message);}
 finally{button.disabled=false;}
});
$('owner-server').addEventListener('change',()=>{openapiRecommendations=[];$('spec-curated-list').replaceChildren();$('spec-watch-import').disabled=true;setTimeout(()=>refreshPublicSpec().catch(()=>{}),300);});


/* Owner-approved draft repair: source and draft fingerprints prevent stale,
 arbitrary changes. Successful apply never publishes or modifies upstream data. */
let repairState=null;
const repairMessage=value=>{$('repair-output').textContent=typeof value==='string'?value:JSON.stringify(value,null,2);};
function clearRepair(){
 repairState=null;$('repair-apply').disabled=true;$('repair-proposals').replaceChildren();
}
$('repair-preview').addEventListener('click',async()=>{
 const button=$('repair-preview');button.disabled=true;clearRepair();
 repairMessage('Fetching pinned public OpenAPI contract and comparing draft definitions…');
 try{
  const result=await api('/api/lab/servers/'+specServer()+'/repair-preview',{
   method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  repairState={source:result.source_sha256,draft:result.draft_sha256};
  const region=$('repair-proposals');
  for(const proposal of result.candidates||[]){
   const label=document.createElement('label'),checkbox=document.createElement('input'),summary=document.createElement('span');
   label.className='launch-tool';checkbox.type='checkbox';checkbox.className='repair-select-tool';
   checkbox.value=proposal.tool_name;checkbox.checked=false;
   const types=Object.entries(proposal.changes||{}).filter(([,changed])=>changed).map(([key])=>key.replaceAll('_',' '));
   summary.textContent=proposal.tool_name+' · '+types.join(', ');
   label.append(checkbox,summary);region.append(label);
  }
  $('repair-apply').disabled=!(result.candidates||[]).length;
  repairMessage({candidates:result.candidates.length,source_sha256:result.source_sha256,
   draft_sha256:result.draft_sha256,published_revision_unchanged:result.published_revision_unchanged,
   next:'Select specific draft changes; test them in this Lab after applying; publish separately in Studio.'});
 }catch(error){repairMessage('Repair preview not available: '+error.message);}
 finally{button.disabled=false;}
});
$('repair-apply').addEventListener('click',async()=>{
 const selected=[...document.querySelectorAll('.repair-select-tool:checked')].map(x=>x.value);
 if(!repairState){repairMessage('Preview current source and draft before applying.');return;}
 if(selected.length<1||selected.length>5){repairMessage('Select between one and five specific repair candidates.');return;}
 const button=$('repair-apply');button.disabled=true;
 repairMessage('Applying only the selected owner-approved changes to the editable draft…');
 try{
  const result=await api('/api/lab/servers/'+specServer()+'/repair-draft',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({selected_tool_names:selected,
    expected_source_sha256:repairState.source,expected_draft_sha256:repairState.draft})});
  clearRepair();repairMessage(result);
  await loadDetails();
 }catch(error){repairMessage('Draft repair not applied: '+error.message+'; preview the current state again.');clearRepair();}
});
$('owner-server').addEventListener('change',clearRepair);
