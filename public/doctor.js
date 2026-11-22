const $=id=>document.getElementById(id),el=(tag,text)=>{const x=document.createElement(tag);x.textContent=String(text??'');return x;};
async function diagnose(slug){
 $('doctor-result').hidden=true;$('doctor-status').textContent='Reading actual published metadata and invocation receipts…';
 if(!/^[a-z][a-z0-9-]{2,48}$/.test(slug)){$('doctor-status').textContent='Enter a valid server slug.';return;}
 try{
  const r=await fetch('/api/doctor/'+encodeURIComponent(slug),{cache:'no-store'});
  const d=await r.json();
  if(!r.ok)throw Error(d.error||('HTTP '+r.status));
  $('doctor-outcome').textContent=d.assessment.replaceAll('_',' ').toUpperCase();
  $('doctor-observations').textContent='Past 30 days: '+d.observations.recorded_calls+' recorded calls; '+d.observations.recorded_successes+' successes; '+d.observations.recorded_failures+' failures; p95 '+(d.observations.p95_ms??'not available')+' ms. These may include test traffic.';
  const checks=$('doctor-checks');checks.replaceChildren();
  for(const c of d.checks){const card=el('div','');card.append(el('strong',(c.status==='pass'?'PASS':'ATTENTION')+' · '+c.id.replaceAll('_',' ')),el('small',c.detail));checks.append(card);}
  const recs=$('doctor-recommendations');recs.replaceChildren();
  for(const t of d.recommendations)recs.append(el('li',t));
  $('doctor-boundary').textContent=d.boundary;
  $('doctor-install').href='/connect?server='+encodeURIComponent(slug);
  $('doctor-passport').href='/passport?server='+encodeURIComponent(slug);
  $('doctor-status').textContent='Diagnosis generated from real published state and recorded events.';
  $('doctor-result').hidden=false;
 }catch(e){$('doctor-status').textContent='Diagnostic unavailable: '+e.message;}
}
$('doctor-form').addEventListener('submit',e=>{e.preventDefault();const slug=$('doctor-slug').value.trim().toLowerCase();history.replaceState(null,'','?server='+encodeURIComponent(slug));diagnose(slug);});
const slug=new URLSearchParams(location.search).get('server')||'';if(slug){$('doctor-slug').value=slug;diagnose(slug);}