import { useEffect, useState } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as NativeSplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { useAuthStore } from '../src/stores/authStore';
import { useNotifications } from '../src/hooks/useNotifications';
import { SplashScreen } from '../src/components/SplashScreen';
import { useSubscriptionStore } from '../src/stores/subscriptionStore';

// Prevent the native splash screen from auto-hiding
NativeSplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

function RootLayoutNav() {
  const { colors, colorScheme } = useTheme();
  const { isInitialized, isProfileReady, profile, user, isLoading } = useAuthStore();
  const { initialize: initSubscription } = useSubscriptionStore();
  const segments = useSegments();

  // Initialize notifications
  useNotifications();

  // Initialize RevenueCat when user is authenticated
  useEffect(() => {
    if (user?.id) {
      initSubscription(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isInitialized || isLoading || !isProfileReady) return;

    const [group, screen] = segments as string[];
    const inAuthGroup = group === '(auth)';
    const inOnboardingGroup = group === '(onboarding)';
    const inPasswordReset = group === '(auth)' && screen === 'reset-password';
    // The paywall and the finish screen sit after setup. Kick users to tabs
    // from any other onboarding screen once setup is marked complete.
    // activate-texts is step 1 again, so it is no longer in this list.
    const postSetupOnboarding = screen === 'paywall' || screen === 'complete';

    if (inPasswordReset) {
      return;
    }

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (user) {
      if (!profile?.onboarding_completed && !inOnboardingGroup) {
        router.replace('/(onboarding)/activate-texts');
      } else if (profile?.onboarding_completed && inAuthGroup) {
        router.replace('/(tabs)');
      } else if (profile?.onboarding_completed && inOnboardingGroup && !postSetupOnboarding) {
        router.replace('/(tabs)');
      }
    }
  }, [user, profile, isInitialized, isLoading, isProfileReady, segments]);

  if (!isInitialized) {
    return null;
  }

  if (user && !isProfileReady) {
    return null;
  }

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="(onboarding)" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const initialize = useAuthStore((state) => state.initialize);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const profile = useAuthStore((state) => state.profile);
  const [showSplash, setShowSplash] = useState(true);
  const [nativeSplashHidden, setNativeSplashHidden] = useState(false);

  const [fontsLoaded] = useFonts({
    // Add custom fonts here when needed
  });

  useEffect(() => {
    initialize();
  }, []);

  // Hide native splash once fonts are loaded and app is initialized
  useEffect(() => {
    if (fontsLoaded && isInitialized && !nativeSplashHidden) {
      NativeSplashScreen.hideAsync();
      setNativeSplashHidden(true);
    }
  }, [fontsLoaded, isInitialized, nativeSplashHidden]);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RootLayoutNav />
          {showSplash && nativeSplashHidden && (
            <SplashScreen
              onAnimationComplete={handleSplashComplete}
              accentColor={profile?.theme_color}
            />
          )}
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
