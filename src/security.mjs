import {randomBytes, scryptSync, timingSafeEqual, createHash} from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import {Agent, fetch as undiciFetch} from 'undici';

export const id=()=>crypto.randomUUID();
export const token=()=>randomBytes(32).toString('base64url');
export const sha=value=>createHash('sha256').update(value).digest('hex');
export function passwordHash(password){
  if(typeof password!=='string'||password.length<12||password.length>256) throw new Error('Password must have 12–256 characters');
  const salt=randomBytes(16).toString('hex');
  return salt+':'+scryptSync(password,salt,64).toString('hex');
}
export function passwordMatches(password,stored){
  try { const [salt,hash]=stored.split(':');const actual=scryptSync(password,salt,64);const expected=Buffer.from(hash,'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected); } catch { return false; }
}
const blockedIp=(v)=>{
  if(net.isIP(v)!==4) return true;
  const p=v.split('.').map(Number);
  return p[0]===0||p[0]===10||p[0]===127||p[0]>=224||
   (p[0]===100&&p[1]>=64&&p[1]<=127)||
   (p[0]===169&&p[1]===254)||
   (p[0]===172&&p[1]>=16&&p[1]<=31)||
   (p[0]===192&&(p[1]===168||p[1]===0||p[1]===88||p[1]===2))||
   (p[0]===198&&(p[1]===18||p[1]===19||p[1]===51&&p[2]===100))||
   (p[0]===203&&p[1]===0&&p[2]===113);
};
export function validatedTarget(value){
  let u;try {u=new URL(value);}catch{throw new Error('Invalid HTTPS endpoint');}
  if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||!u.hostname||u.hostname.length>253||u.hostname.endsWith('.local')||u.hostname.endsWith('.internal')||net.isIP(u.hostname)||u.hostname.includes('[')||u.hostname.includes(']')) throw new Error('Only public-domain HTTPS endpoints on port 443 are supported');
  u.hash='';
  return u;
}
export async function safeGet(value){
  const u=validatedTarget(value);
  const answers=await dns.lookup(u.hostname,{all:true,family:4,verbatim:true});
  if(!answers.length||answers.some(a=>blockedIp(a.address))) throw new Error('Endpoint DNS is not a public IPv4 address');
  const address=answers[0].address;
  const dispatcher=new Agent({connect:{lookup:(_hostname,_opts,cb)=>cb(null,address,4)},connections:1,pipelining:0});
  try {
    const response=await undiciFetch(u,{method:'GET',redirect:'manual',headers:{Accept:'application/json, text/plain;q=0.9'},dispatcher,signal:AbortSignal.timeout(8000)});
    if(response.status>=300&&response.status<400) throw new Error('Upstream redirects are disabled');
    const header=Number(response.headers.get('content-length')||'0');
    if(header>262144) throw new Error('Upstream response exceeds 256 KiB');
    let total=0;const chunks=[];
    for await (const chunk of response.body??[]){total+=chunk.length;if(total>262144) throw new Error('Upstream response exceeds 256 KiB');chunks.push(chunk);}
    const data=Buffer.concat(chunks).toString('utf8');
    if(!response.ok) throw new Error('Upstream returned HTTP '+response.status);
    return {status:response.status,body:data.slice(0,262144),contentType:response.headers.get('content-type')||'text/plain'};
  } finally {await dispatcher.close();}
}
export function toolUrl(record,args){
  const url=validatedTarget(record.url);
  for(const p of record.params||[]){
    const value=args?.[p.name];
    if(value===undefined||value===null||value===''){if(p.required) throw new Error('Missing '+p.name);continue;}
    if(p.in==='path'){
      const escaped=encodeURIComponent(String(value)); const target='{'+p.name+'}';
      if(!url.pathname.includes(target)) throw new Error('Invalid path parameter '+p.name);
      url.pathname=url.pathname.replace(target,escaped);
    } else if(p.in==='query'){url.searchParams.set(p.name,String(value));}
  }
  if(/\{[^}]+\}/.test(url.pathname)) throw new Error('Unresolved path parameters');
  return url.toString();
}
export function specTools(doc,serverUrl){
  if(!doc||typeof doc!=='object'||!doc.paths||typeof doc.paths!=='object') throw new Error('OpenAPI paths object required');
  validatedTarget(serverUrl);
  const result=[];
  for(const [path,methods] of Object.entries(doc.paths)){
    if(!path.startsWith('/')||path.includes('..')||path.length>250) continue;
    const op=methods?.get;if(!op) continue;
    const raw=(op.operationId||('get_'+path.replace(/[^a-zA-Z0-9]+/g,'_'))).toLowerCase();
    const name=raw.replace(/[^a-z0-9_]/g,'_').slice(0,60);
    if(!name||result.some(t=>t.name===name)) continue;
    const params=[...(methods.parameters||[]),...(op.parameters||[])].filter(p=>p&&['path','query'].includes(p.in)&&/^[a-zA-Z_][\w-]{0,63}$/.test(p.name)).slice(0,18).map(p=>({name:p.name,in:p.in,required:p.in==='path'||!!p.required,type:['string','integer','number','boolean'].includes(p.schema?.type)?p.schema.type:'string'}));
    result.push({name,description:String(op.summary||op.description||'Read data from the upstream API').slice(0,280),method:'GET',url:new URL(path,serverUrl.replace(/\/$/,'')+'/').toString(),params});
    if(result.length>=30) break;
  }
  return result;
}
export function enforceOrigin(req,res,next){
 if(['GET','HEAD','OPTIONS'].includes(req.method)) return next();
 const origin=req.get('origin');
 if(origin){try{if(new URL(origin).host===req.get('host')&&new URL(origin).protocol===(req.secure?'https:':'http:')) return next();}catch{} return res.status(403).json({error:'ORIGIN_MISMATCH'});}
 return next(); // non-browser API clients authenticate with bearer tokens
}
export function throttle(){const slots=new Map();return (req,res,next)=>{const key=req.ip||'unknown', now=Date.now(); const v=slots.get(key);const state=!v||v.expires<now?{n:0,expires:now+60000}:v;state.n++;slots.set(key,state);if(slots.size>10000)for(const [k,v] of slots)if(v.expires<now)slots.delete(k);if(state.n>180)return res.status(429).json({error:'RATE_LIMIT'});next();};}
