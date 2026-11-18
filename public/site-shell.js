// Shared, tiny progressive enhancement for the canonical MCP Foundry shell.
// The homepage keeps its existing Studio/nav controller in app.js.
(() => {
  'use strict';
  const header=document.querySelector('header.foundry-nav');
  const nav=header?.querySelector('#primary-nav');
  const toggle=header?.querySelector('#menu-toggle');
  if(!header||!nav||!toggle)return;
  const setOpen=open=>{
    header.classList.toggle('open',open);
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');
  };
  toggle.addEventListener('click',()=>setOpen(!header.classList.contains('open')));
  nav.addEventListener('click',event=>{if(event.target.closest('a'))setOpen(false);});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&header.classList.contains('open')){setOpen(false);toggle.focus();}
  });
  document.addEventListener('click',event=>{
    if(header.classList.contains('open')&&!event.target.closest('header.foundry-nav'))setOpen(false);
  });
  window.addEventListener('resize',()=>{if(window.innerWidth>1040)setOpen(false);},{passive:true});
  // Mark the active product area without adding page-specific navigation variants.
  const pathname=location.pathname.replace(/\/$/,'')||'/';
  nav.querySelectorAll('a[href]').forEach(link=>{
    const target=new URL(link.href,location.origin).pathname.replace(/\/$/,'')||'/';
    if(target===pathname)link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
})();
