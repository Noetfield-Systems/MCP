const $=(q,root=document)=>root.querySelector(q);
const $$=(q,root=document)=>[...root.querySelectorAll(q)];
const state={user:null,servers:[],selected:null,detail:null,tab:'overview',login:false,templates:[],editToolId:null,growth:null};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=()=>location.origin+'/mcp/foundry';
let catalogRequestId=0;
const nav=$('#primary-nav'),menu=$('#menu-toggle');
function setMenu(open){document.querySelector('.nav')?.classList.toggle('open',open);if(menu){menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');}}
nav?.addEventListener('click',event=>{if(event.target.closest('a'))setMenu(false);});
document.addEventListener('keydown',event=>{if(event.key==='Escape')setMenu(false);});
document.addEventListener('click',event=>{if(document.querySelector('.nav')?.classList.contains('open')&&!event.target.closest('.nav'))setMenu(false);});
const msg=(text)=>{const box=$('#toast');box.textContent=text;box.classList.remove('hidden');clearTimeout(window._toast);window._toast=setTimeout(()=>box.classList.add('hidden'),4000);};
const feedback=(text)=>{$('#workspace-feedback').textContent=text;msg(text);};
async function request(method,path,data){let r;try{r=await fetch(path,{method,credentials:'same-origin',headers:{...(data!==undefined?{'Content-Type':'application/json'}:{})},body:data===undefined?undefined:JSON.stringify(data)});}catch{throw Error('Network unavailable');}
 let value;try{value=await r.json();}catch{throw Error('Invalid server response');}if(!r.ok)throw Error((value.error||'REQUEST_FAILED').replaceAll('_',' '));return value;}
async function loadCatalog(){const current=++catalogRequestId;try{const data=await request('GET','/api/catalog?q='+encodeURIComponent($('#catalog-search').value));if(current!==catalogRequestId)return;$('#catalog-count').textContent=data.servers.length+' public server'+(data.servers.length===1?'':'s')+' listed';
$('#catalog-list').innerHTML=data.servers.length?data.servers.map(s=>`<article class="catalog-card"><span class="plan-type">PUBLIC MCP SERVER</span><h4>${esc(s.name)}</h4><p>${esc(s.description||'Public MCP tool endpoint')}</p><div class="catalog-meta"><span>${esc(s.tool_count)} tool(s)</span><em>${esc(s.slug)}</em></div><div class="catalog-actions"><button type="button" class="btn btn-outline btn-small" data-catalog-slug="${esc(s.slug)}">Copy MCP URL</button><a href="/developers#connect" class="catalog-guide">Connect ↗</a></div></article>`).join(''):'<div class="empty-state">No published servers match your search yet. Be the first to publish a working MCP endpoint.</div>';
}catch(e){if(current!==catalogRequestId)return;$('#catalog-list').innerHTML='<div class="empty-state">Directory is not available: '+esc(e.message)+'</div>';$('#catalog-count').textContent='Directory unavailable';}}
function authMode(login){state.login=login;$('#auth-submit').innerHTML=login?'Sign in <span>↗</span>':'Create workspace <span>↗</span>';$('#auth-switch').textContent=login?'Need an account? Create workspace':'Already have an account? Sign in';}
function updateWorkspace(){
 const logged=!!state.user;$('#studio-auth').classList.toggle('hidden',logged);$('#studio-app').classList.toggle('hidden',!logged);
 $('#sidebar-account').textContent=logged?state.user.email:'Guest access';$('#sidebar-plan').textContent=logged?state.user.plan.toUpperCase()+' PLAN':'Sign in to create servers';
 $('#nav-login').textContent=logged?'Sign out':'Sign in';if(logged){loadServers().catch(e=>feedback(e.message));loadTemplates().catch(e=>feedback(e.message));loadActivation().catch(e=>feedback(e.message));loadGrowth().catch(e=>feedback(e.message));}else{state.growth=null;}
}
async function loadGrowth(){
 if(!state.user)return;
 const data=await request('GET','/api/growth/me');state.growth=data;
 $('#growth-summary').textContent=data.referrals+' real signup(s) · '+data.activated_referrals+' with successful managed tool calls';
}
async function loadTemplates(){
 const {templates}=await request('GET','/api/templates');
 state.templates=templates;
 const suggested=new URLSearchParams(location.search).get('starter');
 const target=$('#template-list');
 if(!target)return;
 target.innerHTML=templates.map(t=>`<button class="template-choice${suggested===t.id?' recommended':''}" data-template="${esc(t.id)}"><span class="template-category">${esc(t.category)}</span><b>${esc(t.name)}</b><small>${esc(t.description)}</small><span class="template-action">Create draft →</span></button>`).join('');
}
async function openapiPayload(form){
 const fd=new FormData(form),file=fd.get('spec_file');
 const baseUrl=String(fd.get('baseUrl')||'').trim();
 let text=String(fd.get('document')||'').trim();
 const specUrl=String(fd.get('spec_url')||'').trim();
 if(file instanceof File&&file.size){
  if(file.size>262144)throw Error('OpenAPI file exceeds 256 KiB');
  text=await file.text();
 }
 if(!text&&!specUrl)throw Error('Paste JSON/YAML, upload a file, or supply a public spec URL');
 return text?{baseUrl,document_text:text}:{baseUrl,spec_url:specUrl};
}
function renderOpenapiPreview(x){
 const box=$('#openapi-preview');if(!box)return;
 if(!x.tools?.length){box.textContent='No supported GET operations. Write methods are not imported.';return;}
 box.innerHTML='<div class="openapi-preview-heading"><strong>'+x.found+' supported GET operation(s)</strong><small>'+x.available+' tool slots available · preview only</small></div><div class="openapi-preview-list">'+
 x.tools.map(t=>'<div class="openapi-preview-row"><div><b>'+esc(t.name)+'</b><small>'+esc(t.description)+'</small><code>'+esc(t.url)+'</code></div><span>GET</span></div>').join('')+'</div>';
}
async function loadActivation(){
 if(!state.user)return;
 const data=await request('GET','/api/me/activation');
 const done=data.completed||{};
 const stages=[
  {label:'Create server',completed:!!(done.server_created||done.template_started),hint:'Choose a live-source starter'},
  {label:'Run real test',completed:!!done.tool_test_succeeded,hint:'Execute an upstream GET'},
  {label:'Publish MCP',completed:!!done.server_published,hint:'Activate your endpoint'},
  {label:'Real tool call',completed:data.successful_managed_calls>0,hint:'Connect a compatible MCP client'}
 ];
 const completed=stages.filter(x=>x.completed).length;
 const target=$('#activation-steps');if(!target)return;
 target.innerHTML='<div class="activation-score">'+completed+' / '+stages.length+' completed</div>'+stages.map((x,i)=>'<div class="activation-step '+(x.completed?'complete':'pending')+'"><span class="activation-icon">'+(x.completed?'✓':(i+1))+'</span><div><b>'+esc(x.label)+'</b><small>'+esc(x.completed?'Verified':'Next: '+x.hint)+'</small></div></div>').join('');
}
async function loadMe(){try{state.user=(await request('GET','/api/me')).account;}catch{state.user=null;}updateWorkspace();}
async function loadServers(){const data=await request('GET','/api/servers');state.servers=data.servers;renderServers();if(state.selected)await selectServer(state.selected);await loadActivation();}
function renderServers(){
 $('#server-list').innerHTML=state.servers.length?state.servers.map(s=>`<button class="server-row" data-server="${esc(s.id)}"><span class="server-avatar">⌘</span><span><b>${esc(s.name)}</b><small>/mcp/${esc(s.slug)} · ${s.tool_count} tool(s)</small></span><span class="status ${s.status==='published'?'published':''}">${esc(s.status)}</span></button>`).join(''):'<div class="empty-state">No servers yet. Use “New server” to start with your existing API.</div>';
}
async function selectServer(id){state.selected=id;const data=await request('GET','/api/servers/'+encodeURIComponent(id));state.detail=data;$('#server-detail').classList.remove('hidden');renderDetail();}
function detailTabs(){return ['overview','add tool','import openapi','test','usage','diagnostics','revisions'].map(tab=>`<button class="detail-tab ${state.tab===tab?'active':''}" data-tab="${tab}">${tab[0].toUpperCase()+tab.slice(1)}</button>`).join('');}
function renderDetail(){
 const s=state.detail.server,t=state.detail.tools;
 const preset=state.templates.find(x=>s.slug.startsWith(x.id.replaceAll('_','-')+'-'));
 const sampleArgs=JSON.stringify(preset?.sampleArgs||{},null,2);
 $('#server-detail').innerHTML=`<div class="detail-header"><div><span class="workspace-eyebrow">SELECTED SERVER · ${esc(s.status)}</span><h4>${esc(s.name)}</h4></div><button class="btn btn-outline btn-small" id="close-detail">Back to all servers</button></div><div class="detail-tabs">${detailTabs()}</div><div id="detail-content" class="detail-content"></div>`;
 const pane=$('#detail-content');
 if(state.tab==='overview')pane.innerHTML=`<div class="endpoint-box"><small class="workspace-eyebrow">ENDPOINT</small><div><code>${esc(location.origin+'/mcp/'+s.slug)}</code></div></div><p class="hint">${esc(s.description||'No description yet')} · ${s.visibility==='private'?'Private: use a Foundry API key':'Public read-only tool endpoint'}</p><div class="tool-list">${t.length?t.map(x=>`<div class="tool-item"><div><b>${esc(x.name)}</b><small>${esc(x.description)}</small></div><span class="status published">GET</span></div>`).join(''):'<div class="empty-state">Add or import a GET operation to publish this server.</div>'}</div><div class="inline-form"><button class="btn btn-primary btn-small" id="publish-server">${s.status==='published'?'Republish changes':'Publish server'}</button><select class="input" id="server-visibility" style="max-width:170px"><option value="public" ${s.visibility==='public'?'selected':''}>Public</option><option value="private" ${s.visibility==='private'?'selected':''}>Private</option></select><button class="btn btn-outline btn-small" data-copy="endpoint">Copy URL</button><a href="/connect?server=${esc(s.slug)}${s.visibility==='private'?'&private=1':''}" class="btn btn-outline btn-small">Client setup ↗</a>${s.status==='published'&&s.visibility==='public'?'<a class="btn btn-outline btn-small" href="/marketplace">List in marketplace ↗</a>':''}${s.status==='published'?'<button class="btn btn-outline btn-small" data-copy="mcp-config">Copy client config</button>':''}</div>`;
 if(state.tab==='overview'){
   $$('.tool-item',pane).forEach((element,index)=>{
     const tool=t[index];if(!tool)return;
     element.insertAdjacentHTML('beforeend',`<div class="tool-actions"><button class="btn btn-outline btn-small" data-edit-tool="${esc(tool.id)}">Edit</button><button class="btn btn-outline btn-small danger" data-remove-tool="${esc(tool.id)}">Remove</button></div>`);
   });
   pane.insertAdjacentHTML('beforeend',`<div class="lifecycle-actions">
    ${s.status==='published'?'<button class="btn btn-outline btn-small" id="unpublish-server">Unpublish endpoint</button>':''}
    <button class="btn btn-outline btn-small danger" id="delete-server">Delete server</button>
   </div><form id="server-settings-form" class="tool-form lifecycle-settings">
    <span class="workspace-eyebrow">SERVER PROFILE</span>
    <label>Server name<input required name="name" maxlength="100" value="${esc(s.name)}"></label>
    <label>Description<input name="description" maxlength="400" value="${esc(s.description||'')}"></label>
    <button class="btn btn-outline btn-small">Save details</button>
   </form>`);
 }
 if(state.tab==='add tool')pane.innerHTML=`<div class="inner-title"><h4>Register a read-only tool</h4><p>Use a public HTTPS GET API. Query and path parameters are explicitly declared; values cannot redirect tools to other hosts.</p></div><form id="tool-form" class="tool-form"><label>Tool name<input required name="name" placeholder="get_products" pattern="[a-z][a-z0-9_]{1,59}"></label><label>What does the tool do?<input required name="description" placeholder="List products from the inventory API"></label><label>HTTPS URL<input required name="url" type="url" placeholder="https://api.example.com/products"></label><label>Parameters JSON<textarea name="params" spellcheck="false" placeholder='[{"name":"category","in":"query","type":"string","required":false}]'>[]</textarea></label><button class="btn btn-primary btn-small">Save tool</button></form>`;
 if(state.tab==='import openapi')pane.innerHTML=`<div class="inner-title"><h4>OpenAPI Import Studio</h4><p>Import read-only GET operations from OpenAPI 3.x or Swagger 2. Preview the exact tool names and endpoints before changing your server.</p></div>
<form id="import-form" class="tool-form openapi-wizard">
<label>Public upstream API base URL<input required type="url" name="baseUrl" placeholder="https://api.example.com"></label>
<div class="import-source-grid">
<label>Paste JSON or YAML<textarea name="document" style="min-height:175px" spellcheck="false" placeholder="openapi: 3.1.0&#10;info:&#10;  title: My API&#10;  version: 1.0.0&#10;paths:&#10;  /items:&#10;    get:&#10;      operationId: list_items"></textarea><button type="button" class="btn btn-outline btn-small import-sample-btn" id="load-openapi-example">Load a real YAML example</button></label>
<label>Upload specification file<input type="file" name="spec_file" accept=".json,.yaml,.yml,application/json,text/yaml"><small>Max 256 KiB. Uploaded file takes priority over pasted text.</small></label>
<label>Or fetch public HTTPS spec URL<input type="url" name="spec_url" placeholder="https://example.com/openapi.yaml"><small>Used if no file or pasted text. Private hosts and redirects are blocked.</small></label>
</div><div class="import-actions"><button type="button" class="btn btn-outline btn-small" id="preview-openapi">Preview tools</button><button type="submit" class="btn btn-primary btn-small">Import GET operations</button></div>
<div id="openapi-preview" class="openapi-preview" role="status" aria-live="polite">Preview is read-only. Nothing is imported until you choose Import.</div>
</form>`;
 if(state.tab==='test')pane.innerHTML=`<div class="inner-title"><h4>Live request playground</h4><p>Tests call the actual endpoint. No simulated response or fabricated latency is returned.</p></div>${t.length?`<form id="test-form" class="tool-form"><label>Select tool<select class="input" name="tool">${t.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></label><label>Arguments JSON<textarea name="args" spellcheck="false">${esc(sampleArgs)}</textarea></label><button class="btn btn-primary btn-small">Run live test</button></form><div id="test-result" class="result-box hidden"></div>`:'<div class="empty-state">Add a tool before running tests.</div>'}`;
 if(state.tab==='usage'){pane.innerHTML='<div class="empty-state">Loading observed usage…</div>';request('GET','/api/servers/'+s.id+'/usage').then(x=>{pane.innerHTML=`<div class="usage-grid"><div class="usage-card"><b>${x.usage.calls}</b><small>Tool calls / 30 days</small></div><div class="usage-card"><b>${x.usage.successes}</b><small>Successful executions</small></div><div class="usage-card"><b>${x.usage.avg_ms} ms</b><small>Average execution time</small></div></div><p class="hint">Observed invocation events only. Calls do not imply distinct users or collected revenue.</p>`;}).catch(e=>pane.textContent=e.message);}
 if(state.tab==='diagnostics'){
  pane.innerHTML='<div class="empty-state">Loading observed execution diagnostics…</div>';
  request('GET','/api/servers/'+s.id+'/diagnostics').then(x=>{
   if(state.tab!=='diagnostics')return;
   const metrics=[['Observed calls',x.summary.calls],['Successful',x.summary.success],
    ['Average latency',x.summary.avg_ms+' ms'],['P95 latency',x.summary.p95_ms+' ms']];
   pane.innerHTML='<div class="inner-title"><h4>Live execution diagnostics</h4><p>Observed tool calls for the last 30 days. No raw input, tokens, URLs or response bodies are stored here.</p></div>'+
    '<div class="usage-grid">'+metrics.map(([k,v])=>'<div class="usage-card"><b>'+esc(v)+'</b><small>'+esc(k)+'</small></div>').join('')+'</div>'+
    '<div class="inner-title"><h4>Tool outcomes</h4></div><div class="team-list">'+
    (x.tools.length?x.tools.map(t=>'<div class="team-item"><div><b>'+esc(t.tool_name)+'</b><small>'+esc(t.calls)+' calls · '+esc(t.success)+' successes · '+esc(t.avg_ms)+' ms avg</small></div></div>').join(''):'<div class="empty-state">No managed MCP calls recorded yet.</div>')+'</div>'+
    '<div class="inner-title"><h4>Redacted recent executions</h4></div><div class="team-list">'+
    (x.recent.length?x.recent.map(e=>'<div class="team-item"><div><b>'+esc(e.tool_name)+'</b><small>'+esc(new Date(e.created_at).toLocaleString())+' · '+esc(e.duration_ms)+' ms · '+esc(e.error_code||'SUCCESS')+'</small></div><span class="status '+(e.success?'published':'')+'">'+(e.success?'PASS':'FAIL')+'</span></div>').join(''):'<div class="empty-state">No recent invocation history.</div>')+'</div>';
  }).catch(e=>{pane.textContent='Diagnostics unavailable: '+e.message;});
 }
 if(state.tab==='revisions'){
  pane.innerHTML='<div class="empty-state">Loading published revisions…</div>';
  request('GET','/api/servers/'+s.id+'/revisions').then(x=>{
   if(!x.revisions.length){pane.innerHTML='<div class="empty-state">Publish your server once to create a restorable version. Prior revisions are immutable snapshots.</div>';return;}
   pane.innerHTML='<div class="inner-title"><h4>Published versions</h4><p>Restoring any version creates an unpublished draft. Review the tools and republish explicitly.</p></div><div class="team-list">'+
   x.revisions.map(r=>'<div class="team-item"><div><b>Version '+esc(r.version)+'</b><small>'+esc(r.tools)+' tools · '+esc(new Date(r.created_at).toLocaleString())+'</small></div><button data-restore-revision="'+esc(r.id)+'" class="btn btn-outline btn-small">Restore as draft</button></div>').join('')+'</div>';
  }).catch(error=>{pane.textContent=error.message;});
 }
}
function renderNewServer(){state.selected=null;$('#server-detail').classList.remove('hidden');$('#server-detail').innerHTML=`<div class="detail-header"><h4>Create MCP server</h4><button class="btn btn-outline btn-small" id="close-detail">Cancel</button></div><form id="new-server-form" class="tool-form" style="margin-top:23px"><label>Server name<input required name="name" placeholder="Commerce API"></label><label>Unique public slug<input required name="slug" pattern="[a-z][a-z0-9-]{2,48}" placeholder="commerce-api"></label><label>Description<input name="description" placeholder="Search and read our product catalog"></label><button class="btn btn-primary btn-small">Create server</button></form>`;}
async function loadKeys(){const x=await request('GET','/api/keys');$('#key-list').innerHTML=x.keys.length?x.keys.map(k=>`<div class="key-item"><span><b>${esc(k.label)}</b><br><small>${esc(k.prefix)}… · ${k.revoked_at?'Revoked':'Active'}</small></span>${k.revoked_at?'':'<button class="btn btn-outline btn-small danger" data-revoke="${esc(k.id)}">Revoke</button>'}</div>`).join(''):'<div class="empty-state">You have not created an API key.</div>';}
async function loadBilling(){const x=await request('GET','/api/billing');$('#billing-panel').innerHTML=`<div class="usage-grid"><div class="usage-card"><b>${esc(x.plan.toUpperCase())}</b><small>Current plan</small></div><div class="usage-card"><b>${x.checkout_available?'Ready':'Offline'}</b><small>Checkout status</small></div></div>${x.checkout_available?'<button class="btn btn-primary btn-small" id="upgrade-plan">Open secure checkout</button>':'<p class="hint">Paid checkout is not yet configured. Free building and published endpoints are available without payment.</p>'}`;}
function showPanel(panel){
 $$('.side-item').forEach(x=>x.classList.toggle('active',x.dataset.panel===panel));$$('.app-panel').forEach(x=>x.classList.add('hidden'));$('#panel-'+panel).classList.remove('hidden');$('#workspace-heading').textContent={servers:'Your MCP servers',keys:'API access',billing:'Billing'}[panel];$('#new-server').classList.toggle('hidden',panel!=='servers');
 if(panel==='keys')loadKeys().catch(e=>feedback(e.message));if(panel==='billing')loadBilling().catch(e=>feedback(e.message));
}
document.addEventListener('click',async e=>{
 const b=e.target.closest('button,[data-copy]');if(!b)return;
 try{
 if(b.id==='menu-toggle'){setMenu(!document.querySelector('.nav').classList.contains('open'));return;}
 if(b.dataset.catalogSlug){const link=location.origin+'/mcp/'+encodeURIComponent(b.dataset.catalogSlug);await navigator.clipboard.writeText(link);msg('Public MCP endpoint copied');return;}
  if(b.id==='nav-login'){if(state.user){await request('POST','/api/auth/logout');state.user=null;state.selected=null;updateWorkspace();}else{authMode(true);location.hash='#studio';}return;}
 if(b.id==='auth-switch'){authMode(!state.login);return;}
 if(b.dataset.template){
   if(!state.user){location.hash='#studio';return;}
   b.disabled=true;
   try{
     const x=await request('POST','/api/servers/from-template',{template_id:b.dataset.template});
     state.tab='overview';state.selected=null;await loadServers();await selectServer(x.server.id);
     feedback('Live-source starter created. Use Test and Publish to activate the MCP endpoint.');
   }finally{b.disabled=false;}
   return;
 }
 if(b.id==='load-openapi-example'){
   b.disabled=true;
   try{
    const response=await fetch('/examples/hacker-news.openapi.yaml');
    if(!response.ok)throw Error('EXAMPLE_NOT_AVAILABLE');
    const spec=await response.text();
    const form=$('#import-form');
    form.querySelector('[name=baseUrl]').value='https://hacker-news.firebaseio.com';
    form.querySelector('[name=document]').value=spec;
    form.querySelector('[name=spec_url]').value='';
    form.querySelector('[name=spec_file]').value='';
    $('#openapi-preview').textContent='Example loaded. Choose Preview tools to inspect the GET operations before importing.';
   }finally{b.disabled=false;}
   return;
 }
 if(b.id==='preview-openapi'){
   const form=$('#import-form');if(!form?.reportValidity())return;
   b.disabled=true;const target=$('#openapi-preview');target.textContent='Validating specification…';
   try{const payload=await openapiPayload(form);
    const result=await request('POST','/api/servers/'+state.selected+'/preview-openapi',payload);
    renderOpenapiPreview(result);
   }catch(error){target.textContent='Preview failed: '+error.message;}
   finally{b.disabled=false;}
   return;
 }
 if(b.id==='copy-growth-invite'){if(!state.growth)await loadGrowth();await navigator.clipboard.writeText(state.growth.invite_url);msg('Invite URL copied. Referrals count only real new accounts.');return;}
 if(b.id==='new-server'){showPanel('servers');renderNewServer();return;}
 if(b.id==='close-detail'){state.selected=null;$('#server-detail').classList.add('hidden');return;}
 if(b.dataset.server){state.tab='overview';await selectServer(b.dataset.server);return;}
 if(b.dataset.tab){state.tab=b.dataset.tab;renderDetail();return;}
 if(b.dataset.panel){showPanel(b.dataset.panel);return;}
 if(b.dataset.editTool){
    const tool=state.detail?.tools.find(x=>x.id===b.dataset.editTool);
    if(!tool)return;
    state.editToolId=tool.id;state.tab='add tool';renderDetail();
    const f=$('#tool-form');if(!f)return;f.id='edit-tool-form';
    f.querySelector('[name=name]').value=tool.name;
    f.querySelector('[name=description]').value=tool.description;
    f.querySelector('[name=url]').value=tool.url;
    f.querySelector('[name=params]').value=JSON.stringify(tool.params,null,2);
    f.querySelector('button').textContent='Update read-only tool';
    return;
 }
 if(b.dataset.removeTool){
    if(!confirm('Remove this tool? Its published endpoint will return to draft until republished.'))return;
    await request('DELETE','/api/tools/'+b.dataset.removeTool);
    state.editToolId=null;state.tab='overview';await loadServers();feedback('Tool removed; server returned to draft');return;
 }
 if(b.id==='unpublish-server'){
    await request('POST','/api/servers/'+state.selected+'/unpublish',{});
    state.tab='overview';await loadServers();await loadCatalog();feedback('MCP endpoint unpublished');return;
 }
 if(b.dataset.restoreRevision){
   if(!confirm('Restore this published revision as a draft? All current tools will be replaced and the endpoint unpublished until you publish again.'))return;
   const r=await request('POST','/api/servers/'+state.selected+'/revisions/'+b.dataset.restoreRevision+'/restore',{});
   state.tab='overview';await loadServers();await loadCatalog();feedback('Version '+r.restored+' restored as draft. Review and republish to enable endpoint.');return;
 }
 if(b.id==='delete-server'){
    if(!confirm('Delete this server and all its tools and usage events? This cannot be undone.'))return;
    await request('DELETE','/api/servers/'+state.selected);
    state.selected=null;state.detail=null;$('#server-detail').classList.add('hidden');
    await loadServers();await loadCatalog();feedback('Server and tools deleted');return;
 }
 if(b.id==='publish-server'){const x=await request('POST','/api/servers/'+state.selected+'/publish',{visibility:$('#server-visibility').value});feedback('Published: '+x.endpoint);await loadServers();await loadCatalog();return;}
 if(b.dataset.copy){
  const server=state.detail?.server;
  const endpoint=server?location.origin+'/mcp/'+server.slug:url();
  let value=b.dataset.copy==='mcp-url'?url():endpoint;
  if(b.dataset.copy==='mcp-config'){
    if(!server||server.status!=='published')throw Error('Publish first');
    const client={type:'http',url:endpoint};
    if(server.visibility==='private')client.headers={Authorization:'Bearer YOUR_PERSONAL_FOUNDRY_API_KEY'};
    value=JSON.stringify({mcpServers:{[server.slug]:client}},null,2);
  }
  await navigator.clipboard.writeText(value);msg(b.dataset.copy==='mcp-config'?'Client config copied':'Endpoint URL copied');return;
 }
 if(b.id==='create-key'){const x=await request('POST','/api/keys',{label:$('#key-label').value});$('#key-reveal').classList.remove('hidden');$('#key-reveal').textContent='Copy this key now. It will not be shown again: '+x.secret;await loadKeys();return;}
 if(b.dataset.revoke){await request('DELETE','/api/keys/'+b.dataset.revoke);await loadKeys();msg('Key revoked');return;}
 if(b.id==='upgrade-plan'){const x=await request('POST','/api/billing/checkout',{});if(x.url){location.href=x.url;}return;}
 }catch(err){feedback(err.message);}
});
document.addEventListener('submit',async e=>{
 const f=e.target;if(!['auth-form','new-server-form','tool-form','edit-tool-form','server-settings-form','import-form','test-form','pilot-form'].includes(f.id))return;e.preventDefault();
 const data=new FormData(f);const value=name=>String(data.get(name)||'').trim();
 const button=f.querySelector('button[type=submit],button:not([type])');if(button)button.disabled=true;
 try{
 if(f.id==='pilot-form'){
   const result=$('#pilot-result');
   result.classList.remove('success','error');
   const payload={
     contact_name:value('contact_name'),email:value('email'),company:value('company'),
     website:value('website'),project_brief:value('project_brief'),
     contact_consent:data.has('contact_consent'),marketing_consent:data.has('marketing_consent'),
     nickname:value('nickname')
   };
   const response=await request('POST','/api/pilot-interest',payload);
   result.classList.add('success');
   result.textContent='Request received. Reference '+(response.reference||'recorded')+'. No payment has been taken.';
   f.reset();
 }
 if(f.id==='auth-form'){const endpoint=state.login?'/api/auth/login':'/api/auth/register';const ref=new URLSearchParams(location.search).get('ref')||'';const x=await request('POST',endpoint,{email:value('auth-email')||$('#auth-email').value,password:$('#auth-password').value,...(!state.login&&/^fdy-[a-zA-Z0-9_-]{8,28}$/.test(ref)?{referral_code:ref}:{})});state.user=x.account;updateWorkspace();msg('Workspace ready');}
 if(f.id==='new-server-form'){const x=await request('POST','/api/servers',{name:value('name'),slug:value('slug'),description:value('description')});state.tab='overview';await loadServers();await selectServer(x.server.id);feedback('Server created. Add a tool to publish.');}
 if(f.id==='tool-form'||f.id==='edit-tool-form'){
    const params=JSON.parse(value('params')||'[]');
    const edit=f.id==='edit-tool-form';
    await request(edit?'PATCH':'POST',edit?'/api/tools/'+state.editToolId:'/api/servers/'+state.selected+'/tools',
      {name:value('name'),description:value('description'),url:value('url'),params});
    state.editToolId=null;state.tab='overview';await loadServers();
    feedback('Tool saved. Republish the server to activate changes.');
 }
 if(f.id==='server-settings-form'){
    await request('PATCH','/api/servers/'+state.selected,{name:value('name'),description:value('description')});
    await loadServers();await loadCatalog();feedback('Server details saved');
 }
 if(f.id==='import-form'){const payload=await openapiPayload(f);const x=await request('POST','/api/servers/'+state.selected+'/import-openapi',payload);state.tab='overview';await loadServers();feedback(x.added+' GET tool(s) imported from '+x.found+' supported operations; '+x.skipped+' skipped');}
 if(f.id==='test-form'){const args=JSON.parse(value('args')||'{}');const tool=value('tool');const result=$('#test-result');result.classList.remove('hidden');result.textContent='Executing against source…';try{const x=await request('POST','/api/tools/'+tool+'/test',{args});result.textContent=JSON.stringify(x,null,2);await loadActivation();}catch(err){result.textContent='Test failed: '+err.message;}}
 }catch(err){if(f.id==='auth-form')$('#auth-feedback').textContent=err.message;else if(f.id==='pilot-form'){const result=$('#pilot-result');result.classList.remove('success');result.classList.add('error');result.textContent='Request not saved: '+err.message;}else feedback(err.message);}finally{if(button)button.disabled=false;}
});
let searchTimer;$('#catalog-search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(loadCatalog,250);});
document.addEventListener('input',event=>{
 const target=event.target;
 if(target.matches('#new-server-form [name="name"]')){
   const slug=document.querySelector('#new-server-form [name="slug"]');
   if(!slug||slug.dataset.userEdited==='true')return;
   slug.value=target.value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-+|-+$/g,'').slice(0,48);
 }
 if(target.matches('#new-server-form [name="slug"]'))target.dataset.userEdited='true';
});
$('#public-mcp-url').textContent=url();
const gateway=$('#hero-gateway');
request('GET','/healthz').then(s=>{
 if(gateway)gateway.textContent=s.ok?'Gateway operational':'Service unavailable';
 document.querySelector('.status-light')?.classList.toggle('online',!!s.ok);
}).catch(()=>{if(gateway)gateway.textContent='Status temporarily unavailable';});
loadCatalog();loadMe();request('GET','/api/status').then(s=>{if(s.protocol)document.documentElement.dataset.protocol=s.protocol;}).catch(()=>{});
