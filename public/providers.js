const root=document.getElementById('providers-live');
const note=document.getElementById('providers-evidence-note');
const short=v=>typeof v==='string'?v.slice(0,240):'';
fetch('/api/catalog',{cache:'no-store'}).then(async r=>{
 if(!r.ok)throw Error('CATALOG_UNAVAILABLE');
 return r.json();
}).then(data=>{
 root.replaceChildren();
 const servers=Array.isArray(data.servers)?data.servers:[];
 if(!servers.length){
  const empty=document.createElement('div');empty.className='providers-card';
  empty.textContent='No public publisher integration is listed yet. This is a real empty state, not a directory of sample partners.';
  root.append(empty);note.textContent='Published directory has no listed public server records at this time.';return;
 }
 for(const s of servers.slice(0,12)){
  const card=document.createElement('article');card.className='providers-card';
  const title=document.createElement('h3');title.textContent=short(s.name);
  const description=document.createElement('p');description.textContent=short(s.description)||'Publisher supplied no description.';
  const count=document.createElement('small');count.textContent=Number(s.tool_count||0)+' published tools · not independently endorsed';
  const p=document.createElement('p'),link=document.createElement('a');link.href='/passport?server='+encodeURIComponent(s.slug);
  link.textContent='View published-definition passport';p.append(link);
  card.append(title,description,count,p);root.append(card);
 }
 note.textContent=servers.length+' actual published records returned by Foundry. No external partnership, install or revenue inferred.';
}).catch(()=>{
 root.replaceChildren();
 const box=document.createElement('div');box.className='providers-card';box.textContent='Live directory could not be loaded. Publisher proposals and the launch tools remain available.';
 root.append(box);note.textContent='No listing or partnership is inferred while the directory is unavailable.';
});
