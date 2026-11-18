const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,options={}){const r=await fetch(path,{credentials:'same-origin',...options});const x=await r.json();if(!r.ok)throw Error(x.error||'REQUEST_FAILED');return x;}
async function refresh(){
 try{
  const me=await api('/api/me');$('#team-account').innerHTML='<span class="workspace-eyebrow">YOUR ACCOUNT UUID</span><div style="font:600 15px ui-monospace,monospace;overflow-wrap:anywhere;margin:14px 0">'+esc(me.account.id)+'</div><p>'+esc(me.account.email)+' · Share the UUID only with collaborators you intend to invite.</p>';
  const [own,invites,shared]=await Promise.all([api('/api/servers'),api('/api/team/invitations'),api('/api/team/servers')]);
  const options=own.servers.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+'</option>').join('');
  $('#team-owner-servers').innerHTML=options;
  $('#team-owner-member-server').innerHTML=options;
  $('#team-invite-form').querySelector('button').disabled=!own.servers.length;
  $('#team-pending').innerHTML=invites.invitations.length?invites.invitations.map(i=>'<div class="team-item"><div><b>'+esc(i.name)+'</b><small>Access: '+esc(i.role)+' · expires '+esc(new Date(i.expires_at).toLocaleDateString())+'</small></div><button data-accept="'+esc(i.id)+'" class="btn btn-primary btn-small">Accept</button></div>').join(''):'<div class="empty-state">No pending invitations.</div>';
  $('#team-shared').innerHTML=shared.servers.length?shared.servers.map(s=>'<div class="team-item"><div><b>'+esc(s.name)+'</b><small>'+esc(s.role)+' · '+esc(s.status)+'</small></div><button data-shared="'+esc(s.id)+'" class="btn btn-outline btn-small">Inspect</button></div>').join(''):'<div class="empty-state">No accepted server collaborations yet.</div>';
  await members();
 }catch(e){$('#team-account').innerHTML='<span class="workspace-eyebrow">SIGN IN REQUIRED</span><p>To use team collaboration, first <a style="color:#d1c3ff" href="/#studio">sign in to your Foundry workspace</a>.</p>';$('#team-invite-form').classList.add('hidden');$('#team-pending').textContent='Sign in to see invitations.';$('#team-shared').textContent='Sign in to see shared servers.';$('#team-members').textContent='Sign in to manage members.';}
}
async function members(){
 const id=$('#team-owner-member-server').value;
 if(!id){$('#team-members').textContent='No owned server.';return;}
 try{const x=await api('/api/servers/'+id+'/members');$('#team-members').innerHTML=x.members.length?x.members.map(m=>'<div class="team-item"><div><b>'+esc(m.account_id.slice(0,8))+'…</b><small>'+esc(m.role)+' · active</small></div><button data-remove="'+esc(m.account_id)+'" class="btn btn-outline btn-small danger">Revoke</button></div>').join(''):'<div class="empty-state">No collaborator access granted.</div>';}catch(e){$('#team-members').textContent=e.message;}
}
$('#team-owner-member-server').addEventListener('change',()=>members());
$('#team-invite-form').addEventListener('submit',async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;
 const form=new FormData(e.target);try{await api('/api/servers/'+form.get('server')+'/invitations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({account_id:form.get('account_id'),role:form.get('role')})});$('#team-invite-status').textContent='Invitation created. Recipient sees it after signing into their Foundry workspace.';}catch(e){$('#team-invite-status').textContent='Invite failed: '+e.message;}finally{b.disabled=false;}});
document.addEventListener('click',async e=>{
 const accept=e.target.closest('[data-accept]'),shared=e.target.closest('[data-shared]'),remove=e.target.closest('[data-remove]');
 try{
 if(accept){await api('/api/team/invitations/'+accept.dataset.accept+'/accept',{method:'POST'});await refresh();}
 if(shared){const x=await api('/api/team/servers/'+shared.dataset.shared);const p=$('#team-preview');p.classList.remove('hidden');p.innerHTML='<h3>'+esc(x.server.name)+'</h3><p>'+esc(x.server.description||'')+'</p><p>Role: '+esc(x.server.role)+' · tools: '+x.tools.map(t=>esc(t.name)).join(', ')+'</p>'+(x.server.role==='editor'?'<button class="btn btn-outline btn-small" data-publish-shared="'+esc(x.server.id)+'">Publish existing tools</button>':'<span class="workspace-eyebrow">READ-ONLY VIEW</span>');}
 if(remove){const id=$('#team-owner-member-server').value;if(!confirm('Revoke this collaborator’s access to your server?'))return;await api('/api/servers/'+id+'/members/'+remove.dataset.remove,{method:'DELETE'});await members();}
 const publish=e.target.closest('[data-publish-shared]');if(publish){await api('/api/team/servers/'+publish.dataset.publishShared+'/publish',{method:'POST'});$('#team-preview').append(document.createTextNode(' · Published successfully'));await refresh();}
 }catch(x){$('#team-invite-status').textContent='Action failed: '+x.message;}
});
refresh();
