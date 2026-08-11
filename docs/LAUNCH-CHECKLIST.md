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

### 1. DSA trader status — decide the address first

**Paid Apps Agreement is Active** (Aug 11 – Dec 5, 2026), bank account and W-9
both Active. The In-App Purchase Key is uploaded. Only the trader declaration
is left, at **appstoreconnect.apple.com → Business → Complete Compliance
Requirements**.

- [ ] Decide what address is on file, **then** declare.

Selling $9.99/mo subscriptions is commercial activity, so under the DSA
definition — "acting for purposes relating to their trade, business, craft or
profession" — the answer is trader. That part is not really a judgement call.

The part that is: **Apple publicly displays trader contact details on the EU App
Store listing** — name, address, phone, email. The account is registered to an
individual at a residential address, so declaring as-is publishes a home address
and phone number. Options, in rough order of how most indie devs handle it:

1. Form an LLC (or use a registered-agent / business mailing address), update the
   entity in App Store Connect, then declare.
2. Accept publication of the personal address.
3. Drop EU distribution — rejected; EU is wanted.

Apple verifies the details and may make contact, so whatever is on file has to be
real and reachable.

> Not legal advice — the declaration is an attestation about your own status.
> Flagged here because the address becomes public the moment it is submitted,
> and that is hard to walk back.

### 1b. Subscription level order (2-second manual fix)

Monthly is Level 1 and Annual is Level 2. Apple treats Level 1 as the *higher*
service tier, so monthly→annual is currently a deferred downgrade rather than an
immediate upgrade — backwards from what you want.

Subscription group → **Edit** → **Edit Level** → drag *Paly Pro Annual* above
*Paly Pro Monthly* → Save.

> I could not do this one by automation: the reorder list only responds to real
> pointer-drag sequences, and synthetic drags leave Save disabled.

### 2. SendBlue inbound webhook

Without this, no one can link a phone number and Pro's texting does nothing.

- [x] **SendBlue → Settings → Webhooks → Inbound**: URL configured.
- [ ] **Verify it end to end.** `profiles.sms_linked_at` is still null, so
      nothing has come through the webhook yet — the existing number was set by
      hand before any of this existed. Text `8T666A` to `+19293649402` from the
      handset you want linked, then check that `sms_linked_at` populates.
- [ ] Check whether SMS fallback can be disabled on the number. iMessage does not
      touch carrier A2P channels, so 10DLC does not apply to it — but SendBlue
      downgrades to SMS for recipients who aren't on iMessage, and those messages
      do ride carrier channels.

### 3. App Review demo account — created

Apple rejects apps requiring login without working credentials.

- [x] Account created: **brandonmtalla+appreview@gmail.com** (password handed
      over separately — it is not committed to this repo). Sign-in verified
      against the live auth endpoint, not just inserted into the table.
- [x] Populated so the reviewer sees a working app rather than empty state:
      2 classes with weekly schedules, 2 notes, one fully synthesized set
      (summary, 5 takeaways, 6 flashcards, 5 quiz questions, 4 daily chunks),
      5 study prompts (3 read, 2 unread), a 4-day reading streak and 90 Paly
      Points backed by real ledger rows.
- [x] No phone number linked — the reviewer never needs SMS, and push is the
      default channel on every plan.
- [ ] Paste the credentials into App Store Connect → *App Review Information*,
      along with the notes from `legal/store-listing.md`.

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
