export const HOSTS=Object.freeze([
 {id:'cursor',name:'Cursor',filename:'.cursor/mcp.json',kind:'json'},
 {id:'vscode',name:'VS Code',filename:'.vscode/mcp.json',kind:'json'},
 {id:'claude',name:'Claude Code',filename:'terminal',kind:'command'},
 {id:'generic',name:'Generic Streamable HTTP host',filename:'mcp.json',kind:'json'}
]);
export function generateClientInstall(host,endpoint,{privateServer=false}={}){
 const item=HOSTS.find(h=>h.id===host);
 if(!item)throw Error('UNSUPPORTED_CLIENT');
 const url=new URL(endpoint);
 if(url.protocol!=='https:'||!/^\/mcp\/[a-z][a-z0-9-]{2,48}$/.test(url.pathname)||
    url.search||url.hash||url.username||url.password)throw Error('INVALID_REMOTE_MCP_ENDPOINT');
 const name=url.pathname.split('/').at(-1);
 if(item.id==='claude'){
  const command=['claude','mcp','add','--transport','http',name,url.href];
  // Host/CLI versions vary; no authentication credentials are inserted.
  return {kind:'command',filename:item.filename,text:command.join(' '),
    hint:privateServer?'This private endpoint additionally requires host-supported bearer Authorization; configure it securely in your client.':'Confirm your installed Claude Code CLI supports remote HTTP.'};
 }
 const entry={type:'http',url:url.href};
 if(privateServer)entry.headers={Authorization:'Bearer YOUR_FOUNDRY_API_KEY'};
 const config=item.id==='vscode'?{servers:{[name]:entry}}:{mcpServers:{[name]:entry}};
 return {kind:'json',filename:item.filename,text:JSON.stringify(config,null,2),
   hint:privateServer?'Replace only the placeholder with your private Foundry API key; do not commit this file or share the key.':'Remote Streamable HTTP support depends on the specific host version.'};
}
