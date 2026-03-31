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

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |

For **production**, update the values in `eas.json` under `build.production.env` or use EAS Secrets:

```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-prod.supabase.co" --scope project
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-prod-anon-key" --scope project
```

### Supabase Edge Functions

Set via Supabase Dashboard > Project Settings > Edge Functions > Secrets, or via CLI:

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set TWILIO_ACCOUNT_SID=AC...
supabase secrets set TWILIO_AUTH_TOKEN=...
supabase secrets set TWILIO_PHONE_NUMBER=+1...
```

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

## SMS (Twilio)

- Ensure your Twilio phone number is configured for production messaging
- For US numbers: register your A2P 10DLC brand and campaign in Twilio Console
- Review messaging compliance requirements for your target regions

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

```bash
supabase functions deploy process-upload
supabase functions deploy synthesize-content
supabase functions deploy schedule-prompts
supabase functions deploy deliver-prompts
supabase functions deploy delete-account
supabase functions deploy extract-text
supabase functions deploy send-now
```

### Run Migrations

```bash
supabase db push
```

## Monitoring

- **App errors**: Consider integrating Sentry (`@sentry/react-native`) for crash reporting
- **Supabase**: Monitor via Supabase Dashboard > Logs
- **Edge Functions**: Check logs via `supabase functions logs <function-name>`
- **Twilio**: Monitor delivery status in Twilio Console > Messaging > Logs
