import crypto from 'node:crypto';
import pg from 'pg';
const { Pool } = pg;

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'false' ? false : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined)
});

function dataKey() {
  const raw = process.env.APP_DATA_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('APP_DATA_ENCRYPTION_KEY is required');
  const b = Buffer.from(raw, 'base64');
  if (b.length !== 32) throw new Error('APP_DATA_ENCRYPTION_KEY must decode to 32 bytes');
  return b;
}
function decrypt(blob, context) {
  if (!blob) return null;
  const b = Buffer.from(blob);
  if (b[0] !== 1) return JSON.parse(b.toString('utf8'));
  const iv = b.subarray(1, 13), tag = b.subarray(13, 29), ct = b.subarray(29);
  const d = crypto.createDecipheriv('aes-256-gcm', dataKey(), iv);
  d.setAAD(Buffer.from(context)); d.setAuthTag(tag);
  return JSON.parse(Buffer.concat([d.update(ct), d.final()]).toString('utf8'));
}

async function notify(input) {
  const idempotencyKey = input.idempotencyKey || `mwahli-${crypto.createHash('sha256').update(JSON.stringify([input.channel,input.to,input.template,input.variables])).digest('hex').slice(0,32)}`;
  if (input.channel === 'email' && String(process.env.EMAIL_PROVIDER || '').toLowerCase() === 'resend' && process.env.EMAIL_API_KEY) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { authorization: `Bearer ${process.env.EMAIL_API_KEY}`, 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || 'MWAHLI <hello@mwahli.app>', to: [input.to], subject: input.variables?.subject || 'A MWAHLI moment is ready', html: input.variables?.html || input.variables?.body || input.template })
    });
    if (!r.ok) throw new Error(`email provider ${r.status}`); return r.json();
  }
  if (!process.env.NOTIFICATION_GATEWAY_URL) throw new Error('notification gateway not configured');
  const r = await fetch(process.env.NOTIFICATION_GATEWAY_URL, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.NOTIFICATION_GATEWAY_TOKEN || ''}`, 'idempotency-key': idempotencyKey }, body: JSON.stringify({...input,idempotencyKey}) });
  if (!r.ok) throw new Error(`notification provider ${r.status}`); return r.json().catch(() => ({}));
}
async function scan(storageKey) {
  const url = process.env.MEDIA_SCAN_URL || process.env.MALWARE_SCANNER_URL;
  if (!url) throw new Error('media scanner not configured');
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.MEDIA_SCAN_TOKEN || process.env.MEDIA_MODERATION_API_KEY || ''}` }, body: JSON.stringify({ bucket: process.env.OBJECT_STORAGE_BUCKET, key: storageKey }) });
  if (!r.ok) throw new Error(`media scanner ${r.status}`); return r.json();
}
async function verifyPayment(provider, reference) {
  if (provider === 'paystack') {
    if (!process.env.PAYSTACK_SECRET_KEY) throw new Error('Paystack not configured');
    const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } });
    const d = await r.json(); if (!r.ok) throw new Error(`Paystack verify ${r.status}`);
    return String(d?.data?.status || '').toLowerCase() === 'success' ? 'paid' : 'pending';
  }
  if (provider === 'flutterwave') {
    if (!process.env.FLUTTERWAVE_SECRET_KEY) throw new Error('Flutterwave not configured');
    const r = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, { headers: { authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` } });
    const d = await r.json(); if (!r.ok) throw new Error(`Flutterwave verify ${r.status}`);
    const s = String(d?.data?.status || '').toLowerCase(); return s === 'successful' ? 'paid' : s === 'failed' ? 'failed' : 'pending';
  }
  if (provider === 'stripe') {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe not configured');
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(reference)}`, { headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` } });
    const d = await r.json(); if (!r.ok) throw new Error(`Stripe verify ${r.status}`);
    return d?.payment_status === 'paid' ? 'paid' : d?.status === 'expired' ? 'failed' : 'pending';
  }
  if (provider === 'momo') {
    const base=process.env.MOMO_API_URL?.replace(/\/$/,''); if(!base||!process.env.MOMO_API_KEY) throw new Error('Mobile money provider not configured');
    const r=await fetch(`${base}/payments/${encodeURIComponent(reference)}`,{headers:{authorization:`Bearer ${process.env.MOMO_API_KEY}`}});
    const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(`MoMo verify ${r.status}`);
    const s=String(d?.status||d?.data?.status||'').toLowerCase(); return ['paid','successful','success'].includes(s)?'paid':['failed','cancelled'].includes(s)?'failed':'pending';
  }
  return 'pending';
}
async function refundPayment(provider, reference, amountMinor) {
  if (provider === 'paystack') {
    if (!process.env.PAYSTACK_SECRET_KEY) throw new Error('Paystack not configured');
    const r=await fetch('https://api.paystack.co/refund',{method:'POST',headers:{authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY}`,'content-type':'application/json','idempotency-key':`mwahli-refund-${reference}-${amountMinor}`},body:JSON.stringify({transaction:reference,amount:amountMinor})});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`Paystack refund ${r.status}`);return String(d?.data?.id||d?.data?.transaction?.reference||reference);
  }
  if (provider === 'flutterwave') {
    if (!process.env.FLUTTERWAVE_SECRET_KEY) throw new Error('Flutterwave not configured');
    const v=await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,{headers:{authorization:`Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`}});const vd=await v.json().catch(()=>({}));if(!v.ok||!vd?.data?.id)throw new Error(`Flutterwave refund lookup ${v.status}`);
    const r=await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(String(vd.data.id))}/refund`,{method:'POST',headers:{authorization:`Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,'content-type':'application/json'},body:JSON.stringify({amount:amountMinor/100})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`Flutterwave refund ${r.status}`);return String(d?.data?.id||vd.data.id);
  }
  if (provider === 'stripe') {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe not configured');
    let paymentIntent=reference;if(reference.startsWith('cs_')){const s=await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(reference)}`,{headers:{authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`}});const sd=await s.json().catch(()=>({}));if(!s.ok||!sd?.payment_intent)throw new Error(`Stripe refund lookup ${s.status}`);paymentIntent=String(sd.payment_intent)}
    const body=new URLSearchParams({payment_intent:paymentIntent,amount:String(amountMinor)});const r=await fetch('https://api.stripe.com/v1/refunds',{method:'POST',headers:{authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`,'content-type':'application/x-www-form-urlencoded','idempotency-key':`mwahli-refund-${reference}-${amountMinor}`},body});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`Stripe refund ${r.status}`);return String(d?.id||paymentIntent);
  }
  if (provider === 'momo') {
    const base=process.env.MOMO_API_URL?.replace(/\/$/,''); if(!base||!process.env.MOMO_API_KEY) throw new Error('Mobile money provider not configured');
    const r=await fetch(`${base}/payments/${encodeURIComponent(reference)}/refund`,{method:'POST',headers:{authorization:`Bearer ${process.env.MOMO_API_KEY}`,'content-type':'application/json','idempotency-key':`mwahli-refund-${reference}-${amountMinor}`},body:JSON.stringify({amountMinor})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`MoMo refund ${r.status}`);return String(d?.reference||d?.id||reference);
  }
  throw new Error('unsupported refund provider');
}
async function refreshDelivery(reference) {
  const base = process.env.LOGISTICS_API_URL?.replace(/\/$/, '');
  const token = process.env.LOGISTICS_API_TOKEN || process.env.LOGISTICS_API_KEY || '';
  if (!base) throw new Error('logistics provider not configured');
  const r = await fetch(`${base}/deliveries/${encodeURIComponent(reference)}`, { headers: { authorization: `Bearer ${token}` } });
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(`logistics status ${r.status}`);
  return d;
}
function deliveryState(value) {
  const s = String(value || '').toLowerCase();
  if (['planned','awaiting_recipient','ready','dispatched','delivered','failed','cancelled'].includes(s)) return s;
  if (['picked_up','in_transit','out_for_delivery'].includes(s)) return 'dispatched';
  if (['complete','completed','success'].includes(s)) return 'delivered';
  return 'ready';
}

async function commitOrderInventory(client, orderId) {
  const rr = await client.query(`select ir.id,ir.variant_id,ir.quantity,ir.state,v.inventory from inventory_reservation ir join variant v on v.id=ir.variant_id where ir.order_id=$1 order by ir.created_at for update of ir,v`, [orderId]);
  if (!rr.rows.length) return true;
  const shortage = rr.rows.find(x => x.state !== 'committed' && x.inventory !== null && Number(x.inventory) < Number(x.quantity));
  if (shortage) {
    await client.query("update inventory_reservation set state='released',released_at=coalesce(released_at,now()) where order_id=$1 and state<>'committed'", [orderId]);
    await client.query("update app_order set state='paid_stock_exception',updated_at=now() where id=$1", [orderId]);
    await client.query("insert into risk_case (risk_type,severity,state) values ('paid_inventory_shortfall',5,'open')");
    return false;
  }
  for (const x of rr.rows) {
    if (x.state === 'committed') continue;
    if (x.inventory !== null) await client.query('update variant set inventory=inventory-$2 where id=$1', [x.variant_id, Number(x.quantity)]);
    await client.query("update inventory_reservation set state='committed',committed_at=now() where id=$1", [x.id]);
  }
  return true;
}

async function recordPaid(client, pi) {
  const updated = await client.query("update payment_intent set state='paid',updated_at=now() where id=$1 and state<>'paid' returning id,order_id,amount_minor,currency", [pi.id]);
  const row = updated.rows[0]; if (!row) return;
  if (row.order_id) { await client.query("update app_order set state='paid',updated_at=now() where id=$1", [row.order_id]); await commitOrderInventory(client, row.order_id); }
  const contribution = await client.query("update contribution set state='paid',updated_at=now() where payment_intent_id=$1 returning id,pool_id", [row.id]);
  if (contribution.rows[0]) await client.query("update contribution_pool set status=case when target_minor is not null and (select coalesce(sum(amount_minor),0) from contribution where pool_id=contribution_pool.id and state='paid')>=target_minor then 'funded' else status end where id=$1", [contribution.rows[0].pool_id]);
  const existing=await client.query("select 1 from ledger_entry where reference_type='payment_intent' and reference_id=$1 limit 1",[row.id]);if(existing.rows[0])return;
  const txid = crypto.randomUUID();
  const cash = await client.query("insert into ledger_account (owner_type,owner_id,currency,account_type) values ('platform',null,$1,'cash') on conflict (owner_type,owner_id,currency,account_type) do update set currency=excluded.currency returning id", [row.currency]);
  const liability = await client.query("insert into ledger_account (owner_type,owner_id,currency,account_type) values ('platform',null,$1,'customer_funds') on conflict (owner_type,owner_id,currency,account_type) do update set currency=excluded.currency returning id", [row.currency]);
  await client.query("insert into ledger_entry (transaction_id,account_id,amount_minor,currency,entry_type,reference_type,reference_id) values ($1,$2,$3,$4,'debit','payment_intent',$5),($1,$6,$7,$4,'credit','payment_intent',$5)", [txid, cash.rows[0].id, Number(row.amount_minor), row.currency, row.id, liability.rows[0].id, -Number(row.amount_minor)]);
}
async function recordRefundLedger(client, refund, payment) {
  const existing=await client.query("select 1 from ledger_entry where reference_type='refund' and reference_id=$1 limit 1",[refund.id]);if(existing.rows[0])return;
  const txid=crypto.randomUUID();
  const cash=await client.query("insert into ledger_account (owner_type,owner_id,currency,account_type) values ('platform',null,$1,'cash') on conflict (owner_type,owner_id,currency,account_type) do update set currency=excluded.currency returning id",[payment.currency]);
  const liability=await client.query("insert into ledger_account (owner_type,owner_id,currency,account_type) values ('platform',null,$1,'customer_funds') on conflict (owner_type,owner_id,currency,account_type) do update set currency=excluded.currency returning id",[payment.currency]);
  await client.query("insert into ledger_entry (transaction_id,account_id,amount_minor,currency,entry_type,reference_type,reference_id) values ($1,$2,$3,$4,'debit','refund',$5),($1,$6,$7,$4,'credit','refund',$5)",[txid,liability.rows[0].id,Number(refund.amount_minor),payment.currency,refund.id,cash.rows[0].id,-Number(refund.amount_minor)]);
}

async function processJob(client, job) {
  const suffix = String(job.dedupe_key || '').split(':').slice(1).join(':');
  const context = job.job_type === 'capsule.deliver' ? `job:capsule:${suffix}` : job.job_type === 'media.scan' ? `job:media:${suffix}` : `job:${job.id}`;
  const p = decrypt(job.payload_ciphertext, context) || {};
  if (job.job_type === 'capsule.deliver') {
    const id = p.capsuleId || suffix;
    const c = await client.query("select c.id,c.owner_user_id,c.experience_id,c.unlock_at,c.status,e.share_id,e.title,u.email from capsule c join studio_experience e on e.id=c.experience_id join app_user u on u.id=c.owner_user_id where c.id=$1 for update", [id]);
    const row = c.rows[0]; if (!row || row.status !== 'scheduled') return;
    await notify({ channel: 'email', to: row.email, template: 'capsule-ready', idempotencyKey:`capsule-${id}`, variables: { subject: 'Your MWAHLI capsule is ready', title: row.title, url: `${process.env.APP_URL}/experience/${row.share_id}`, html: `<p>Your MWAHLI capsule <strong>${row.title}</strong> is ready.</p><p><a href="${process.env.APP_URL}/experience/${row.share_id}">Open it privately</a></p>` } });
    await client.query("update capsule set status='delivered',delivered_at=now() where id=$1", [id]); return;
  }
  if (job.job_type === 'media.scan') {
    const id = p.mediaId || suffix, storageKey = p.storageKey;
    const result = await scan(storageKey);
    const state = String(result.state || 'pending').toLowerCase();
    await client.query("update media_asset set malware_state=$2,moderation_state=case when $2='clean' then 'approved' else 'blocked' end where id=$1", [id, state]); return;
  }
  if (job.job_type === 'notification.send') { await notify({...p,idempotencyKey:p.idempotencyKey||`job-${job.id}`}); return; }
  if (job.job_type === 'payment.reconcile') {
    const pi = await client.query('select * from payment_intent where id=$1 for update', [p.paymentIntentId || suffix]);
    const row = pi.rows[0]; if (!row || ['paid','refunded'].includes(row.state)) return;
    const state = await verifyPayment(row.provider, row.provider_reference);
    if (state === 'paid') await recordPaid(client, row);
    else if (state === 'failed') { await client.query("update payment_intent set state='failed',updated_at=now() where id=$1", [row.id]); await client.query("update contribution set state='failed',updated_at=now() where payment_intent_id=$1",[row.id]); }
    else throw new Error('payment still pending');
    return;
  }
  if (job.job_type === 'refund.process') {
    const r=await client.query(`select r.*,p.provider,p.provider_reference,p.amount_minor payment_amount_minor,p.currency,p.order_id from refund r join payment_intent p on p.id=r.payment_intent_id where r.id=$1 for update`,[p.refundId||suffix]);
    const refund=r.rows[0];if(!refund||refund.state==='completed')return;
    await client.query("update refund set state='processing' where id=$1",[refund.id]);
    const providerReference=await refundPayment(refund.provider,refund.provider_reference,Number(refund.amount_minor));
    await client.query("update refund set state='completed',provider_reference=$2 where id=$1",[refund.id,providerReference]);
    const total=await client.query("select coalesce(sum(amount_minor),0)::bigint amount from refund where payment_intent_id=$1 and state='completed'",[refund.payment_intent_id]);
    const refunded=Number(total.rows[0]?.amount||0),full=refunded>=Number(refund.payment_amount_minor);
    await client.query("update payment_intent set state=$2,updated_at=now() where id=$1",[refund.payment_intent_id,full?'refunded':'partially_refunded']);
    if(refund.order_id)await client.query("update app_order set state=$2,updated_at=now() where id=$1",[refund.order_id,full?'refunded':'partially_refunded']);
    await recordRefundLedger(client,refund,{currency:refund.currency});return;
  }
  if (job.job_type === 'order.release_inventory') {
    const id = p.orderId || suffix;
    const o = await client.query('select state from app_order where id=$1 for update', [id]);
    const row = o.rows[0]; if (!row) return;
    if (!['paid','paid_stock_exception','fulfilled','delivered','refund_pending','refunded','partially_refunded'].includes(row.state)) {
      await client.query("update inventory_reservation set state='released',released_at=coalesce(released_at,now()) where order_id=$1 and state='reserved'", [id]);
      await client.query("update app_order set state=case when state in ('pending','payment_failed') then 'expired' else state end,updated_at=now() where id=$1", [id]);
    }
    return;
  }
  if (job.job_type === 'delivery.refresh') {
    const d = await client.query('select * from delivery where id=$1 for update', [p.deliveryId || suffix]);
    const row = d.rows[0]; if (!row || ['delivered','cancelled'].includes(row.state)) return;
    if (!row.provider_reference) throw new Error('delivery provider reference missing');
    const result = await refreshDelivery(row.provider_reference); const state = deliveryState(result.state || result.status);
    await client.query('update delivery set state=$2,updated_at=now(),last_provider_payload=$3,dispatched_at=case when $2=\'dispatched\' then coalesce(dispatched_at,now()) else dispatched_at end,delivered_at=case when $2=\'delivered\' then coalesce(delivered_at,now()) else delivered_at end where id=$1', [row.id, state, result]);
    await client.query('insert into delivery_event (delivery_id,event_type,public_payload) values ($1,$2,$3)', [row.id, state, { state, eta: result.eta || null }]);
    if (!['delivered','failed','cancelled'].includes(state)) throw new Error('delivery still in progress');
    return;
  }
  throw new Error(`unknown job type ${job.job_type}`);
}

async function claimJobs() {
  const client=await pool.connect();
  try{
    await client.query('begin');
    await client.query("update scheduled_job set state='failed',last_error=coalesce(last_error,'worker lock expired'),run_at=now(),locked_at=null where state='running' and locked_at<now()-interval '15 minutes'");
    const r=await client.query(`with due as (select id from scheduled_job where state in ('queued','failed') and run_at<=now() and attempts<max_attempts order by run_at for update skip locked limit 10)
      update scheduled_job j set state='running',locked_at=now(),attempts=attempts+1 from due where j.id=due.id returning j.*`);
    await client.query('commit');return r.rows;
  }catch(e){await client.query('rollback');throw e}finally{client.release()}
}
async function runJob(job){
  const client=await pool.connect();
  try{
    await client.query('begin');
    await processJob(client,job);
    await client.query("update scheduled_job set state='completed',completed_at=now(),locked_at=null,last_error=null where id=$1",[job.id]);
    await client.query('commit');
  }catch(e){
    await client.query('rollback').catch(()=>{});
    const delay=Math.min(3600,Math.pow(2,Math.min(Number(job.attempts||1),10))*30);
    await pool.query("update scheduled_job set state='failed',locked_at=null,last_error=$2,run_at=now()+($3||' seconds')::interval where id=$1",[job.id,String(e?.message||e).slice(0,1000),String(delay)]).catch(console.error);
  }finally{client.release()}
}
async function tick(){
  try{const jobs=await claimJobs();for(const job of jobs)await runJob(job)}catch(e){console.error('worker tick failed',e)}
}

const interval = Math.max(5000, Number(process.env.WORKER_POLL_MS || 10000));
console.log('MWAHLI worker started', { interval });
while (true) { await tick(); await new Promise(r => setTimeout(r, interval)); }
