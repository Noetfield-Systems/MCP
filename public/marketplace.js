const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,options={}){const response=await fetch(path,{credentials:'same-origin',...options});const data=await response.json();if(!response.ok)throw Error(data.error||'REQUEST_FAILED');return data;}
let listings=[],timer;
function card(x){return '<article class="market-card"><div class="market-card-top"><span>'+esc(x.category.replaceAll('-',' '))+'</span><span>'+(x.verified_at?'Independently reviewed':'Publisher submitted')+'</span></div><h3>'+esc(x.name)+'</h3><p>'+esc(x.tagline||x.description)+'</p><div class="market-card-footer"><small>'+esc(x.tools)+' source-backed GET tool(s)</small><button class="btn btn-outline btn-small" data-listing="'+esc(x.slug)+'">Inspect →</button></div></article>';}
async function refresh(){
 const params=new URLSearchParams({q:$('#market-query').value,category:$('#market-category').value});
 const x=await api('/api/marketplace?'+params);
 listings=x.listings;
 $('#market-count').textContent=listings.length+' real public listing(s). Counts are listings, not customers.';
 $('#market-list').innerHTML=listings.length?listings.map(card).join(''):'<div class="empty-state">No published integration matches yet. Builders can create and list the first working server.</div>';
}
async function load(){
 try{const x=await api('/api/marketplace');$('#market-category').innerHTML='<option value="">All categories</option>'+x.categories.map(c=>'<option value="'+esc(c)+'">'+esc(c.replaceAll('-',' '))+'</option>').join('');
 $('#market-pub-category').innerHTML=x.categories.map(c=>'<option value="'+esc(c)+'">'+esc(c.replaceAll('-',' '))+'</option>').join('');await refresh();}
 catch(e){$('#market-count').textContent='Directory unavailable: '+e.message;}
 try{const me=await api('/api/me');
 const servers=await api('/api/servers');const available=servers.servers.filter(s=>s.status==='published'&&s.visibility==='public');
 $('#market-signin').textContent='Signed in as '+me.account.email+'. '+available.length+' eligible server(s).';
 if(available.length){$('#market-myserver').innerHTML=available.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+'</option>').join('');$('#market-form').classList.remove('hidden');}
 else $('#market-publish-status').textContent='Publish at least one public server in Studio to create a marketplace listing.';}
 catch{$('#market-signin').innerHTML='To list your own integration, <a href="/#studio" style="color:#c9baff">sign in or create a workspace</a> first.';}
 const slug=new URLSearchParams(location.search).get('server');if(slug)showDetails(slug).catch(()=>{});
}
async function showDetails(slug){
 const x=await api('/api/marketplace/'+encodeURIComponent(slug));const l=x.listing;
 const detail=$('#market-details');detail.classList.remove('hidden');
 detail.innerHTML='<span class="workspace-eyebrow">'+esc(l.category.replaceAll('-',' '))+'</span><h3>'+esc(l.name)+'</h3><p>'+esc(l.readme)+'</p><p style="margin-top:13px;color:#aab9ca">Tools: '+x.tools.map(t=>esc(t.name)).join(' · ')+'</p><code>'+esc(location.origin+'/mcp/'+l.slug)+'</code><div><a class="btn btn-primary btn-small" href="/connect?server='+encodeURIComponent(l.slug)+'">Get connection settings ↗</a> <a class="btn btn-outline btn-small" href="/passport?server='+encodeURIComponent(l.slug)+'">Evidence Passport ↗</a> <a class="btn btn-outline btn-small" href="/doctor?server='+encodeURIComponent(l.slug)+'">MCP Doctor ↗</a></div>';
 detail.scrollIntoView({behavior:'smooth',block:'start'});
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-listing]');if(b)showDetails(b.dataset.listing).catch(x=>$('#market-count').textContent=x.message);});
$('#market-query').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>refresh().catch(x=>$('#market-count').textContent=x.message),220)});
$('#market-category').addEventListener('change',()=>refresh().catch(x=>$('#market-count').textContent=x.message));
$('#market-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;const button=form.querySelector('button[type=submit]');button.disabled=true;try{
 const fd=new FormData(form),id=String(fd.get('server'));
 const body={category:fd.get('category'),tagline:fd.get('tagline'),docs_url:fd.get('docs_url'),readme:fd.get('readme')};
 const r=await api('/api/servers/'+encodeURIComponent(id)+'/listing',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 $('#market-publish-status').textContent='Your published server is now listed. Publisher identity is not independently verified.';await refresh();await showDetails(r.slug);
 }catch(x){$('#market-publish-status').textContent='Listing not saved: '+x.message;}finally{button.disabled=false;}});
load();
