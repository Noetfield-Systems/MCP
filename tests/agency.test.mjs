import {test} from 'node:test';
import assert from 'node:assert/strict';
import {agencyLabel,agencySummary} from '../src/agency.mjs';
test('agency labels have bounded private text and no assumed company verification',()=>{
 assert.equal(agencyLabel(' Client Alpha '),'Client Alpha');
 assert.equal(agencyLabel(''),'');
 assert.throws(()=>agencyLabel('<img onerror=alert(1)>'),/CLIENT_LABEL_INVALID/);
 assert.throws(()=>agencyLabel('X'.repeat(81)),/CLIENT_LABEL_INVALID/);
 assert.throws(()=>agencyLabel(456),/CLIENT_LABEL_MUST_BE_TEXT/);
});
test('agency totals sum observed invocations and do not invent buyer counts',()=>{
 const rows=[
 {agency_client_label:'Alpha',status:'published',calls_30d:3,successes_30d:2},
 {agency_client_label:'Alpha',status:'draft',calls_30d:0,successes_30d:0},
 {agency_client_label:'',status:'published',calls_30d:1,successes_30d:1}
 ];
 const groups=agencySummary(rows);
 const alpha=groups.find(x=>x.label==='Alpha');
 assert.deepEqual({servers:alpha.servers,published:alpha.published,calls:alpha.recorded_calls_30d}, {servers:2,published:1,calls:3});
 assert.equal(groups.find(x=>x.label==='Unassigned').servers,1);
 assert.equal(groups.length,2);
});
