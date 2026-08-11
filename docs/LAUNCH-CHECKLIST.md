# Paly v1 — iOS launch checklist

Everything in the codebase and backend is done. What remains is dashboard work
in accounts only you can sign into, plus one device verification pass.

Status as of the last automated check (2026-08-11).

---

## ✅ Done and verified

| Item | Evidence |
|---|---|
| Push delivery live | `deliver-prompts` v14 deployed; invoked it and got `trialNudges` in the response |
| pg_cron drip running | `deliver-study-prompts`, `*/5 * * * *`, active; recent runs returning 200 |
| `delete-account` deployed | Was never deployed before — Delete Account in the app used to fail outright |
| Stale functions removed | `test-sms` (unauthenticated, could send real texts), `test-hello`, `create-checkout` |
| SMS linking | `sendblue-inbound` deployed; returns 503 with no secret, 401 on a bad token |
| SMS consent enforced | Every send path goes through `sendSmsToProfile()`; STOP/START/HELP honoured |
| Migrations applied | 4 new, all recorded remotely; see `supabase/migrations/README.md` |
| `REVENUECAT_SECRET_KEY` set | Was missing entirely — `grant-free-month` had been failing silently |
| Legal pages hosted | https://paly-legal-logical-enterprises.vercel.app — verified by content, not status code (Vercel's SSO page also returns 200) |
| Vercel auth disabled | Deployment protection was on by default and was blocking Apple from fetching the privacy URL |
| `appl_` key set | `EXPO_PUBLIC_REVENUECAT_IOS_KEY` created in EAS `production` and `preview` |
| RevenueCat wiring | `paly_pro_monthly` + `paly_pro_annual` created under the App Store app, attached to the `Paly Pro` entitlement and to `$rc_monthly` / `$rc_annual` |
| App icons | Built from the supplied Paly logo (`assets/paly-logo-source.png`); the Expo placeholder rings would have failed Guideline 4.0 |
| App Store Connect products | Subscription group `Paly Pro`, `paly_pro_monthly` ($9.99/mo) and `paly_pro_annual` ($69.99/yr), both localized, both with a 7-day free trial across 175 regions, no end date |
| RevenueCat paywall | `Paly Pro Paywall` published and attached to the `default` offering (`pw0458effe05bf49ff`) |
| Build guard | An EAS build now fails if the RevenueCat key for that platform is missing |
| CI green | typecheck clean · lint at its 18-warning budget · format clean · 38 tests |

---

## 🔴 Blocking submission

### 1. App Store Connect — two items only you can do

Products, pricing and trials are all set up. Two things remain, both requiring
credentials or agreements I should not handle on your behalf:

- [ ] **Business → Paid Applications agreement**: sign it. It requires banking
      and tax-identity details. **Until it is active, IAP products do not appear
      at all** — this is the most common cause of an empty paywall, and nothing
      else in the purchase flow can be tested until it is done.
- [ ] **Users and Access → Integrations → In-App Purchase Key**: create it,
      download the `.p8`, and upload it to RevenueCat (Project settings → Apps →
      Paly (App Store)). Without it RevenueCat cannot validate receipts, so
      entitlements never sync. The `.p8` is a private key — handle it yourself.

Both subscriptions currently sit at *Prepare for Submission*. Apple requires the
first subscription group to be submitted **with** a new app version, so they go
out attached to the 1.0 build rather than separately.

### 2. SendBlue inbound webhook

Without this, no one can link a phone number and Pro's texting does nothing.

- [ ] **SendBlue → Settings → Webhooks → Inbound**: paste the URL from
      `sendblue-webhook-url.txt` (in the session scratchpad). Treat it as a
      credential — anyone holding it can post forged inbound messages.
- [ ] Check whether SMS fallback can be disabled on the number. iMessage does not
      touch carrier A2P channels, so 10DLC does not apply to it — but SendBlue
      downgrades to SMS for recipients who aren't on iMessage, and those messages
      do ride carrier channels.

### 3. App Review demo account

Apple **rejects** apps that require login without working demo credentials.

- [ ] Create a real account, complete onboarding, add a class and a note so the
      reviewer sees a populated app rather than empty state.
- [ ] Put the credentials in App Store Connect → *App Review Information*.
- [ ] In the review notes, explain that study texts are a Pro feature requiring
      the user to text a link code first, so the reviewer doesn't flag the
      onboarding step as broken. Draft copy is in `legal/store-listing.md`.

### 4. Submit credentials

`eas.json`'s submit block is an empty object on purpose — `eas submit` will
prompt for Apple ID / ASC App ID / Team ID and cache them. The previous empty
strings read as supplied-and-invalid and broke the command.

---

## 🟡 Device verification

```bash
eas build --profile preview --platform ios
```

Then, in rough order of how much it would hurt to get wrong:

- [ ] **Push arrives.** The whole free tier depends on it. Requires an APNs key
      uploaded via `eas credentials`. Nothing else in the app matters if this
      is broken.
- [ ] **SMS link round-trip.** Text the code from onboarding, confirm
      `profiles.phone_number` populates and the screen flips to "You're all set".
- [ ] **Sandbox purchase** completes and `profiles.is_premium` flips (via the
      RevenueCat webhook, already deployed and configured).
- [ ] **Account deletion** succeeds end to end, including storage cleanup.
- [ ] **Reply STOP** to a Paly text and confirm `sms_opted_in` goes false and
      delivery stops.

---

## Notes

- **iPhone-only.** `supportsTablet` is now `false`. Declaring iPad support means
  App Review tests on iPad, and the layouts are phone-first and untested there.
  The app still installs on iPad in compatibility mode.
- **Android is deferred**, so no FCM credentials, Play service account, or
  `goog_` key are needed. Nothing in the code needs changing for this.
- **Rotate the RevenueCat `sk_` secret key** when convenient — it was pasted into
  a chat transcript. Regenerate in RevenueCat, then
  `supabase secrets set REVENUECAT_SECRET_KEY=sk_...`.
- **Domain.** The legal pages are on a `*.vercel.app` URL, which is fine for
  submission. When a real domain is registered, change `PALY_SITE_URL` in
  `src/lib/constants.ts` and redeploy — nothing else references the host.
- **Supabase org is on the Pro plan**, so the project will not auto-pause. It was
  paused at the start of this work, which would have taken the whole backend
  down after launch.
