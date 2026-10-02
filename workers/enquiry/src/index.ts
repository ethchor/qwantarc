/**
 * Contact form endpoint for qwantarc.com: POST /api/enquiry with JSON
 * { topic, name, email, company?, message, website (honeypot), elapsed (ms on page) }
 * and the enquiry is mailed to the verified Email Routing destination, with Reply-To set to the sender.
 */
import { EmailMessage } from 'cloudflare:email';

interface Env {
  MAILER: { send(message: EmailMessage): Promise<void> };
  FROM_ADDRESS: string;
  TO_ADDRESS: string;
  ALLOWED_ORIGINS: string;
}

const TOPICS = ['Partnership', 'Product', 'Careers', 'Press', 'Something else'];
const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;

const json = (body: unknown, status: number, origin?: string) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}),
    },
  });

/** One line, no control characters: safe to put in a header. */
const oneLine = (value: unknown, max: number) =>
  String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .trim()
    .slice(0, max);

const b64 = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};
const encodeHeader = (text: string) => `=?UTF-8?B?${b64(text)}?=`;
const wrap76 = (text: string) => text.replace(/.{1,76}/g, '$&\r\n');

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('origin') ?? '';
    const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
    const okOrigin = allowed.includes(origin) ? origin : undefined;

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: okOrigin
          ? {
              'access-control-allow-origin': okOrigin,
              'access-control-allow-methods': 'POST',
              'access-control-allow-headers': 'content-type',
              vary: 'Origin',
            }
          : {},
      });
    }
    if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405, okOrigin);
    if (!okOrigin) return json({ ok: false, error: 'Not allowed from this site.' }, 403);

    let data: Record<string, unknown>;
    try {
      const raw = await request.text();
      if (raw.length > 20_000) return json({ ok: false, error: 'That message is too long.' }, 413, okOrigin);
      data = JSON.parse(raw);
    } catch {
      return json({ ok: false, error: 'Couldn’t read the form.' }, 400, okOrigin);
    }

    // Bots fill the hidden field or submit instantly; pretend it worked so they move on.
    if (oneLine(data.website, 200) || Number(data.elapsed) < 2500) return json({ ok: true }, 200, okOrigin);

    const topic = TOPICS.includes(String(data.topic)) ? String(data.topic) : 'Something else';
    const name = oneLine(data.name, 120);
    const email = oneLine(data.email, 200);
    const company = oneLine(data.company, 160);
    const message = String(data.message ?? '').replace(/\r\n?/g, '\n').trim().slice(0, 8000);

    if (!name || !EMAIL_RE.test(email) || message.length < 2) {
      return json({ ok: false, error: 'Check your name, email and message, then send again.' }, 422, okOrigin);
    }

    const subject = `${topic} enquiry from ${name}${company ? `, ${company}` : ''}`;
    const body = [
      message,
      '',
      '--',
      `${name}${company ? `, ${company}` : ''}`,
      email,
      `Topic: ${topic}`,
      `Sent from qwantarc.com/contact`,
    ].join('\r\n');
    const domain = env.FROM_ADDRESS.split('@')[1];
    const raw = [
      `From: ${encodeHeader('Qwantarc Enquiries')} <${env.FROM_ADDRESS}>`,
      `To: <${env.TO_ADDRESS}>`,
      `Reply-To: ${encodeHeader(name)} <${email}>`,
      `Subject: ${encodeHeader(subject)}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@${domain}>`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      wrap76(b64(body)),
    ].join('\r\n');

    try {
      await env.MAILER.send(new EmailMessage(env.FROM_ADDRESS, env.TO_ADDRESS, raw));
    } catch (err) {
      console.error('send failed', err);
      return json({ ok: false, error: 'Couldn’t send right now. Try again in a minute.' }, 502, okOrigin);
    }
    return json({ ok: true }, 200, okOrigin);
  },
};
