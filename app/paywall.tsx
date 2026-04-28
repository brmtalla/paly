import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import RevenueCatUI from 'react-native-purchases-ui';
import { useSubscriptionStore } from '../src/stores/subscriptionStore';

export default function PaywallModal() {
  const { refreshCustomerInfo } = useSubscriptionStore();

  const close = () => {
    refreshCustomerInfo();
    if (router.canGoBack()) router.back();
  };

  return (
    <View style={styles.container}>
      <RevenueCatUI.Paywall
        onPurchaseCompleted={close}
        onRestoreCompleted={close}
        onDismiss={close}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
