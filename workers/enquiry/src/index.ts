/**
 * Enquiry endpoint for qwantarc.com and farms.qwantarc.com: POST /api/enquiry with JSON.
 *
 * qwantarc.com/contact sends { topic, name, email, company?, message, website (honeypot), elapsed (ms on page) }.
 * farms.qwantarc.com sends { source: 'farms', topic, plant?, name, phone?, email?, message?, website, elapsed },
 * where a phone number is as good as an email for replying, and naming a plant is enough of a message.
 * ethchor.qwantarc.com, Vimu's portfolio, sends { source: 'ethchor', topic, name, email, message, website, elapsed }.
 *
 * Each enquiry is mailed to the verified Email Routing destination, with Reply-To set to the sender's email.
 */
import { EmailMessage } from 'cloudflare:email';

interface Env {
  MAILER: { send(message: EmailMessage): Promise<void> };
  FROM_ADDRESS: string;
  TO_ADDRESS: string;
  ALLOWED_ORIGINS: string;
}

const TOPICS = ['Partnership', 'Product', 'Careers', 'Press', 'Something else'];
const FARM_TOPICS = ['Buying a plant', 'Help choosing', 'A bulk order', 'Something else'];
const PORTFOLIO_TOPICS = ['A project', 'Hiring', 'Mentorship', 'Just saying hello'];
const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;
const PHONE_RE = /^\+?[\d\s().-]{7,30}$/;

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

interface Letter {
  fromName: string;
  subject: string;
  body: string[];
  replyTo?: { name: string; email: string };
}

/** Builds the email for an enquiry, or returns the error to show the sender. */
function compose(data: Record<string, unknown>): Letter | string {
  const name = oneLine(data.name, 120);
  const email = oneLine(data.email, 200);
  const message = String(data.message ?? '').replace(/\r\n?/g, '\n').trim().slice(0, 8000);

  if (data.source === 'farms') {
    const topic = FARM_TOPICS.includes(String(data.topic)) ? String(data.topic) : 'Something else';
    const plant = oneLine(data.plant, 80);
    const phone = oneLine(data.phone, 40);
    const phoneOk = PHONE_RE.test(phone) && phone.replace(/\D/g, '').length >= 7;
    const emailOk = EMAIL_RE.test(email);
    if (!name || (!phoneOk && !emailOk) || (message.length < 2 && !plant)) {
      return 'Check your name, a phone number or email, and your message, then send again.';
    }
    return {
      fromName: 'Qwantarc Farms',
      subject: `Plant enquiry from ${name}${plant ? `: ${plant}` : ''}`,
      body: [
        message || `Asking about the ${plant}.`,
        '',
        '--',
        name,
        ...(phoneOk ? [`Phone: ${phone}`] : []),
        ...(emailOk ? [email] : []),
        `Topic: ${topic}`,
        ...(plant ? [`Plant: ${plant}`] : []),
        'Sent from farms.qwantarc.com',
      ],
      replyTo: emailOk ? { name, email } : undefined,
    };
  }

  if (data.source === 'ethchor') {
    const topic = PORTFOLIO_TOPICS.includes(String(data.topic)) ? String(data.topic) : 'Just saying hello';
    if (!name || !EMAIL_RE.test(email) || message.length < 2) {
      return 'Check your name, email and message, then send again.';
    }
    return {
      fromName: 'Vimu Kale, portfolio',
      subject: `${topic}: a message from ${name}`,
      body: [message, '', '--', name, email, `Topic: ${topic}`, 'Sent from ethchor.qwantarc.com'],
      replyTo: { name, email },
    };
  }

  const topic = TOPICS.includes(String(data.topic)) ? String(data.topic) : 'Something else';
  const company = oneLine(data.company, 160);
  if (!name || !EMAIL_RE.test(email) || message.length < 2) {
    return 'Check your name, email and message, then send again.';
  }
  return {
    fromName: 'Qwantarc Enquiries',
    subject: `${topic} enquiry from ${name}${company ? `, ${company}` : ''}`,
    body: [message, '', '--', `${name}${company ? `, ${company}` : ''}`, email, `Topic: ${topic}`, `Sent from qwantarc.com/contact`],
    replyTo: { name, email },
  };
}

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

    const letter = compose(data);
    if (typeof letter === 'string') return json({ ok: false, error: letter }, 422, okOrigin);

    const domain = env.FROM_ADDRESS.split('@')[1];
    const raw = [
      `From: ${encodeHeader(letter.fromName)} <${env.FROM_ADDRESS}>`,
      `To: <${env.TO_ADDRESS}>`,
      ...(letter.replyTo ? [`Reply-To: ${encodeHeader(letter.replyTo.name)} <${letter.replyTo.email}>`] : []),
      `Subject: ${encodeHeader(letter.subject)}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@${domain}>`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      wrap76(b64(letter.body.join('\r\n'))),
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
