import {test} from 'node:test';
import assert from 'node:assert/strict';
import {channelFunnel} from '../src/channel.mjs';
test('referral funnel cannot claim more activated users than observed referred accounts',()=>{
 const x=channelFunnel({referrals:3,published:9,used:10,returning:99,recent:50});
 assert.equal(x.referred_signups,3);
 assert.equal(x.referred_accounts_with_published_server,3);
 assert.equal(x.referred_accounts_with_successful_recorded_tool_calls,3);
 assert.equal(x.referred_accounts_used_on_multiple_days,3);
 assert.equal(x.referred_signups_last_30d,3);
 assert.match(x.note,/not prove a human buyer/);
});
test('referral funnel has safe zero state and negative values cannot inflate metrics',()=>{
 const x=channelFunnel({referrals:-3,published:null,used:'invalid',returning:1});
 assert.equal(x.referred_signups,0);
 assert.equal(x.referred_accounts_with_successful_recorded_tool_calls,0);
 assert.equal(x.referred_accounts_used_on_multiple_days,0);
 assert.equal(x.attribution,'signup referral code; no cross-site tracking');
});
