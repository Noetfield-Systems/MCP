import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyToolError} from '../src/diagnostics.mjs';

test('categorical redaction avoids secret-bearing error messages',()=>{
 const example=[
  ['Daily execution quota reached','QUOTA_EXCEEDED'],
  ['GITHUB_CONNECTION_REQUIRED','AUTHORIZATION_REQUIRED'],
  ['Upstream returned HTTP 429','UPSTREAM_RATE_LIMIT'],
  ['Upstream returned HTTP 503','UPSTREAM_SERVER_ERROR'],
  ['Upstream returned HTTP 404','UPSTREAM_NOT_FOUND'],
  ['Upstream returned HTTP 401','UPSTREAM_ACCESS_DENIED'],
  ['UPSTREAM_CONNECT_ECONNRESET','UPSTREAM_NETWORK_ERROR'],
  ['Upstream response exceeds 256 KiB','RESPONSE_TOO_LARGE'],
  ['Invalid path parameter id','INVALID_TOOL_ARGUMENTS']
 ];
 for(const [message,code]of example)assert.equal(classifyToolError(Error(message)),code,message);
 const token='gho_SUPER_SECRET_USER_API_KEY_ABCDE12345';
 assert.equal(classifyToolError(Error('Error calling https://api.github.com/user?token='+token)),'TOOL_EXECUTION_ERROR');
 assert.ok(!classifyToolError(Error('https://api.github.com/user?token='+token)).includes(token));
});
