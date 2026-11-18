// Privacy-preserving execution receipts: save bounded categorical outcomes,
// never query parameters, tokens, request/response bodies or upstream URLs.
export function classifyToolError(error){
 const value=String(error?.message||error||'UNKNOWN').slice(0,300);
 if(/daily execution quota/i.test(value))return 'QUOTA_EXCEEDED';
 if(/AUTH_REQUIRED|CONNECTION_REQUIRED|RECONNECT_REQUIRED|OAUTH_/i.test(value))return 'AUTHORIZATION_REQUIRED';
 if(/Upstream returned HTTP (\d{3})/.test(value)){
  const n=Number(RegExp.$1);
  if(n===429)return 'UPSTREAM_RATE_LIMIT';
  if(n>=500)return 'UPSTREAM_SERVER_ERROR';
  if(n===404)return 'UPSTREAM_NOT_FOUND';
  if(n===401||n===403)return 'UPSTREAM_ACCESS_DENIED';
  return 'UPSTREAM_HTTP_ERROR';
 }
 if(/UPSTREAM_CONNECT|NETWORK_ERROR|DNS|fetch failed/i.test(value))return 'UPSTREAM_NETWORK_ERROR';
 if(/Timeout|timed out|aborted/i.test(value))return 'UPSTREAM_TIMEOUT';
 if(/size|exceeds 256 KiB/i.test(value))return 'RESPONSE_TOO_LARGE';
 if(/param|schema|Unresolved|Only read-only GET/i.test(value))return 'INVALID_TOOL_ARGUMENTS';
 if(/redirect|public IPv4|public-domain HTTPS/i.test(value))return 'UPSTREAM_POLICY_BLOCK';
 return 'TOOL_EXECUTION_ERROR';
}
