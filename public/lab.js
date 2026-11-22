const $=id=>document.getElementById(id),text=(id,value)=>{$(id).textContent=String(value??'');};
const json=data=>JSON.stringify(data,null,2);
const opts=value=>({method:'POST',headers:{'Content-Type':'application/json'},body:json(value)});
let account=false,servers=[],curated=[];
async function api(url,options={}){
 const res=await fetch(url,{credentials:'same-origin',cache:'no-store',...options});
 const body=await res.json().catch(()=>({}));
 if(!res.ok)throw Error(body.error||('HTTP '+res.status));
 return body;
}
function selected(){return $('lab-server').value;}
async function loadServers(){
 try{
  await api('/api/me');
  account=true;text('lab-auth','Signed in · showing only your owned servers.');
  const x=await api('/api/servers');
  servers=x.servers||[];
  const s=$('lab-server');s.replaceChildren(new Option('Select a server…',''));
  for(const r of servers)s.add(new Option(r.name+' · '+r.slug,r.id));
  s.addEventListener('change',()=>{curated=[];$('lab-suggestions').replaceChildren();$('lab-import').disabled=true;loadWatch().catch(()=>{});});
  if(servers.length)s.value=servers[0].id;
  await loadWatch();
 }catch(e){text('lab-auth','Sign in through /#studio to use your own server. '+e.message);}
}
const requireServer=()=>{if(!account||!selected())throw Error('SELECT_OWNED_SERVER');return encodeURIComponent(selected());};
async function loadWatch(){
 if(!selected())return;
 try{
  const d=await api('/api/servers/'+requireServer()+'/contract-watch');
  if(!d.watch){text('lab-contract-output','No pinned contract baseline for this server.');return;}
  $('lab-spec').value=d.watch.spec_url;$('lab-base').value=d.watch.base_url;
  text('lab-contract-output',json(d.watch));
 }catch(e){text('lab-contract-output',e.message);}
}
$('lab-run').addEventListener('click',async()=>{
 const btn=$('lab-run');btn.disabled=true;text('lab-run-output','Testing source tools against real upstream APIs…');
 try{
  const id=requireServer(),samples=JSON.parse($('lab-samples').value||'{}');
  const res=await api('/api/servers/'+id+'/test-suite',opts({samples}));
  text('lab-run-output',json(res));
 }catch(e){text('lab-run-output','Test not confirmed: '+e.message);}finally{btn.disabled=false;}
});
$('lab-history').addEventListener('click',async()=>{
 try{text('lab-run-output',json(await api('/api/servers/'+requireServer()+'/test-runs')));}
 catch(e){text('lab-run-output','History unavailable: '+e.message);}
});
const spec=()=>({spec_url:$('lab-spec').value.trim(),base_url:$('lab-base').value.trim()});
$('lab-pin').addEventListener('click',async()=>{
 const btn=$('lab-pin');btn.disabled=true;text('lab-contract-output','Fetching and pinning public OpenAPI metadata…');
 try{text('lab-contract-output',json(await api('/api/servers/'+requireServer()+'/contract-watch',opts(spec()))));}
 catch(e){text('lab-contract-output','Baseline not saved: '+e.message);}finally{btn.disabled=false;}
});
$('lab-check').addEventListener('click',async()=>{
 const btn=$('lab-check');btn.disabled=true;text('lab-contract-output','Fetching the current external OpenAPI contract…');
 try{text('lab-contract-output',json(await api('/api/servers/'+requireServer()+'/contract-watch/check',opts({}))));}
 catch(e){text('lab-contract-output','Check failed: '+e.message);}finally{btn.disabled=false;}
});
$('lab-curate').addEventListener('click',async()=>{
 const btn=$('lab-curate');btn.disabled=true;$('lab-suggestions').replaceChildren();$('lab-import').disabled=true;
 text('lab-curator-output','Reading a real public OpenAPI specification…');
 try{
  const d=await api('/api/servers/'+requireServer()+'/curate-openapi',opts({...spec(),max:5}));
  curated=d.recommended||[];
  const region=$('lab-suggestions');
  for(const t of curated){
   const label=document.createElement('label'),box=document.createElement('input'),desc=document.createElement('span');
   box.type='checkbox';box.value=t.name;box.checked=true;box.className='lab-select-tool';
   desc.textContent=t.name+' · '+t.description+' · heuristic score '+t.score;
   label.append(box,desc);region.append(label);
  }
  $('lab-import').disabled=!curated.length;
  text('lab-curator-output',json({method:d.method,total_supported:d.total_supported,recommended_count:curated.length,other_count:d.other_count,caveat:d.caveat}));
 }catch(e){text('lab-curator-output','Curation failed: '+e.message);}finally{btn.disabled=false;}
});
$('lab-import').addEventListener('click',async()=>{
 const names=[...document.querySelectorAll('.lab-select-tool:checked')].map(x=>x.value);
 if(!names.length){text('lab-curator-output','Select at least one operation.');return;}
 const btn=$('lab-import');btn.disabled=true;
 try{
  const input={spec_url:spec().spec_url,baseUrl:spec().base_url,selected_tool_names:names};
  const d=await api('/api/servers/'+requireServer()+'/import-openapi',opts(input));
  text('lab-curator-output',json(d)+'\nTools imported to your draft, not automatically published.');
 }catch(e){text('lab-curator-output','Import was not confirmed: '+e.message);}finally{btn.disabled=false;}
});
loadServers();