# Sign in with Apple & Google — console setup

The app code is done. What remains is console configuration in three places,
none of which can be scripted from here because it involves developer accounts
and credentials.

**Nothing here breaks the current build.** Until the Google client IDs are set,
the Google plugin is omitted from the config and the Google button hides itself.
Apple works as soon as the capability is enabled.

---

## Why both, and not just Google

**Guideline 4.8** requires that any app offering a third-party login also offers
a privacy-preserving equivalent — one that limits data collection to name and
email and lets the user keep their email private. Sign in with Apple qualifies.

Shipping Google alone is an automatic rejection. `SocialAuthButtons` enforces
this in code: if the Apple button is unavailable it renders nothing at all,
rather than leaving Google on screen by itself.

---

## 1. Apple Developer — enable the capability

1. developer.apple.com → **Certificates, Identifiers & Profiles** → **Identifiers**
2. Open **`com.paly.app`**
3. Tick **Sign In with Apple** → **Save**

`usesAppleSignIn: true` is already in `app.config.ts`, so EAS regenerates the
provisioning profile with the entitlement on the next build. No key, no Services
ID — those are only needed for web/Android, and this is a native iOS flow.

## 2. Supabase — enable the Apple provider

**Authentication → Providers → Apple → Enable**

- **Authorized Client IDs:** `com.paly.app`

That single field is the whole native setup. Leave the Services ID, Team ID and
key blank; they are for the web OAuth flow, which the app does not use.

Supabase verifies the identity token's audience against this list. If the bundle
ID is missing or misspelled, sign-in fails with an audience-mismatch error.

## 3. Google Cloud — create two OAuth clients

console.cloud.google.com → create a project (or reuse one) → **APIs & Services →
Credentials**. Configure the **OAuth consent screen** first if prompted:
External, app name Paly, your support email.

Create **two** clients under **Create Credentials → OAuth client ID**:

| Type | Field | Value |
|---|---|---|
| **iOS** | Bundle ID | `com.paly.app` |
| **Web application** | — | no redirect URIs needed |

Both are needed even though the app is iOS-only:

- the **iOS client** is what the native sheet authenticates against
- the **Web client** is the audience the returned ID token is minted for, and is
  what Supabase validates — this is the one people usually miss

## 4. Supabase — enable the Google provider

**Authentication → Providers → Google → Enable**

- **Client ID:** the **Web** client ID
- **Client Secret:** the Web client's secret
- **Authorized Client IDs:** add **both** the Web and the iOS client IDs,
  comma-separated

## 5. Set the environment variables

```
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<ios client id>.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web client id>.apps.googleusercontent.com
```

Put them in `.env` for local runs, and register them for builds:

```bash
eas env:create --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value "..." --environment production
eas env:create --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "..." --environment production
```

These are public identifiers, not secrets — they ship inside any iOS binary
regardless. The Web client *secret* is a real secret, but it lives only in
Supabase and never in this repo.

The iOS URL scheme Google requires is **derived** from the iOS client ID in
`app.config.ts` rather than being a third variable, so there is nothing to keep
in sync by hand.

---

## Verifying

Check the config picked the values up before burning a build:

```bash
npx expo config --type public | grep -A2 google-signin
```

The plugin should appear with an `iosUrlScheme` of
`com.googleusercontent.apps.<ios client id without the suffix>`. If the plugin is
absent, the iOS client ID is not reaching the config and the Google button will
stay hidden at runtime.

On device, after building:

1. **Apple** — tap Continue with Apple, use "Hide My Email". A user should
   appear in Supabase with a `privaterelay.appleid.com` address, and a matching
   `profiles` row (created by the `on_auth_user_created` trigger).
2. **Google** — tap Continue with Google, pick an account, confirm the session
   lands and onboarding starts.
3. **Cancel both sheets.** Backing out must return silently to the form with no
   error alert — that path is handled explicitly and is worth confirming.
4. Sign out and sign back in with the same Apple ID. It must reuse the same
   account, not create a second one.

### One quirk worth knowing

Apple returns the user's real name **only on the very first authorisation** for
a given Apple ID. Every later sign-in returns null for it. The app writes it
immediately on first sign-in for that reason.

If you test, delete the account, and test again, Apple will *not* send the name
the second time — it still considers your Apple ID as having authorised the app.
To get a genuine first-run: **Settings → your name → Sign-In & Security → Sign in
with Apple → Paly → Stop Using Apple ID**, then try again.
