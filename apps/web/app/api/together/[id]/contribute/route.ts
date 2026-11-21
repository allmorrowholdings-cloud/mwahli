import { z } from 'zod';
import { auth, json, safeBody } from '@/lib/http';
import { query, tx } from '@/lib/db';
import { initializePayment } from '@/lib/payments';
import { audit } from '@/lib/audit';

const schema = z.object({ amountMinor: z.number().int().positive().max(100_000_000), provider: z.enum(['paystack','flutterwave','stripe','momo']), privateAmount: z.boolean().default(true) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await auth(); if ('response' in a) return a.response;
  const { id } = await params;
  const p = schema.safeParse(await safeBody(req).catch(() => null)); if (!p.success) return json({ error: 'Check the contribution amount and payment provider.' }, 400);
  const roomR = await query<any>(`select g.id,g.title,g.organizer_user_id,g.contribution_pool_id,c.currency,c.status from group_room g join contribution_pool c on c.id=g.contribution_pool_id
    where g.id=$1 and (g.organizer_user_id=$2 or exists(select 1 from group_room_member gm where gm.room_id=g.id and gm.user_id=$2))`, [id, a.session.sub]);
  const room = roomR.rows[0]; if (!room) return json({ error: 'Join this private room before contributing.' }, 403);
  if (room.status !== 'open') return json({ error: 'This contribution pool is closed.' }, 409);
  const u = await query<{email:string}>('select email from app_user where id=$1', [a.session.sub]);
  const contributionId = crypto.randomUUID(); const paymentIntentId = crypto.randomUUID();
  const reference = `group-${id.slice(0,8)}-${Date.now()}`;
  try {
    const pay = await initializePayment(p.data.provider, { amountMinor:p.data.amountMinor, currency:room.currency, email:u.rows[0]?.email || '', reference, callbackUrl:process.env.APP_URL, metadata:{roomId:id,contributionId} });
    await tx(async c => {
      await c.query("insert into contribution (id,pool_id,contributor_user_id,amount_minor,private_amount,state) values ($1,$2,$3,$4,$5,'pending')", [contributionId, room.contribution_pool_id, a.session.sub, p.data.amountMinor, p.data.privateAmount]);
      await c.query("insert into payment_intent (id,order_id,provider,provider_reference,amount_minor,currency,state) values ($1,null,$2,$3,$4,$5,'pending')", [paymentIntentId, p.data.provider, pay.providerReference, p.data.amountMinor, room.currency]);
      await c.query('update contribution set payment_intent_id=$2 where id=$1', [contributionId,paymentIntentId]);
      await c.query("insert into scheduled_job (job_type,run_at,dedupe_key,payload_ciphertext) values ('payment.reconcile',now()+interval '2 minutes',$1,null) on conflict (dedupe_key) do nothing", [`payment:${paymentIntentId}`]);
    });
    await audit(a.session.sub,'group.contribute','group_room',id,{contributionId,amountMinor:p.data.amountMinor,currency:room.currency},'financial',req);
    return json({ contributionId, paymentIntentId, checkoutUrl:pay.checkoutUrl, providerReference:pay.providerReference },201);
  } catch (e) { return json({ error:e instanceof Error?e.message:'Contribution payment could not start.' },502); }
}
