const $=(q,root=document)=>root.querySelector(q);
const $$=(q,root=document)=>[...root.querySelectorAll(q)];
const state={user:null,servers:[],selected:null,detail:null,tab:'overview',login:false,templates:[],editToolId:null};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=()=>location.origin+'/mcp/foundry';
const msg=(text)=>{const box=$('#toast');box.textContent=text;box.classList.remove('hidden');clearTimeout(window._toast);window._toast=setTimeout(()=>box.classList.add('hidden'),4000);};
const feedback=(text)=>{$('#workspace-feedback').textContent=text;msg(text);};
async function request(method,path,data){let r;try{r=await fetch(path,{method,credentials:'same-origin',headers:{...(data!==undefined?{'Content-Type':'application/json'}:{})},body:data===undefined?undefined:JSON.stringify(data)});}catch{throw Error('Network unavailable');}
 let value;try{value=await r.json();}catch{throw Error('Invalid server response');}if(!r.ok)throw Error((value.error||'REQUEST_FAILED').replaceAll('_',' '));return value;}
async function loadCatalog(){try{const data=await request('GET','/api/catalog?q='+encodeURIComponent($('#catalog-search').value));$('#catalog-count').textContent=data.servers.length+' public server'+(data.servers.length===1?'':'s')+' listed';
$('#catalog-list').innerHTML=data.servers.length?data.servers.map(s=>`<article class="catalog-card"><span class="plan-type">PUBLIC MCP SERVER</span><h4>${esc(s.name)}</h4><p>${esc(s.description||'Public MCP tool endpoint')}</p><div class="catalog-meta"><span>${esc(s.tool_count)} tool(s)</span><em>${esc(s.slug)}</em></div></article>`).join(''):'<div class="empty-state">No published servers match your search yet. Be the first to publish a working MCP endpoint.</div>';
}catch(e){$('#catalog-list').innerHTML='<div class="empty-state">Directory is not available: '+esc(e.message)+'</div>';$('#catalog-count').textContent='Directory unavailable';}}
function authMode(login){state.login=login;$('#auth-submit').innerHTML=login?'Sign in <span>↗</span>':'Create workspace <span>↗</span>';$('#auth-switch').textContent=login?'Need an account? Create workspace':'Already have an account? Sign in';}
function updateWorkspace(){
 const logged=!!state.user;$('#studio-auth').classList.toggle('hidden',logged);$('#studio-app').classList.toggle('hidden',!logged);
 $('#sidebar-account').textContent=logged?state.user.email:'Guest access';$('#sidebar-plan').textContent=logged?state.user.plan.toUpperCase()+' PLAN':'Sign in to create servers';
 $('#nav-login').textContent=logged?'Sign out':'Sign in';if(logged){loadServers().catch(e=>feedback(e.message));loadTemplates().catch(e=>feedback(e.message));loadActivation().catch(e=>feedback(e.message));}
}
async function loadTemplates(){
 const {templates}=await request('GET','/api/templates');
 state.templates=templates;
 const target=$('#template-list');
 if(!target)return;
 target.innerHTML=templates.map(t=>`<button class="template-choice" data-template="${esc(t.id)}"><span class="template-category">${esc(t.category)}</span><b>${esc(t.name)}</b><small>${esc(t.description)}</small><span class="template-action">Create draft →</span></button>`).join('');
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
function detailTabs(){return ['overview','add tool','import openapi','test','usage'].map(tab=>`<button class="detail-tab ${state.tab===tab?'active':''}" data-tab="${tab}">${tab[0].toUpperCase()+tab.slice(1)}</button>`).join('');}
function renderDetail(){
 const s=state.detail.server,t=state.detail.tools;
 const preset=state.templates.find(x=>s.slug.startsWith(x.id.replaceAll('_','-')+'-'));
 const sampleArgs=JSON.stringify(preset?.sampleArgs||{},null,2);
 $('#server-detail').innerHTML=`<div class="detail-header"><div><span class="workspace-eyebrow">SELECTED SERVER · ${esc(s.status)}</span><h4>${esc(s.name)}</h4></div><button class="btn btn-outline btn-small" id="close-detail">Back to all servers</button></div><div class="detail-tabs">${detailTabs()}</div><div id="detail-content" class="detail-content"></div>`;
 const pane=$('#detail-content');
 if(state.tab==='overview')pane.innerHTML=`<div class="endpoint-box"><small class="workspace-eyebrow">ENDPOINT</small><div><code>${esc(location.origin+'/mcp/'+s.slug)}</code></div></div><p class="hint">${esc(s.description||'No description yet')} · ${s.visibility==='private'?'Private: use a Foundry API key':'Public read-only tool endpoint'}</p><div class="tool-list">${t.length?t.map(x=>`<div class="tool-item"><div><b>${esc(x.name)}</b><small>${esc(x.description)}</small></div><span class="status published">GET</span></div>`).join(''):'<div class="empty-state">Add or import a GET operation to publish this server.</div>'}</div><div class="inline-form"><button class="btn btn-primary btn-small" id="publish-server">${s.status==='published'?'Republish changes':'Publish server'}</button><select class="input" id="server-visibility" style="max-width:170px"><option value="public" ${s.visibility==='public'?'selected':''}>Public</option><option value="private" ${s.visibility==='private'?'selected':''}>Private</option></select><button class="btn btn-outline btn-small" data-copy="endpoint">Copy URL</button>${s.status==='published'?'<button class="btn btn-outline btn-small" data-copy="mcp-config">Copy client config</button>':''}</div>`;
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
 if(state.tab==='import openapi')pane.innerHTML=`<div class="inner-title"><h4>Import OpenAPI operations</h4><p>Paste an OpenAPI JSON document. The builder extracts GET operations, descriptions, and query/path parameters. Private headers and write methods are not imported.</p></div><form id="import-form" class="tool-form"><label>Public API base URL<input required type="url" name="baseUrl" placeholder="https://api.example.com/v1/"></label><label>OpenAPI JSON<textarea required name="document" style="min-height:210px" spellcheck="false" placeholder='{"openapi":"3.1.0","paths":{...}}'></textarea></label><button class="btn btn-primary btn-small">Import GET operations</button></form>`;
 if(state.tab==='test')pane.innerHTML=`<div class="inner-title"><h4>Live request playground</h4><p>Tests call the actual endpoint. No simulated response or fabricated latency is returned.</p></div>${t.length?`<form id="test-form" class="tool-form"><label>Select tool<select class="input" name="tool">${t.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></label><label>Arguments JSON<textarea name="args" spellcheck="false">${esc(sampleArgs)}</textarea></label><button class="btn btn-primary btn-small">Run live test</button></form><div id="test-result" class="result-box hidden"></div>`:'<div class="empty-state">Add a tool before running tests.</div>'}`;
 if(state.tab==='usage'){pane.innerHTML='<div class="empty-state">Loading observed usage…</div>';request('GET','/api/servers/'+s.id+'/usage').then(x=>{pane.innerHTML=`<div class="usage-grid"><div class="usage-card"><b>${x.usage.calls}</b><small>Tool calls / 30 days</small></div><div class="usage-card"><b>${x.usage.successes}</b><small>Successful executions</small></div><div class="usage-card"><b>${x.usage.avg_ms} ms</b><small>Average execution time</small></div></div><p class="hint">Observed invocation events only. Calls do not imply distinct users or collected revenue.</p>`;}).catch(e=>pane.textContent=e.message);}
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
 if(b.id==='menu-toggle'){$('.nav').classList.toggle('open');return;}
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
 if(f.id==='auth-form'){const endpoint=state.login?'/api/auth/login':'/api/auth/register';const x=await request('POST',endpoint,{email:value('auth-email')||$('#auth-email').value,password:$('#auth-password').value});state.user=x.account;updateWorkspace();msg('Workspace ready');}
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
 if(f.id==='import-form'){const document=JSON.parse(value('document'));const x=await request('POST','/api/servers/'+state.selected+'/import-openapi',{document,baseUrl:value('baseUrl')});state.tab='overview';await loadServers();feedback(x.added+' real GET tool(s) imported');}
 if(f.id==='test-form'){const args=JSON.parse(value('args')||'{}');const tool=value('tool');const result=$('#test-result');result.classList.remove('hidden');result.textContent='Executing against source…';try{const x=await request('POST','/api/tools/'+tool+'/test',{args});result.textContent=JSON.stringify(x,null,2);await loadActivation();}catch(err){result.textContent='Test failed: '+err.message;}}
 }catch(err){if(f.id==='auth-form')$('#auth-feedback').textContent=err.message;else if(f.id==='pilot-form'){const result=$('#pilot-result');result.classList.remove('success');result.classList.add('error');result.textContent='Request not saved: '+err.message;}else feedback(err.message);}finally{if(button)button.disabled=false;}
});
let searchTimer;$('#catalog-search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(loadCatalog,250);});
$('#public-mcp-url').textContent=url();
loadCatalog();loadMe();request('GET','/api/status').then(s=>{if(s.protocol)document.documentElement.dataset.protocol=s.protocol;}).catch(()=>{});
