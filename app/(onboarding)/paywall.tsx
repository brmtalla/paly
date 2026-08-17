import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import RevenueCatUI from 'react-native-purchases-ui';
import { useAuthStore } from '../../src/stores/authStore';
import { useSubscriptionStore } from '../../src/stores/subscriptionStore';

export default function OnboardingPaywall() {
  const { updateProfile } = useAuthStore();
  const { refreshCustomerInfo } = useSubscriptionStore();
  const finishing = useRef(false);

  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;

    try {
      await refreshCustomerInfo();
      await updateProfile({ onboarding_completed: true });
      router.replace('/(tabs)');
    } catch (error) {
      finishing.current = false;
      console.error('Failed to finish onboarding after paywall:', error);
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      <RevenueCatUI.Paywall
        onPurchaseCompleted={() => {
          void finish();
        }}
        onRestoreCompleted={() => {
          void finish();
        }}
        onDismiss={() => {
          void finish();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
