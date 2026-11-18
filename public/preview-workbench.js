// Approved workbench preview. Illustrative only; real requests and publishing use the live Studio.
(() => {
  const tabs=document.querySelectorAll('.hero-art [data-wb-tab]');
  const label=document.getElementById('wb-code-label'),kind=document.getElementById('wb-code-kind'),code=document.getElementById('wb-code-content');
  if(!tabs.length||!label||!kind||!code)return;
  const views={
    definition:{label:'TOOL / get_country',kind:'HTTP GET',body:'GET  api.worldbank.org/v2/country/CA\n\nquery   format  json\noutput  country / capital / region\nschema  validated on response'},
    result:{label:'EXAMPLE / RESPONSE SHAPE',kind:'ILLUSTRATIVE JSON',body:'{\n  "country": "Canada",\n  "capital": "Ottawa",\n  "region": "North America"\n}\n\n// Example shape, not a live API response'},
    endpoint:{label:'REMOTE / MCP ENDPOINT',kind:'STREAMABLE HTTP',body:'POST /mcp/your-server\nAccept: application/json, text/event-stream\nMethod: tools/list\n\n// Publish from the real Studio'}
  };
  for(const button of tabs)button.addEventListener('click',()=>{
    const view=views[button.dataset.wbTab];if(!view)return;
    label.textContent=view.label;kind.textContent=view.kind;code.textContent=view.body;
    for(const tab of tabs){const selected=tab===button;tab.classList.toggle('selected',selected);tab.setAttribute('aria-selected',String(selected))}
  });
})();
