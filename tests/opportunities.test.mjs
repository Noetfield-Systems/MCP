import test from 'node:test';
import assert from 'node:assert/strict';
import {OPPORTUNITY_TRACKS,OPPORTUNITY_STAGES,OpportunityError,validateOpportunity} from '../src/opportunities.mjs';

const valid=()=>({
 track:'web3_builder',contact_name:'Ada Developer',email:'Ada@Example.org',
 organization:'Example collective',website:'https://example.org',github_url:'https://github.com/example',
 project_brief:'I can build a read-only onchain market data adapter and test it in a real MCP client.',
 source:'github',contact_consent:true,updates_consent:false
});
test('six explicit customer, contributor and partner pathways with no compensation promises',()=>{
 assert.equal(OPPORTUNITY_TRACKS.length,6);
 assert.equal(new Set(OPPORTUNITY_TRACKS.map(t=>t.id)).size,6);
 assert.deepEqual(OPPORTUNITY_STAGES,['new','contacted','qualified','collaborating','closed']);
 assert.ok(OPPORTUNITY_TRACKS.every(t=>t.goal.length>24));
});
test('consented technical opportunity normalizes contact and sources without collecting extra identity data',()=>{
 const d=validateOpportunity(valid());
 assert.equal(d.track,'web3_builder');assert.equal(d.email,'ada@example.org');
 assert.equal(d.source,'github');assert.equal(d.contact_consent,true);
 assert.equal(d.github_url,'https://github.com/example');
 assert.equal(d.updates_consent,false);
 assert.ok(!Object.hasOwn(d,'ip')&&!Object.hasOwn(d,'wallet'));
});
test('application rejects invalid/nonconsented prospects and private URLs',()=>{
 const bads=[
  {...valid(),contact_consent:false},
  {...valid(),track:'token_sale'},
  {...valid(),email:'not-a-real-email'},
  {...valid(),project_brief:'buy tokens'},
  {...valid(),website:'http://localhost:5432/admin'},
  {...valid(),website:'https://localhost/admin'},
  {...valid(),github_url:'https://evil.example/github'},
  {...valid(),github_url:'https://github.com@evil.example/steal'},
  {...valid(),website:'http://example.org'}
 ];
 for(const d of bads)assert.throws(()=>validateOpportunity(d),OpportunityError);
});
test('unrecognized marketing source becomes other and no contact identity is fabricated',()=>{
 const d=validateOpportunity({...valid(),source:'../../tracking'});
 assert.equal(d.source,'other');
 assert.equal(d.organization,'Example collective');
 assert.equal(d.updates_consent,false);
});
