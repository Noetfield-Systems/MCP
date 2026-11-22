import {generateClientInstall,generateDocsInstallLink} from './client-config.mjs';
const $=s=>document.querySelector(s);
function render(){
 const slug=$('#client-slug').value.trim().toLowerCase();
 const endpoint=location.origin+'/mcp/'+slug;
 const publicLink=/^[a-z][a-z0-9-]{2,48}$/.test(slug)&&!$('#client-private').checked;
 $('#passport-link').href=publicLink?'/passport?server='+encodeURIComponent(slug):'/passport';
 $('#doctor-link').href=publicLink?'/doctor?server='+encodeURIComponent(slug):'/doctor';
 $('#receipt-hint').textContent=publicLink?'Public evidence links ready. Verify the server has been published before sharing.':'For a private server use owner-only Studio diagnostics; no public receipts are shared.';
 try{
 const data=generateClientInstall($('#client-host').value,endpoint,{privateServer:$('#client-private').checked});
 $('#client-code').textContent=data.text;
 $('#client-file').textContent=data.filename;
 $('#client-hint').textContent=data.hint;
 $('#client-feedback').textContent='';
 }catch(e){$('#client-code').textContent='Enter a valid MCP server slug.';$('#client-file').textContent='—';$('#client-hint').textContent=e.message;}
 try{
   const embed=generateDocsInstallLink(location.origin,slug,{privateServer:$('#client-private').checked});
   $('#docs-embed-code').textContent=embed.html;
   $('#docs-embed-copy').disabled=false;
   $('#docs-embed-hint').textContent='Public documentation link ready. It contains no credentials; verify that this server is published before sharing.';
 }catch(e){
   $('#docs-embed-code').textContent='';
   $('#docs-embed-copy').disabled=true;
   $('#docs-embed-hint').textContent=$('#client-private').checked
     ?'Private endpoints are not eligible for a public install embed. Do not share an owner API key.'
     :'Enter a valid public server slug to generate the link.';
 }
}
const params=new URLSearchParams(location.search),slug=params.get('server');
if(slug&&/^[a-z][a-z0-9-]{2,48}$/.test(slug))$('#client-slug').value=slug;
$('#client-private').checked=params.get('private')==='1';
['client-slug','client-host','client-private'].forEach(id=>$('#'+id).addEventListener('input',render));
$('#client-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#client-code').textContent);$('#client-feedback').textContent='Configuration copied. Now paste it into your supported host.';}catch{$('#client-feedback').textContent='Clipboard unavailable. Select and copy the configuration manually.';}});
$('#docs-embed-copy').addEventListener('click',async()=>{
 try{
  if($('#docs-embed-copy').disabled)return;
  await navigator.clipboard.writeText($('#docs-embed-code').textContent);
  $('#docs-embed-hint').textContent='HTML link copied. Add it to your public API documentation and confirm the endpoint is published.';
 }catch{$('#docs-embed-hint').textContent='Clipboard unavailable. Select the displayed HTML and copy manually.';}
});
render();
fetch('/healthz').then(r=>r.json()).then(x=>{$('#client-status').textContent=x.ok?'Foundry gateway operational · live PostgreSQL check':'Gateway unavailable';}).catch(()=>{$('#client-status').textContent='Gateway status unavailable';});
