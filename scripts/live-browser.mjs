// Real Chromium acceptance against deployed Production, not a DOM mock.
// The disposable .invalid account is deleted in finally, even after a failure.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {chromium} from 'playwright';

const base=(process.env.FOUNDRY_BASE_URL||'https://mcp-foundry-web-production.up.railway.app').replace(/\/$/,'');
const suffix=randomUUID().slice(0,12),email='conformance-browser-'+suffix+'@foundry.invalid';
const password='Foundry-E2E!'+randomUUID();
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:900}});
const page=await context.newPage();
let registered=false;
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.url().endsWith('/api/auth/register')&&response.status()===201)registered=true;});
async function click(selector){await page.locator(selector).click({timeout:15000});}
try{
 const opened=await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:30000});
 assert.equal(opened.status(),200);
 await page.locator('#auth-email').fill(email);
 await page.locator('#auth-password').fill(password);
 await click('#auth-submit');
 await page.locator('#studio-app').waitFor({state:'visible',timeout:15000});
 await page.locator('[data-template="hacker_news"]').waitFor({state:'visible',timeout:15000});
 await click('[data-template="hacker_news"]');
 await page.locator('#server-detail').waitFor({state:'visible',timeout:15000});
 await page.locator('#server-detail .tool-item').first().waitFor({state:'visible',timeout:15000});
 assert.ok((await page.locator('#server-detail .tool-item').count())>0,'real starter tools render without browser JS errors');
 await click('[data-tab="test"]');
 await page.locator('#test-form').waitFor({state:'visible'});
 await click('#test-form button');
 await page.waitForFunction(()=>{
   const result=document.querySelector('#test-result');
   return result&&result.textContent.includes('"ok": true');
 },undefined,{timeout:20000});
 await click('[data-tab="overview"]');
 await click('#publish-server');
 await page.waitForFunction(()=>{
   const target=document.querySelector('#server-detail');
   return target&&target.textContent.includes('SELECTED SERVER · published');
 },undefined,{timeout:15000});
 await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:base});
 await click('[data-copy="mcp-config"]');
 const copied=await page.evaluate(()=>navigator.clipboard.readText());
 assert.ok(copied.includes('mcpServers')&&copied.includes(base+'/mcp/'),'real portable client configuration copied');
 const activation=await page.request.get(base+'/api/me/activation');
 assert.equal(activation.status(),200);
 const data=await activation.json();
 assert.ok(data.completed.template_started);
 assert.ok(data.completed.tool_test_succeeded);
 assert.ok(data.completed.server_published);
 assert.ok(!data.payments_collected,'no fake checkout revenue');
 const anonymous=await page.request.get(base+'/api/admin/funnel');
 assert.ok([403,503].includes(anonymous.status()),'operator data inaccessible without secret');
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.locator('#studio-app').isVisible(),true,'mobile workspace is visible');
 assert.deepEqual(errors,[],'no uncaught production browser JavaScript error');
 console.log(JSON.stringify({result:'PASS',type:'REAL_CHROMIUM',signup:'PASS',starter:'PASS',overview:'PASS',source_test:'PASS',published:'PASS',client_config:'PASS',observed_activation:'PASS',operator_scope:'PASS',mobile:'PASS',external_customer:false}));
}finally{
 if(registered){
   try {
     const response=await page.request.delete(base+'/api/account',{data:{password},timeout:12000});
     assert.equal(response.status(),200);
     console.log('BROWSER_FIXTURE_ACCOUNT_DELETED');
   }catch(e){console.error('BROWSER_TEST_CLEANUP_FAILED',String(e));process.exitCode=1;}
 }
 await browser.close();
}
