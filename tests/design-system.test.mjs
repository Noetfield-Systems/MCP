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
   assert.ok(doc.includes('href="/ui-system.css?v=20261118-c"'),name+' loads final shared theme');
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

test('finish 02 uses the unified final design across 12 routes',()=>{
  const css=readFileSync(new URL('../public/ui-system.css',import.meta.url),'utf8');
  for(const token of ['--fd-container:1200px','--fd-canvas:#0b1420','--fd-accent:#e7ceb0',
    '--fd-section-space:100px','#home.hero','body.growth-body .growth-hero',
    '.expansion-main .product-panel','@media(max-width:600px)','prefers-reduced-motion:reduce']){
    assert.ok(css.includes(token),'shared design token/surface: '+token);
  }
  for(const name of routeNames){
    assert.equal((html(name).match(/ui-system\.css\?v=20261118-c/g)||[]).length,1,
      name+' loads exactly one versioned final design sheet');
  }
});
