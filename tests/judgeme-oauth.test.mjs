import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {encryptJudgeToken,decryptJudgeToken,assertReadOnlyScopes,judgeGet} from '../src/judgeme/integration.mjs';

test('Judge.me credentials are encrypted at rest, bound to account, and reject tampering',()=>{
  const old=process.env.FOUNDRY_OAUTH_ENCRYPTION_KEY;
  process.env.FOUNDRY_OAUTH_ENCRYPTION_KEY=randomBytes(32).toString('hex');
  try{
    const secret='judge-me-private-oauth-example-token';
    const encrypted=encryptJudgeToken(secret,'account-A');
    assert.ok(!encrypted.includes(secret));
    assert.equal(decryptJudgeToken(encrypted,'account-A'),secret);
    assert.throws(()=>decryptJudgeToken(encrypted,'account-B'),/authenticate|INVALID/);
    assert.throws(()=>decryptJudgeToken(encrypted.slice(0,-3)+'abc','account-A'));
    assert.throws(()=>encryptJudgeToken('','account-A'),/INVALID/);
  }finally{
    if(old===undefined)delete process.env.FOUNDRY_OAUTH_ENCRYPTION_KEY;
    else process.env.FOUNDRY_OAUTH_ENCRYPTION_KEY=old;
  }
});
test('Judge.me OAuth must have exactly needed read permissions, no write scopes',()=>{
  assert.equal(assertReadOnlyScopes('public read_reviews read_products'),'public read_reviews read_products');
  for(const scopes of ['read_reviews','read_products','read_reviews read_products write_reviews',
      'read_products read_reviews write_products','read_products,read_reviews,write_shops',''])
    assert.throws(()=>assertReadOnlyScopes(scopes),/JUDGEME_/);
});
test('Judge.me request allowlist denies arbitrary endpoints before networking',async()=>{
  await assert.rejects(judgeGet('/reviews/1',{},'some-secret'),/JUDGEME_ENDPOINT_NOT_ALLOWED/);
  await assert.rejects(judgeGet('/products',{},'some-secret'),/JUDGEME_ENDPOINT_NOT_ALLOWED/);
});
