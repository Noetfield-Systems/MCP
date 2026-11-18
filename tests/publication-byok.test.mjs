import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {activeTools,markDraftChanged,exposedPublishedServer,draftStatus} from '../src/publication.mjs';
import {allowedBearer,normalizedHost,encryptUpstreamKey,decryptUpstreamKey,upstreamEncryptionReady} from '../src/upstream.mjs';
import {safeGet} from '../src/security.mjs';

test('published snapshot remains separate from mutable draft tool rows',async()=>{
 const published={status:'published',published_snapshot:{tools:[{name:'old_read',method:'GET',url:'https://api.example.com/v1'}]}};
 assert.deepEqual(activeTools(published).map(t=>t.name),['old_read']);
 assert.equal(exposedPublishedServer(published),true);
 assert.equal(draftStatus(published),'published');
 const calls=[];await markDraftChanged('server-id',async(sql,args)=>{calls.push({sql,args});return {rowCount:1};});
 assert.match(calls[0].sql,/has_unpublished_changes=\(status='published'\)/);
 assert.ok(!calls[0].sql.includes("SET status='draft'"),'editing must not unpublish');
 assert.equal(activeTools({status:'draft',published_snapshot:null}),null);
 assert.equal(exposedPublishedServer({status:'draft',published_snapshot:published.published_snapshot}),false);
});
test('private BYOK encryption is host- and server-bound, tamper evident and never plaintext',()=>{
 const old=process.env.FOUNDRY_UPSTREAM_ENCRYPTION_KEY;
 process.env.FOUNDRY_UPSTREAM_ENCRYPTION_KEY=randomBytes(32).toString('hex');
 try{
  assert.equal(upstreamEncryptionReady(),true);
  assert.equal(normalizedHost('https://api.example.com/'),'api.example.com');
  const token='buyer_owned_private_API_token_123456789';
  const encrypted=encryptUpstreamKey(token,'server-1','api.example.com');
  assert.ok(!encrypted.includes(token));
  assert.equal(decryptUpstreamKey(encrypted,'server-1','api.example.com'),token);
  assert.throws(()=>decryptUpstreamKey(encrypted,'server-2','api.example.com'));
  assert.throws(()=>decryptUpstreamKey(encrypted,'server-1','other.example.com'));
  assert.throws(()=>decryptUpstreamKey(encrypted.slice(0,-4)+'aaaa','server-1','api.example.com'));
  for(const bad of ['http://api.example.com/','https://api.example.com/path','https://api.example.com/?token=abc','https://localhost/','https://127.0.0.1/','https://api.example.com:8443/'])
    assert.throws(()=>normalizedHost(bad),undefined,bad);
  for(const bad of ['','key with spaces','Bearer header:hello','123\nX-Exploit: test'])
    assert.equal(allowedBearer(bad),false);
 }finally{
  if(old===undefined)delete process.env.FOUNDRY_UPSTREAM_ENCRYPTION_KEY;
  else process.env.FOUNDRY_UPSTREAM_ENCRYPTION_KEY=old;
 }
});
test('bearer injection cannot reach a host other than the fixed encrypted-key origin',async()=>{
 await assert.rejects(()=>safeGet('https://other.example.com/v1',{authorization:'Bearer buyer_owned_private_123456',authorizedHost:'api.example.com'}),/UPSTREAM_AUTH_HOST_OR_TOKEN_INVALID/);
 await assert.rejects(()=>safeGet('https://api.example.com/v1',{authorization:'Bearer contains spaces',authorizedHost:'api.example.com'}),/UPSTREAM_AUTH_HOST_OR_TOKEN_INVALID/);
 await assert.rejects(()=>safeGet('https://api.example.com/v1',{authorization:'Bearer abc\r\nX: bad',authorizedHost:'api.example.com'}),/UPSTREAM_AUTH_HOST_OR_TOKEN_INVALID/);
});
