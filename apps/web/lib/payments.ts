type InitInput={amountMinor:number;currency:string;email:string;reference:string;callbackUrl?:string;metadata?:Record<string,unknown>};
async function postJson(url:string,headers:Record<string,string>,body:unknown){const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body),cache:'no-store'});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`Provider request failed (${r.status})`);return data as any}
export async function initializePayment(provider:string,input:InitInput){switch(provider){
case 'paystack':{if(!process.env.PAYSTACK_SECRET_KEY)throw new Error('Paystack is not configured');const d=await postJson('https://api.paystack.co/transaction/initialize',{authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY}`},{email:input.email,amount:input.amountMinor,currency:input.currency,reference:input.reference,callback_url:input.callbackUrl,metadata:input.metadata});return {providerReference:d.data?.reference||input.reference,checkoutUrl:d.data?.authorization_url}}
case 'flutterwave':{if(!process.env.FLUTTERWAVE_SECRET_KEY)throw new Error('Flutterwave is not configured');const d=await postJson('https://api.flutterwave.com/v3/payments',{authorization:`Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`},{tx_ref:input.reference,amount:input.amountMinor/100,currency:input.currency,redirect_url:input.callbackUrl,customer:{email:input.email},customizations:{title:'MWAHLI',description:'Love, made felt.'},meta:input.metadata});return {providerReference:input.reference,checkoutUrl:d.data?.link}}
case 'stripe':{if(!process.env.STRIPE_SECRET_KEY)throw new Error('Stripe is not configured');const body=new URLSearchParams({mode:'payment',success_url:`${input.callbackUrl||process.env.APP_URL}/orders?payment=success`,cancel_url:`${input.callbackUrl||process.env.APP_URL}/orders?payment=cancelled`,'line_items[0][price_data][currency]':input.currency.toLowerCase(),'line_items[0][price_data][unit_amount]':String(input.amountMinor),'line_items[0][price_data][product_data][name]':'MWAHLI order','line_items[0][quantity]':'1','metadata[reference]':input.reference,customer_email:input.email});const r=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`,'content-type':'application/x-www-form-urlencoded'},body});const d=await r.json() as any;if(!r.ok)throw new Error('Stripe request failed');return {providerReference:d.id||input.reference,checkoutUrl:d.url}}
case 'momo':{const base=process.env.MOMO_API_URL?.replace(/\/$/,'');if(!base||!process.env.MOMO_API_KEY)throw new Error('Mobile money provider is not configured');const d=await postJson(`${base}/payments`,{authorization:`Bearer ${process.env.MOMO_API_KEY}`},{amountMinor:input.amountMinor,currency:input.currency,reference:input.reference,callbackUrl:input.callbackUrl,customer:{email:input.email},metadata:input.metadata});return {providerReference:d.reference||d.id||input.reference,checkoutUrl:d.checkoutUrl||d.authorizationUrl||d.url||null,instructions:d.instructions||null}}
default:throw new Error('Unsupported payment provider')}}

export async function refundPayment(provider:string,reference:string,amountMinor?:number){
  if(provider==='paystack'){
    if(!process.env.PAYSTACK_SECRET_KEY)throw new Error('Paystack is not configured');
    return postJson('https://api.paystack.co/refund',{authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY}`},{transaction:reference,...(amountMinor?{amount:amountMinor}:{})});
  }
  if(provider==='flutterwave'){
    if(!process.env.FLUTTERWAVE_SECRET_KEY)throw new Error('Flutterwave is not configured');
    const verify=await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,{headers:{authorization:`Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`},cache:'no-store'});
    const vd=await verify.json().catch(()=>({})) as any;if(!verify.ok||!vd?.data?.id)throw new Error(`Flutterwave refund lookup failed (${verify.status})`);
    return postJson(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(String(vd.data.id))}/refund`,{authorization:`Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`},amountMinor?{amount:amountMinor/100}:{});
  }
  if(provider==='stripe'){
    if(!process.env.STRIPE_SECRET_KEY)throw new Error('Stripe is not configured');
    let paymentIntent=reference;
    if(reference.startsWith('cs_')){
      const lookup=await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(reference)}`,{headers:{authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`},cache:'no-store'});
      const ld=await lookup.json().catch(()=>({})) as any;if(!lookup.ok||!ld?.payment_intent)throw new Error(`Stripe refund lookup failed (${lookup.status})`);paymentIntent=String(ld.payment_intent);
    }
    const body=new URLSearchParams({payment_intent:paymentIntent});if(amountMinor)body.set('amount',String(amountMinor));
    const r=await fetch('https://api.stripe.com/v1/refunds',{method:'POST',headers:{authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`,'content-type':'application/x-www-form-urlencoded'},body,cache:'no-store'});
    const d=await r.json();if(!r.ok)throw new Error(`Stripe refund failed (${r.status})`);return d;
  }
  if(provider==='momo'){
    const base=process.env.MOMO_API_URL?.replace(/\/$/,'');if(!base||!process.env.MOMO_API_KEY)throw new Error('Mobile money provider is not configured');
    return postJson(`${base}/payments/${encodeURIComponent(reference)}/refund`,{authorization:`Bearer ${process.env.MOMO_API_KEY}`},{amountMinor});
  }
  throw new Error('Unsupported payment provider');
}
