import 'dotenv/config';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function usernameToEmail(username, domain) {
  const slug = username
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '');
  return `${slug}@${domain}`;
}

async function fetchJson(url, init, timeoutMs = 15000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} ${res.statusText}`);
      err.details = json;
      throw err;
    }
    return json;
  } finally {
    clearTimeout(t);
  }
}

async function upsertFirestoreProfile({ projectId, databaseId, idToken, uid, profile }) {
  const base = `projects/${projectId}/databases/${databaseId}/documents/users/${uid}`;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:commit`;

  const fields = Object.fromEntries(
    Object.entries(profile).map(([k, v]) => {
      if (typeof v === 'boolean') return [k, { booleanValue: v }];
      if (typeof v === 'number') return [k, { integerValue: String(Math.trunc(v)) }];
      return [k, { stringValue: String(v ?? '') }];
    }),
  );

  const body = {
    writes: [
      {
        update: {
          name: base,
          fields,
        },
        currentDocument: { exists: false },
        updateTransforms: [
          { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
          { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
        ],
      },
    ],
  };

  return fetchJson(
    url,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${idToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    20000,
  );
}

async function ensureAuthUser({ apiKey, email, password }) {
  const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`;
  const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetchJson(
      signUpUrl,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
      20000,
    );
    return { uid: res.localId, idToken: res.idToken, kind: 'created' };
  } catch (e) {
    const msg = e?.details?.error?.message || '';
    if (msg !== 'EMAIL_EXISTS') throw e;
    const res = await fetchJson(
      signInUrl,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
      20000,
    );
    return { uid: res.localId, idToken: res.idToken, kind: 'signed-in' };
  }
}

async function main() {
  const devUsername = requiredEnv('FURSALINK_DEV_USERNAME');
  const devPassword = requiredEnv('FURSALINK_DEV_PASSWORD');

  const apiKey = requiredEnv('VITE_FIREBASE_API_KEY');
  const projectId = requiredEnv('VITE_FIREBASE_PROJECT_ID');
  const databaseId = requiredEnv('VITE_FIRESTORE_DATABASE_ID') || '(default)';
  const domain = process.env.VITE_LOGIN_EMAIL_DOMAIN || 'fursalink.znz';
  const email = usernameToEmail(devUsername, domain);

  console.log(`[bootstrap-dev-user] ensuring auth user: ${email}`);
  const { uid, idToken, kind } = await ensureAuthUser({ apiKey, email, password: devPassword });
  console.log(`[bootstrap-dev-user] ${kind}; uid=${uid}`);

  console.log('[bootstrap-dev-user] creating Firestore profile...');
  await upsertFirestoreProfile({
    projectId,
    databaseId,
    idToken,
    uid,
    profile: {
      fullName: devUsername,
      phoneNumber: '0700000000',
      role: 'developer',
      phoneVerified: true,
      profileProgress: 100,
      seededBy: 'scripts/bootstrap-dev-user-rest.mjs',
    },
  });

  console.log('[bootstrap-dev-user] done.');
}

main().catch((e) => {
  console.error('[bootstrap-dev-user] failed:', e?.message || e);
  if (e?.details) console.error(JSON.stringify(e.details, null, 2));
  process.exitCode = 1;
});

