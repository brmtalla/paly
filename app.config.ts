import { ExpoConfig, ConfigContext } from 'expo/config';

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
    supportsTablet: true,
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
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://eftafqxzqijsueviocsv.supabase.co',
    supabaseAnonKey:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmdGFmcXh6cWlqc3VldmlvY3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3OTc4MjIsImV4cCI6MjA4MjM3MzgyMn0.vHbK0Wc_tT2WJbqZevZjY2v41Wr0RC7MQTNmJ9czLNo',
    router: {
      origin: false,
    },
    eas: {
      projectId: '3d334eca-64a1-40b3-89a7-569d42c5834a',
    },
  },
  owner: 'bmtall',
});
