import {McpServer,createMcpHandler} from '@modelcontextprotocol/server';
import {toNodeHandler} from '@modelcontextprotocol/node';
import * as z from 'zod/v4';
import {q} from './db.mjs';
import {safeGet,toolUrl} from './security.mjs';

function schemaFor(params){
  const shape={};
  for(const p of params||[]){
    let entry=p.type==='integer'?z.number().int():p.type==='number'?z.number():p.type==='boolean'?z.boolean():z.string().max(500);
    shape[p.name]=p.required?entry:entry.optional();
  }
  return z.object(shape);
}
async function executeTool(server,tool,args,principal){
  const start=Date.now();let success=false;
  try {
    if(tool.method!=='GET')throw new Error('Only read-only GET tools are enabled');
    const count=await q('SELECT count(*)::int AS n FROM tool_events WHERE server_id=$1 AND created_at>now()-interval \'1 day\'',[server.id]);
    if(count.rows[0].n >= (server.owner_plan==='pro'?25000:500))throw new Error('Daily execution quota reached');
    const target=toolUrl(tool,args);
    const result=await safeGet(target);
    success=true;
    return {content:[{type:'text',text:result.body}],structuredContent:{status:result.status,contentType:result.contentType,source:target}};
  } catch(error){
    return {isError:true,content:[{type:'text',text:String(error.message||error).slice(0,250)}]};
  } finally {
    await q('INSERT INTO tool_events(server_id,tool_name,account_id,success,duration_ms) VALUES($1,$2,$3,$4,$5)',[server.id,tool.name,principal?.id||null,success,Date.now()-start]).catch(()=>{});
  }
}
export function managedMcp(server,tools,principal){
  const handler=createMcpHandler(()=>{
    const mcp=new McpServer({name:server.name,version:'1.0.0'});
    for(const t of tools){
      mcp.registerTool(t.name,{title:t.name,description:t.description,inputSchema:schemaFor(t.params)},async(args)=>executeTool(server,t,args,principal));
    }
    return mcp;
  });
  return toNodeHandler(handler);
}
export function foundryMcp(){
  const handler=createMcpHandler(()=>{
    const mcp=new McpServer({name:'MCP Foundry Directory',version:'0.1.0'});
    mcp.registerTool('search_servers',{description:'Search published public MCP servers in MCP Foundry',inputSchema:z.object({query:z.string().max(100).optional()})},async({query=''})=>{
      const {rows}=await q('SELECT slug,name,description FROM servers WHERE status=\'published\' AND visibility=\'public\' AND (name ILIKE $1 OR description ILIKE $1) ORDER BY updated_at DESC LIMIT 25',['%'+query+'%']);
      return {content:[{type:'text',text:JSON.stringify(rows)}]};
    });
    mcp.registerTool('get_server_tools',{description:'List tools published by one MCP Foundry server',inputSchema:z.object({slug:z.string().max(80)})},async({slug})=>{
      const {rows}=await q('SELECT s.name,t.name AS tool_name,t.description,t.params FROM servers s JOIN tools t ON t.server_id=s.id WHERE s.slug=$1 AND s.status=\'published\' AND s.visibility=\'public\' ORDER BY t.name',[slug]);
      return {content:[{type:'text',text:JSON.stringify(rows)}]};
    });
    return mcp;
  });
  return toNodeHandler(handler);
}
