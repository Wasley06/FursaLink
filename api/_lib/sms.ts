function hasEnv(name: string) {
  return Boolean(process.env[name] && String(process.env[name]).trim());
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function sendTwilioSms(input: { to: string; body: string }) {
  const sid = requireEnv('TWILIO_ACCOUNT_SID');
  const token = requireEnv('TWILIO_AUTH_TOKEN');
  const from = requireEnv('TWILIO_FROM_NUMBER');

  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`;
  const form = new URLSearchParams();
  form.set('To', input.to);
  form.set('From', from);
  form.set('Body', input.body);

  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Basic ${auth}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  const body = await res.text();
  if (!res.ok) throw new Error(`twilio_failed:${res.status}:${body.slice(0, 200)}`);
}

async function sendVonageSms(input: { to: string; body: string }) {
  const apiKey = requireEnv('VONAGE_API_KEY');
  const apiSecret = requireEnv('VONAGE_API_SECRET');
  const from = requireEnv('VONAGE_FROM');

  const res = await fetch('https://rest.nexmo.com/sms/json', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      api_secret: apiSecret,
      to: input.to,
      from,
      text: input.body,
      type: 'text',
    }),
  });

  const body = (await res.json().catch(() => null)) as any;
  if (!res.ok) throw new Error(`vonage_failed:${res.status}:${JSON.stringify(body || {}).slice(0, 200)}`);

  const msg = body?.messages?.[0];
  const status = String(msg?.status ?? '');
  if (status !== '0') {
    const errText = String(msg?.['error-text'] || msg?.error_text || 'unknown_error');
    throw new Error(`vonage_rejected:${status}:${errText}`.slice(0, 240));
  }
}

export async function sendSms(input: { to: string; body: string }) {
  const provider = String(process.env.SMS_PROVIDER || '').trim().toLowerCase();

  if (provider === 'vonage') return sendVonageSms(input);
  if (provider === 'twilio') return sendTwilioSms(input);

  // Auto-pick based on configured env vars.
  if (hasEnv('VONAGE_API_KEY') && hasEnv('VONAGE_API_SECRET') && hasEnv('VONAGE_FROM')) return sendVonageSms(input);
  if (hasEnv('TWILIO_ACCOUNT_SID') && hasEnv('TWILIO_AUTH_TOKEN') && hasEnv('TWILIO_FROM_NUMBER')) return sendTwilioSms(input);

  throw new Error('sms_not_configured');
}

