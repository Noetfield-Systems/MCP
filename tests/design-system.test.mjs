import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
const routeNames=['index','solutions','web3','collaborate','marketplace','connect','developers','team','oauth','operator','order','privacy'];
const html=name=>readFileSync(new URL('../public/'+name+'.html',import.meta.url),'utf8');
const linkLabels=['Platform','For APIs','Web3','Marketplace','Developers','Work with us'];
test('canonical 12-page premium design shell is consistent and retains product routes',()=>{
 let originalNavigation;
 for(const name of routeNames){
   const doc=html(name);
   const nav=doc.match(/<nav aria-label="Primary navigation" id="primary-nav">([\s\S]*?)<\/nav>/);
   assert.ok(nav,name+' shared canonical main navigation');
   const links=[...nav[1].matchAll(/<a href="([^"]+)"(?: aria-current="page")?>([^<]+)<\/a>/g)];
   assert.deepEqual(links.map(x=>x[2]),linkLabels,name+' same ordered information architecture');
   const hrefs=links.map(x=>x[1]);
   if(!originalNavigation)originalNavigation=hrefs;
   assert.deepEqual(hrefs,originalNavigation,name+' same canonical destinations');
   assert.equal((doc.match(/<header class="nav foundry-nav">/g)||[]).length,1,name+' one standard header');
   assert.equal((doc.match(/<footer class="foundry-footer">/g)||[]).length,1,name+' one standard footer');
   assert.ok(doc.includes('href="/ui-system.css?v=20261118-graphite"'),name+' loads final shared theme');
   assert.ok(doc.includes('<main id="main"'),name+' has skip-link landmark');
   assert.ok(doc.includes('aria-controls="primary-nav" aria-expanded="false"'),name+' accessible mobile nav');
   assert.ok(doc.includes('href="/privacy"'),name+' visible privacy destination');
   assert.ok(doc.includes('/#quickstart'),name+' real fixed-scope commercial handoff');
   if(name==='index')assert.ok(doc.includes('id="nav-login"'), 'homepage auth integration preserved');
   else assert.ok(doc.includes('src="/site-shell.js?v=20261118-b"'),name+' dedicated secondary navigation logic');
 }
});
test('canonical design system establishes responsive layout, keyboard and reduced-motion accessibility',()=>{
 const css=readFileSync(new URL('../public/ui-system.css',import.meta.url),'utf8');
 assert.match(css,/\.foundry-nav\s+#primary-nav/);
 assert.match(css,/\.foundry-footer-links/);
 assert.match(css,/@media\(max-width:1040px\)/);
 assert.match(css,/@media\(max-width:440px\)/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 const js=readFileSync(new URL('../public/site-shell.js',import.meta.url),'utf8');
 assert.match(js,/Escape/);
 assert.match(js,/aria-expanded/);
 assert.match(js,/aria-current/);
});

test('approved graphite product preview is installed without replacing live Studio',()=>{
 const home=html('index');
 assert.ok(home.includes('Your APIs.<br><em>Ready for agents.</em>'));
 assert.ok(home.includes('class="preview-shell"'));
 assert.ok(home.includes('id="wb-code-content"'));
 assert.ok(home.includes('src="/preview-workbench.js"'));
 for(const id of ['id="auth-form"','id="studio-app"','id="catalog-search"','id="hero-gateway"'])
   assert.ok(home.includes(id), 'original functional hook '+id);
 const script=readFileSync(new URL('../public/preview-workbench.js',import.meta.url),'utf8');
 assert.ok(script.includes('data-wb-tab'));
 const css=readFileSync(new URL('../public/ui-system.css',import.meta.url),'utf8');
 for(const token of ['#08090b','#81b4ff','.preview-shell','.growth-hero','.docs-layout','.market-list','.workspace-shell'])
   assert.ok(css.includes(token),'shared approved design: '+token);
});

test('V3 sales offer keeps real Quickstart checkout and labels new Launch as quoted',()=>{
 const home=html('index');
 assert.ok(home.includes('id="quickstart"'),'original CA$199 checkout retained');
 assert.ok(home.includes('https://buy.stripe.com/5kQ7sMaLm81SeWSfPu1Nu0j'),'existing live hosted checkout link retained');
 assert.ok(home.includes('id="agent-launch"'),'new scoped offer discoverable');
 assert.ok(home.includes('From CA$799'),'price is an explicitly experimental starting quote');
 assert.ok(home.includes('individually scoped'),'must not pretend instant checkout is configured');
 assert.ok(home.includes('id="pilot-form"'),'existing persistent consent-based buyer enquiry remains intact');
 assert.ok(home.includes('id="build-from-ai"'),'existing native MCP Builder explained');
 assert.ok(home.includes('/developers#native'),'native Builder leads to working docs');
 assert.ok(html('solutions').includes('/#agent-launch'),'API owners can reach the Launch offer');
});
test('customer docs install is visible on /connect and remains a separate public-only widget',()=>{
 const connect=html('connect');
 for(const id of ['id="client-host"','id="client-slug"','id="client-private"','id="docs-install-panel"','id="docs-embed-code"','id="docs-embed-copy"'])assert.ok(connect.includes(id),id);
 const script=readFileSync(new URL('../public/connect.js',import.meta.url),'utf8');
 assert.match(script,/generateDocsInstallLink/);
 assert.match(script,/docs-embed-copy/);
 assert.match(script,/disabled=true/);
});
