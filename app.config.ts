import fs from 'node:fs';
import path from 'node:path';
import { ExpoConfig, ConfigContext } from 'expo/config';

type EnvMap = Record<string, string | undefined>;

let localEnvCache: EnvMap | null = null;
let easEnvCache: EnvMap | null = null;

function parseEnvFile(contents: string): EnvMap {
  return contents.split(/\r?\n/).reduce<EnvMap>((env, rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      return env;
    }

    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) {
      return env;
    }

    const name = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[name] = value;
    return env;
  }, {});
}

function getLocalEnv(): EnvMap {
  if (localEnvCache) {
    return localEnvCache;
  }

  const envPath = path.join(process.cwd(), '.env');
  try {
    localEnvCache = parseEnvFile(fs.readFileSync(envPath, 'utf8'));
  } catch {
    localEnvCache = {};
  }

  return localEnvCache;
}

function getEasProfileEnv(): EnvMap {
  if (easEnvCache) {
    return easEnvCache;
  }

  const easPath = path.join(process.cwd(), 'eas.json');
  try {
    const eas = JSON.parse(fs.readFileSync(easPath, 'utf8')) as {
      build?: Record<string, { env?: EnvMap }>;
    };
    const profile =
      process.env.EAS_BUILD_PROFILE ||
      process.env.EAS_BUILD_PROFILE_NAME ||
      process.env.EAS_PROFILE ||
      'production';

    easEnvCache = eas.build?.[profile]?.env ?? {};
  } catch {
    easEnvCache = {};
  }

  return easEnvCache;
}

function publicEnv(name: string): string | undefined {
  return process.env[name] || getLocalEnv()[name] || getEasProfileEnv()[name];
}

/**
 * Asserts a required public env var is present. Failing the build is
 * deliberate: a binary built without these silently points at nothing, which is
 * far harder to diagnose after it ships than a broken build is now.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        'Set it in your .env file for local development, or in the EAS build profile / EAS secrets for builds.'
    );
  }

  return value;
}

/**
 * Like `required`, but only enforced inside an EAS build.
 *
 * Local `expo start` stays usable without a RevenueCat key — the store just
 * reports that subscriptions are unavailable. A *build*, though, is a binary
 * someone could ship, and one without a key shows an empty paywall that can
 * never complete a purchase. Apple rejects that, so fail the build instead.
 */
function requiredForBuild(name: string, value: string | undefined): string | undefined {
  if (process.env.EAS_BUILD === 'true' && !value) {
    throw new Error(
      `Missing ${name}. A store build without it ships a paywall that cannot ` +
        'complete a purchase. Set it with `eas env:create` or in the build profile.'
    );
  }

  return value;
}

// Only the key for the platform being built is needed; a local run needs neither.
const buildPlatform = process.env.EAS_BUILD_PLATFORM;

const googleIosClientId = publicEnv('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID');
const googleWebClientId = publicEnv('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');

/**
 * Google's iOS SDK needs the reversed client ID registered as a URL scheme, or
 * the sign-in sheet never returns. It is just the client ID with the two halves
 * swapped, so deriving it here keeps one source of truth instead of a second
 * env var that can silently disagree with the first.
 *
 * 123-abc.apps.googleusercontent.com -> com.googleusercontent.apps.123-abc
 */
const googleIosUrlScheme = googleIosClientId
  ? `com.googleusercontent.apps.${googleIosClientId.replace('.apps.googleusercontent.com', '')}`
  : undefined;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Paly',
  slug: 'paly',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'paly',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  // The brand mark is navy-on-white, so it needs a white field — the previous
  // #6366F1 indigo was chosen for the placeholder icon and clashes with it.
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
  },
  ios: {
    // iPhone-only for v1. Declaring iPad support means App Review tests on an
    // iPad, and every layout here is phone-first and untested at that size —
    // an avoidable rejection. The app still installs on iPad in compatibility
    // mode. Flip to true once the layouts have actually been checked there.
    supportsTablet: false,
    bundleIdentifier: 'com.paly.app',
    // Adds the Sign In with Apple entitlement. Guideline 4.8 requires a
    // privacy-preserving login alongside Google, and this is it.
    usesAppleSignIn: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      UIBackgroundModes: ['remote-notification'],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF',
    },
    package: 'com.paly.app',
    permissions: ['NOTIFICATIONS', 'RECEIVE_BOOT_COMPLETED'],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    ...(googleIosUrlScheme
      ? ([['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }]] as [
          string,
          unknown,
        ][])
      : []),
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        // Android tints the notification mask with this; sampled from the mark.
        color: '#2050B0',
      },
    ],
    'expo-document-picker',
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Paly to access your photos so you can choose a profile picture.',
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
    'expo-font',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', publicEnv('EXPO_PUBLIC_SUPABASE_URL')),
    supabaseAnonKey: required(
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      publicEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY')
    ),
    revenueCat: {
      iosKey:
        buildPlatform === 'ios'
          ? requiredForBuild(
              'EXPO_PUBLIC_REVENUECAT_IOS_KEY',
              publicEnv('EXPO_PUBLIC_REVENUECAT_IOS_KEY')
            )
          : publicEnv('EXPO_PUBLIC_REVENUECAT_IOS_KEY'),
      androidKey:
        buildPlatform === 'android'
          ? requiredForBuild(
              'EXPO_PUBLIC_REVENUECAT_ANDROID_KEY',
              publicEnv('EXPO_PUBLIC_REVENUECAT_ANDROID_KEY')
            )
          : publicEnv('EXPO_PUBLIC_REVENUECAT_ANDROID_KEY'),
    },
    google: {
      // From Google Cloud > Credentials. The iOS client is what the native
      // sheet uses; the Web client is the audience Supabase validates the
      // returned ID token against, so both are needed even on iOS only.
      iosClientId: googleIosClientId,
      webClientId: googleWebClientId,
    },
    router: {
      origin: false,
    },
    eas: {
      projectId: '3d334eca-64a1-40b3-89a7-569d42c5834a',
    },
  },
  owner: 'bmtall',
});
