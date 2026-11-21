const status=document.getElementById('status');
const connect=document.getElementById('connect');
const disconnect=document.getElementById('disconnect');
document.getElementById('endpoint').textContent=location.origin+'/mcp/judgeme';
const message=s=>{status.textContent=s;};
async function refresh(){
  connect.disabled=true;disconnect.hidden=true;
  try{
    const response=await fetch('/api/integrations/judgeme/status',{credentials:'same-origin',cache:'no-store'});
    if(response.status===401){message('Sign in to MCP Foundry to connect your Judge.me store.');return;}
    if(!response.ok)throw Error('Unable to load connection status');
    const data=await response.json();
    message(data.connected?'Connected · Read-only scopes active':data.configured?'Not connected':'Provider OAuth is not configured on this deployment.');
    connect.disabled=!data.configured;connect.hidden=!!data.connected;disconnect.hidden=!data.connected;
  }catch{message('Unable to load connection status');}
}
connect.addEventListener('click',async()=>{
  connect.disabled=true;
  try{
    const response=await fetch('/api/integrations/judgeme/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    const data=await response.json();
    if(!response.ok||!data.authorize_url)throw Error(data.error||'Connection unavailable');
    location.assign(data.authorize_url);
  }catch(error){message(String(error.message));connect.disabled=false;}
});
disconnect.addEventListener('click',async()=>{
  disconnect.disabled=true;
  try{
    const response=await fetch('/api/integrations/judgeme',{method:'DELETE'});
    if(!response.ok)throw Error('Disconnect failed');
    await refresh();
  }catch(error){message(String(error.message));}
  disconnect.disabled=false;
});
const params=new URLSearchParams(location.search);
if(params.has('error'))message('Connection not completed: '+params.get('error'));
refresh();
