import { auth, json, safeBody } from '@/lib/http';
import { query, tx } from '@/lib/db';
import { decryptJson } from '@/lib/crypto-store';
import { createDelivery } from '@/lib/logistics';
import { audit } from '@/lib/audit';

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  const a=await auth(['ops','support']);if('response'in a)return a.response;
  const {id}=await params; await safeBody(req).catch(()=>null);
  const r=await query<any>(`select o.*,dt.address_ciphertext,dt.instructions_ciphertext,dt.revoked_at,dt.expires_at
    from app_order o left join delivery_token dt on dt.id=o.delivery_token_id where o.id=$1`,[id]);
  const order=r.rows[0];if(!order)return json({error:'Order not found.'},404);
  if(order.state!=='paid')return json({error:'Only paid orders can be dispatched.'},409);
  if(!order.delivery_token_id)return json({error:'Recipient delivery token is required.'},409);
  if(order.revoked_at||(order.expires_at&&new Date(order.expires_at).getTime()<Date.now()))return json({error:'Recipient delivery token is no longer valid.'},409);
  const address=decryptJson(order.address_ciphertext,`delivery:${order.delivery_token_id}:address`);
  const instructions=decryptJson(order.instructions_ciphertext,`delivery:${order.delivery_token_id}:instructions`);
  try{
    const providerResult:any=await createDelivery({orderId:id,deliveryToken:order.delivery_token_id,items:order.metadata?.items||[],recipientAddress:address,instructions,promise:order.metadata?.deliveryPromise||{}});
    const deliveryId=crypto.randomUUID(),planId=crypto.randomUUID();
    const providerReference=String(providerResult.reference||providerResult.id||providerResult.deliveryId||'');
    if(!providerReference)throw new Error('Logistics provider did not return a delivery reference');
    const promisedAt=providerResult.promisedAt||providerResult.eta||null;
    await tx(async c=>{
      await c.query('insert into fulfilment_plan (id,order_id,strategy,confidence,landed_cost_minor,currency,substitution_policy) values ($1,$2,\'local\',$3,$4,$5,$6)',[planId,id,providerResult.confidence??null,providerResult.priceMinor??null,providerResult.currency||order.currency,providerResult.substitutionPolicy||null]);
      await c.query("insert into delivery (id,order_id,fulfilment_plan_id,state,promised_at,provider,provider_reference,last_provider_payload) values ($1,$2,$3,'ready',$4,$5,$6,$7)",[deliveryId,id,planId,promisedAt,process.env.LOGISTICS_PROVIDER||'configured',providerReference,providerResult]);
      await c.query("insert into scheduled_job (job_type,run_at,dedupe_key,payload_ciphertext) values ('delivery.refresh',now()+interval '5 minutes',$1,null) on conflict (dedupe_key) do nothing",[`delivery:${deliveryId}`]);
    });
    await audit(a.session.sub,'delivery.create','delivery',deliveryId,{orderId:id,providerReference},'restricted',req);
    return json({deliveryId,providerReference,promisedAt},201);
  }catch(e){return json({error:e instanceof Error?e.message:'Could not create delivery.'},502)}
}
