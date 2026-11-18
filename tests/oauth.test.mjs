import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {encryptToken,decryptToken,pkcePair} from '../src/oauth.mjs';
import {safeGet} from '../src/security.mjs';

test('PKCE verifier is random and SHA256 challenge matches independently',()=>{
 const a=pkcePair(),b=pkcePair();
 assert.notEqual(a.verifier,b.verifier);
 assert.ok(a.verifier.length>=43);
 assert.equal(a.challenge,createHash('sha256').update(a.verifier).digest('base64url'));
});
test('AES-GCM encrypted OAuth tokens are owner-bound and tamper-evident',()=>{
 const prior=process.env.FOUNDRY_OAUTH_ENCRYPTION_KEY;
 process.env.FOUNDRY_OAUTH_ENCRYPTION_KEY=randomBytes(32).toString('hex');
 try{
  const id='ad2c63ad-3c23-4491-afdf-b65e38aba115';
  const encrypted=encryptToken('ghu_private_test_TOKEN_1234567',id);
  assert.ok(!encrypted.includes('ghu_private_test_TOKEN_1234567'));
  assert.equal(decryptToken(encrypted,id),'ghu_private_test_TOKEN_1234567');
  assert.throws(()=>decryptToken(encrypted,'another-account'),/Unsupported state|unable to authenticate|authenticate data/i);
  const broken=encrypted.slice(0,-3)+'foo';
  assert.throws(()=>decryptToken(broken,id));
 }finally{if(prior===undefined)delete process.env.FOUNDRY_OAUTH_ENCRYPTION_KEY;else process.env.FOUNDRY_OAUTH_ENCRYPTION_KEY=prior;}
});
test('OAuth bearer tokens cannot be forwarded to an arbitrary GET endpoint',async()=>{
 await assert.rejects(()=>safeGet('https://api.example.com/anything',{authorization:'Bearer ghp_12345678901234567890'}),/OAUTH_HOST_OR_TOKEN_INVALID/);
 await assert.rejects(()=>safeGet('https://127.0.0.1/admin',{authorization:'Bearer ghp_12345678901234567890'}));
 await assert.rejects(()=>safeGet('https://api.github.com/user',{authorization:'token 123456789012'}),/OAUTH_HOST_OR_TOKEN_INVALID/);
});
