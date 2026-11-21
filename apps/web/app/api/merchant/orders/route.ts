import {auth,json} from '@/lib/http';import {query} from '@/lib/db';
export async function GET(){const a=await auth(['merchant']);if('response'in a)return a.response;const r=await query<any>(`select o.id,o.order_number,o.state,o.currency,o.created_at,
  jsonb_agg(jsonb_build_object('variantId',v.id,'product',p.title,'variant',v.title,'quantity',ir.quantity,'unitMinor',v.price_minor) order by p.title,v.title) items,
  sum(v.price_minor*ir.quantity)::bigint merchant_total_minor
  from app_order o join inventory_reservation ir on ir.order_id=o.id join variant v on v.id=ir.variant_id join product p on p.id=v.product_id join merchant m on m.id=p.merchant_id
  where m.owner_user_id=$1 group by o.id,o.order_number,o.state,o.currency,o.created_at order by o.created_at desc limit 100`,[a.session.sub]);return json({items:r.rows})}
