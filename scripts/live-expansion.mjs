import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

const base=(process.env.FOUNDRY_BASE_URL||'https://mcp-foundry-web-production.up.railway.app').replace(/\/$/,'');
const suffix=randomUUID().slice(0,12),pw='Foundry-Collab!'+randomUUID();
const make=()=>({cookie:'',created:false,password:pw,email:'conformance-exp-'+randomUUID().slice(0,10)+'@foundry.invalid'});
const owner=make(),member=make();
async function fetchJson(path,{account,method='GET',data}={}){
 const headers={...(account?.cookie?{cookie:account.cookie}:{}),...(data!==undefined?{'content-type':'application/json'}:{})};
 const resp=await fetch(base+path,{method,headers,body:data!==undefined?JSON.stringify(data):undefined,signal:AbortSignal.timeout(14000)});
 const json=await resp.json().catch(()=>({}));
 if(account&&!account.cookie&&resp.headers.get('set-cookie'))account.cookie=resp.headers.get('set-cookie').split(';')[0];
 return {status:resp.status,data:json};
}
async function ok(path,opts={}){const r=await fetchJson(path,opts);assert.ok(r.status>=200&&r.status<300,path+' => '+r.status+' '+JSON.stringify(r.data).slice(0,350));return r.data;}
try{
 const a=await ok('/api/auth/register',{account:owner,method:'POST',data:{email:owner.email,password:owner.password}});
 owner.created=true;assert.ok(a.account.id);
 const growth=await ok('/api/growth/me',{account:owner});assert.ok(growth.invite_url.includes('?ref=fdy-'));
 const ref=new URL(growth.invite_url).searchParams.get('ref');
 const b=await ok('/api/auth/register',{account:member,method:'POST',data:{email:member.email,password:member.password,referral_code:ref}});
 member.created=true;
 const reflected=await ok('/api/growth/me',{account:owner});assert.equal(reflected.referrals,1,'new account referred and persisted; not a paid customer');
 const starter=await ok('/api/servers/from-template',{account:owner,method:'POST',data:{template_id:'hacker_news'}});
 assert.ok(starter.server.id);
 const serverId=starter.server.id;
 const pub=await ok('/api/servers/'+serverId+'/publish',{account:owner,method:'POST',data:{visibility:'public'}});
 assert.equal(pub.server.status,'published');
 const revisions=await ok('/api/servers/'+serverId+'/revisions',{account:owner});
 assert.equal(revisions.revisions.length,1,'published snapshot exists');
 const market=await ok('/api/servers/'+serverId+'/listing',{account:owner,method:'PUT',data:{
   category:'research',tagline:'Live Hacker News item IDs for real agent research',
   readme:'Use read-only Hacker News APIs to list current story identifiers and inspect the latest item. This source may be unavailable or rate limited.',
   docs_url:'https://github.com/HackerNews/API'
 }});
 assert.equal(market.status,'published_unverified');
 const directory=await ok('/api/marketplace');
 assert.ok(directory.listings.some(x=>x.slug===starter.server.slug),'real published listing available');
 const entry=await ok('/api/marketplace/'+starter.server.slug);
 assert.ok(entry.tools.length>=1,'tool inventory exists');
 assert.equal((await fetchJson('/api/servers/'+serverId+'/members',{account:member})).status,404,'tenant boundaries for owner-only routes');
 assert.equal((await fetchJson('/api/admin/pilot-orders')).status,403,'signed operator access required');
 const inv=await ok('/api/servers/'+serverId+'/invitations',{account:owner,method:'POST',data:{account_id:b.account.id,role:'viewer'}});
 const pending=await ok('/api/team/invitations',{account:member});
 assert.ok(pending.invitations.some(x=>x.id===inv.invitation.id));
 const accepted=await ok('/api/team/invitations/'+inv.invitation.id+'/accept',{account:member,method:'POST'});
 assert.equal(accepted.role,'viewer');
 const shared=await ok('/api/team/servers/'+serverId,{account:member});
 assert.equal(shared.server.role,'viewer');assert.ok(shared.tools.length>=1);
 assert.equal((await fetchJson('/api/team/servers/'+serverId+'/publish',{account:member,method:'POST'})).status,403,'viewer cannot publish');
 const editor=await ok('/api/servers/'+serverId+'/invitations',{account:owner,method:'POST',data:{account_id:b.account.id,role:'editor'}});
 await ok('/api/team/invitations/'+editor.invitation.id+'/accept',{account:member,method:'POST'});
 const sharedEditor=await ok('/api/team/servers/'+serverId,{account:member});
 assert.equal(sharedEditor.server.role,'editor');
 const pubEditor=await ok('/api/team/servers/'+serverId+'/publish',{account:member,method:'POST'});
 assert.equal(pubEditor.published,true);
 const revoked=await ok('/api/servers/'+serverId+'/members/'+b.account.id,{account:owner,method:'DELETE'});
 assert.equal(revoked.removed,true);
 assert.equal((await fetchJson('/api/team/servers/'+serverId,{account:member})).status,404,'revoked collaborator loses access immediately');
 const prior=await ok('/api/servers/'+serverId+'/revisions',{account:owner});
 assert.ok(prior.revisions.length>=2);
 const restored=await ok('/api/servers/'+serverId+'/revisions/'+prior.revisions[0].id+'/restore',{account:owner,method:'POST'});
 assert.equal(restored.status,'draft');assert.equal(restored.requires_republish,true);
 const absent=await ok('/api/marketplace');
 assert.equal(absent.listings.some(x=>x.slug===starter.server.slug),false,'draft revisions cannot appear as live marketplace items');
 await ok('/api/servers/'+serverId+'/publish',{account:owner,method:'POST',data:{visibility:'public'}});
 const listedAgain=await ok('/api/marketplace');
 assert.ok(listedAgain.listings.some(x=>x.slug===starter.server.slug));
 console.log(JSON.stringify({result:'PASS',type:'P0_P1_P2_ACTUAL_POSTGRES',referral_signup:'PASS',publisher_marketplace:'PASS',revision_restore:'PASS',team_invite:'PASS',viewer_denied:'PASS',editor_published:'PASS',revoke:'PASS',operator_isolation:'PASS',real_customer:false,payment_collected:false}));
}finally{
 for(const account of [member,owner]){
  if(!account.created)continue;
  try{const r=await fetchJson('/api/account',{account,method:'DELETE',data:{password:account.password}});
   assert.equal(r.status,200);console.log('EXPANSION_FIXTURE_ACCOUNT_DELETED');
  }catch(e){console.error('EXPANSION_CLEANUP_FAILED',String(e));process.exitCode=1;}
 }
}
