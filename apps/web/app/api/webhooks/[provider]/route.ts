import crypto from 'node:crypto';
import { json } from '@/lib/http';
import { query, tx } from '@/lib/db';
import { providerEventId, verifyProviderWebhook } from '@/lib/webhooks';
import { sha256 } from '@/lib/security';

function paymentState(provider:string,p:any){
  if(provider==='paystack'){const ev=String(p?.event||'');if(ev==='charge.success')return 'paid';if(ev.includes('refund'))return 'refunded';if(ev.includes('failed'))return 'failed';return null}
  if(provider==='flutterwave'){const s=String(p?.data?.status||p?.status||'').toLowerCase();if(s==='successful')return 'paid';if(s==='failed')return 'failed';if(s.includes('refund'))return 'refunded';return null}
  if(provider==='stripe'){const ev=String(p?.type||'');if(ev==='checkout.session.completed'||ev==='payment_intent.succeeded')return 'paid';if(ev.includes('payment_failed'))return 'failed';if(ev.includes('refunded'))return 'refunded';return null}
  if(provider==='momo'){const s=String(p?.status||p?.data?.status||'').toLowerCase();if(['paid','successful','success'].includes(s))return 'paid';if(['failed','cancelled'].includes(s))return 'failed';if(s.includes('refund'))return 'refunded';return null}
  return null;
}
function reference(provider:string,p:any){
  if(provider==='paystack')return p?.data?.reference;
  if(provider==='flutterwave')return p?.data?.tx_ref||p?.data?.id;
  if(provider==='stripe')return p?.data?.object?.id||p?.data?.object?.metadata?.reference;
  if(provider==='momo')return p?.reference||p?.data?.reference||p?.id;
  return p?.reference;
}
async function commitOrderInventory(c:any,orderId:string){const rr=await c.query(`select ir.id,ir.variant_id,ir.quantity,ir.state,v.inventory from inventory_reservation ir join variant v on v.id=ir.variant_id where ir.order_id=$1 order by ir.created_at for update of ir,v`,[orderId]);if(!rr.rows.length)return true;const shortage=rr.rows.find((x:any)=>x.state!=='committed'&&x.inventory!==null&&Number(x.inventory)<Number(x.quantity));if(shortage){await c.query("update inventory_reservation set state='released',released_at=coalesce(released_at,now()) where order_id=$1 and state<>'committed'",[orderId]);await c.query("update app_order set state='paid_stock_exception',updated_at=now() where id=$1",[orderId]);await c.query("insert into risk_case (risk_type,severity,state) values ('paid_inventory_shortfall',5,'open')");return false}for(const x of rr.rows){if(x.state==='committed')continue;if(x.inventory!==null)await c.query('update variant set inventory=inventory-$2 where id=$1',[x.variant_id,Number(x.quantity)]);await c.query("update inventory_reservation set state='committed',committed_at=now() where id=$1",[x.id])}return true}
async function postLedger(c:any,row:any){
  const existing=await c.query("select 1 from ledger_entry where reference_type='payment_intent' and reference_id=$1 limit 1",[row.id]);
  if(existing.rows[0])return;
  const txid=crypto.randomUUID();
  const cash=await c.query("insert into ledger_account (owner_type,owner_id,currency,account_type) values ('platform',null,$1,'cash') on conflict (owner_type,owner_id,currency,account_type) do update set currency=excluded.currency returning id",[row.currency]);
  const liability=await c.query("insert into ledger_account (owner_type,owner_id,currency,account_type) values ('platform',null,$1,'customer_funds') on conflict (owner_type,owner_id,currency,account_type) do update set currency=excluded.currency returning id",[row.currency]);
  await c.query("insert into ledger_entry (transaction_id,account_id,amount_minor,currency,entry_type,reference_type,reference_id) values ($1,$2,$3,$4,'debit','payment_intent',$5),($1,$6,$7,$4,'credit','payment_intent',$5)",[txid,cash.rows[0].id,Number(row.amount_minor),row.currency,row.id,liability.rows[0].id,-Number(row.amount_minor)]);
}

export async function POST(req:Request,{params}:{params:Promise<{provider:string}>}){
  const {provider}=await params;
  const raw=await req.text();
  if(!verifyProviderWebhook(provider,raw,req.headers))return json({error:'Invalid signature.'},401);
  let payload:any;try{payload=JSON.parse(raw)}catch{return json({error:'Invalid payload.'},400)}
  const eventId=providerEventId(provider,payload,raw);
  const inserted=await query('insert into webhook_event (provider,provider_event_id,signature_valid,payload_sha256) values ($1,$2,true,$3) on conflict (provider,provider_event_id) do nothing returning id',[provider,eventId,sha256(raw)]);
  if(!inserted.rows[0])return json({ok:true,duplicate:true});
  const state=paymentState(provider,payload),ref=reference(provider,payload);
  if(state&&ref){
    await tx(async c=>{
      const pi=await c.query('select * from payment_intent where provider=$1 and provider_reference=$2 for update',[provider,String(ref)]);
      for(const row of pi.rows){
        await c.query('update payment_intent set state=$2,updated_at=now() where id=$1',[row.id,state]);
        if(row.order_id){await c.query('update app_order set state=$2,updated_at=now() where id=$1',[row.order_id,state==='paid'?'paid':state==='failed'?'payment_failed':state]);if(state==='paid')await commitOrderInventory(c,row.order_id)}
        const contribution=await c.query('update contribution set state=$2,updated_at=now() where payment_intent_id=$1 returning id',[row.id,state==='paid'?'paid':state==='failed'?'failed':state]);
        if(state==='paid')await postLedger(c,row);
        if(contribution.rows[0]&&state==='paid')await c.query("update contribution_pool set status=case when target_minor is not null and (select coalesce(sum(amount_minor),0) from contribution where pool_id=contribution_pool.id and state='paid')>=target_minor then 'funded' else status end where id=(select pool_id from contribution where id=$1)",[contribution.rows[0].id]);
      }
      await c.query("update webhook_event set state='processed',processed_at=now() where provider=$1 and provider_event_id=$2",[provider,eventId]);
    });
  }else await query("update webhook_event set state='processed',processed_at=now() where provider=$1 and provider_event_id=$2",[provider,eventId]);
  return json({ok:true});
}
