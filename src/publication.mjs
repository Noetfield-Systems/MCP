import {randomUUID} from 'node:crypto';
import {pool,q} from './db.mjs';
import {validatedTarget} from './security.mjs';

/** Durable published definitions. Draft tool rows are never served to external MCP clients. */
export function activeTools(server){
 const tools=server?.published_snapshot?.tools;
 if(!Array.isArray(tools))return null; // backfill during migration; never silently serve draft
 return tools;
}
export const draftStatus=server=>server?.status==='published'?'published':'draft';

/** Keep a published endpoint active while the owner changes draft tools. */
export async function markDraftChanged(serverId,query=q){
 return query("UPDATE servers SET has_unpublished_changes=(status='published'),updated_at=now() WHERE id=$1",[serverId]);
}

/** Atomic, versioned cutover of a server to its verified draft. No partial tool lists. */
export async function publishDraftServer(serverId,visibility='public'){
 if(!['public','private'].includes(visibility))throw Error('INVALID_VISIBILITY');
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  const existing=await c.query('SELECT * FROM servers WHERE id=$1 FOR UPDATE',[serverId]);
  const server=existing.rows[0];if(!server)throw Error('SERVER_NOT_FOUND');
  const tools=(await c.query('SELECT name,description,method,url,params FROM tools WHERE server_id=$1 ORDER BY name',[serverId])).rows;
  if(!tools.length)throw Error('ADD_A_TOOL_FIRST');
  for(const t of tools){if(t.method!=='GET')throw Error('ONLY_GET_SUPPORTED');validatedTarget(t.url);}
  const oauth=(await c.query('SELECT provider FROM server_oauth_bindings WHERE server_id=$1',[serverId])).rows[0];
  const byok=(await c.query('SELECT hostname FROM server_upstream_keys WHERE server_id=$1',[serverId])).rows[0];
  if(oauth&&byok)throw Error('CONFLICTING_UPSTREAM_AUTH');
  if((oauth||byok)&&visibility!=='private')throw Error('UPSTREAM_AUTH_REQUIRES_PRIVATE');
  if(byok&&tools.some(t=>new URL(t.url).hostname.toLowerCase()!==byok.hostname))throw Error('UPSTREAM_KEY_HOST_MISMATCH');
  if(oauth&&tools.some(t=>new URL(t.url).hostname!=='api.github.com'))throw Error('GITHUB_OAUTH_REQUIRES_API_GITHUB_COM_TOOLS');
  const n=await c.query('SELECT coalesce(max(version),0)+1 AS n FROM server_revisions WHERE server_id=$1',[serverId]);
  const version=Number(n.rows[0].n);
  const snapshot={tools};
  await c.query('INSERT INTO server_revisions(id,server_id,version,snapshot) VALUES($1,$2,$3,$4)',[randomUUID(),serverId,version,JSON.stringify(snapshot)]);
  const updated=await c.query("UPDATE servers SET status='published',visibility=$2,published_snapshot=$3::jsonb,published_revision=$4,has_unpublished_changes=false,updated_at=now() WHERE id=$1 RETURNING *",
   [serverId,visibility,JSON.stringify(snapshot),version]);
  await c.query('COMMIT');
  return {server:updated.rows[0],version,toolCount:tools.length};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}

/** Publishing is explicit; restore copies a prior revision only into draft. */
export function exposedPublishedServer(server){
 if(server?.status!=='published')return false;
 return Array.isArray(activeTools(server))&&activeTools(server).length>0;
}
