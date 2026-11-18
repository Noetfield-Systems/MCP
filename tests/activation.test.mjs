import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTIVATION_EVENTS,recordActivation} from '../src/activation.mjs';

test('event vocabulary is an explicit restricted set',()=>{
 const required=['account_created','server_created','template_started','tool_added','tool_test_succeeded','server_published','api_key_created'];
 assert.deepEqual([...ACTIVATION_EVENTS],required);
 assert.ok(Object.isFrozen(ACTIVATION_EVENTS));
});
test('synthetic analytics labels and invalid sources are refused before DB access',async()=>{
 await assert.rejects(()=>recordActivation('revenue_collected','00000000-0000-4000-8000-000000000001'),/INVALID_ACTIVATION_EVENT/);
 await assert.rejects(()=>recordActivation('account_created',null),/INVALID_ACTIVATION_EVENT/);
 await assert.rejects(()=>recordActivation('account_created','00000000-0000-4000-8000-000000000001',null,'imagined_click'),/INVALID_ACTIVATION_SOURCE/);
});
