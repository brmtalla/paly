import React, { useRef } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useSubscriptionStore } from '../../src/stores/subscriptionStore';
import { ProPaywall } from '../../src/components/ProPaywall';

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

  return <ProPaywall onClose={finish} onPurchaseCompleted={finish} />;
}
