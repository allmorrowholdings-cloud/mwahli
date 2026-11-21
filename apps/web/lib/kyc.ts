export async function startKyc(input: { subjectType: 'creator' | 'merchant'; subjectId: string; country?: string }) {
  const base = process.env.KYC_PROVIDER_URL;
  const token = process.env.KYC_PROVIDER_TOKEN || process.env.KYC_PROVIDER_API_KEY;
  if (!base) throw new Error('KYC provider is not configured');
  const r = await fetch(`${base.replace(/\/$/, '')}/verifications`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token || ''}` },
    body: JSON.stringify(input),
    cache: 'no-store'
  });
  if (!r.ok) throw new Error(`KYC request failed (${r.status})`);
  return r.json();
}
