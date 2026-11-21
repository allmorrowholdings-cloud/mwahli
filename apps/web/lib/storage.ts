import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function client() {
  return new S3Client({
    region: process.env.OBJECT_STORAGE_REGION || 'auto',
    endpoint: process.env.OBJECT_STORAGE_ENDPOINT || undefined,
    forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE === 'true',
    credentials: process.env.OBJECT_STORAGE_ACCESS_KEY && process.env.OBJECT_STORAGE_SECRET_KEY
      ? { accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY, secretAccessKey: process.env.OBJECT_STORAGE_SECRET_KEY }
      : undefined
  });
}
function bucket() {
  if (!process.env.OBJECT_STORAGE_BUCKET) throw new Error('OBJECT_STORAGE_BUCKET is not configured');
  return process.env.OBJECT_STORAGE_BUCKET;
}

export async function presignUpload(key: string, contentType: string, bytes: number) {
  const max = Number(process.env.MEDIA_MAX_BYTES || 20_000_000);
  if (bytes > max) throw new Error('File too large');
  const kmsKey = process.env.OBJECT_STORAGE_KMS_KEY_ID || process.env.KMS_KEY_ID;
  return getSignedUrl(client(), new PutObjectCommand({
    Bucket: bucket(), Key: key, ContentType: contentType, Metadata: { visibility: 'private' },
    ServerSideEncryption: kmsKey ? 'aws:kms' : 'AES256',
    ...(kmsKey ? { SSEKMSKeyId: kmsKey } : {})
  }), { expiresIn: 300 });
}

export async function presignRead(key: string) {
  return getSignedUrl(client(), new GetObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn: 300 });
}

export async function verifyUploadedObject(key: string, expectedBytes?: number) {
  const out = await client().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
  if (expectedBytes && Number(out.ContentLength || 0) !== expectedBytes) throw new Error('Uploaded file size does not match');
  return { bytes: Number(out.ContentLength || 0), contentType: out.ContentType || null };
}

export async function scanMedia(storageKey: string) {
  const url = process.env.MEDIA_SCAN_URL || process.env.MALWARE_SCANNER_URL;
  if (!url) return process.env.NODE_ENV === 'production' ? { state: 'pending' } : { state: 'clean' };
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.MEDIA_SCAN_TOKEN || process.env.MEDIA_MODERATION_API_KEY || ''}` },
    body: JSON.stringify({ bucket: bucket(), key: storageKey })
  });
  if (!r.ok) throw new Error(`Media scanner failed (${r.status})`);
  return await r.json() as { state: string; reason?: string };
}
