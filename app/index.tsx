import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { useTheme } from '../src/theme/ThemeContext';

export default function Index() {
  const { colors } = useTheme();
  const { user, profile, isLoading, isInitialized } = useAuthStore();

  // Show loading state
  if (!isInitialized || isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Not logged in - go to auth
  if (!user) {
    return <Redirect href="/(auth)/welcome" />;
  }

  // Logged in but not completed onboarding
  if (!profile?.onboarding_completed) {
    return <Redirect href="/(onboarding)/assistant" />;
  }

  // Fully onboarded - go to main app
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});


