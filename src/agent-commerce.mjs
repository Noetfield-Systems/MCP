// Native public commercial discovery. No account creation, quote issuance,
// external submission or checkout charge is performed by these functions.
const root='https://mcp-foundry-web-production.up.railway.app';
export function commercialOffers(){
 return {schema:'foundry.agent-commerce.v1',merchant:'MCP Foundry',currency:'CAD',
  offers:[
   {id:'public-api-quickstart',name:'Public API Quickstart',price_minor:19900,price_type:'fixed_one_time',scope:{apis:1,max_readonly_get_tools:3,public_https:true},delivery:['live upstream source test','supported client connection guidance','hosted MCP where supported'],exclusions:['OAuth','private upstream credentials','write methods','enterprise SLA'],purchase:{kind:'buyer_completed_hosted_checkout',url:'https://buy.stripe.com/5kQ7sMaLm81SeWSfPu1Nu0j'},details:root+'/solutions'},
   {id:'api-agent-launch',name:'API Agent Launch',price_from_minor:79900,price_type:'indicative_scoped_quote',scope:{apis:1,max_readonly_get_tools:5,public_https:true},delivery:['two agreed real use cases','tested client connection','shareable installation page'],purchase:{kind:'request_scope',url:root+'/#agent-launch'}},
   {id:'self-serve',name:'Free Builder',price_minor:0,price_type:'free_with_existing_quotas',purchase:{kind:'self_serve',url:root+'/#studio'}}
  ],readiness:root+'/readiness',enquiry:root+'/collaborate?track=api_business',payment_collected:false};
}
export function recommendOffer(input){
 if(!input||typeof input!=='object'||typeof input.public_https!=='boolean'||typeof input.requires_auth!=='boolean'||typeof input.requires_write!=='boolean'||!Number.isInteger(input.get_tools)||input.get_tools<1||input.get_tools>100||!Number.isInteger(input.api_count)||input.api_count<1||input.api_count>100)throw Error('INVALID_SCOPE');
 const catalog=commercialOffers();
 let route,reason;
 if(input.prefer_self_serve===true&&!input.requires_write&&input.public_https&&!input.requires_auth){route='self-serve';reason='PUBLIC_READONLY_SELF_SERVE';}
 else if(!input.public_https||input.requires_auth||input.requires_write||input.api_count>1||input.get_tools>5){route='scope_review';reason='CUSTOM_SCOPE_REQUIRES_REVIEW';}
 else if(input.get_tools<=3){route='public-api-quickstart';reason='MATCHES_PUBLISHED_QUICKSTART_SCOPE';}
 else {route='api-agent-launch';reason='MATCHES_INDICATIVE_LAUNCH_SCOPE';}
 return {route,reason,offer:catalog.offers.find(x=>x.id===route)||null,
  next_url:route==='scope_review'?catalog.enquiry:catalog.offers.find(x=>x.id===route).purchase.url,
  readiness:catalog.readiness,eligibility:'SELF_REPORTED_SCOPE_NOT_UPSTREAM_VERIFICATION',payment_collected:false};
}
