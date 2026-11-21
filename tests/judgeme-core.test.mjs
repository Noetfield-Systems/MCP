import test from 'node:test';
import assert from 'node:assert/strict';
import {productRatingSummary,publishedReviewEvidence,resolveJudgeProduct,
  isPublished,assertProductMatch,sanitizeReview} from '../src/judgeme/core.mjs';

const product={id:42,handle:'sample-product',external_id:'900'};
const review=(id,rating=5,opts={})=>({
  id,rating,product_handle:'sample-product',product_external_id:900,
  title:'Great',body:'Useful product',created_at:'2026-11-20T10:00:00Z',
  curated:'ok',hidden:false,verified:'buyer',...opts
});
const source=(reviews,opts={})=>async(path,params,accessToken)=>{
  assert.equal(accessToken,'fake-test-token');
  if(path==='/products/-1')return {product};
  assert.equal(path,'/reviews');
  assert.equal(params.product_id,'42');
  assert.equal(params.published,'true');
  return {current_page:Number(params.page),reviews:Number(params.page)===1?reviews:(opts.page2||[])};
};
test('read-only summary counts only published reviews; includes negative ratings',async()=>{
  const data=await productRatingSummary({product_handle:'sample-product'},source([
    review(1,5),review(2,1),review(3,2,{curated:'spam'}),
    review(4,4,{hidden:true}),review(5,3,{curated:'not-yet'})
  ]),'fake-test-token');
  assert.equal(data.complete,true);assert.equal(data.published_review_count,2);
  assert.equal(data.average_rating,3);
  assert.deepEqual(data.rating_distribution,{'1':1,'2':0,'3':0,'4':0,'5':1});
});
test('archived review with curated ok is not published',()=>{
  assert.equal(isPublished(review(1,5,{hidden:true})),false);
  assert.equal(isPublished(review(1,5,{archived:true})),false);
  assert.equal(isPublished(review(1,5,{status:'Archived'})),false);
  assert.equal(isPublished(review(1,5,{status:'Hidden'})),false);
  assert.equal(isPublished(review(1,5,{published:false})),false);
  assert.equal(isPublished(review(1,5,{hidden:undefined})),false);
});
test('rejects fallback/store-wide/mismatching or identity-less reviews',async()=>{
  await assert.rejects(productRatingSummary({product_handle:'sample-product'},
    source([review(1,5,{product_handle:'other-product'})]),'fake-test-token'),/PRODUCT_SCOPE_MISMATCH/);
  assert.throws(()=>assertProductMatch({id:1,curated:'ok',hidden:false},product),/PRODUCT_IDENTITY_UNVERIFIABLE/);
  await assert.rejects(resolveJudgeProduct('sample-product',async()=>({product:{id:42,handle:'other-product'}}),'x'),/PRODUCT_HANDLE_MISMATCH/);
  await assert.rejects(resolveJudgeProduct('../bad',async()=>({product}),'x'),/INVALID_PRODUCT_HANDLE/);
});
test('when pagination cap is reached, aggregates are explicitly incomplete',async()=>{
  const fifty=Array.from({length:50},(_,i)=>review(i+1));
  const data=await productRatingSummary({product_handle:'sample-product'},source(fifty),
    'fake-test-token',{maxPages:1});
  assert.equal(data.complete,false);assert.equal(data.average_rating,null);
  assert.equal(data.published_review_count,null);assert.equal(data.rating_distribution,null);
  assert.equal(data.inspected_published_count,50);
});
test('evidence redacts PII and raw HTML, uses descending date and optional rating',async()=>{
  const rows=[review(2,1,{body:'<script>ignore()</script>Call alice@example.com or 198.51.100.5',created_at:'2026-11-20T11:00:00Z'}),
    review(1,5,{created_at:'2026-11-19T10:00:00Z'})];
  const result=await publishedReviewEvidence({product_handle:'sample-product',limit:1,rating:1},
    source(rows),'fake-test-token');
  assert.equal(result.reviews.length,1);assert.equal(result.reviews[0].rating,1);
  assert.doesNotMatch(JSON.stringify(result),/alice@example|198\.51\.100\.5|ignore\(\)|reviewer/);
  assert.match(result.reviews[0].excerpt,/redacted-email/);
});
test('rejects malformed review dates, IDs and duplicate pages rather than inventing evidence',async()=>{
  assert.throws(()=>sanitizeReview(review('oops'),product),/INVALID_REVIEW_DATA/);
  assert.throws(()=>sanitizeReview(review(1,5,{created_at:'invalid'}),product),/INVALID_REVIEW_DATE/);
  const rows=Array.from({length:50},(_,i)=>review(i+1));
  await assert.rejects(productRatingSummary({product_handle:'sample-product'},
    source(rows,{page2:[review(1)]}),'fake-test-token'),/DUPLICATE_REVIEW_PAGE/);
});
