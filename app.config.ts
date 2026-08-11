import { ExpoConfig, ConfigContext } from 'expo/config';

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
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#6366F1',
  },
  ios: {
    // iPhone-only for v1. Declaring iPad support means App Review tests on an
    // iPad, and every layout here is phone-first and untested at that size —
    // an avoidable rejection. The app still installs on iPad in compatibility
    // mode. Flip to true once the layouts have actually been checked there.
    supportsTablet: false,
    bundleIdentifier: 'com.paly.app',
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#6366F1',
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
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#6366F1',
      },
    ],
    'expo-document-picker',
    'expo-font',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: required(
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    ),
    revenueCat: {
      iosKey:
        buildPlatform === 'ios'
          ? requiredForBuild(
              'EXPO_PUBLIC_REVENUECAT_IOS_KEY',
              process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
            )
          : process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
      androidKey:
        buildPlatform === 'android'
          ? requiredForBuild(
              'EXPO_PUBLIC_REVENUECAT_ANDROID_KEY',
              process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
            )
          : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
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
