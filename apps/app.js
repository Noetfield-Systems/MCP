import {App} from '@modelcontextprotocol/ext-apps';

const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const status=message=>{$('#status').textContent=String(message).slice(0,260)};
const app=new App({name:'MCP Foundry Studio',version:'0.2.0'});
function parseResult(result){
 if(result?.isError)throw Error(result.content?.find(x=>x.type==='text')?.text||'MCP_TOOL_ERROR');
 return result?.structuredContent||JSON.parse(result.content?.find(x=>x.type==='text')?.text||'{}');
}
async function call(name,args={}){
 const result=await app.callServerTool({name,arguments:args});return parseResult(result);
}
async function search(){
 const data=await call('search_servers',{query:$('#search-query').value||''});
 const rows=Array.isArray(data)?data:Array.isArray(data.servers)?data.servers:[];
 $('#search-results').innerHTML=rows.length?rows.map(s=>'<article class="card"><b>'+esc(s.name)+'</b><small>/mcp/'+esc(s.slug)+'</small><p>'+esc(s.description)+'</p><button class="secondary" data-inspect="'+esc(s.slug)+'">View tools</button></article>').join(''):'<div class="card">No matching published servers. This is a real directory empty state.</div>';
 status(rows.length+' public server(s) returned by MCP Foundry.');
}
async function mine(){
 const data=await call('list_my_servers');
 const rows=data.servers||[];
 $('#owned-results').innerHTML=rows.length?rows.map(s=>'<div class="card"><b>'+esc(s.name)+'</b><small>'+esc(s.status)+' · '+esc(s.slug)+'</small>'+(s.status==='draft'?'<button data-publish="'+esc(s.id)+'">Publish draft (public)</button>':'')+'</div>').join(''):'<div class="card">No owned servers yet. Create a draft below.</div>';
 status(rows.length+' server(s) in your authenticated Foundry workspace.');
}
$('#browse-tab').addEventListener('click',()=>{$('#owned-section').classList.add('hidden');$('#search-form').classList.remove('hidden');$('#search-results').classList.remove('hidden');search().catch(e=>status(e.message));});
$('#owned-tab').addEventListener('click',()=>{$('#owned-section').classList.remove('hidden');$('#search-form').classList.add('hidden');$('#search-results').classList.add('hidden');mine().catch(e=>status('Owner authentication required or unavailable: '+e.message));});
$('#search-form').addEventListener('submit',e=>{e.preventDefault();search().catch(x=>status(x.message));});
$('#create-form').addEventListener('submit',async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{
 const data=await call('create_server',{name:$('#new-name').value,slug:$('#new-slug').value,description:'Created from MCP Apps host'});
 status('Created draft '+data.server.slug+'. Add a real GET tool in Studio or via the Builder tools.');await mine();
}catch(x){status(x.message);}finally{button.disabled=false;}});
document.addEventListener('click',async e=>{
 const inspect=e.target.closest('[data-inspect]'),publish=e.target.closest('[data-publish]');
 try{
 if(inspect){const result=await call('get_server_tools',{slug:inspect.dataset.inspect});const rows=Array.isArray(result)?result:[];
 status(rows.length+' actual GET tool(s): '+rows.map(x=>x.tool_name).join(', '));}
 if(publish){if(!confirm('Publish this server and its existing tools to the public MCP endpoint?'))return;
 const result=await call('publish_server',{server_id:publish.dataset.publish,visibility:'public'});
 status('Published endpoint: '+result.endpoint);await mine();}
 }catch(x){status(x.message);}
});
app.ontoolresult=()=>{
 // The same View can be launched by an MCP tool in an authorized host.
 status('Foundry host connected. Search real integrations or open My workspace.');
};
app.connect().then(()=>search()).catch(error=>status('MCP Apps host connection unavailable: '+error.message));
