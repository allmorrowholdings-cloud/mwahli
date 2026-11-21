const base = () => process.env.LOGISTICS_API_URL?.replace(/\/$/, '');
const token = () => process.env.LOGISTICS_API_TOKEN || process.env.LOGISTICS_API_KEY || '';

async function request(path: string, init: RequestInit = {}) {
  const url = base();
  if (!url) throw new Error('Logistics provider is not configured');
  const r = await fetch(`${url}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token()}`, ...(init.headers || {}) },
    cache: 'no-store'
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Logistics provider failed (${r.status})`);
  return data;
}

export async function quoteLocal(input: { city?: string; country?: string; deadline?: string; items?: unknown[] }) {
  return request('/quotes', { method: 'POST', body: JSON.stringify(input) });
}

export async function createDelivery(input: { orderId: string; deliveryToken?: string; items?: unknown[]; promise?: unknown; recipientAddress?: unknown; instructions?: unknown }) {
  return request('/deliveries', { method: 'POST', headers: { 'idempotency-key': `mwahli-order-${input.orderId}` }, body: JSON.stringify(input) });
}

export async function getDeliveryStatus(reference: string) {
  return request(`/deliveries/${encodeURIComponent(reference)}`);
}
