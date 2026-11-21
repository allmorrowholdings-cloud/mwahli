import { z } from 'zod';
import { auth, json, safeBody } from '@/lib/http';
import { query } from '@/lib/db';
import { presignUpload } from '@/lib/storage';
import { randomToken } from '@/lib/security';

const allowed = ['image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','audio/wav','video/mp4','application/pdf'];
const schema = z.object({ contentType: z.string(), bytes: z.number().int().positive(), sha256: z.string().regex(/^[a-f0-9]{64}$/i).optional() });

export async function POST(req: Request) {
  const a = await auth(); if ('response' in a) return a.response;
  const p = schema.safeParse(await safeBody(req).catch(() => null));
  if (!p.success || !allowed.includes(p.data.contentType)) return json({ error: 'Unsupported media.' }, 400);
  try {
    const id = crypto.randomUUID();
    const ext = p.data.contentType.split('/')[1]?.replace('jpeg','jpg') || 'bin';
    const key = `private/${a.session.sub}/${id}-${randomToken(6)}.${ext}`;
    const uploadUrl = await presignUpload(key, p.data.contentType, p.data.bytes);
    await query('insert into media_asset (id,owner_user_id,storage_key,content_type,bytes,sha256,malware_state,moderation_state) values ($1,$2,$3,$4,$5,$6,\'uploading\',\'pending\')', [id, a.session.sub, key, p.data.contentType, p.data.bytes, p.data.sha256 || null]);
    return json({ id, uploadUrl, expiresIn: 300, completeUrl: `/api/media/${id}/complete` }, 201);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Upload could not start.' }, 503);
  }
}
