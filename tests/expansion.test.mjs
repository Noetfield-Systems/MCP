import test from 'node:test';
import assert from 'node:assert/strict';
import {generateClientInstall,HOSTS} from '../public/client-config.mjs';
import {applyPilotWebhook} from '../src/expansion.mjs';

test('four host installers produce correct stable remote MCP configuration',()=>{
 assert.equal(HOSTS.length,4);
 const endpoint='https://mcp-foundry-web-production.up.railway.app/mcp/market-intelligence';
 const cursor=generateClientInstall('cursor',endpoint);
 const c=JSON.parse(cursor.text);assert.equal(c.mcpServers['market-intelligence'].url,endpoint);
 const vscode=generateClientInstall('vscode',endpoint,{privateServer:true});
 assert.equal(JSON.parse(vscode.text).servers['market-intelligence'].headers.Authorization,'Bearer YOUR_FOUNDRY_API_KEY');
 assert.equal(vscode.filename,'.vscode/mcp.json');
 const claude=generateClientInstall('claude',endpoint);
 assert.ok(claude.text.includes('claude mcp add --transport http'));
 assert.ok(claude.text.includes('market-intelligence'));
 assert.ok(generateClientInstall('generic',endpoint).text.includes('"type": "http"'));
});
test('installer rejects invalid host, non-HTTPS and path injection',()=>{
 for(const host of ['invalid','shopify'])assert.throws(()=>generateClientInstall(host,'https://example.com/mcp/abc'));
 for(const url of ['http://host/mcp/demo','https://example.com/other/path','https://example.com/mcp/a?admin=1','https://example.com/mcp/a#admin','https://user:secret@example.com/mcp/abc'])assert.throws(()=>generateClientInstall('cursor',url));
});
test('signed pilot webhook handler validates order id, matching session, exact amount and paid status',async()=>{
 const id='6b5d8234-ea0d-474b-a154-b587bcae591b';
 const item={id,amount_cents:19900,currency:'cad',stripe_checkout_session_id:'cs_live_reference',status:'checkout_pending'};
 const changes=[];
 const client={query:async(sql,args)=>{
  if(sql.includes('SELECT id,amount_cents,currency'))return {rows:[item],rowCount:1};
  changes.push({sql,args});return {rowCount:1};
 }};
 const event=(overrides={})=>({type:'checkout.session.completed',data:{object:{
  mode:'payment',payment_status:'paid',id:'cs_live_reference',currency:'cad',amount_total:19900,payment_intent:'pi_reference',
  metadata:{foundry_pilot_order_id:id},...overrides
 }}});
 assert.equal(await applyPilotWebhook(client,event()),true);
 assert.equal(changes.length,1);
 assert.match(changes[0].sql,/SET status='paid'/);
 changes.length=0;await applyPilotWebhook(client,event({amount_total:19899}));assert.equal(changes.length,0,'wrong amount does not fulfill');
 changes.length=0;await applyPilotWebhook(client,event({payment_status:'unpaid'}));assert.equal(changes.length,0,'unpaid checkout does not fulfill');
 changes.length=0;await applyPilotWebhook(client,event({id:'cs_tampered'}));assert.equal(changes.length,0,'mismatched checkout session does not fulfill');
 changes.length=0;await applyPilotWebhook(client,event({metadata:{foundry_pilot_order_id:'invalid'}}));assert.equal(changes.length,0,'unauthorized metadata does not fulfill');
});
test('asynchronous payment failure never upgrades a paid order',async()=>{
 const id='6b5d8234-ea0d-474b-a154-b587bcae591b';
 const order={id,amount_cents:19900,currency:'cad',stripe_checkout_session_id:'cs_live_reference',status:'paid'};
 const changes=[];
 const c={query:async(sql,args)=>{if(sql.startsWith('SELECT'))return {rows:[order],rowCount:1};changes.push(sql);return {rowCount:1};}};
 const e={type:'checkout.session.async_payment_failed',data:{object:{id:'cs_live_reference',mode:'payment',metadata:{foundry_pilot_order_id:id}}}};
 assert.equal(await applyPilotWebhook(c,e),true);assert.equal(changes.length,0);
});
