import {q} from './db.mjs';

// Founder-grade activation accounting. Only server-side, authenticated, actual
// completed operations create events. This table is not pageview analytics,
// user identification or simulated customer/revenue activity.
export const ACTIVATION_EVENTS=Object.freeze([
  'account_created',
  'server_created',
  'template_started',
  'tool_added',
  'tool_test_succeeded',
  'server_published',
  'api_key_created'
]);
const allowed=new Set(ACTIVATION_EVENTS);
export async function recordActivation(name,accountId,serverId=null,source='studio'){
  if(!allowed.has(name)||typeof accountId!=='string')throw Error('INVALID_ACTIVATION_EVENT');
  if(!['studio','native_mcp'].includes(source))throw Error('INVALID_ACTIVATION_SOURCE');
  try {
    await q(
      'INSERT INTO activation_events(account_id,server_id,name,source) VALUES($1,$2,$3,$4)',
      [accountId,serverId,name,source]
    );
    return true;
  } catch(error) {
    // The customer operation is complete; do not break paid/free customer
    // workflows because a secondary analytical receipt could not be written.
    console.error('ACTIVATION_EVENT_WRITE_FAILED',name,String(error?.code||'UNKNOWN'));
    return false;
  }
}
