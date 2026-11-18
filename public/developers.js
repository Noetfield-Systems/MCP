const copied = {
  public:'https://mcp-foundry-web-production.up.railway.app/mcp/foundry',
  private:JSON.stringify({mcpServers:{foundry:{type:'http',url:'https://mcp-foundry-web-production.up.railway.app/mcp/foundry',headers:{Authorization:'Bearer YOUR_PERSONAL_FOUNDRY_API_KEY'}}}},null,2),
  sdk:`import {Client, StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
const client = new Client({name:'my-foundry-client',version:'1.0.0'});
const transport = new StreamableHTTPClientTransport(new URL('https://mcp-foundry-web-production.up.railway.app/mcp/foundry'));
try {
  await client.connect(transport);
  const {tools} = await client.listTools();
  console.log(tools.map(tool => tool.name));
} finally {
  await client.close();
}`
};
document.querySelectorAll('[data-docs-copy]').forEach(button=>button.addEventListener('click',async()=>{
 const key=button.dataset.docsCopy;
 if(!Object.prototype.hasOwnProperty.call(copied,key))return;
 try{await navigator.clipboard.writeText(copied[key]);button.textContent='COPIED';}
 catch{button.textContent='COPY UNAVAILABLE';}
}));
