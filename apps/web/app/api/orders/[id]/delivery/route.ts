import { auth, json } from '@/lib/http';
import { query } from '@/lib/db';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
  const a=await auth();if('response'in a)return a.response;const {id}=await params;
  const staff=['ops','support','finance'].includes(a.session.role);
  const order=await query<any>('select id,user_id,state,order_number from app_order where id=$1',[id]);const o=order.rows[0];
  let merchantOwns=false;if(a.session.role==='merchant'){const m=await query('select 1 from inventory_reservation ir join variant v on v.id=ir.variant_id join product p on p.id=v.product_id join merchant m on m.id=p.merchant_id where ir.order_id=$1 and m.owner_user_id=$2 limit 1',[id,a.session.sub]);merchantOwns=!!m.rows[0]}
  if(!o||(!staff&&!merchantOwns&&o.user_id!==a.session.sub))return json({error:'Order not found.'},404);
  const d=await query<any>(`select d.id,d.state,d.promised_at,d.dispatched_at,d.delivered_at,d.created_at,
    (select jsonb_agg(jsonb_build_object('type',e.event_type,'at',e.event_at,'payload',e.public_payload) order by e.event_at) from delivery_event e where e.delivery_id=d.id) events
    from delivery d where d.order_id=$1 order by d.created_at desc limit 1`,[id]);
  return json({order:{id:o.id,orderNumber:o.order_number,state:o.state},delivery:d.rows[0]||null});
}
