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
| Legal pages hosted | https://paly-legal-logical-enterprises.vercel.app — both return 200, no auth wall |
| App icons | Regenerated from the brand mark; the placeholder rings would have failed Guideline 4.0 |
| Build guard | An EAS build now fails if the RevenueCat key for that platform is missing |
| CI green | typecheck clean · lint at its 18-warning budget · format clean · 38 tests |

---

## 🔴 Blocking submission

### 1. RevenueCat — App Store side is empty

The `Paly (App Store)` app exists (`app84da5ea6fd`), but **all five products still
belong to the Test Store app**. Test Store products cannot process real money.

- [ ] **App Store Connect → Subscriptions**: create a subscription group with
      `paly_pro_monthly` and `paly_pro_annual`. Add a 7-day free trial as an
      *Introductory Offer* on each (this is what `TRIAL_DAYS` in
      `src/lib/constants.ts` describes — the app has no trial logic of its own).
- [ ] **App Store Connect → Business**: sign the **Paid Applications agreement**.
      Until this is active, IAP products do not appear at all. This is the most
      common cause of "my paywall is empty" and it is easy to miss.
- [ ] **App Store Connect → Users and Access → Integrations**: create an
      **In-App Purchase Key**, download the `.p8`, upload it to RevenueCat so it
      can validate receipts.
- [ ] **RevenueCat → Product catalog**: import those two products under the
      *App Store* app, attach both to the **`Paly Pro`** entitlement (already
      exists and matches `ENTITLEMENT_PRO` in the code).
- [ ] **RevenueCat → Offerings**: put them in the `default` offering's
      `$rc_monthly` and `$rc_annual` packages.
- [ ] **RevenueCat → Paywalls**: build a paywall and **attach it to the `default`
      offering**. It currently has `paywall_id: null`, and the app calls
      `RevenueCatUI.presentPaywall()` — with nothing attached there is nothing
      to show.

### 2. The `appl_` SDK key

RevenueCat's API deliberately does not expose public SDK keys, so this cannot be
automated.

- [ ] **RevenueCat → API keys** → copy the key for the App Store app (`appl_…`)
- [ ] Set it:
      ```
      eas env:create --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value "appl_..." --environment production --visibility plaintext
      ```
      Repeat with `--environment preview` for TestFlight builds.

`.env` currently holds the **Test Store** key (`test_…`) for local development
only. It renders the paywall but can never complete a real purchase, so it must
not reach a store build — the build guard in `app.config.ts` enforces that.

### 3. SendBlue inbound webhook

Without this, no one can link a phone number and Pro's texting does nothing.

- [ ] **SendBlue → Settings → Webhooks → Inbound**: paste the URL from
      `sendblue-webhook-url.txt` (in the session scratchpad). Treat it as a
      credential — anyone holding it can post forged inbound messages.
- [ ] Check whether SMS fallback can be disabled on the number. iMessage does not
      touch carrier A2P channels, so 10DLC does not apply to it — but SendBlue
      downgrades to SMS for recipients who aren't on iMessage, and those messages
      do ride carrier channels.

### 4. App Review demo account

Apple **rejects** apps that require login without working demo credentials.

- [ ] Create a real account, complete onboarding, add a class and a note so the
      reviewer sees a populated app rather than empty state.
- [ ] Put the credentials in App Store Connect → *App Review Information*.
- [ ] In the review notes, explain that study texts are a Pro feature requiring
      the user to text a link code first, so the reviewer doesn't flag the
      onboarding step as broken. Draft copy is in `legal/store-listing.md`.

### 5. Submit credentials

`eas.json`'s submit block is an empty object on purpose — `eas submit` will
prompt for Apple ID / ASC App ID / Team ID and cache them. The previous empty
strings read as supplied-and-invalid and broke the command.

---

## 🟡 Device verification (needs the `appl_` key first)

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
