import {generateClientInstall} from './client-config.mjs';
const $=s=>document.querySelector(s);
function render(){
 const slug=$('#client-slug').value.trim().toLowerCase();
 const endpoint=location.origin+'/mcp/'+slug;
 try{
 const data=generateClientInstall($('#client-host').value,endpoint,{privateServer:$('#client-private').checked});
 $('#client-code').textContent=data.text;
 $('#client-file').textContent=data.filename;
 $('#client-hint').textContent=data.hint;
 $('#client-feedback').textContent='';
 }catch(e){$('#client-code').textContent='Enter a valid MCP server slug.';$('#client-file').textContent='—';$('#client-hint').textContent=e.message;}
}
const params=new URLSearchParams(location.search),slug=params.get('server');
if(slug&&/^[a-z][a-z0-9-]{2,48}$/.test(slug))$('#client-slug').value=slug;
$('#client-private').checked=params.get('private')==='1';
['client-slug','client-host','client-private'].forEach(id=>$('#'+id).addEventListener('input',render));
$('#client-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#client-code').textContent);$('#client-feedback').textContent='Configuration copied. Now paste it into your supported host.';}catch{$('#client-feedback').textContent='Clipboard unavailable. Select and copy the configuration manually.';}});
render();
fetch('/healthz').then(r=>r.json()).then(x=>{$('#client-status').textContent=x.ok?'Foundry gateway operational · live PostgreSQL check':'Gateway unavailable';}).catch(()=>{$('#client-status').textContent='Gateway status unavailable';});
