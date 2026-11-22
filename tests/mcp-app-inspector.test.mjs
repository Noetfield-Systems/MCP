import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicToolCards,publicHostEndpoint} from '../apps/inspector.mjs';
test('embedded MCP App inspector strips upstream URL, secret and raw owner metadata',()=>{
 const rows=[{tool_name:'get_reviews',description:'Read published reviews',url:'https://api.example.com/?token=SENSITIVE',api_key:'SENSITIVE',
   params:[{name:'product_handle',type:'string',required:true,in:'query'}]}];
 const cards=publicToolCards(rows);
 assert.equal(cards.length,1);
 assert.equal(cards[0].name,'get_reviews');
 assert.equal(cards[0].parameters[0].name,'product_handle');
 assert.doesNotMatch(JSON.stringify(cards),/SENSITIVE|api\.example/);
});
test('only protocol-safe identifiers reach the host inspector',()=>{
 assert.equal(publicToolCards([{tool_name:'<script>alert(1)</script>',params:[]}]).length,0);
 assert.equal(publicToolCards([]).length,0);
 assert.throws(()=>publicToolCards({}),/PUBLIC_TOOL_LIST_REQUIRED/);
 assert.equal(publicHostEndpoint('docs-public'), 'https://mcp-foundry-web-production.up.railway.app/mcp/docs-public');
 assert.throws(()=>publicHostEndpoint('../bad'),/PUBLIC_SERVER_SLUG_REQUIRED/);
});
