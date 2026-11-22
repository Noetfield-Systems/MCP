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
 await page.locator('.preview-shell').waitFor({state:'visible',timeout:15000});
 assert.equal(await page.locator('.preview-shell [data-wb-tab]').count(),3,'approved Builder tabs are present');
  await page.locator('[data-wb-tab="result"]').click();
  assert.equal(await page.locator('#wb-code-kind').innerText(),'ILLUSTRATIVE JSON','Builder preview tabs work without claiming live requests');
  await page.locator('[data-wb-tab="definition"]').click();
 assert.equal(await page.locator('.showcase-section .showcase-card').count(),3,'original showcase still has three workflow cards');
 assert.equal(await page.locator('.faq-item').count(),10);
 await page.locator('.faq-item').first().locator('summary').click();
 assert.equal(await page.locator('.faq-item').first().evaluate(el=>el.open),true,'FAQ opens using native details');
 await page.locator('.faq-item').first().locator('summary').click();
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
 await page.waitForTimeout(100);
 await page.screenshot({path:'artifacts/foundry-desktop.png',fullPage:true,animations:'disabled'});
 const priceLink=page.locator('.featured-price .btn');
 assert.equal(await priceLink.getAttribute('href'),'#implementation','custom plan CTA uses an active commercial funnel');
 assert.ok((await page.locator('.hero-proof').innerText()).includes('Official MCP Registry'),'avoid unsupported self-host portability claim');
 assert.equal(await page.locator('.quickstart-offer').count(),1,'fixed-scope commercial offer is visible');
 const link=page.locator('.quickstart-purchase .btn');
 assert.equal(await link.getAttribute('href'),'https://buy.stripe.com/5kQ7sMaLm81SeWSfPu1Nu0j','real account-specific live Stripe Checkout link');
 assert.match(await page.locator('.quickstart-purchase').innerText(),/CA\$199/,'price and currency are explicit');
 assert.match(await page.locator('.quickstart-disclosure').innerText(),/Excludes private upstream credentials/,'bounded deliverable scope disclosed');

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
 // Canonical design system acceptance: every public page uses the same
 // header, footer, typography, focusable mobile menu and no horizontal overflow.
 const publicRoutes=['/','/solutions','/providers','/readiness','/blueprints','/web3','/collaborate','/marketplace',
  '/agency',
  '/launch','/passport','/doctor','/lab',
  '/connect','/developers','/team','/oauth','/operator','/order','/privacy'];
 const expectedNav=['Platform','For APIs','Web3','Marketplace','Developers','Work with us'];
 for(const route of publicRoutes){
   const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:20000});
   assert.equal(response.status(),200,'public page '+route+' is live');
   assert.equal(await page.locator('header.foundry-nav').count(),1,'canonical header: '+route);
   assert.equal(await page.locator('footer.foundry-footer').count(),1,'canonical footer: '+route);
   const values=await page.evaluate(()=>{
     const header=document.querySelector('header.foundry-nav');
     return {
       width:innerWidth,scroll:document.documentElement.scrollWidth,
       headerHeight:Math.round(header.getBoundingClientRect().height),
       font:getComputedStyle(document.body).fontFamily,
       background:getComputedStyle(document.body).backgroundColor,
       links:[...document.querySelectorAll('#primary-nav a')].map(a=>a.textContent.trim()),
       theme:[...document.styleSheets].some(x=>x.href?.includes('/ui-system.css'))
     };
   });
   assert.deepEqual(values.links,expectedNav,'same navigation across '+route);
   assert.equal(values.headerHeight,64,'same mobile header height on '+route);
   assert.ok(values.font.includes('Inter'),'consistent brand body font '+route);
   assert.ok(values.theme,'shared design tokens loaded on '+route);
   if(values.scroll>values.width+3){
     const offenders=await page.evaluate(()=>[...document.querySelectorAll('body *')]
       .map(el=>({el,r:el.getBoundingClientRect()}))
       .filter(({el,r})=>r.width>0&&r.right>innerWidth+3&&
         getComputedStyle(el).position!=='fixed'&&getComputedStyle(el).display!=='none')
       .sort((a,b)=>b.r.right-a.r.right).slice(0,12)
       .map(({el,r})=>({tag:el.tagName,selector:el.className?.toString().slice(0,80)||el.id,
         right:Math.round(r.right),width:Math.round(r.width),text:el.textContent?.trim().slice(0,40)})));
     throw new Error('mobile overflow on '+route+': '+JSON.stringify({values,offenders}));
   }
   const button=page.locator('#menu-toggle');
   await button.click();
   assert.equal(await button.getAttribute('aria-expanded'),'true','mobile menu opens on '+route);
   await page.keyboard.press('Escape');
   assert.equal(await button.getAttribute('aria-expanded'),'false','Escape closes mobile menu on '+route);
   if(['/solutions','/readiness','/blueprints','/web3','/collaborate','/marketplace','/developers'].includes(route)){
     const label=route.slice(1);
     await page.screenshot({path:'artifacts/foundry-'+label+'-mobile.png',fullPage:true,animations:'disabled'});
   }
 }
 // GA: check both new buyer-facing routes as functioning customer journeys.
 await page.goto(base+'/readiness',{waitUntil:'domcontentloaded',timeout:20000});
 assert.equal(await page.locator('#readiness-assessment fieldset').count(),6);
 await page.locator('input[name="source"][value="public"]').check();
 await page.locator('input[name="docs"][value="openapi"]').check();
 await page.locator('input[name="job"][value="clear"]').check();
 await page.locator('input[name="operations"][value="read"]').check();
 await page.locator('input[name="access"][value="public"]').check();
 await page.locator('input[name="client"][value="selected"]').check();
 await page.locator('#readiness-assessment button[type="submit"]').click();
 assert.equal(await page.locator('#rdy-result').isVisible(),true,'public readiness returns actionable response with no login');
 assert.equal(await page.locator('#rdy-accept').isChecked(),false,'no silent contact consent');
 assert.equal(await page.locator('#rdy-marketing').isChecked(),false,'no silent marketing consent');
 await page.goto(base+'/blueprints',{waitUntil:'domcontentloaded',timeout:20000});
 assert.equal(await page.locator('.bp-card').count(),10,'ten truthful buyer solution blueprints');
 assert.ok((await page.locator('main').innerText()).includes('not completed client projects'),'no fictional client case studies');
 // Strategy V3: customer-owned public API docs may include a safe install link.
 await page.goto(base+'/connect',{waitUntil:'domcontentloaded',timeout:20000});
 await page.locator('#client-slug').fill('public-docs-example');
 await page.locator('#docs-embed-code').waitFor({state:'visible',timeout:12000});
 const embedMarkup=await page.locator('#docs-embed-code').innerText();
 assert.ok(embedMarkup.includes('/connect?server=public-docs-example'),'public API-docs share link generated');
 assert.ok(embedMarkup.includes('Use with AI'),'installation widget provides explicit label');
 assert.ok(!embedMarkup.includes('Bearer'),'never export credentials in public docs');
 assert.equal(await page.locator('#docs-embed-copy').isEnabled(),true,'public docs embed is copyable');
 await page.locator('#client-private').check();
 assert.equal(await page.locator('#docs-embed-copy').isEnabled(),false,'private server embed is disabled');
 assert.equal(await page.locator('#docs-embed-code').innerText(),'','private configuration is not exported into public docs');
 await page.setViewportSize({width:768,height:1024});
 for(const route of publicRoutes){
   const resp=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:20000});
   assert.equal(resp.status(),200,'tablet route '+route);
   const metric=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
   if(metric.scroll>metric.width+3){
     const offenders=await page.evaluate(()=>[...document.querySelectorAll('body *')]
       .map(el=>({el,r:el.getBoundingClientRect()}))
       .filter(({el,r})=>r.width>0&&r.right>innerWidth+3&&
         getComputedStyle(el).position!=='fixed'&&getComputedStyle(el).display!=='none')
       .sort((a,b)=>b.r.right-a.r.right).slice(0,12)
       .map(({el,r})=>({tag:el.tagName,name:el.className?.toString().slice(0,80)||el.id,
          right:Math.round(r.right),width:Math.round(r.width),text:el.textContent?.trim().slice(0,40)})));
     throw Error('tablet overflow on '+route+': '+JSON.stringify({metric,offenders}));
   }
 }
 await page.setViewportSize({width:1440,height:900});
 for(const route of ['/','/solutions','/readiness','/blueprints','/web3','/collaborate','/developers','/marketplace','/connect','/team','/oauth','/operator','/order','/privacy','/providers','/launch','/passport','/doctor','/lab','/agency']){
   const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:20000});
   assert.equal(response.status(),200,'desktop page '+route);
   const metrics=await page.evaluate(()=>({
     viewport:innerWidth,scroll:document.documentElement.scrollWidth,
     header:Math.round(document.querySelector('header.foundry-nav').getBoundingClientRect().height),
     headerBg:getComputedStyle(document.querySelector('header.foundry-nav')).backgroundColor
   }));
   assert.equal(metrics.header,70,'consistent desktop header height on '+route);
   assert.ok(metrics.scroll<=metrics.viewport+3,'no desktop horizontal overflow on '+route+': '+JSON.stringify(metrics));
   if(['/solutions','/web3','/collaborate','/connect'].includes(route)){
     await page.screenshot({path:'artifacts/foundry-'+route.slice(1)+'-desktop.png',fullPage:true,animations:'disabled'});
   }
 }
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+'/collaborate',{waitUntil:'domcontentloaded',timeout:20000});
 assert.equal(await page.locator('[data-track]').count(),6,'six specific developer and partner paths');
 await page.locator('[data-track="web3_builder"]').click();
 assert.equal(await page.locator('#op-track').inputValue(),'web3_builder','role selection fills real opportunity form');
 assert.equal(await page.locator('#opportunity-form').count(),1,'operator-backed real opportunity form rendered');
 await page.screenshot({path:'artifacts/foundry-collaborate-mobile.png',fullPage:true,animations:'disabled'});
 await page.goto(base+'/web3',{waitUntil:'domcontentloaded',timeout:20000});
 await page.screenshot({path:'artifacts/foundry-web3-mobile.png',fullPage:true,animations:'disabled'});
 await page.setViewportSize({width:1440,height:900});
 await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:20000});
 assert.equal(await page.locator('.growth-bridge-card').count(),3,'real business, web3 and partner paths on homepage');
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
 // The Lab is a real authenticated UI, not a promotional screenshot. Verify
 // the owner can load their existing server, and the mobile page does not overflow.
 const lab=await page.goto(base+'/lab',{waitUntil:'domcontentloaded',timeout:20000});
 assert.equal(lab.status(),200,'actual owner Test Lab page live');
 await page.locator('#load-servers').click();
 await page.waitForFunction(()=>document.querySelectorAll('#owner-server option').length>=2,undefined,{timeout:14000});
 await page.locator('#owner-server').selectOption({index:1});
 await page.locator('#owner-report h3').waitFor({state:'visible',timeout:14000});
 assert.ok((await page.locator('#owner-report').innerText()).includes('Recorded MCP calls'),'actual owner-only telemetry rendered');
 const labViewport=await page.evaluate(()=>({screen:innerWidth,content:document.documentElement.scrollWidth}));
 assert.ok(labViewport.content<=labViewport.screen+3,'Lab mobile layout has no horizontal overflow: '+JSON.stringify(labViewport));
 await page.screenshot({path:'artifacts/foundry-lab-mobile.png',fullPage:true,animations:'disabled'});
 assert.deepEqual(errors,[],'no uncaught production browser JavaScript error');
 console.log(JSON.stringify({result:'PASS',type:'REAL_CHROMIUM',signup:'PASS',starter:'PASS',overview:'PASS',source_test:'PASS',premium_hero:'PASS',canonical_12_page_design:'PASS',tablet_12_page_design:'PASS',two_market_growth:'PASS',partner_roles:'PASS',openapi_yaml_preview:'PASS',openapi_yaml_import:'PASS',faq:'PASS',mobile_menu:'PASS',published:'PASS',client_config:'PASS',observed_activation:'PASS',operator_scope:'PASS',mobile:'PASS',external_customer:false}));
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
