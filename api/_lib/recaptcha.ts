function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function verifyRecaptchaToken(input: { token: string; remoteip?: string }) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    // Allow OTP to function if reCAPTCHA is not configured yet.
    return { ok: true, skipped: true as const };
  }

  const token = String(input.token || '').trim();
  if (!token) return { ok: false, error: 'missing_token' as const };

  const url = 'https://www.google.com/recaptcha/api/siteverify';
  const form = new URLSearchParams();
  form.set('secret', requireEnv('RECAPTCHA_SECRET_KEY'));
  form.set('response', token);
  if (input.remoteip) form.set('remoteip', input.remoteip);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  const body = (await res.json().catch(() => null)) as any;
  if (!res.ok) return { ok: false, error: 'verify_failed' as const, detail: String(body || '').slice(0, 120) };
  if (!body?.success) return { ok: false, error: 'invalid' as const, codes: body?.['error-codes'] };

  return { ok: true, skipped: false as const };
}

