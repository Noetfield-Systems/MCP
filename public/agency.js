const $=id=>document.getElementById(id);
const element=(tag,text)=>{const x=document.createElement(tag);x.textContent=String(text??'');return x;};
const link=(text,href)=>{const a=element('a',text);a.href=href;return a;};
const status=text=>{$('agency-status').textContent=text;};
async function api(path,options={}){
 const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||('HTTP '+response.status));
 return data;
}
const pad=n=>String(n??0);
const date=v=>v?new Date(v).toLocaleString('en-CA',{dateStyle:'medium',timeStyle:'short'}):'No recorded execution';
function stat(name,value){
 const span=element('span',name+': '+pad(value));return span;
}
function render(data){
 const main=$('agency-groups');main.replaceChildren();
 if(!data.servers.length){
  const section=element('section','');section.className='agency-group';
  section.append(element('h2','No owned servers yet'),element('p','Use Agent Launch Kit or Studio to create a real integration. Your first customer label can be added afterward.'),link('Open Agent Launch Kit','/launch'));
  main.append(section);return;
 }
 const groups=data.groups||[];
 for(const group of groups){
  const section=element('section','');section.className='agency-group';
  section.append(element('p','OWNER-SUPPLIED PORTFOLIO GROUP'),element('h2',group.label));
  const totals=element('div','');totals.className='agency-metrics';
  totals.append(stat('Owned servers',group.servers),stat('Published',group.published),stat('Recorded calls / 30d',group.recorded_calls_30d),stat('Recorded successes',group.recorded_successes_30d));
  section.append(totals);
  const servers=data.servers.filter(s=>(s.agency_client_label||'Unassigned')===group.label);
  for(const s of servers){
   const row=element('article','');row.className='agency-server';
   const details=element('div','');
   details.append(element('h3',s.name),element('p',s.description||'No description supplied.'),
     element('p','Status: '+s.status+' · '+s.visibility+' · Published revision '+(s.published_revision??'none')+' · '+s.tool_count+' draft tools'),
     element('p','Recorded calls: '+s.calls_30d+' · successful: '+s.successes_30d+' · last success: '+date(s.last_success_at)),
     element('p','Configured collaborators: '+s.member_count+' · Internal client grouping is not third-party verified.'));
   const actions=element('div','');actions.className='agency-actions';
   actions.append(link('Test and inspect','/lab?id='+encodeURIComponent(s.id)),
     link('Open Studio','/#studio'));
   if(s.status==='published'&&s.visibility==='public'){
    actions.append(link('Client install guide','/connect?server='+encodeURIComponent(s.slug)),link('Evidence passport','/passport?server='+encodeURIComponent(s.slug)));
   }
   details.append(actions);
   const edit=element('div','');const label=element('label','Private client label');
   const input=element('input','');input.className='agency-label';input.type='text';input.maxLength=80;input.value=s.agency_client_label||'';
   input.setAttribute('aria-label','Client label for '+s.name);
   label.append(input);const save=element('button','Save grouping');save.type='button';save.className='agency-label-save';
   save.style.cssText='display:block;margin-top:10px;background:#a1dfd1;border:0;border-radius:9px;padding:10px 13px;cursor:pointer;color:#092922;font-weight:700';
   save.addEventListener('click',async()=>{save.disabled=true;status('Saving owner-supplied group…');
    try{await api('/api/agency/servers/'+encodeURIComponent(s.id)+'/client-label',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_label:input.value})});
      await load();status('Private client label saved; no ownership, CRM, billing or provider data changed.');
    }catch(e){status('Grouping not saved: '+e.message);save.disabled=false;}
   });
   edit.append(label,save);row.append(details,edit);section.append(row);
  }
  main.append(section);
 }
}
async function load(){
 try{
  await api('/api/me');
  const data=await api('/api/agency/portfolio');
  render(data);
  status('Owner-only portfolio loaded · '+data.total_owned_servers+' server(s). Data are not customer or payment claims.');
 }catch(e){status('Sign in from Studio to inspect your own workspace. '+e.message);}
}
load();