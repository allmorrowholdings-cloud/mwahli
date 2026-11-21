import { z } from 'zod';
import { auth, json, safeBody } from '@/lib/http';
import { createOrder, resolveDeliveryToken } from '@/lib/repositories';
import { query } from '@/lib/db';
import { audit } from '@/lib/audit';

const schema=z.object({currency:z.string().length(3),items:z.array(z.object({variantId:z.string().uuid(),quantity:z.number().int().min(1).max(20)})).min(1).max(30),recipientUserId:z.string().uuid().nullable().optional(),deliveryToken:z.string().min(20).max(300).nullable().optional(),metadata:z.record(z.unknown()).optional()});

export async function GET(){
  const a=await auth();if('response'in a)return a.response;
  const r=await query<any>(`select o.id,o.order_number,o.state,o.currency,o.total_minor,o.created_at,o.updated_at,o.metadata,
    (select jsonb_build_object('id',d.id,'state',d.state,'promisedAt',d.promised_at,'deliveredAt',d.delivered_at) from delivery d where d.order_id=o.id order by d.created_at desc limit 1) delivery
    from app_order o where o.user_id=$1 order by o.created_at desc limit 100`,[a.session.sub]);
  return json({items:r.rows});
}
export async function POST(req:Request){
  const a=await auth();if('response'in a)return a.response;
  const p=schema.safeParse(await safeBody(req).catch(()=>null));if(!p.success)return json({error:'Check the order.'},400);
  try{
    let recipientUserId=p.data.recipientUserId||null,deliveryTokenId:null|string=null;
    if(p.data.deliveryToken){const resolved=await resolveDeliveryToken(p.data.deliveryToken,a.session.sub);if(!resolved)return json({error:'Recipient delivery token is invalid or expired.'},400);if(recipientUserId&&recipientUserId!==resolved.recipientUserId)return json({error:'Recipient does not match the delivery token.'},400);recipientUserId=resolved.recipientUserId;deliveryTokenId=resolved.id}
    const result=await createOrder(a.session.sub,{...p.data,recipientUserId,deliveryTokenId});
    await audit(a.session.sub,'order.create','app_order',result.id,{totalMinor:result.totalMinor,currency:result.currency,hasPrivateDeliveryToken:!!deliveryTokenId},'financial',req);return json(result,201)
  }catch(e){return json({error:e instanceof Error?e.message:'Could not create order.'},400)}
}
