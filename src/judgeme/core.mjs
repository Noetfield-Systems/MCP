// Judge.me read-only product review adapter. No merchant secrets are logged or returned.
export const JUDGEME_SCOPES='read_products read_reviews';
export const JUDGEME_MAX_PAGES=20;
export const JUDGEME_PAGE_SIZE=50;

const productHandle=value=>{
  if(typeof value!=='string'||!/^[a-z0-9][a-z0-9-]{0,149}$/.test(value))throw Error('INVALID_PRODUCT_HANDLE');
  return value;
};
const numeric=value=>Number.isSafeInteger(Number(value))&&Number(value)>0?String(value):null;
const plain=value=>{
  if(typeof value!=='string')return '';
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,' ')
    .replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|#160);/gi,' ')
    .replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
    .replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim()
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[redacted-email]')
    .replace(/\b(?:\+?\d[\d ().-]{7,}\d)\b/g,'[redacted-phone]')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g,'[redacted-ip]');
};
export function sanitizeReview(review,product){
  const rating=Number(review?.rating), reviewId=numeric(review?.id);
  if(!reviewId||!Number.isInteger(rating)||rating<1||rating>5)throw Error('INVALID_REVIEW_DATA');
  const date=review?.created_at;
  if(typeof date!=='string'||!Number.isFinite(Date.parse(date)))throw Error('INVALID_REVIEW_DATE');
  return {
    review_id:reviewId,product_id:String(product.id),rating,
    title:plain(review.title).slice(0,180),
    excerpt:plain(review.body).slice(0,600),
    created_at:new Date(date).toISOString(),
    verified:typeof review.verified_buyer==='boolean'?review.verified_buyer:
      review.verified==='buyer'?true:review.verified===false?false:null
  };
}
export function isPublished(review){
  // An archived review may retain curated=ok; hidden must explicitly be false.
  return review?.curated==='ok'&&review?.hidden===false&&
    !review?.archived&&String(review?.status||'').toLowerCase()!=='archived';
}
export function assertProductMatch(review,product){
  let checked=false;
  if(review?.product_handle!==undefined&&review.product_handle!==null){
    checked=true;
    if(review.product_handle!==product.handle)throw Error('PRODUCT_SCOPE_MISMATCH');
  }
  if(review?.product_external_id!==undefined&&review.product_external_id!==null&&product.external_id!==null){
    checked=true;
    if(String(review.product_external_id)!==product.external_id)throw Error('PRODUCT_SCOPE_MISMATCH');
  }
  if(review?.product_id!==undefined&&review.product_id!==null){
    checked=true;
    if(String(review.product_id)!==String(product.id))throw Error('PRODUCT_SCOPE_MISMATCH');
  }
  if(!checked)throw Error('PRODUCT_IDENTITY_UNVERIFIABLE');
}
export async function resolveJudgeProduct(handle,request,accessToken){
  productHandle(handle);
  const data=await request('/products/-1',{handle},accessToken);
  const item=data?.product, id=numeric(item?.id);
  if(!id)throw Error('PRODUCT_NOT_FOUND');
  if(item.handle!==handle)throw Error('PRODUCT_HANDLE_MISMATCH');
  return {id,handle,external_id:item.external_id==null?null:String(item.external_id)};
}
export async function loadPublishedReviews(product,request,accessToken,{maxPages=JUDGEME_MAX_PAGES}={}){
  const results=[],seen=new Set();
  if(!Number.isSafeInteger(maxPages)||maxPages<1||maxPages>JUDGEME_MAX_PAGES)throw Error('INVALID_PAGE_CAP');
  for(let page=1;page<=maxPages;page++){
    const data=await request('/reviews',{product_id:product.id,published:'true',
      page:String(page),per_page:String(JUDGEME_PAGE_SIZE)},accessToken);
    if(!data||!Array.isArray(data.reviews)||data.reviews.length>JUDGEME_PAGE_SIZE)throw Error('INVALID_REVIEW_PAGE');
    if(data.current_page!==undefined&&Number(data.current_page)!==page)throw Error('PAGINATION_MISMATCH');
    for(const review of data.reviews){
      assertProductMatch(review,product);
      if(!isPublished(review))continue;
      const cleaned=sanitizeReview(review,product);
      if(seen.has(cleaned.review_id))throw Error('DUPLICATE_REVIEW_PAGE');
      seen.add(cleaned.review_id);results.push(cleaned);
    }
    if(data.reviews.length<JUDGEME_PAGE_SIZE)return {reviews:results,complete:true,pages_fetched:page};
  }
  // Do not certify aggregates based on a capped page sample.
  return {reviews:results,complete:false,pages_fetched:maxPages};
}
export async function productRatingSummary({product_handle},request,accessToken,opts){
  const product=await resolveJudgeProduct(product_handle,request,accessToken);
  const data=await loadPublishedReviews(product,request,accessToken,opts);
  const counts={'1':0,'2':0,'3':0,'4':0,'5':0};
  for(const r of data.reviews)counts[String(r.rating)]++;
  const total=data.reviews.length;
  return {product_id:product.id,product_handle:product.handle,
    average_rating:data.complete&&total?Math.round(data.reviews.reduce((n,r)=>n+r.rating,0)/total*100)/100:null,
    published_review_count:data.complete?total:null,
    rating_distribution:data.complete?counts:null,
    inspected_published_count:total,complete:data.complete,
    retrieved_at:new Date().toISOString(),source:'Judge.me API'};
}
export async function publishedReviewEvidence({product_handle,limit=5,rating},request,accessToken,opts){
  if(!Number.isInteger(limit)||limit<1||limit>10)throw Error('INVALID_LIMIT');
  if(rating!==undefined&&(!Number.isInteger(rating)||rating<1||rating>5))throw Error('INVALID_RATING');
  const product=await resolveJudgeProduct(product_handle,request,accessToken);
  const data=await loadPublishedReviews(product,request,accessToken,opts);
  const selected=data.reviews.filter(r=>rating===undefined||r.rating===rating)
    .sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.review_id.localeCompare(a.review_id)).slice(0,limit);
  return {product_id:product.id,product_handle:product.handle,reviews:selected,
    complete:data.complete,ordering:data.complete?'recent_first':'sample_only_not_guaranteed_recent',
    retrieved_at:new Date().toISOString(),source:'Judge.me API'};
}
