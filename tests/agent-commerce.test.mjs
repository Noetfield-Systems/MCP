import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {commercialOffers,recommendOffer} from '../src/agent-commerce.mjs';
const input={public_https:true,requires_auth:false,requires_write:false,get_tools:3,api_count:1};
test('fixed Quickstart uses existing published native checkout and price',()=>{
 const result=recommendOffer(input);
 assert.equal(result.route,'public-api-quickstart');
 assert.equal(result.offer.price_minor,19900);
 assert.equal(result.payment_collected,false);
 assert.match(result.next_url,/^https:\/\/buy\.stripe\.com\//);
 assert.ok(readFileSync(new URL('../public/solutions.html',import.meta.url),'utf8').includes(result.next_url));
});
test('four or five tools map to indicative scope, not an automatic purchase',()=>{
 const result=recommendOffer({...input,get_tools:4});
 assert.equal(result.route,'api-agent-launch');assert.equal(result.offer.price_type,'indicative_scoped_quote');
 assert.equal(result.offer.purchase.kind,'request_scope');
});
test('unsupported scope maps to enquiry without blocking existing checkout',()=>{
 for(const x of [{requires_auth:true},{requires_write:true},{public_https:false},{api_count:2},{get_tools:6}])assert.equal(recommendOffer({...input,...x}).route,'scope_review');
});
test('self-service choice remains available and no payment is inferred',()=>{
 assert.equal(recommendOffer({...input,prefer_self_serve:true}).route,'self-serve');
 assert.equal(commercialOffers().payment_collected,false);
});
test('invalid scope does not produce a purchase recommendation',()=>{
 for(const x of [{get_tools:0},{get_tools:1.5},{api_count:0},{requires_auth:'false'}])assert.throws(()=>recommendOffer({...input,...x}),/INVALID_SCOPE/);
});
test('actual native HTTP and MCP surfaces register both functions',()=>{
 const m=readFileSync(new URL('../src/mcp.mjs',import.meta.url),'utf8');
 const h=readFileSync(new URL('../src/server.mjs',import.meta.url),'utf8');
 assert.match(m,/registerTool\('get_commercial_offers'/);
 assert.match(m,/registerTool\('recommend_commercial_offer'/);
 assert.ok(h.includes("app.get('/api/agent-commerce'"));
 assert.ok(h.includes("app.post('/api/agent-commerce/recommend'"));
});
