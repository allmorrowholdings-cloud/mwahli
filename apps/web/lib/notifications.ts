import { sendEmail } from './email';

type Input = { channel: 'email'|'sms'|'whatsapp'|'push'; to: string; template: string; variables: Record<string, unknown> };

export async function sendNotification(input: Input) {
  if (input.channel === 'email' && process.env.EMAIL_PROVIDER) {
    const subject = String(input.variables.subject || 'A MWAHLI moment is ready');
    const body = String(input.variables.html || input.variables.body || `MWAHLI notification: ${input.template}`);
    return sendEmail({ to: input.to, subject, html: body });
  }
  const url = process.env.NOTIFICATION_GATEWAY_URL;
  if (!url) throw new Error(`Notification gateway is not configured for ${input.channel}`);
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.NOTIFICATION_GATEWAY_TOKEN || ''}` },
    body: JSON.stringify(input)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Notification delivery failed (${r.status})`);
  return data;
}
