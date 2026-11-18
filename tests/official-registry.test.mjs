import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('remote-only official MCP Registry identity is source-backed',()=>{
 const s=JSON.parse(readFileSync(new URL('../server.json',import.meta.url),'utf8'));
 assert.equal(s.name,'io.github.Noetfield-Systems/mcp-foundry');
 assert.equal(s.version,'0.1.0');
 assert.equal(s.$schema,'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json');
 assert.equal(s.repository.url,'https://github.com/Noetfield-Systems/MCP');
 assert.equal(s.repository.source,'github');
 assert.ok(s.description.length>10&&s.description.length<=100);
 assert.ok(!('packages' in s));
 assert.deepEqual(s.remotes,[{type:'streamable-http',url:'https://mcp-foundry-web-production.up.railway.app/mcp/foundry'}]);
});
