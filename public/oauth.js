const $=s=>document.querySelector(s);const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,{method='GET',body}={}){const r=await fetch(path,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const x=await r.json();if(!r.ok)throw Error(x.error||'REQUEST_FAILED');return x;}
async function load(){
 try{
  await api('/api/me');const [oauth,servers]=await Promise.all([api('/api/oauth/github/status'),api('/api/servers')]);
  $('#oauth-heading').textContent=oauth.connected?'GitHub connected':'No GitHub account connected';
  $('#oauth-description').textContent=oauth.configured?(oauth.connected?'A GitHub OAuth token is encrypted in this account’s connection store.':'Start GitHub OAuth to authorize this workspace.'):'GitHub OAuth is not configured in this Foundry deployment. Read-only public APIs remain usable without authentication.';
  $('#oauth-connect').disabled=!oauth.configured;$('#oauth-disconnect').disabled=!oauth.connected;
  $('#oauth-scopes').textContent='Requested permission: read:user · Granted: '+(oauth.scopes||'none')+' · Expires: '+(oauth.expires_at?new Date(oauth.expires_at).toLocaleString():'not specified by provider');
  $('#oauth-server').innerHTML=servers.servers.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+' · '+esc(s.visibility)+'</option>').join('');
  $('#oauth-bind').disabled=!oauth.connected||servers.servers.length===0;
  $('#byok-server').innerHTML=servers.servers.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+' · '+esc(s.status)+'</option>').join('');
  await loadByokStatus();
  $('#oauth-bindings').innerHTML=oauth.servers.length?oauth.servers.map(s=>'<div class="team-item"><div><b>'+esc(s.name)+'</b><small>Private GitHub OAuth binding</small></div><button class="btn btn-outline btn-small" data-unbind="'+esc(s.id)+'">Unbind</button></div>').join(''):'<div class="empty-state">No servers bound to GitHub yet.</div>';
  const query=new URLSearchParams(location.search);
  if(query.get('connected'))$('#oauth-feedback').textContent='GitHub OAuth callback recorded. Your private binding is a separate step.';
  if(query.get('error'))$('#oauth-feedback').textContent='OAuth authorization was not completed: '+query.get('error');
 }catch(e){$('#oauth-heading').textContent='Sign in required';$('#oauth-description').innerHTML='Open your <a style="color:#d3c4ff" href="/#studio">Foundry workspace</a> to manage OAuth connections.';$('#oauth-feedback').textContent=e.message;}
}
$('#oauth-connect').addEventListener('click',async()=>{const btn=$('#oauth-connect');btn.disabled=true;try{const x=await api('/api/oauth/github/start',{method:'POST',body:{}});const u=new URL(x.authorize_url);if(u.origin!=='https://github.com'||u.pathname!=='/login/oauth/authorize')throw Error('INVALID_PROVIDER_REDIRECT');location.assign(u.href);}catch(e){$('#oauth-feedback').textContent=e.message;btn.disabled=false;}});
$('#oauth-disconnect').addEventListener('click',async()=>{if(!confirm('Disconnect GitHub? All bound MCP servers return to draft. Also revoke the application authorization from GitHub Settings if desired.'))return;try{const x=await api('/api/oauth/github',{method:'DELETE'});$('#oauth-feedback').textContent='Local token access removed. Bound servers are drafts; remote revocation from GitHub Settings is separate.';await load();}catch(e){$('#oauth-feedback').textContent=e.message;}});
$('#oauth-bind').addEventListener('click',async()=>{if(!confirm('Bind this GitHub connection? It will switch the selected server to a private, unpublished draft.'))return;try{const x=await api('/api/servers/'+encodeURIComponent($('#oauth-server').value)+'/github-oauth',{method:'POST',body:{}});$('#oauth-feedback').textContent='Bound to private draft. Review your GitHub GET tools and publish with Private visibility.';await load();}catch(e){$('#oauth-feedback').textContent=e.message;}});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-unbind]');if(!b)return;if(!confirm('Remove this OAuth binding and unpublish its endpoint?'))return;try{await api('/api/servers/'+encodeURIComponent(b.dataset.unbind)+'/github-oauth',{method:'DELETE'});$('#oauth-feedback').textContent='Binding removed and server returned to draft.';await load();}catch(e){$('#oauth-feedback').textContent=e.message;}});

async function loadByokStatus(){
 const id=$('#byok-server').value;
 if(!id){$('#byok-feedback').textContent='Create a server in Studio first.';$('#byok-save').disabled=true;$('#byok-revoke').disabled=true;return;}
 try{
  const status=await api('/api/servers/'+encodeURIComponent(id)+'/upstream-key');
  $('#byok-save').disabled=!status.encryption_ready;
  $('#byok-revoke').disabled=!status.configured;
  $('#byok-feedback').textContent=status.configured
   ?'Encrypted upstream bearer configured for '+status.hostname+'. Server requires Private visibility.'
   :status.encryption_ready?'Ready to save a key for one exact upstream host.':'Upstream key encryption is not configured on this deployment. Public API tools remain usable.';
 }catch(e){$('#byok-feedback').textContent='Credential status unavailable: '+e.message;$('#byok-save').disabled=true;$('#byok-revoke').disabled=true;}
}
$('#byok-server').addEventListener('change',loadByokStatus);
$('#byok-form').addEventListener('submit',async e=>{
 e.preventDefault();const id=$('#byok-server').value;
 const btn=$('#byok-save');btn.disabled=true;
 try{
  if(!confirm('Saving this upstream API key will switch the server to a private draft until retested and republished. Continue?'))return;
  await api('/api/servers/'+encodeURIComponent(id)+'/upstream-key',{
   method:'POST',body:{upstream_origin:$('#byok-host').value,api_key:$('#byok-key').value}
  });
  $('#byok-key').value='';
  $('#byok-feedback').textContent='Key encrypted and saved. In Studio, test a GET tool and publish with Private visibility; the key will not be shown again.';
  await loadByokStatus();
 }catch(e){$('#byok-feedback').textContent='Could not save upstream key: '+e.message;}
 finally{$('#byok-key').value='';if(!btn.disabled){}}
});
$('#byok-revoke').addEventListener('click',async()=>{
 const id=$('#byok-server').value;if(!confirm('Revoke this upstream key and deliberately unpublish the endpoint?'))return;
 try{await api('/api/servers/'+encodeURIComponent(id)+'/upstream-key',{method:'DELETE'});
  $('#byok-feedback').textContent='Upstream key revoked. Review and republish only when ready.';
  await loadByokStatus();
 }catch(e){$('#byok-feedback').textContent='Revocation failed: '+e.message;}
});

load();
