const $=s=>document.querySelector(s);const token=location.pathname.split('/').pop();
async function request(path,method='GET'){const r=await fetch(path,{method,headers:method==='POST'?{'Content-Type':'application/json'}:{},cache:'no-store'});const x=await r.json();if(!r.ok)throw Error(x.error||'ORDER_UNAVAILABLE');return x;}
async function load(){
 try{
 const x=await request('/api/orders/'+encodeURIComponent(token));const order=x.order;
 $('#order-title').textContent='Scoped MCP integration implementation';
 $('#order-price').textContent=new Intl.NumberFormat('en-CA',{style:'currency',currency:order.currency.toUpperCase()}).format(order.amount_cents/100);
 $('#order-description').textContent=order.description;
 $('#order-status').textContent='Order status: '+order.status.replaceAll('_',' ');
 const btn=$('#order-checkout');
 btn.disabled=!x.checkout_available||!['offered','checkout_pending'].includes(order.status);
 if(['paid','fulfilled'].includes(order.status)){btn.textContent='Payment verified';$('#order-feedback').textContent='A signed payment event was recorded. Your project delivery is tracked separately.';}
 else if(order.status==='refunded'){btn.textContent='Refund recorded';}
 else if(!x.checkout_available){btn.textContent='Checkout not yet configured';$('#order-feedback').textContent='No payment can be collected on this link until the merchant payment configuration is complete.';}
 else if(order.status==='failed'){btn.textContent='Request updated quote';}
 }catch(e){$('#order-title').textContent='Quote not found';$('#order-feedback').textContent=e.message;}
}
$('#order-checkout').addEventListener('click',async()=>{const btn=$('#order-checkout');btn.disabled=true;$('#order-feedback').textContent='Creating a secure one-time Checkout Session…';try{const x=await request('/api/orders/'+encodeURIComponent(token)+'/checkout','POST');if(!x.url||!x.url.startsWith('https://checkout.stripe.com/'))throw Error('INVALID_CHECKOUT_DESTINATION');location.assign(x.url);}catch(e){$('#order-feedback').textContent='Unable to open checkout: '+e.message;btn.disabled=false;}});
load();
