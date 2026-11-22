const id=n=>document.getElementById(n);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function showError(text){id('result').textContent=text;id('result').classList.add('launch-error');}
id('lookup').addEventListener('submit',async event=>{
 event.preventDefault();const slug=id('slug').value.trim().toLowerCase();
 if(!/^[a-z][a-z0-9-]{2,48}$/.test(slug))return showError('Invalid public server slug.');
 id('result').classList.remove('launch-error');id('result').textContent='Loading published definitions…';
 try{
  const response=await fetch('/api/passports/'+encodeURIComponent(slug),{cache:'no-store'});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'PASSPORT_NOT_FOUND');
  const p=data.passport;
  id('result').innerHTML='<h2>'+esc(p.name)+'</h2><p>'+esc(p.description)+'</p>'+
    '<p><span class="launch-badge">Public published revision: '+esc(p.published_revision??'not recorded')+'</span>'+
    ' <span class="launch-badge">MCP Streamable HTTP</span></p>'+
    '<h3>Published read-only tools</h3><ul>'+p.published_tools.map(t=>'<li><strong>'+esc(t.name)+'</strong>: '+esc(t.description)+'</li>').join('')+'</ul>'+
    '<h3>Evidence boundaries</h3><ul>'+
    '<li>Published definition: stored in Foundry PostgreSQL</li>'+
    '<li>Third-party host execution: not certified by this passport</li>'+
    '<li>External provider approval: not claimed</li></ul>'+
    '<div class="launch-actions"><a class="launch-button" href="'+esc(p.install_url)+'">Open client install guide</a>'+
    '<a class="launch-link" href="'+esc(p.mcp_endpoint)+'">MCP endpoint</a></div>'+
    '<p class="launch-small">A tool name alone does not prove usability in every MCP client. Owner test receipts are different from external host acceptance.</p>';
 }catch(e){showError('No public published passport: '+e.message);}
});
const p=new URLSearchParams(location.search).get('server');
if(p&&/^[a-z][a-z0-9-]{2,48}$/.test(p)){id('slug').value=p;id('lookup').requestSubmit();}
