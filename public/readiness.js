// MCP Foundry readiness clinic: deterministic self-assessment, not an AI/security certification.
// Private until a visitor explicitly submits the existing consented pilot enquiry.
(() => {
  'use strict';
  const quiz=document.querySelector('#readiness-assessment');
  const lead=document.querySelector('#rdy-enquiry');
  const feedback=document.querySelector('#rdy-feedback');
  let assessment=null;

  function assess(profile) {
    const publicGet=profile.source==='public' && profile.operations==='read' && profile.access==='public';
    if(profile.source==='none'){
      return {title:'First: establish a supported source API',
        description:'An MCP wrapper needs an authorized, stable way to retrieve or act on source data. Start by defining one task and identifying an API or approved adapter.',
        next:'Recommended: scoped technical discovery, not instant API conversion.',offer:'custom',href:'/#implementation',cta:'Discuss API foundation'};
    }
    if(profile.operations==='write'){
      return {title:'Scoped action integration',
        description:'Updates, payments and other side effects need separately scoped tools, authorization, predictable failure handling and confirmation. They are not included in public GET Quickstart.',
        next:'Recommended: private/custom technical review before quoting write-capable behavior.',offer:'private',href:'/#implementation',cta:'Request a scoped review'};
    }
    if(profile.source==='private' || profile.access==='authenticated'){
      return {title:'Permissioned API integration',
        description:'Your source needs an explicit, owner-authorized authentication model. Customer-scoped credentials and compatible host login must be tested individually.',
        next:'Recommended: discuss a private API launch; availability and price depend on real access requirements.',offer:'private',href:'/#implementation',cta:'Discuss private integration'};
    }
    if(profile.docs==='none'){
      return {title:'Document the interface before publishing',
        description:'A named, documented endpoint and reliable example response make it possible to define useful and testable MCP tools.',
        next:'Recommended: guided API inspection and tool design.',offer:'custom',href:'/#implementation',cta:'Discuss API documentation'};
    }
    if(publicGet && profile.job==='clear' && profile.client==='selected'){
      return {title:'Potential fit: Public API Quickstart',
        description:'Your answers suggest an eligible read-only public API. Up to three supported GET tools may fit the existing CA$199 scope, subject to real inspection and a successful source test.',
        next:'Need up to five curated tools, two use-case tests and a customer install page? Request a scoped API Agent Launch instead.',offer:'quickstart',href:'/#quickstart',cta:'Review CA$199 Quickstart'};
    }
    return {title:'Potential fit: API Agent Launch',
      description:'A public read-only API is a useful starting point. We should define the customer job, select a named AI client, curate a few tools and test the resulting interaction.',
      next:'Recommended: scoped Agent Launch proposal, experimentally from CA$799, not an instant fixed-price checkout.',offer:'launch',href:'/#agent-launch',cta:'Request Agent Launch scope'};
  }

  quiz?.addEventListener('submit',(event)=>{
    event.preventDefault();
    if(!quiz.reportValidity())return;
    const fd=new FormData(quiz);
    const profile={};
    for(const key of ['source','docs','job','operations','access','client'])profile[key]=String(fd.get(key)||'');
    const result=assess(profile);
    assessment={profile,result};
    document.querySelector('#rdy-title').textContent=result.title;
    document.querySelector('#rdy-description').textContent=result.description;
    document.querySelector('#rdy-actions-text').textContent=result.next;
    const offer=document.querySelector('#rdy-offer');
    offer.textContent=result.cta;
    offer.href=result.href;
    document.querySelector('#rdy-result').hidden=false;
    document.querySelector('#rdy-result').scrollIntoView({behavior:'smooth',block:'nearest'});
  });
  document.querySelector('#rdy-print')?.addEventListener('click',()=>window.print());

  lead?.addEventListener('submit',async(event)=>{
    event.preventDefault();
    if(!lead.reportValidity())return;
    const btn=document.querySelector('#rdy-submit');
    const fd=new FormData(lead);
    const p=assessment?.profile;
    const summary=p ? Object.entries(p).map(([key,value])=>key+': '+value).join('; ')
      : 'Assessment not completed; customer requests a personalized review.';
    const project_brief='AI Agent Readiness Review. Self-reported profile: '+summary+
      '. Please inspect our authorized source API and propose a bounded integration with named client acceptance.';
    const body={contact_name:String(fd.get('contact_name')||''),email:String(fd.get('email')||''),
      company:String(fd.get('company')||''),website:String(fd.get('website')||''),
      project_brief,service_package:assessment?.result.offer||'custom',
      contact_consent:fd.has('contact_consent'),marketing_consent:fd.has('marketing_consent'),
      nickname:String(fd.get('nickname')||'')};
    btn.disabled=true;
    feedback.textContent='Saving your requested review…';
    try{
      const resp=await fetch('/api/pilot-interest',{method:'POST',headers:{'Content-Type':'application/json'},
        credentials:'same-origin',body:JSON.stringify(body)});
      const data=await resp.json().catch(()=>({}));
      if(!resp.ok || !data.received || !data.reference)throw new Error(data.error||'REQUEST_NOT_RECORDED');
      feedback.textContent='Your enquiry was recorded. Reference: '+data.reference+
        '. This is not a booking, accepted order or payment confirmation.';
      lead.reset();
    }catch(err){
      feedback.textContent='Your enquiry was not confirmed. Please retry or use the implementation form on our platform. '+String(err.message).replaceAll('_',' ').slice(0,90);
    }finally{btn.disabled=false;}
  });
})();