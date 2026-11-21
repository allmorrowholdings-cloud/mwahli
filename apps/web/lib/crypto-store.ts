import crypto from 'node:crypto';

function key() {
  const raw = process.env.APP_DATA_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('APP_DATA_ENCRYPTION_KEY is required in production');
    }
    return crypto.createHash('sha256').update(process.env.SESSION_SECRET || 'mwahli-dev-data-key').digest();
  }
  const b = Buffer.from(raw, 'base64');
  if (b.length !== 32) throw new Error('APP_DATA_ENCRYPTION_KEY must be a base64 encoded 32-byte key');
  return b;
}

export function encryptJson(value: unknown, context = 'mwahli') {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(context));
  const data = Buffer.from(JSON.stringify(value), 'utf8');
  const ct = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([1]), iv, tag, ct]);
}

export function decryptJson<T = unknown>(blob: Buffer | Uint8Array | null | undefined, context = 'mwahli'): T | null {
  if (!blob) return null;
  const b = Buffer.from(blob);
  if (b[0] !== 1 || b.length < 30) return null;
  const iv = b.subarray(1, 13);
  const tag = b.subarray(13, 29);
  const ct = b.subarray(29);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  return JSON.parse(out) as T;
}
