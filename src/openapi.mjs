import {parseDocument} from 'yaml';
import {safeGet, specTools, validatedTarget} from './security.mjs';

const MAX_BYTES=262144;

export function parseOpenapi(raw) {
  if(raw && typeof raw==='object' && !Array.isArray(raw)) {
    if(JSON.stringify(raw).length>MAX_BYTES)throw Error('OPENAPI_DOCUMENT_TOO_LARGE');
    return validateDocument(raw);
  }
  if(typeof raw!=='string' || !raw.trim())throw Error('OPENAPI_DOCUMENT_REQUIRED');
  if(Buffer.byteLength(raw,'utf8')>MAX_BYTES)throw Error('OPENAPI_DOCUMENT_TOO_LARGE');
  let document;
  const text=raw.trim();
  if(text.startsWith('{')){
    try{document=JSON.parse(text);}catch{throw Error('INVALID_OPENAPI_JSON');}
  } else {
    try {
      const yaml=parseDocument(text,{schema:'core',uniqueKeys:true,strict:true});
      if(yaml.errors.length)throw Error('INVALID_OPENAPI_YAML');
      document=yaml.toJS({maxAliasCount:0});
    } catch {throw Error('INVALID_OPENAPI_YAML');}
  }
  return validateDocument(document);
}
function validateDocument(doc){
  if(!doc||typeof doc!=='object'||Array.isArray(doc))throw Error('INVALID_OPENAPI_DOCUMENT');
  if(!doc.paths||typeof doc.paths!=='object'||Array.isArray(doc.paths))throw Error('OPENAPI_PATHS_REQUIRED');
  if(Object.keys(doc.paths).length>250)throw Error('OPENAPI_TOO_MANY_PATHS');
  // Swagger 2 and OpenAPI 3 are both accepted as schema inputs, but only GET
  // operations with supported path/query parameters are translated.
  if(!(typeof doc.openapi==='string'&&/^3\./.test(doc.openapi))&&doc.swagger!=='2.0')throw Error('OPENAPI_VERSION_REQUIRED');
  return doc;
}
export async function resolveOpenapiInput(body){
  const url=typeof body?.spec_url==='string'?body.spec_url.trim():'';
  const input=body?.document??body?.document_text;
  if(url){
    if(input && (typeof input==='object'||String(input).trim()))throw Error('CHOOSE_SPEC_URL_OR_DOCUMENT');
    const target=validatedTarget(url);
    // Identical DNS/SSRF/redirect/timeout/size policy to GET tool calls.
    const remote=await safeGet(target.href);
    return {document:parseOpenapi(remote.body),origin:'public_https_url'};
  }
  return {document:parseOpenapi(input),origin:'pasted_or_uploaded_document'};
}
export function openapiPreview(doc,baseUrl){
  if(typeof baseUrl!=='string'||!baseUrl.trim())throw Error('PUBLIC_API_BASE_URL_REQUIRED');
  validatedTarget(baseUrl);
  const tools=specTools(doc,baseUrl);
  return {found:tools.length,tools:tools.map(({name,description,url,params})=>({name,description,url,params})),supported_methods:['GET'],max_import:30};
}
