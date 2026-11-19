// A signed processor payment proves collection, not satisfactory client delivery.
// Operator may mark a paid scoped order fulfilled only with independently traceable
// delivery and explicit customer acceptance references (email, ticket, signoff).
const val=(x,max)=>typeof x==='string'?x.trim().slice(0,max):'';
export function validateOrderAcceptance(body){
 const delivery_reference=val(body?.delivery_reference,500);
 const customer_acceptance_reference=val(body?.customer_acceptance_reference,500);
 const accepted_by=val(body?.accepted_by,120);
 if(delivery_reference.length<12||customer_acceptance_reference.length<12||accepted_by.length<3)
   throw Error('CUSTOMER_DELIVERY_AND_ACCEPTANCE_RECEIPTS_REQUIRED');
 // Reject fabricated placeholders that would falsely certify customer acceptance.
 const bad=/^(test|none|n\/a|todo|pending|unknown|sample|placeholder|na)$/i;
 if([delivery_reference,customer_acceptance_reference,accepted_by].some(x=>bad.test(x)))
   throw Error('ACTUAL_DELIVERY_RECEIPT_REQUIRED');
 return {delivery_reference,customer_acceptance_reference,accepted_by};
}
