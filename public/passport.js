const $=id=>document.getElementById(id);
const make=(tag,text)=>{const e=document.createElement(tag);e.textContent=String(text??'');return e;};
function a(label,url){const e=make('a',label);e.href=url;return e;}
async function load(slug){
 $('passport-content').hidden=true;$('passport-status').textContent='Reading the published definition…';
 if(!/^[a-z][a-z0-9-]{2,48}$/.test(slug)){$('passport-status').textContent='Enter a valid server slug.';return;}
 try{
  const r=await fetch('/api/passport/'+encodeURIComponent(slug),{cache:'no-store'});
  const d=await r.json();
  if(!r.ok)throw Error(d.error||('HTTP '+r.status));
  $('passport-name').textContent=d.name;
  $('passport-description').textContent=d.description||'No publisher description supplied.';
  $('passport-version').textContent='Published revision: '+(d.published_revision||'unavailable')+' · Protocol: '+d.protocol+' · Access: '+d.access;
  $('passport-tool-count').textContent=d.tools.length;
  $('passport-calls').textContent=d.evidence.recorded_calls_30d;
  $('passport-review').textContent='Not established';
  $('passport-evidence').textContent=d.evidence.classification+' Recorded successes: '+d.evidence.recorded_successes_30d+'.';
  $('passport-updated').textContent='Definition updated: '+(d.updated_at||'not available')+' · Last recorded success: '+(d.evidence.last_recorded_success_at||'none');
  const div=$('passport-tools');div.replaceChildren();
  for(const t of d.tools){
   const card=make('article','');card.className='passport-tool';
   card.append(make('h3',t.name),make('p',t.description),make('small',t.method+' · '+t.parameters.length+' declared parameters'));
   div.append(card);
  }
  $('passport-cta').replaceChildren(a('Configure MCP host',d.install_page),a('Diagnose this integration',d.doctor_page));
  $('passport-status').textContent='Published definition loaded. Evidence is explicitly qualified.';
  $('passport-content').hidden=false;
 }catch(e){$('passport-status').textContent='Passport unavailable: '+e.message;}
}
$('passport-form').addEventListener('submit',e=>{e.preventDefault();const slug=$('passport-slug').value.trim().toLowerCase();history.replaceState(null,'','?server='+encodeURIComponent(slug));load(slug);});
const slug=new URLSearchParams(location.search).get('server')||'';if(slug){$('passport-slug').value=slug;load(slug);}