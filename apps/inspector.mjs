// Safe browser display shape for public, published MCP tool metadata.
const plain=(value,max=260)=>typeof value==='string'?value.trim().slice(0,max):'';
export function publicToolCards(source){
 if(!Array.isArray(source))throw Error('PUBLIC_TOOL_LIST_REQUIRED');
 return source.slice(0,60).map((t)=>{
  if(!t||typeof t!=='object')return null;
  const name=plain(t.tool_name||t.name,64);
  if(!/^[a-z][a-z0-9_]{1,59}$/.test(name))return null;
  const params=(Array.isArray(t.params)?t.params:[]).slice(0,18).map(p=>({
   name:plain(p?.name,64),type:plain(p?.type,25),required:p?.required===true,
   where:['path','query'].includes(p?.in)?p.in:'unknown'
  })).filter(p=>/^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$/.test(p.name));
  return {name,description:plain(t.description,280),parameters:params};
 }).filter(Boolean);
}
export function publicHostEndpoint(slug,base='https://mcp-foundry-web-production.up.railway.app'){
 if(typeof slug!=='string'||!/^[a-z][a-z0-9-]{2,48}$/.test(slug))throw Error('PUBLIC_SERVER_SLUG_REQUIRED');
 return base.replace(/\/$/,'')+'/mcp/'+slug;
}
