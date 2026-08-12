# Paly Deployment Guide

## Prerequisites

- Node.js 20+
- EAS CLI: `npm install -g eas-cli`
- Supabase CLI: `npm install -g supabase`
- Apple Developer Account (iOS)
- Google Play Console Account (Android)

## Environment Setup

### Mobile App (Expo/EAS)

Environment variables are injected via `eas.json` build profiles and read in `app.config.ts`.

| Variable | Description | Where it lives |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | `eas.json` build profiles |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eas.json` build profiles |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | RevenueCat public SDK key, `appl_…` | **EAS env vars — not committed** |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat public SDK key, `goog_…` | **EAS env vars — not committed** |

The Supabase values are the public anon key and are safe in git. The RevenueCat
keys are deliberately *not* in `eas.json` — set them once per environment:

```bash
eas env:create --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value "appl_..." --environment production --visibility plaintext
```

`app.config.ts` fails the build if the key for the platform being built is
missing. That is intentional: a binary without it renders an empty paywall that
can never complete a purchase, which Apple rejects. A local `expo start` still
runs fine without them — the store simply reports subscriptions as unavailable.

### Supabase Edge Functions

Set via Supabase Dashboard > Project Settings > Edge Functions > Secrets, or via CLI:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set REVENUECAT_SECRET_KEY=sk_...
supabase secrets set REVENUECAT_WEBHOOK_SECRET="$(openssl rand -hex 32)"
supabase secrets set SENDBLUE_API_KEY=...
supabase secrets set SENDBLUE_API_SECRET=...
supabase secrets set SENDBLUE_PHONE_NUMBER=+1...
supabase secrets set SENDBLUE_INBOUND_SECRET="$(openssl rand -base64 32 | tr -d '=+/')"
```

`SENDBLUE_PHONE_NUMBER` must match `PALY_SMS_NUMBER` in `src/lib/constants.ts`,
or the opt-in text goes to a number whose inbound webhook we do not control.

## Tiers

| | Free | Paly Pro |
|---|---|---|
| Daily study chunks in-app | ✅ | ✅ |
| Push notification per chunk | ✅ | ✅ |
| Quizzes (required to keep delivery) | ✅ | ✅ |
| SMS / iMessage delivery | — | ✅ |
| Flashcards | — | ✅ |
| Chunks on demand (`request-chunk`) | — | ✅ |
| Classes | 2 | Unlimited |

Entitlement lives in `profiles.is_premium` / `profiles.premium_until`, written **only**
by `revenuecat-webhook` and `grant-free-month`. A database trigger blocks clients from
writing those columns, so edge functions must check them rather than trusting the app.

## Free Trial (7 days)

The trial is a **store-native introductory offer**, so Apple/Google collect the
payment method up front and convert automatically unless the user cancels. No
custom entitlement code is involved — the trial arrives through the same webhook
as a normal purchase.

Configure once per store, then RevenueCat surfaces it automatically:

1. **App Store Connect** → your subscription → *Introductory Offers* → Free
   trial, 1 week, all territories.
2. **Play Console** → subscription → *Base plan* → add a **Free trial** offer of
   7 days.
3. **RevenueCat** → confirm the offer appears on the product, and that the
   paywall shows the trial copy.

Keep `TRIAL_DAYS` in `src/lib/constants.ts` in step with the store config — it
drives the in-app copy only, never entitlement.

**Conversion nudge.** `deliver-prompts` calls `nudgeExpiringTrials()` on every
run. Within 24h of a trial lapsing, the user gets one SMS (falling back to push)
telling them the texts are about to stop. `profiles.trial_nudge_sent_at` makes it
fire exactly once per trial.

`profiles.trial_used_at` is a permanent marker, so the app never offers a second
free trial. Like all entitlement columns, it is writable only by the service role.

## RevenueCat Webhook (required for Pro to work)

Without this, purchases never reach the backend and Pro features stay locked.

1. Deploy: `supabase functions deploy revenuecat-webhook --no-verify-jwt`
2. RevenueCat Dashboard → Project → Integrations → **Webhooks** → Add:
   - **URL:** `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`
   - **Authorization header:** the exact `REVENUECAT_WEBHOOK_SECRET` value set above
3. Send a test event and confirm `profiles.is_premium` flips for that user.

## Prompt Delivery Scheduler (required for the daily drip)

`deliver-prompts` is a polling endpoint — it delivers every prompt whose
`scheduled_for` has passed and that is not yet delivered.

In production this is driven **inside the database** by `pg_cron` + `pg_net`:

| Job | Schedule | Calls |
|---|---|---|
| `deliver-study-prompts` | `*/5 * * * *` | `POST /functions/v1/deliver-prompts` |

```sql
-- Is the drip running?
select jobid, jobname, schedule, active from cron.job;

-- Did recent runs succeed?
select status, start_time, end_time
from cron.job_run_details
order by start_time desc
limit 20;
```

See `supabase/migrations/20260227154707_setup_deliver_prompts_cron.sql` for the
job definition and how to (re)create it.

> ⚠️ Run exactly **one** scheduler. Adding an external cron on top of the
> pg_cron job double-sends texts and push notifications to students.

## Push Notifications

### iOS (APNs)

1. Create an APNs Key in Apple Developer Portal > Certificates, Identifiers & Profiles > Keys
2. Download the `.p8` file
3. Upload to Expo: `eas credentials` and follow prompts, or configure in Expo Dashboard > Credentials

### Android (FCM)

1. In Firebase Console, go to Project Settings > Cloud Messaging
2. Generate a Server Key (or use the FCM v1 API with a service account)
3. Upload to Expo: `eas credentials` and follow prompts

### Verification

After configuring credentials, run a preview build and test push notifications on a physical device:

```bash
eas build --profile preview --platform ios
eas build --profile preview --platform android
```

## SMS / iMessage (SendBlue)

### Account linking (required before anyone can receive a text)

`profiles.phone_number` is written **only** by the `sendblue-inbound` webhook.
Nothing in the app can set it — a client-writable phone number would let any
signed-in user point Paly's texts at a stranger's handset.

How a student links their number:

1. Onboarding shows their `profiles.sms_link_code` (a 6-character code, assigned
   by a database trigger on profile creation) and opens Messages with
   `Link my Paly account: ABC234` pre-filled.
2. They send it. `sendblue-inbound` resolves the code back to their account,
   stores the sending number as `phone_number`, and sets `sms_opted_in`.
3. The app re-reads the profile when it returns to the foreground and confirms.

Texting from the handset is itself proof of ownership, so there is no separate
verification code step.

> A bare "Hi" cannot work: an inbound message carries a phone number but nothing
> that identifies the account. The code is what makes the link unambiguous.

### Inbound webhook setup

1. Deploy: `supabase functions deploy sendblue-inbound --no-verify-jwt`
2. SendBlue Dashboard → Settings → **Webhooks** → Inbound:
   - **URL:** `https://<project-ref>.supabase.co/functions/v1/sendblue-inbound?token=<SENDBLUE_INBOUND_SECRET>`

SendBlue does not sign its webhooks, so the shared token in the query string is
the only thing standing between the endpoint and forged inbound messages —
**treat that URL as a credential.** The function returns 503 until the secret is
set and 401 on a mismatch; it never processes an unauthenticated payload.

### Compliance

- Complete SendBlue's A2P 10DLC brand and campaign registration for US numbers.
  Carrier approval takes days to weeks — **start it before you need it.**
- STOP / STOPALL / UNSUBSCRIBE / CANCEL / END / QUIT are handled by
  `sendblue-inbound`, which clears `sms_opted_in` on both `profiles` and
  `landing_subscribers`. START / UNSTOP / RESUME re-subscribe. HELP replies with
  a description and opt-out instructions. These are matched only when the keyword
  is the entire message, so "I need help with stereoisomers" is a question rather
  than a support request.
- Every outbound path goes through `sendSmsToProfile()`, which refuses to send
  unless `sms_opted_in` is true. Use it rather than `sendSms()` for anything
  addressed to a user — `sendSms()` takes a bare number and cannot check consent.
- The onboarding screen carries the required "Msg & data rates may apply. Reply
  STOP at any time to opt out." disclosure.

## Ask your companion

Anything inbound that is not a keyword or a link code is treated as a question
about the student's own material. `sendblue-inbound` routes it to
`answerStudyQuestion()` in `_shared/tutor.ts`.

**There is no in-app equivalent, on purpose.** Talking back and forth is what
you get for having her in your Messages thread; putting it in the app would
give away the reason to pay.

- **Grounding is limited to *delivered* prompts.** The whole product rests on
  releasing material one day at a time, so answering out of a chunk that has not
  arrived yet would quietly undo it.
- **Pro only.** Free accounts get an upsell reply instead of an answer;
  entitlement is read server-side via `isPro()`, never from the client.
- **Unlinked or opted-out numbers get the help text**, never an answer — a reply
  to someone who has opted out is the one thing we must not send.
- **Rate limit: 30 questions per rolling 24h per account**, counted from
  `tutor_questions`. That table is written with the service role and is
  read-only to the student, so the limit cannot be dodged from the client.
- The SMS reply is sent from `EdgeRuntime.waitUntil()` after the webhook has
  already returned 200. An answer takes 5–10s, and SendBlue retries anything
  slower — which would answer the same question twice.

## AI

One key, one model, one place: `ANTHROPIC_API_KEY` and `CLAUDE_MODEL` in
`_shared/claude.ts`. Synthesis, PDF extraction, the landing demo, and the
companion answers all go through it.

Both synthesis paths use **structured outputs** — each day's chunk comes back as
an array of bullets rather than a string the model was asked to format nicely.
A schema the model cannot satisfy with a paragraph is worth more than any amount
of instruction telling it not to write one. `_shared/bullets.ts` renders those
arrays and also rescues chunks synthesised before the change.

## Building for Release

### Preview (Internal Testing)

```bash
eas build --profile preview --platform all
```

Distribute via:
- iOS: TestFlight (automatic with `eas submit`)
- Android: Internal testing track

### Production

```bash
eas build --profile production --platform all
```

### Submit to Stores

```bash
# iOS - requires Apple credentials in eas.json submit config
eas submit --platform ios

# Android - requires Google service account key in eas.json submit config
eas submit --platform android
```

## Supabase Deployment

### Deploy Edge Functions

`--no-verify-jwt` is **not** optional where shown: those functions are called by
pg_cron or by third parties that cannot present a Supabase JWT. Each one
authenticates itself instead — `requireUserId()` for user-facing calls, a shared
secret for the two webhooks. Redeploying one without its flag silently breaks it.

```bash
# Authenticate the caller from their own JWT
supabase functions deploy delete-account      # required for App Store account deletion
supabase functions deploy extract-text
supabase functions deploy grant-free-month
supabase functions deploy demo-synthesis      # landing-page demo, called with the anon key

# Verify the JWT in-function via requireUserId()
supabase functions deploy process-upload --no-verify-jwt
supabase functions deploy synthesize-content --no-verify-jwt
supabase functions deploy schedule-prompts --no-verify-jwt
supabase functions deploy send-now --no-verify-jwt
supabase functions deploy request-chunk --no-verify-jwt

# Invoked by pg_cron, no user context
supabase functions deploy deliver-prompts --no-verify-jwt

# Third-party webhooks, authenticated by shared secret
supabase functions deploy revenuecat-webhook --no-verify-jwt
supabase functions deploy sendblue-inbound --no-verify-jwt
```

Push notifications are the free tier's delivery channel, so **APNs/FCM credentials
must be configured** (see Push Notifications below) or free users receive nothing.

### Run Migrations

```bash
supabase db push
```

## Monitoring

- **App errors**: Consider integrating Sentry (`@sentry/react-native`) for crash reporting
- **Supabase**: Monitor via Supabase Dashboard > Logs
- **Edge Functions**: Check logs via `supabase functions logs <function-name>`
- **SendBlue**: Monitor delivery status in the SendBlue dashboard > Messages
