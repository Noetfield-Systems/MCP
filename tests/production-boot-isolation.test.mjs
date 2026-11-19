import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadProspectResearch} from '../src/prospects.mjs';

test('missing optional research does not crash import',()=>{
 assert.deepEqual(loadProspectResearch('absent',()=>{throw Object.assign(new Error('absent'),{code:'ENOENT'});}),{as_of:null,prospects:[]});
});

test('malformed optional research falls back without false records',()=>{
 assert.deepEqual(loadProspectResearch('bad',()=>'{'),{as_of:null,prospects:[]});
 assert.deepEqual(loadProspectResearch('wrong',()=>JSON.stringify({as_of:'today'})),{as_of:null,prospects:[]});
});

test('valid research remains usable',()=>{
 assert.equal(loadProspectResearch('valid',()=>JSON.stringify({as_of:'today',prospects:[{slug:'example'}]})).prospects[0].slug,'example');
});

test('optional CRM seed starts only after server is listening',()=>{
 const source=readFileSync(new URL('../src/server.mjs',import.meta.url),'utf8');
 const boot=source.slice(source.lastIndexOf('await initDb();'));
 assert.match(boot,/app\.listen\(port,'0\.0\.0\.0',\(\)=>\{/);
 assert.match(boot,/void seedProspectAccounts\(\)\.catch/);
 assert.doesNotMatch(boot,/await seedProspectAccounts\(\)/);
 assert.ok(boot.indexOf('app.listen(')<boot.indexOf('void seedProspectAccounts()'));
 assert.match(source,/RAILWAY_GIT_COMMIT_SHA/);
});
