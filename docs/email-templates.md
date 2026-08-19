# Auth email templates

Paste these into **Supabase → Authentication → Emails → Templates**. They replace
the default Supabase wording and, more importantly, the default link.

## Why the link is different

The stock template uses `{{ .ConfirmationURL }}`, which points at
`https://<project-ref>.supabase.co/auth/v1/verify?…`. Three problems with that:

1. **A supabase.co URL is visible to the user** in the email and in the browser
   address bar. It does not look like your product.
2. **Supabase consumes the token on that request**, then 302s to the app scheme.
   iOS opens the browser first and asks "Open in Paly?" — and by the time the
   student taps, the token is already spent. That is the "link expired" they hit.
3. It cannot be styled, because the redirect is not your page.

These templates link to `{{ .SiteURL }}/confirm?token_hash={{ .TokenHash }}&…`
instead. Nothing consumes the token in transit: the page hands the hash to the
app, and the **app** calls `verifyOtp`. Tapping the email twice still works, and
the only domain the student ever sees is yours.

`app/(auth)/confirm.tsx` already handles `token_hash` — no app change is needed.

## Required settings

- **Authentication → URL Configuration → Site URL:** `https://www.paly.study`
  (`{{ .SiteURL }}` resolves to this, so it has to match the deployed domain).
- **Redirect URLs** must include `paly://confirm` and `paly://reset-password`.
- The pages live at `landing/public/confirm.html` and
  `landing/public/reset-password.html`, routed by the rewrites in `vercel.json`.

---

## Confirm signup

**Subject:** `Confirm your email — Paly`

```html
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#EEF3FC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF3FC;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px -12px rgba(12,26,56,0.18);">
            <tr>
              <td style="background:#0C1A38;padding:28px 32px;">
                <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.02em;">Paly</span>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 8px;">
                <h1 style="margin:0;color:#0C1A38;font-size:24px;line-height:1.25;letter-spacing:-0.02em;">Confirm your email</h1>
                <p style="margin:14px 0 0;color:#4A5878;font-size:15px;line-height:1.65;">
                  Tap below and Paly will open and finish setting up your account. Your first
                  lecture is about ten seconds away from becoming a week of study material.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 32px 8px;">
                <a href="{{ .SiteURL }}/confirm?token_hash={{ .TokenHash }}&type=signup"
                   style="display:block;padding:15px 24px;background:#2050B0;color:#ffffff;border-radius:14px;text-align:center;text-decoration:none;font-weight:600;font-size:16px;">
                  Confirm my email
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 36px;">
                <p style="margin:0;color:#8792AE;font-size:13px;line-height:1.6;">
                  This link works once and expires in 24 hours. If you didn&rsquo;t create a Paly
                  account, you can ignore this email &mdash; nothing was set up.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0;color:#8792AE;font-size:12px;">Paly &middot; study without cramming</p>
        </td>
      </tr>
    </table>
  </body>
</html>
```

## Reset password

**Subject:** `Reset your Paly password`

Identical markup, with the heading, body, button label and link swapped:

```html
<h1 style="margin:0;color:#0C1A38;font-size:24px;line-height:1.25;letter-spacing:-0.02em;">Reset your password</h1>
<p style="margin:14px 0 0;color:#4A5878;font-size:15px;line-height:1.65;">
  Tap below and Paly will open so you can choose a new password.
</p>
```

```html
<a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery"
   style="display:block;padding:15px 24px;background:#2050B0;color:#ffffff;border-radius:14px;text-align:center;text-decoration:none;font-weight:600;font-size:16px;">
  Choose a new password
</a>
```

```html
<p style="margin:0;color:#8792AE;font-size:13px;line-height:1.6;">
  This link works once and expires in 24 hours. If you didn&rsquo;t ask to reset your
  password, you can ignore this email &mdash; nothing has changed.
</p>
```

---

## Custom SMTP — do this before launch

Until custom SMTP is configured, these emails send from
`noreply@mail.app.supabase.io` **and Supabase's built-in SMTP is rate limited to
a small number of messages per hour**. That limit is not a warning banner; it
silently drops signups once you have real traffic. It is the single most likely
way a launch day goes wrong.

Set up any provider (Resend, Postmark, SES) and fill in
**Authentication → Emails → SMTP Settings**:

- Sender: `hello@paly.study`, name `Paly`
- Host / port / user / pass from the provider
- Verify the sending domain with the provider's DNS records (SPF + DKIM), or
  everything lands in spam

Once SMTP is set, raise the rate limit under **Authentication → Rate Limits**.
