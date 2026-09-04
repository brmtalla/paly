import React from 'react';
import { router } from 'expo-router';
import { useSubscriptionStore } from '../src/stores/subscriptionStore';
import { ProPaywall } from '../src/components/ProPaywall';

export default function PaywallModal() {
  const { refreshCustomerInfo } = useSubscriptionStore();

  const close = () => {
    void refreshCustomerInfo();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return <ProPaywall onClose={close} onPurchaseCompleted={close} />;
}
