import { auth, json } from '@/lib/http';
import { query, tx } from '@/lib/db';
import { verifyUploadedObject } from '@/lib/storage';
import { encryptJson } from '@/lib/crypto-store';
import { audit } from '@/lib/audit';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await auth(); if ('response' in a) return a.response;
  const { id } = await params;
  const r = await query<any>('select id,storage_key,bytes,content_type,malware_state from media_asset where id=$1 and owner_user_id=$2 and deleted_at is null', [id, a.session.sub]);
  const asset = r.rows[0]; if (!asset) return json({ error: 'Media asset not found.' }, 404);
  if (asset.malware_state === 'clean') return json({ ok: true, state: 'clean' });
  try {
    const head = await verifyUploadedObject(asset.storage_key, Number(asset.bytes));
    if(head.contentType&&head.contentType!==asset.content_type)throw new Error('Uploaded file type does not match the declared media type');
    await tx(async c => {
      await c.query("update media_asset set malware_state='pending' where id=$1", [id]);
      await c.query("insert into scheduled_job (job_type,run_at,dedupe_key,payload_ciphertext) values ('media.scan',now(),$1,$2) on conflict (dedupe_key) do update set state='queued',run_at=now(),last_error=null", [`media:${id}`, encryptJson({ mediaId: id, storageKey: asset.storage_key }, `job:media:${id}`)]);
    });
    await audit(a.session.sub, 'media.complete', 'media_asset', id, { bytes: head.bytes, contentType: head.contentType }, 'sensitive', req);
    return json({ ok: true, state: 'pending_scan' });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Upload could not be verified.' }, 409);
  }
}
