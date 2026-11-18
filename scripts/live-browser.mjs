// Real Chromium acceptance against deployed Production, not a DOM mock.
// The disposable .invalid account is deleted in finally, even after a failure.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
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
 await mkdir('artifacts',{recursive:true});
 await page.locator('.console-panel').waitFor({state:'visible',timeout:15000});
 assert.equal(await page.locator('.console-panel .chain-step').count(),3);
 assert.equal(await page.locator('.showcase-card').count(),3);
 assert.equal(await page.locator('.faq-item').count(),10);
 await page.locator('.faq-item').first().locator('summary').click();
 assert.equal(await page.locator('.faq-item').first().evaluate(el=>el.open),true,'FAQ opens using native details');
 await page.locator('.faq-item').first().locator('summary').click();
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
 await page.waitForTimeout(100);
 await page.screenshot({path:'artifacts/foundry-desktop.png',fullPage:true,animations:'disabled'});
 const priceLink=page.locator('.featured-price .btn');
 assert.equal(await priceLink.getAttribute('href'),'#implementation','custom plan CTA uses an active commercial funnel');
 assert.ok((await page.locator('.hero-proof').innerText()).includes('Open MCP standard'),'avoid unsupported self-host portability claim');
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
 await page.waitForTimeout(100);
 await page.screenshot({path:'artifacts/foundry-mobile.png',fullPage:true,animations:'disabled'});
 await page.goto(base+'/developers',{waitUntil:'domcontentloaded',timeout:20000});
 assert.ok((await page.locator('.docs-section').count())>=7,'complete customer-facing technical docs');
 await page.screenshot({path:'artifacts/foundry-developers-mobile.png',fullPage:true,animations:'disabled'});
 await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:20000});
 await page.locator('#menu-toggle').click();
 assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'),'true','mobile navigation opens');
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'),'false','Escape closes navigation');
 const viewport=await page.evaluate(()=>({screen:innerWidth,content:document.documentElement.scrollWidth}));
 assert.ok(viewport.content<=viewport.screen+3,'mobile page does not overflow horizontally: '+JSON.stringify(viewport));
 await page.setViewportSize({width:1440,height:900});
 await page.locator('#auth-email').fill(email);
 await page.locator('#auth-password').fill(password);
 await click('#auth-submit');
 await page.locator('#studio-app').waitFor({state:'visible',timeout:15000});
 await page.locator('[data-template="hacker_news"]').waitFor({state:'visible',timeout:15000});
 await click('[data-template="hacker_news"]');
 await page.locator('#server-detail').waitFor({state:'visible',timeout:15000});
 await page.locator('#server-detail .tool-item').first().waitFor({state:'visible',timeout:15000});
 assert.ok((await page.locator('#server-detail .tool-item').count())>0,'real starter tools render without browser JS errors');
 await click('[data-tab="import openapi"]');
 await page.locator('#import-form').waitFor({state:'visible'});
 await click('#load-openapi-example');
 await page.waitForFunction(()=>{
   const form=document.querySelector('#import-form');
   return form?.querySelector('[name=document]')?.value?.includes('openapi: 3.1.0') &&
     form?.querySelector('[name=baseUrl]')?.value==='https://hacker-news.firebaseio.com';
 },undefined,{timeout:15000});
 await click('#preview-openapi');
 await page.locator('.openapi-preview-row').first().waitFor({state:'visible',timeout:12000});
 assert.equal(await page.locator('.openapi-preview-row').count(),2,'two real previewed GET operations');
 assert.equal(await page.locator('#server-detail .tool-item').count(),0,'preview does not write to the workspace view');
 await click('#import-form button[type="submit"]');
 await page.waitForFunction(()=>document.querySelectorAll('#server-detail .tool-item').length===3,undefined,{timeout:15000});

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
 console.log(JSON.stringify({result:'PASS',type:'REAL_CHROMIUM',signup:'PASS',starter:'PASS',overview:'PASS',source_test:'PASS',premium_hero:'PASS',openapi_yaml_preview:'PASS',openapi_yaml_import:'PASS',faq:'PASS',mobile_menu:'PASS',published:'PASS',client_config:'PASS',observed_activation:'PASS',operator_scope:'PASS',mobile:'PASS',external_customer:false}));
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
