const $=id=>document.getElementById(id);
const feedback=$('launch-feedback'),create=$('launch-create'),test=$('launch-test'),publish=$('launch-publish');
let templates=[],draft=null,tested=false,account=false,busy=false;
const say=t=>{feedback.textContent=t;};
async function api(path,options={}){
 const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||('HTTP '+response.status));
 return data;
}
const jsonBody=obj=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)});
function enable(){
 create.disabled=busy||!account||!$('launch-template').value||!!draft;
 test.disabled=busy||!draft||tested;
 publish.disabled=busy||!draft||!tested;
}
function anchor(label,href){
 const a=document.createElement('a');a.textContent=label+' ↗';a.href=href;a.rel='noopener';return a;
}
async function bootstrap(){
 try{
  const [data]=await Promise.all([api('/api/templates')]);
  templates=data.templates||[];
  const select=$('launch-template');select.replaceChildren();
  for(const t of templates){const o=document.createElement('option');o.value=t.id;o.textContent=t.name+' · '+t.tool_count+' tool(s)';select.append(o);}
  select.addEventListener('change',()=>{const t=templates.find(x=>x.id===select.value);$('launch-description').textContent=t?(t.description+' · Source: '+t.source):'';enable();});
  select.dispatchEvent(new Event('change'));
  try{await api('/api/me');account=true;say('Signed in. Choose a source, then create an isolated draft.');}
  catch{say('Sign in from the existing Studio first. Nothing will be created without your account.');$('launch-description').append(' · Sign in at /#studio.');}
 }catch(e){say('Could not load live templates: '+e.message);}
 enable();
}
create.addEventListener('click',async()=>{
 if(busy||!account||draft)return;busy=true;enable();say('Creating a real draft…');
 try{
  const t=templates.find(x=>x.id===$('launch-template').value);
  if(!t)throw Error('SELECT_A_TEMPLATE');
  const result=await api('/api/servers/from-template',jsonBody({template_id:t.id}));
  draft={server:result.server,sampleArgs:result.sample_args||{},template:t};
  say('Draft created: '+draft.server.slug+'. No tool was tested or published yet. Click Test.');
 }catch(e){say('Draft not created: '+e.message);}
 finally{busy=false;enable();}
});
test.addEventListener('click',async()=>{
 if(busy||!draft||tested)return;busy=true;enable();say('Running actual upstream requests. A failed tool blocks this wizard from publishing…');
 try{
  const response=await api('/api/servers/'+encodeURIComponent(draft.server.id));
  const tools=response.tools||[];
  if(!tools.length)throw Error('NO_TOOLS_ON_DRAFT');
  const receipts=[];
  for(const tool of tools){
   const started=Date.now();
   const result=await api('/api/tools/'+encodeURIComponent(tool.id)+'/test',jsonBody({args:draft.sampleArgs}));
   if(result.ok!==true)throw Error(tool.name+' FAILED');
   receipts.push(tool.name+' PASS · '+result.duration_ms+' ms · actual upstream response received');
   if(Date.now()-started>30000)throw Error('SLOW_UPSTREAM_TEST');
  }
  tested=true;
  say(receipts.join('\n')+'\nAll draft tools passed. You may now explicitly publish the tested version.');
 }catch(e){tested=false;say('Test did not pass: '+e.message+'\nNo publish was requested. You can retry or inspect the draft in Studio.');}
 finally{busy=false;enable();}
});
publish.addEventListener('click',async()=>{
 if(busy||!draft||!tested)return;busy=true;enable();say('Publishing the tested draft…');
 try{
  const result=await api('/api/servers/'+encodeURIComponent(draft.server.id)+'/publish',jsonBody({visibility:'public'}));
  if(!result.endpoint)throw Error('PUBLISHED_ENDPOINT_MISSING');
  $('launch-output').style.display='block';
  $('launch-endpoint').textContent=result.endpoint;
  const slug=draft.server.slug,links=$('launch-links');links.replaceChildren(
    anchor('Install in an MCP client','/connect?server='+encodeURIComponent(slug)),
    anchor('Integration Passport','/passport?server='+encodeURIComponent(slug)),
    anchor('MCP Doctor','/doctor?server='+encodeURIComponent(slug))
  );
  say('Published revision '+result.published_revision+' is live. Independent client usage is a separate checkpoint; open your installation guide and invoke a real tool.');
  draft=null;tested=false;
 }catch(e){say('Publish was not confirmed: '+e.message+'. Check Studio before retrying.');}
 finally{busy=false;enable();}
});
bootstrap();