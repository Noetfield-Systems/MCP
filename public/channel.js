const $=id=>document.getElementById(id);
async function api(path){
 const response=await fetch(path,{credentials:'same-origin',cache:'no-store'});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||('HTTP '+response.status));
 return data;
}
const create=(name,value)=>{
 const card=document.createElement('div');card.className='channel-card';
 const n=document.createElement('strong');n.textContent=String(value??0);
 const t=document.createElement('span');t.textContent=name;card.append(n,t);return card;
};
let invite='';
async function load(){
 try{
  await api('/api/me');
  const [growth,channel]=await Promise.all([api('/api/growth/me'),api('/api/growth/channel')]);
  invite=growth.invite_url||'';
  const grid=$('channel-grid');grid.replaceChildren(
   create('Observed referral signups',channel.referred_signups),
   create('Referred owners who published',channel.referred_accounts_with_published_server),
   create('Referred owners with a successful tool execution',channel.referred_accounts_with_successful_recorded_tool_calls),
   create('Referred owners with multi-day usage',channel.referred_accounts_used_on_multiple_days),
   create('New referred signups in last 30 days',channel.referred_signups_last_30d),
   create('Verified purchases or install claims', 'Not measured')
  );
  $('channel-url').textContent=invite||'No referral link available.';
  $('channel-copy').disabled=!invite;
  $('channel-status').textContent='Source-backed referral and tool-event records loaded · '+new Date(channel.measured_at).toLocaleString('en-CA')+'.';
 }catch(e){$('channel-status').textContent='Sign in through Studio to inspect your private channel. '+e.message;}
}
$('channel-copy').addEventListener('click',async()=>{
 try{if(!invite)return;await navigator.clipboard.writeText(invite);$('channel-status').textContent='Invite link copied. A copy is not recorded as an installation or signup.';}
 catch{$('channel-status').textContent='Clipboard unavailable. Select and copy the displayed URL.';}
});
load();