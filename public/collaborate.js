const form=document.querySelector('#opportunity-form');
const roles=[...document.querySelectorAll('[data-track]')];
const status=document.querySelector('#op-feedback');
const field=document.querySelector('#op-track');
const source=(new URLSearchParams(location.search).get('utm_source')||'').trim().toLowerCase();
const allowedSources=new Set(['direct','organic','github','referral','community','social','web3','partner','other']);
function chooseRole(role,scroll=false){
 if(!roles.some(r=>r.dataset.track===role))return;
 field.value=role;
 roles.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.track===role)));
 if(scroll)document.querySelector('#apply')?.scrollIntoView({behavior:'smooth',block:'start'});
}
roles.forEach(button=>button.addEventListener('click',()=>chooseRole(button.dataset.track,true)));
field.addEventListener('change',()=>roles.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.track===field.value))));
const requested=new URLSearchParams(location.search).get('track');
if(requested)chooseRole(requested);
form.addEventListener('submit',async event=>{
 event.preventDefault();status.classList.remove('error');
 if(!form.reportValidity())return;
 const button=document.querySelector('#op-submit');button.disabled=true;status.textContent='Submitting your real project proposal…';
 try{
  const fd=new FormData(form);
  const body={track:fd.get('track'),contact_name:fd.get('contact_name'),email:fd.get('email'),
    organization:fd.get('organization'),website:fd.get('website'),github_url:fd.get('github_url'),
    project_brief:fd.get('project_brief'),nickname:fd.get('nickname'),
    contact_consent:fd.has('contact_consent'),updates_consent:fd.has('updates_consent'),
    source:allowedSources.has(source)?source:'direct'};
  const response=await fetch('/api/opportunities',{method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw Error((result.error||'SUBMISSION_FAILED').replaceAll('_',' '));
  status.textContent='Proposal received in the Foundry opportunity pipeline. Reference: '+(result.reference||'received')+'. No job, payment or partnership is implied.';
  form.reset();roles.forEach(b=>b.setAttribute('aria-pressed','false'));
 }catch(error){status.classList.add('error');status.textContent='Submission not recorded: '+error.message;}
 finally{button.disabled=false;}
});
