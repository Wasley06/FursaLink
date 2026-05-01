# Supabase Email OTP + FursaLink Branding (Brevo SMTP)

This project uses **Supabase Auth Email OTP** for candidate verification (`/verify-email`).

## 1) Set SMTP in Supabase (Brevo)

In Supabase Dashboard:

- `Authentication` → `SMTP Settings`
- Enable `Custom SMTP`
- Use Brevo SMTP values:
  - **Host**: `smtp-relay.brevo.com`
  - **Port**: `587` (STARTTLS)
  - **Username**: your Brevo login email (or SMTP login shown in Brevo)
  - **Password**: your Brevo **SMTP key** (create one in Brevo if needed)
  - **Sender name**: `FursaLink`
  - **Sender email**: `wasleyinc@gmail.com` (or a verified sender/domain in Brevo)

If Supabase shows “Email OTP server is not configured”, it usually means **Custom SMTP is not enabled** or the SMTP credentials are invalid.

## 2) Update Auth Email Templates (FursaLink branded)

Supabase Dashboard:

- `Authentication` → `Email Templates`

Replace the templates with the branded versions below.  
The logo URL uses the Vercel production domain:

- Logo: `https://fursalink-zanzibar.vercel.app/brand/logo.png`

### Confirm sign up

```html
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f1f5f9;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
    <div style="padding:20px 22px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
      <div style="display:flex;align-items:center;gap:10px;">
        <img src="https://fursalink-zanzibar.vercel.app/brand/logo.png" width="40" height="40" alt="FursaLink" style="border-radius:12px;border:1px solid #e2e8f0;background:#fff;object-fit:contain;" />
        <div>
          <div style="font-weight:900;letter-spacing:.02em;color:#083B66;">FursaLink</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">Zanzibar Employment Portal</div>
        </div>
      </div>
    </div>
    <div style="padding:22px;">
      <h2 style="margin:0 0 10px;color:#0f172a;">Confirm your signup</h2>
      <p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.5;">
        Click the button below to confirm your email and activate your FursaLink account.
      </p>
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0B4F8A;color:#fff;text-decoration:none;font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:12px;padding:12px 16px;border-radius:12px;">
        Confirm Email
      </a>
      <p style="margin:16px 0 0;color:#64748b;font-size:12px;line-height:1.4;">
        If you did not request this, you can ignore this email.
      </p>
    </div>
  </div>
</div>
```

### Invite user

```html
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f1f5f9;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
    <div style="padding:20px 22px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
      <div style="display:flex;align-items:center;gap:10px;">
        <img src="https://fursalink-zanzibar.vercel.app/brand/logo.png" width="40" height="40" alt="FursaLink" style="border-radius:12px;border:1px solid #e2e8f0;background:#fff;object-fit:contain;" />
        <div>
          <div style="font-weight:900;letter-spacing:.02em;color:#083B66;">FursaLink</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">Zanzibar Employment Portal</div>
        </div>
      </div>
    </div>
    <div style="padding:22px;">
      <h2 style="margin:0 0 10px;color:#0f172a;">You have been invited</h2>
      <p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.5;">
        You have been invited to create an account on <strong>{{ .SiteURL }}</strong>.
      </p>
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0B4F8A;color:#fff;text-decoration:none;font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:12px;padding:12px 16px;border-radius:12px;">
        Accept Invite
      </a>
    </div>
  </div>
</div>
```

### Confirm change of email

```html
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f1f5f9;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
    <div style="padding:20px 22px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
      <div style="display:flex;align-items:center;gap:10px;">
        <img src="https://fursalink-zanzibar.vercel.app/brand/logo.png" width="40" height="40" alt="FursaLink" style="border-radius:12px;border:1px solid #e2e8f0;background:#fff;object-fit:contain;" />
        <div>
          <div style="font-weight:900;letter-spacing:.02em;color:#083B66;">FursaLink</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">Zanzibar Employment Portal</div>
        </div>
      </div>
    </div>
    <div style="padding:22px;">
      <h2 style="margin:0 0 10px;color:#0f172a;">Confirm email change</h2>
      <p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.5;">
        Confirm updating your email from <strong>{{ .Email }}</strong> to <strong>{{ .NewEmail }}</strong>.
      </p>
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0B4F8A;color:#fff;text-decoration:none;font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:12px;padding:12px 16px;border-radius:12px;">
        Confirm Change
      </a>
    </div>
  </div>
</div>
```

### Reset password

```html
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f1f5f9;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
    <div style="padding:20px 22px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
      <div style="display:flex;align-items:center;gap:10px;">
        <img src="https://fursalink-zanzibar.vercel.app/brand/logo.png" width="40" height="40" alt="FursaLink" style="border-radius:12px;border:1px solid #e2e8f0;background:#fff;object-fit:contain;" />
        <div>
          <div style="font-weight:900;letter-spacing:.02em;color:#083B66;">FursaLink</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">Zanzibar Employment Portal</div>
        </div>
      </div>
    </div>
    <div style="padding:22px;">
      <h2 style="margin:0 0 10px;color:#0f172a;">Reset password</h2>
      <p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.5;">
        Click the button below to reset your password.
      </p>
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0B4F8A;color:#fff;text-decoration:none;font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:12px;padding:12px 16px;border-radius:12px;">
        Reset Password
      </a>
    </div>
  </div>
</div>
```

### Confirm reauthentication

```html
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f1f5f9;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
    <div style="padding:20px 22px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
      <div style="display:flex;align-items:center;gap:10px;">
        <img src="https://fursalink-zanzibar.vercel.app/brand/logo.png" width="40" height="40" alt="FursaLink" style="border-radius:12px;border:1px solid #e2e8f0;background:#fff;object-fit:contain;" />
        <div>
          <div style="font-weight:900;letter-spacing:.02em;color:#083B66;">FursaLink</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">Security verification</div>
        </div>
      </div>
    </div>
    <div style="padding:22px;">
      <h2 style="margin:0 0 10px;color:#0f172a;">Confirm reauthentication</h2>
      <p style="margin:0 0 6px;color:#334155;font-size:14px;line-height:1.5;">
        Enter this code to continue:
      </p>
      <div style="font-weight:900;font-size:22px;letter-spacing:.22em;color:#0B4F8A;margin-top:8px;">
        {{ .Token }}
      </div>
    </div>
  </div>
</div>
```

### Password changed confirmation

```html
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f1f5f9;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
    <div style="padding:20px 22px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
      <div style="display:flex;align-items:center;gap:10px;">
        <img src="https://fursalink-zanzibar.vercel.app/brand/logo.png" width="40" height="40" alt="FursaLink" style="border-radius:12px;border:1px solid #e2e8f0;background:#fff;object-fit:contain;" />
        <div>
          <div style="font-weight:900;letter-spacing:.02em;color:#083B66;">FursaLink</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">Account security</div>
        </div>
      </div>
    </div>
    <div style="padding:22px;">
      <h2 style="margin:0 0 10px;color:#0f172a;">Your password has been changed</h2>
      <p style="margin:0;color:#334155;font-size:14px;line-height:1.5;">
        This is a confirmation that the password for your account <strong>{{ .Email }}</strong> has just been changed.
      </p>
      <p style="margin:12px 0 0;color:#64748b;font-size:12px;line-height:1.4;">
        If you did not make this change, please contact support immediately.
      </p>
    </div>
  </div>
</div>
```

## 3) Vercel Environment Variables (required)

In Vercel Project → `Settings` → `Environment Variables`, set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

Then redeploy.

