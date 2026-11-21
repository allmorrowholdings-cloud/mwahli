import { z } from 'zod';
import { auth, json, safeBody } from '@/lib/http';
import { query, tx } from '@/lib/db';
import { initializePayment } from '@/lib/payments';
import { audit } from '@/lib/audit';

const schema = z.object({ provider: z.enum(['paystack','flutterwave','stripe','momo']) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await auth(); if ('response' in a) return a.response;
  const { id } = await params;
  const p = schema.safeParse(await safeBody(req).catch(() => null));
  if (!p.success) return json({ error: 'Choose a supported payment provider.' }, 400);
  const o = await query<any>('select o.*,u.email from app_order o join app_user u on u.id=o.user_id where o.id=$1 and o.user_id=$2', [id, a.session.sub]);
  const row = o.rows[0];
  if (!row) return json({ error: 'Order not found.' }, 404);
  if (row.state === 'paid' || row.state === 'paid_stock_exception') return json({ error: 'This order is already paid.' }, 409);
  if (row.state === 'expired' || (row.reservation_expires_at && new Date(row.reservation_expires_at).getTime() < Date.now())) return json({ error: 'This order reservation expired. Create the order again so stock can be checked.' }, 409);
  const active=await query('select 1 from payment_intent where order_id=$1 and state=\'pending\' and created_at>now()-interval \'15 minutes\' limit 1',[id]);
  if(active.rows[0])return json({error:'A payment attempt is already in progress for this order. Wait for its status to update before trying again.'},409);
  const reference = `${p.data.provider}-${row.order_number}-${Date.now()}`;
  try {
    const pay = await initializePayment(p.data.provider, { amountMinor: Number(row.total_minor), currency: row.currency, email: row.email, reference, callbackUrl: process.env.APP_URL, metadata: { orderId: id, orderNumber: row.order_number } });
    const paymentIntentId = crypto.randomUUID();
    await tx(async c => {
      await c.query("insert into payment_intent (id,order_id,provider,provider_reference,amount_minor,currency,state) values ($1,$2,$3,$4,$5,$6,'pending')", [paymentIntentId, id, p.data.provider, pay.providerReference, Number(row.total_minor), row.currency]);
      await c.query("insert into scheduled_job (job_type,run_at,dedupe_key,payload_ciphertext) values ('payment.reconcile',now()+interval '2 minutes',$1,null) on conflict (dedupe_key) do nothing", [`payment:${paymentIntentId}`]);
    });
    await audit(a.session.sub, 'payment.initialize', 'app_order', id, { provider: p.data.provider, paymentIntentId }, 'financial', req);
    return json({ ...pay, paymentIntentId });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Payment could not start.' }, 502);
  }
}
