import {McpServer,createMcpHandler} from '@modelcontextprotocol/server';
import {registerAppResource,registerAppTool,RESOURCE_MIME_TYPE} from '@modelcontextprotocol/ext-apps/server';
import {readFileSync} from 'node:fs';
import {toNodeHandler} from '@modelcontextprotocol/node';
import * as z from 'zod/v4';
import {q} from './db.mjs';
import {recordActivation} from './activation.mjs';
import {commercialOffers,recommendOffer} from './agent-commerce.mjs';
import {parseOpenapi,openapiPreview} from './openapi.mjs';
import {safeGet,toolUrl,validatedTarget,specTools} from './security.mjs';
import {guardedManagedGet} from './oauth.mjs';
import {markDraftChanged,publishDraftServer} from './publication.mjs';
import {classifyToolError} from './diagnostics.mjs';
import {randomUUID} from 'node:crypto';

function schemaFor(params){
  const shape={};
  for(const p of params||[]){
    let entry=p.type==='integer'?z.number().int():p.type==='number'?z.number():p.type==='boolean'?z.boolean():z.string().max(500);
    shape[p.name]=p.required?entry:entry.optional();
  }
  return z.object(shape);
}
async function executeTool(server,tool,args,principal){
  const start=Date.now();let success=false,errorCode=null,upstreamStatus=null;
  try {
    if(tool.method!=='GET')throw new Error('Only read-only GET tools are enabled');
    const count=await q('SELECT count(*)::int AS n FROM tool_events WHERE server_id=$1 AND created_at>now()-interval \'1 day\'',[server.id]);
    if(count.rows[0].n >= (server.owner_plan==='pro'?25000:500))throw new Error('Daily execution quota reached');
    const target=toolUrl(tool,args);
    const result=await guardedManagedGet(server,principal,target);
    success=true;upstreamStatus=result.status;
    return {content:[{type:'text',text:result.body}],structuredContent:{status:result.status,contentType:result.contentType,source:target}};
  } catch(error){
    errorCode=classifyToolError(error);
    return {isError:true,content:[{type:'text',text:errorCode}]};
  } finally {
    await q('INSERT INTO tool_events(server_id,tool_name,account_id,success,duration_ms,error_code,upstream_status) VALUES($1,$2,$3,$4,$5,$6,$7)',[server.id,tool.name,principal?.id||null,success,Date.now()-start,errorCode,upstreamStatus]).catch(()=>{});
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
export function foundryMcp(principal=null){
  const handler=createMcpHandler(()=>{
    const mcp=new McpServer({name:'MCP Foundry Directory',version:'0.1.0'});
    // MCP Apps extension: an authenticated or anonymous host can render a
    // self-contained Foundry View. All actions invoke existing owner-scoped
    // server tools through the host; no API keys are embedded in HTML.
    const appUri='ui://mcp-foundry/studio.html';
    registerAppTool(mcp,'open_foundry_app',{
      title:'Open MCP Foundry Studio',
      description:'Open interactive Foundry directory and authenticated Builder workspace in a compatible MCP Apps host.',
      inputSchema:z.object({}),
      _meta:{ui:{resourceUri:appUri}},
      annotations:{readOnlyHint:true,openWorldHint:false}
    },async()=>({
      content:[{type:'text',text:'MCP Foundry interactive workspace. Use this View to discover real servers or manage your authorized workspace.'}],
      structuredContent:{product:'MCP Foundry',surface:'mcp_apps',authenticated:!!principal}
    }));
    registerAppResource(mcp,'MCP Foundry Studio',appUri,{mimeType:RESOURCE_MIME_TYPE},async()=>({
      contents:[{uri:appUri,mimeType:RESOURCE_MIME_TYPE,text:readFileSync(new URL('../dist/index.html',import.meta.url),'utf8')}]
    }));

    mcp.registerTool('search_servers',{description:'Search published public MCP servers in MCP Foundry',inputSchema:z.object({query:z.string().max(100).optional()})},async({query=''})=>{
      const {rows}=await q('SELECT slug,name,description FROM servers WHERE status=\'published\' AND visibility=\'public\' AND published_snapshot IS NOT NULL AND (name ILIKE $1 OR description ILIKE $1) ORDER BY updated_at DESC LIMIT 25',['%'+query+'%']);
      return {content:[{type:'text',text:JSON.stringify(rows)}]};
    });
    mcp.registerTool('get_server_tools',{description:'List tools published by one MCP Foundry server',inputSchema:z.object({slug:z.string().max(80)})},async({slug})=>{
      const {rows}=await q("SELECT name,published_snapshot->'tools' AS tools FROM servers WHERE slug=$1 AND status='published' AND visibility='public' AND published_snapshot IS NOT NULL",[slug]);
      const tools=rows[0]?.tools||[];
      return {content:[{type:'text',text:JSON.stringify(tools.map(t=>({name:rows[0].name,tool_name:t.name,description:t.description,params:t.params})))}]};
    });
    mcp.registerTool('get_commercial_offers',{
      description:'Read native Foundry integration offers, scope, prices and purchase links. No purchase or order is created.',
      inputSchema:z.object({}),annotations:{readOnlyHint:true,openWorldHint:false}
    },async()=>{
      const data=commercialOffers();return {content:[{type:'text',text:JSON.stringify(data)}],structuredContent:data};
    });
    mcp.registerTool('recommend_commercial_offer',{
      description:'Match a self-reported API scope to existing Foundry offers or scope review. No purchase, contact submission or guaranteed compatibility.',
      inputSchema:z.object({public_https:z.boolean(),requires_auth:z.boolean(),requires_write:z.boolean(),get_tools:z.number().int().min(1).max(100),api_count:z.number().int().min(1).max(100),prefer_self_serve:z.boolean().optional()}),
      annotations:{readOnlyHint:true,openWorldHint:false}
    },async(args)=>{
      const data=recommendOffer(args);return {content:[{type:'text',text:JSON.stringify(data)}],structuredContent:data};
    });
    // Anonymous clients can discover servers; authenticated API key holders can build and publish.
    // Each tool checks the owner and persists changes in the existing Foundry database.
    if(principal){
      const ok=data=>({content:[{type:'text',text:JSON.stringify(data)}],structuredContent:data});
      const failed=message=>({isError:true,content:[{type:'text',text:String(message).slice(0,250)}]});
      const guarded=fn=>async args=>{try{return ok(await fn(args));}catch(e){return failed(e.message||e);}};
      const myServer=async id=>{
        const {rows}=await q('SELECT * FROM servers WHERE id=$1 AND owner_id=$2',[id,principal.id]);
        if(!rows.length)throw Error('Server not found in your workspace');return rows[0];
      };
      mcp.registerTool('list_my_servers',{
        description:'List only MCP servers owned by your authenticated Foundry workspace.',
        inputSchema:z.object({})
      },guarded(async()=>{
        const {rows}=await q('SELECT id,slug,name,status,visibility FROM servers WHERE owner_id=$1 ORDER BY updated_at DESC LIMIT 100',[principal.id]);return {servers:rows};
      }));
      mcp.registerTool('create_server',{
        description:'Create a new draft MCP server in your Foundry workspace. This does not publish it.',
        inputSchema:z.object({name:z.string().trim().min(2).max(100),slug:z.string().regex(/^[a-z][a-z0-9-]{2,48}$/),description:z.string().max(400).default('')})
      },guarded(async({name,slug,description})=>{
        if(slug==='foundry')throw Error('Reserved server slug');
        const total=await q('SELECT count(*)::int n FROM servers WHERE owner_id=$1',[principal.id]);
        if(principal.plan!=='pro'&&total.rows[0].n>=2)throw Error('Free server limit reached');
        try{const {rows}=await q('INSERT INTO servers(id,owner_id,slug,name,description) VALUES($1,$2,$3,$4,$5) RETURNING id,name,slug,status',[randomUUID(),principal.id,slug,name,description]);await recordActivation('server_created',principal.id,rows[0].id,'native_mcp');return {server:rows[0]};}
        catch(e){if(e.code==='23505')throw Error('Slug is already taken');throw e;}
      }));
      const param=z.object({
        name:z.string().regex(/^[a-zA-Z_][\\w-]{0,63}$/),
        in:z.enum(['path','query']),
        type:z.enum(['string','integer','number','boolean']),
        required:z.boolean().default(false)
      });
      mcp.registerTool('add_readonly_tool',{
        description:'Add a GET-only HTTPS tool to a server that you own. Values are allowed only in declared query/path parameters. Editing a published server keeps its live revision running until the next publish.',
        inputSchema:z.object({
          server_id:z.string().uuid(),name:z.string().regex(/^[a-z][a-z0-9_]{1,59}$/),
          description:z.string().trim().min(3).max(280),url:z.url().max(1500),
          params:z.array(param).max(18).default([])
        })
      },guarded(async({server_id,name,description,url,params})=>{
        const server=await myServer(server_id);
        validatedTarget(url);
        const count=await q('SELECT count(*)::int n FROM tools WHERE server_id=$1',[server.id]);
        if(principal.plan!=='pro'&&count.rows[0].n>=10)throw Error('Free plan tool limit reached');
        try{
          const {rows}=await q("INSERT INTO tools(id,server_id,name,description,url,params) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,name",[randomUUID(),server.id,name,description,url,JSON.stringify(params)]);
          await markDraftChanged(server.id);
          await recordActivation('tool_added',principal.id,server.id,'native_mcp');
          return {tool:rows[0],status:server.status,unpublished_changes:server.status==='published'};
        }catch(e){if(e.code==='23505')throw Error('Duplicate tool name');throw e;}
      }));
      mcp.registerTool('import_openapi',{
        description:'Import OpenAPI JSON or YAML GET operations as draft MCP tools. Only public HTTPS servers and read-only GET operations are supported.',
        inputSchema:z.object({
          server_id:z.string().uuid(),base_url:z.url(),openapi_json:z.string().min(5).max(262144)
        })
      },guarded(async({server_id,base_url,openapi_json})=>{
        const server=await myServer(server_id);
        const doc=parseOpenapi(openapi_json);
        const entries=openapiPreview(doc,base_url).tools;let added=0;
        const limit=principal.plan==='pro'?50:10;
        const existing=await q('SELECT count(*)::int n FROM tools WHERE server_id=$1',[server.id]);
        const capacity=Math.max(0,limit-existing.rows[0].n);
        for(const tool of entries.slice(0,capacity)){
          try{validatedTarget(tool.url);}catch{continue;}
          const out=await q('INSERT INTO tools(id,server_id,name,description,url,params) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(server_id,name) DO NOTHING RETURNING id',[randomUUID(),server.id,tool.name,tool.description,tool.url,JSON.stringify(tool.params)]);
          added+=out.rowCount;
        }
        if(added){await markDraftChanged(server.id);await recordActivation('tool_added',principal.id,server.id,'native_mcp');}
        return {found:entries.length,added,status:server.status,unpublished_changes:!!added&&server.status==='published'};
      }));
      mcp.registerTool('test_readonly_tool',{
        description:'Run one real read-only tool against its upstream HTTPS API, only for an MCP server you own. This is a test, not a customer invocation.',
        inputSchema:z.object({server_id:z.string().uuid(),tool_name:z.string().max(60),arguments_json:z.string().max(10000).default('{}')})
      },guarded(async({server_id,tool_name,arguments_json})=>{
        const server=await myServer(server_id);
        const {rows}=await q('SELECT * FROM tools WHERE server_id=$1 AND name=$2',[server.id,tool_name]);
        if(!rows.length)throw Error('Tool not found');
        let args;try{args=JSON.parse(arguments_json);}catch{throw Error('Invalid tool argument JSON');}
        const source=toolUrl(rows[0],args);
        const data=await guardedManagedGet(server,principal,source);
        await recordActivation('tool_test_succeeded',principal.id,server.id,'native_mcp');
        return {ok:true,source,status:data.status,content_type:data.contentType,response:data.body.slice(0,16000)};
      }));
      mcp.registerTool('publish_server',{
        description:'Publish one of your MCP servers after at least one tool has been registered. Visibility may be public or private.',
        inputSchema:z.object({server_id:z.string().uuid(),visibility:z.enum(['public','private']).default('public')})
      },guarded(async({server_id,visibility})=>{
        const server=await myServer(server_id);
        const count=await q('SELECT count(*)::int n FROM tools WHERE server_id=$1',[server.id]);
        if(!count.rows[0].n)throw Error('Add a tool before publishing');
        const binding=await q('SELECT 1 FROM server_oauth_bindings WHERE server_id=$1',[server.id]);
        if(binding.rowCount&&visibility!=='private')throw Error('OAUTH_SERVER_MUST_REMAIN_PRIVATE');
        const published=await publishDraftServer(server.id,visibility);
        await recordActivation('server_published',principal.id,server.id,'native_mcp');
        const base=(process.env.PUBLIC_URL||'').replace(/\/$/,'');
        return {status:'published',slug:server.slug,endpoint:base+'/mcp/'+server.slug,visibility,published_revision:published.version};
      }));
      mcp.registerTool('get_server_usage',{
        description:'Get only observed real tool invocation metrics for a server in your workspace; does not infer customers or revenue.',
        inputSchema:z.object({server_id:z.string().uuid()})
      },guarded(async({server_id})=>{
        await myServer(server_id);
        const {rows}=await q("SELECT count(*)::int calls,count(*) FILTER (WHERE success)::int successes,coalesce(round(avg(duration_ms)),0)::int average_ms FROM tool_events WHERE server_id=$1 AND created_at>now()-interval '30 days'",[server_id]);
        return {usage:rows[0]};
      }));
    }
    return mcp;
  });
  return toNodeHandler(handler);
}
