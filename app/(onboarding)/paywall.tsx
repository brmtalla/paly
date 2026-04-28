import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import RevenueCatUI from 'react-native-purchases-ui';
import { useSubscriptionStore } from '../../src/stores/subscriptionStore';

export default function OnboardingPaywall() {
  const { refreshCustomerInfo } = useSubscriptionStore();

  const finish = () => {
    refreshCustomerInfo();
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <RevenueCatUI.Paywall
        onPurchaseCompleted={finish}
        onRestoreCompleted={finish}
        onDismiss={finish}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
