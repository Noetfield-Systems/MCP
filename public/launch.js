const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slugOk=s=>/^[a-z][a-z0-9-]{2,48}$/.test(s);
const prettyTime=value=>value?new Date(value).toLocaleString('en-CA',{dateStyle:'medium',timeStyle:'short'}):'Not recorded';
const state={server:null,report:null};
async function api(path,options={}){
  const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});
  let data;try{data=await response.json();}catch{throw Error('SERVICE_RESPONSE_UNAVAILABLE');}
  if(!response.ok)throw Error(data.error||'REQUEST_FAILED');
  return data;
}
function status(node,text,error=false){node.textContent=text;node.classList.toggle('launch-error',error);}
function distribution(slug,publicReady){
  const box=$('distribution-output');box.replaceChildren();
  if(!slug||!publicReady){box.textContent='Publish your server as public before sharing an installation page. Never distribute private bearer keys.';return;}
  const url=location.origin+'/connect?server='+encodeURIComponent(slug);
  const passport=location.origin+'/passport?server='+encodeURIComponent(slug);
  const embed='<a href="'+url+'" rel="noopener noreferrer">Use with AI — '+slug+'</a>';
  const heading=document.createElement('h3');heading.textContent='Public installation assets';
  const a=document.createElement('a');a.href=passport;a.className='launch-link';a.textContent='Open public Integration Passport';
  const code=document.createElement('pre');code.textContent=embed;
  const copy=document.createElement('button');copy.className='launch-button alt';copy.type='button';copy.textContent='Copy HTML link';
  copy.addEventListener('click',()=>navigator.clipboard.writeText(embed).then(()=>{copy.textContent='Copied';}).catch(()=>{copy.textContent='Select and copy HTML above';}));
  box.append(heading,a,document.createElement('p'),code,copy);
}
function showPassport(passport){
  const el=$('passport-output');
  const tools=passport.published_tools||[];
  el.innerHTML='<h3>'+esc(passport.name)+'</h3>'+
    '<p>'+esc(passport.description||'No description available')+'</p>'+
    '<p><span class="launch-badge">Published revision '+esc(passport.published_revision??'not recorded')+'</span> <span class="launch-badge">'+tools.length+' declared read-only tools</span></p>'+
    '<ul>'+tools.slice(0,10).map(t=>'<li><strong>'+esc(t.name)+'</strong> — '+esc(t.description)+'</li>').join('')+'</ul>'+
    '<p class="launch-small">Not independently certified. No customer adoption or external client installation is inferred.</p>'+
    '<a class="launch-link" href="'+esc(passport.passport_url)+'">Open shareable passport</a>';
  distribution(passport.slug,true);
}
async function inspectPassport(event){
  event.preventDefault();const slug=$('passport-slug').value.trim().toLowerCase();
  if(!slugOk(slug)){status($('passport-output'),'Enter a valid public server slug.',true);return;}
  status($('passport-output'),'Reading published revision…');
  try{const data=await api('/api/passports/'+encodeURIComponent(slug));showPassport(data.passport);}
  catch(err){status($('passport-output'),'Public passport unavailable: '+err.message,true);}
}
async function runDoctor(event){
  event.preventDefault();const slug=$('doctor-slug').value.trim().toLowerCase();
  if(!slugOk(slug)){status($('doctor-output'),'Enter a valid public server slug.',true);return;}
  status($('doctor-output'),'Inspecting published server configuration…');
  try{
    const data=await api('/api/doctor/'+encodeURIComponent(slug));
    const report=data.report;
    $('doctor-output').innerHTML='<h3>'+esc(report.configuration_ready?'Published configuration found':'Configuration incomplete')+'</h3>'+
      '<p class="launch-small">Scope: Foundry metadata only. No remote MCP handshake was performed.</p>'+
      (report.issues?.length?'<ul>'+report.issues.map(issue=>'<li><strong>'+esc(issue.code)+'</strong>: '+esc(issue.remedy)+'</li>').join('')+'</ul>':
        '<p>No issues found in the stored published metadata. This is not a compatibility or security certification.</p>')+
      '<a class="launch-link" href="/connect?server='+encodeURIComponent(slug)+'">Get installation instructions</a>';
  }catch(err){status($('doctor-output'),'Public diagnosis unavailable: '+err.message,true);}
}
async function loadServers(){
  status($('owner-feedback'),'Loading your account servers…');
  try{
    const data=await api('/api/servers');
    const select=$('owner-server');
    select.replaceChildren();
    const start=document.createElement('option');start.value='';start.textContent='Select a server';
    select.append(start);
    for(const server of data.servers||[]){
      const option=document.createElement('option');option.value=server.id;
      option.textContent=server.name+' ('+server.status+', '+server.visibility+')';
      select.append(option);
    }
    if(!data.servers?.length){status($('owner-feedback'),'No servers found. Use Studio to create one.');return;}
    status($('owner-feedback'),data.servers.length+' existing server(s) found. Select one to run owner-controlled tests.');
    const preselect=new URLSearchParams(location.search).get('id');
    if(preselect&&data.servers.some(s=>s.id===preselect))select.value=preselect;
    else if(data.servers.length===1)select.value=data.servers[0].id;
    if(select.value)await loadOwner();
  }catch(e){
    status($('owner-feedback'),'Sign in to Studio first, then return here. '+e.message,true);
  }
}
async function loadOwner(){
  const id=$('owner-server').value;
  state.server=null;state.report=null;
  $('run-tests').disabled=true;$('rank-tools').disabled=true;$('reload-owner').disabled=!id;
  $('tool-lab').replaceChildren();
  if(!id){$('owner-report').textContent='Choose a server.';distribution(null,false);return;}
  status($('owner-feedback'),'Loading persisted evidence and tool definitions…');
  try{
    const result=await api('/api/launch/servers/'+encodeURIComponent(id));
    state.server=result.server;state.report=result;
    const s=result.server, calls=result.external_calls_30d||{};
    $('owner-report').innerHTML='<h3>'+esc(s.name)+'</h3>'+
      '<p><span class="launch-badge">'+esc(s.status)+'</span> <span class="launch-badge">'+esc(s.visibility)+'</span>'+
      ' <span class="launch-badge">Revision '+esc(s.published_revision??'—')+'</span></p>'+
      '<div class="launch-stats"><div class="launch-stat"><strong>'+esc(calls.calls||0)+'</strong><small>Observed MCP calls / 30 days</small></div>'+
      '<div class="launch-stat"><strong>'+esc(calls.succeeded||0)+'</strong><small>Successful calls (including any tests)</small></div>'+
      '<div class="launch-stat"><strong>'+esc(result.checks?.length||0)+'</strong><small>Recent owner test receipts shown</small></div></div>'+
      '<p class="launch-small">Observed invocations do not establish unique users, revenue or independent organizations.</p>'+
      (result.doctor?.issues?.length?'<h3>Doctor findings</h3><ul>'+result.doctor.issues.map(x=>'<li>'+esc(x.code)+': '+esc(x.remedy)+'</li>').join('')+'</ul>':'<p>No issues identified in currently stored owner evidence.</p>')+
      (result.checks?.length?'<h3>Recent checks</h3><ul>'+
        result.checks.slice(0,8).map(c=>'<li><strong>'+esc(c.tool_name)+'</strong> '+esc(c.outcome)+
          (c.drift?' · <strong class="launch-error">Schema changed</strong>':'')+
          (c.error_code?' · '+esc(c.error_code):'')+
          ' · '+esc(prettyTime(c.created_at))+'</li>').join('')+'</ul>':'<p>No owner-initiated test receipts yet.</p>');
    renderTools(result.tools||[]);
    distribution(s.slug,s.status==='published'&&s.visibility==='public');
    $('run-tests').disabled=!result.tools?.length;
    $('rank-tools').disabled=!result.tools?.length;
    status($('owner-feedback'),'Server loaded. Select the tools and provide any required arguments before running checks.');
  }catch(e){status($('owner-feedback'),'Could not load owner evidence: '+e.message,true);}
}
function renderTools(tools){
  const root=$('tool-lab');root.replaceChildren();
  for(const tool of tools){
    const label=document.createElement('div');label.className='launch-tool';
    const check=document.createElement('input');check.type='checkbox';check.dataset.toolId=tool.id;
    check.className='launch-check';check.setAttribute('aria-label','Run '+tool.name);
    const info=document.createElement('div');
    const title=document.createElement('strong');title.textContent=tool.name;
    const desc=document.createElement('small');desc.textContent=tool.description;
    const required=(tool.params||[]).filter(p=>p.required).map(p=>p.name);
    const hint=document.createElement('small');
    hint.textContent=required.length?'Required: '+required.join(', '):'No required arguments';
    info.append(title,desc,hint);
    const inputLabel=document.createElement('label');inputLabel.className='launch-field';
    inputLabel.textContent='JSON arguments';
    const area=document.createElement('textarea');area.dataset.argsFor=tool.id;area.value='{}';
    area.spellcheck=false;area.setAttribute('aria-label','Arguments for '+tool.name);
    inputLabel.append(area);label.append(check,info,inputLabel);root.append(label);
  }
}
async function runChecks(){
  if(!state.server)return;
  const selected=[...document.querySelectorAll('.launch-check:checked')];
  if(!selected.length){status($('test-results'),'Select at least one GET tool first.',true);return;}
  if(selected.length>5){status($('test-results'),'Limit each test batch to five tools.',true);return;}
  let checks;
  try{checks=selected.map(item=>{
    const raw=document.querySelector('[data-args-for="'+item.dataset.toolId+'"]').value;
    const args=JSON.parse(raw);
    if(!args||typeof args!=='object'||Array.isArray(args))throw Error('Arguments must be a JSON object');
    return {tool_id:item.dataset.toolId,args};
  });}catch(e){status($('test-results'),'Invalid JSON arguments: '+e.message,true);return;}
  const button=$('run-tests');button.disabled=true;status($('test-results'),'Running authorized, read-only upstream tests…');
  try{
    const data=await api('/api/launch/servers/'+encodeURIComponent(state.server.id)+'/checks',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({checks})
    });
    $('test-results').innerHTML='<h3>Test receipts saved</h3><ul>'+data.results.map(r=>
      '<li><strong>'+esc(r.tool_name)+'</strong>: '+esc(r.outcome)+' · '+esc(r.duration_ms)+' ms · '+esc(r.contract_status)+
      (r.error_code?' · '+esc(r.error_code):'')+'</li>').join('')+'</ul>'+
      '<p class="launch-small">These are owner-initiated source tests, not independent MCP client certifications.</p>';
    await loadOwner();
  }catch(e){status($('test-results'),'Test run failed: '+e.message,true);}
  finally{button.disabled=false;}
}
async function rankTools(){
  if(!state.report?.tools)return;
  const button=$('rank-tools');button.disabled=true;
  try{
    const r=await api('/api/launch/curate',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({tools:state.report.tools})});
    $('test-results').innerHTML='<h3>Suggested high-value tools</h3><ol>'+
      r.suggestions.map(t=>'<li><strong>'+esc(t.name)+'</strong> (heuristic '+esc(t.score)+'/100)'+
        (t.manual_review?' — requires manual review':'')+
        '<small> '+esc(t.reasons.join(' · '))+'</small></li>').join('')+'</ol>'+
      '<p class="launch-small">Suggestions are deterministic, not AI-generated, imported or verified. Review actual use cases before publishing.</p>';
  }catch(e){status($('test-results'),'Could not rank tools: '+e.message,true);}
  finally{button.disabled=false;}
}
$('passport-search').addEventListener('submit',inspectPassport);
$('doctor-form').addEventListener('submit',runDoctor);
$('load-servers').addEventListener('click',loadServers);
$('owner-server').addEventListener('change',loadOwner);
$('reload-owner').addEventListener('click',loadOwner);
$('run-tests').addEventListener('click',runChecks);
$('rank-tools').addEventListener('click',rankTools);
const querySlug=new URLSearchParams(location.search).get('server');
if(querySlug&&slugOk(querySlug)){
  $('passport-slug').value=querySlug;$('doctor-slug').value=querySlug;
  $('passport-search').requestSubmit();
}
