import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Purchases, { INTRO_ELIGIBILITY_STATUS, PurchasesPackage } from 'react-native-purchases';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PRIVACY_URL, TERMS_URL } from '../lib/constants';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { RADIUS, SHADOWS, SPACING } from '../theme/spacing';

type Plan = 'annual' | 'monthly';

interface ProPaywallProps {
  onClose: () => void | Promise<void>;
  onPurchaseCompleted?: () => void | Promise<void>;
}

const FEATURES = [
  { icon: 'chatbubbles-outline', label: 'Study prompts delivered by text' },
  { icon: 'chatbubble-ellipses-outline', label: 'Ask questions from your own material' },
  { icon: 'layers-outline', label: 'AI flashcards for every lecture' },
  { icon: 'infinite-outline', label: 'Unlimited classes' },
] as const;

function billingPeriod(plan: Plan) {
  return plan === 'annual' ? 'year' : 'month';
}

function trialPeriod(pkg: PurchasesPackage | null) {
  const intro = pkg?.product.introPrice;
  if (!intro || intro.price !== 0) return null;

  const count = intro.cycles * intro.periodNumberOfUnits;
  const unit = intro.periodUnit.toLowerCase();
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}

export function ProPaywall({ onClose, onPurchaseCompleted }: ProPaywallProps) {
  const { width } = useWindowDimensions();
  const {
    annualPackage,
    monthlyPackage,
    isLoading,
    isRestoring,
    error,
    fetchOfferings,
    purchaseAnnual,
    purchaseMonthly,
    restorePurchases,
  } = useSubscriptionStore();
  const [selectedPlan, setSelectedPlan] = useState<Plan>('annual');
  const [eligibility, setEligibility] = useState<Record<string, INTRO_ELIGIBILITY_STATUS>>({});

  const isWide = width >= 700;
  const selectedPackage =
    selectedPlan === 'annual'
      ? (annualPackage ?? monthlyPackage)
      : (monthlyPackage ?? annualPackage);
  const selectedPeriod = selectedPackage === annualPackage ? 'annual' : 'monthly';
  const selectedBillingPeriod = billingPeriod(selectedPeriod);
  const selectedPrice = selectedPackage?.product.priceString;
  const selectedTrialPeriod = trialPeriod(selectedPackage);
  const isTrialEligible =
    Platform.OS === 'ios' &&
    !!selectedPackage &&
    eligibility[selectedPackage.product.identifier] ===
      INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE &&
    !!selectedTrialPeriod;

  useEffect(() => {
    if (!annualPackage && !monthlyPackage) {
      void fetchOfferings();
    }
  }, [annualPackage, monthlyPackage, fetchOfferings]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const productIds = [annualPackage, monthlyPackage]
      .filter((pkg): pkg is PurchasesPackage => !!pkg)
      .map((pkg) => pkg.product.identifier);

    if (productIds.length === 0) return;

    let active = true;
    Purchases.checkTrialOrIntroductoryPriceEligibility(productIds)
      .then((result) => {
        if (!active) return;
        setEligibility(
          Object.fromEntries(Object.entries(result).map(([id, value]) => [id, value.status]))
        );
      })
      .catch((eligibilityError) => {
        // When eligibility cannot be verified, omit trial marketing. The App Store
        // purchase sheet remains the final, authoritative statement of the offer.
        console.warn('[RC] Introductory eligibility unavailable:', eligibilityError);
      });

    return () => {
      active = false;
    };
  }, [annualPackage, monthlyPackage]);

  const renewalText = useMemo(() => {
    if (!selectedPrice) return '';
    if (isTrialEligible) {
      return `${selectedTrialPeriod} free, then ${selectedPrice} per ${selectedBillingPeriod}.`;
    }
    return `${selectedPrice} per ${selectedBillingPeriod}.`;
  }, [isTrialEligible, selectedBillingPeriod, selectedPrice, selectedTrialPeriod]);

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    const purchased =
      selectedPackage === annualPackage ? await purchaseAnnual() : await purchaseMonthly();

    if (purchased) {
      await onPurchaseCompleted?.();
    }
  };

  const handleRestore = async () => {
    const restored = await restorePurchases();
    if (restored) {
      await onPurchaseCompleted?.();
      return;
    }
    Alert.alert('No Purchase Found', 'No active Paly Pro subscription was found to restore.');
  };

  const renderPlan = (plan: Plan, pkg: PurchasesPackage | null) => {
    if (!pkg) return null;
    const selected = pkg === selectedPackage;
    const period = billingPeriod(plan);

    return (
      <TouchableOpacity
        key={plan}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={`${plan === 'annual' ? 'Annual' : 'Monthly'} plan, billed ${pkg.product.priceString} per ${period}`}
        activeOpacity={0.82}
        onPress={() => setSelectedPlan(plan)}
        style={[
          styles.planCard,
          isWide && styles.planCardWide,
          selected ? styles.planCardSelected : styles.planCardUnselected,
        ]}
      >
        <View style={styles.planTopRow}>
          <Text style={styles.planName}>{plan === 'annual' ? 'Annual' : 'Monthly'}</Text>
          {selected && (
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={BRAND_BLUE}
              accessibilityElementsHidden
            />
          )}
        </View>
        <Text style={styles.billedLabel}>BILLED AMOUNT</Text>
        <View style={styles.priceRow}>
          <Text style={styles.billedPrice}>{pkg.product.priceString}</Text>
          <Text style={styles.billedPeriod}> / {period}</Text>
        </View>
        {plan === 'annual' && <Text style={styles.secondaryPrice}>One payment every year</Text>}
        {plan === 'monthly' && <Text style={styles.secondaryPrice}>One payment every month</Text>}
      </TouchableOpacity>
    );
  };

  const storeAccount = Platform.OS === 'ios' ? 'App Store account' : 'Google Play account';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <View style={styles.topBarSpacer} />
        <Text style={styles.topBarTitle}>Paly Pro</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Close subscription options"
          hitSlop={8}
          onPress={() => void onClose()}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={24} color="#28334A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        alwaysBounceVertical={false}
      >
        <View style={[styles.content, isWide && styles.contentWide]}>
          <View style={styles.hero}>
            <View style={styles.proIcon}>
              <Ionicons name="diamond" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>Make every class easier to keep up with</Text>
            <Text style={styles.subtitle}>
              Upgrade to Paly Pro for your complete study companion.
            </Text>
          </View>

          <View style={[styles.features, isWide && styles.featuresWide]}>
            {FEATURES.map((feature) => (
              <View key={feature.label} style={[styles.feature, isWide && styles.featureWide]}>
                <View style={styles.featureIcon}>
                  <Ionicons name={feature.icon} size={19} color={BRAND_BLUE} />
                </View>
                <Text style={styles.featureText}>{feature.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Choose your billing period</Text>
          <View style={[styles.plans, isWide && styles.plansWide]}>
            {renderPlan('annual', annualPackage)}
            {renderPlan('monthly', monthlyPackage)}
          </View>

          {!annualPackage && !monthlyPackage ? (
            <View style={styles.loadingBox}>
              {isLoading ? (
                <ActivityIndicator color={BRAND_BLUE} />
              ) : (
                <>
                  <Text style={styles.errorText}>
                    Subscription options are unavailable right now.
                  </Text>
                  <TouchableOpacity
                    onPress={() => void fetchOfferings()}
                    style={styles.retryButton}
                  >
                    <Text style={styles.retryText}>Try Again</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Continue with Paly Pro for ${renewalText}`}
                activeOpacity={0.86}
                disabled={isLoading || !selectedPackage}
                onPress={() => void handlePurchase()}
                style={[styles.purchaseButton, (isLoading || !selectedPackage) && styles.disabled]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.purchaseButtonText}>
                    Continue — {selectedPrice}/{selectedBillingPeriod}
                  </Text>
                )}
              </TouchableOpacity>

              <Text style={styles.renewalSummary}>{renewalText} Cancel anytime.</Text>
              {!!error && <Text style={styles.errorText}>{error}</Text>}
            </>
          )}

          <TouchableOpacity
            accessibilityRole="button"
            disabled={isRestoring}
            onPress={() => void handleRestore()}
            style={styles.restoreButton}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={BRAND_BLUE} />
            ) : (
              <Text style={styles.restoreText}>Restore Purchases</Text>
            )}
          </TouchableOpacity>

          <View style={styles.legal}>
            <Text style={styles.legalText}>
              Payment is charged to your {storeAccount} at confirmation. This subscription renews
              automatically at the billed amount shown above unless canceled at least 24 hours
              before the end of the current period. You can manage or cancel it in your account
              settings.
            </Text>
            <View style={styles.legalLinks}>
              <TouchableOpacity
                accessibilityRole="link"
                onPress={() => Linking.openURL(TERMS_URL)}
                style={styles.legalLinkButton}
              >
                <Text style={styles.legalLink}>Terms of Use (EULA)</Text>
              </TouchableOpacity>
              <Text style={styles.legalSeparator}>·</Text>
              <TouchableOpacity
                accessibilityRole="link"
                onPress={() => Linking.openURL(PRIVACY_URL)}
                style={styles.legalLinkButton}
              >
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const BRAND_BLUE = '#2050B0';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F8FC' },
  topBar: {
    minHeight: 52,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarSpacer: { width: 44, height: 44 },
  topBarTitle: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: '#17223B' },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
    backgroundColor: '#E9ECF3',
  },
  scrollContent: { flexGrow: 1, alignItems: 'center', paddingBottom: SPACING.xl },
  content: { width: '100%', maxWidth: 560, paddingHorizontal: SPACING.xl },
  contentWide: { maxWidth: 720, paddingHorizontal: SPACING['2xl'] },
  hero: { alignItems: 'center', paddingTop: SPACING.sm, paddingBottom: SPACING.xl },
  proIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: BRAND_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  title: {
    maxWidth: 500,
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
    color: '#111B32',
  },
  subtitle: {
    maxWidth: 500,
    marginTop: SPACING.sm,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#59637A',
  },
  features: { gap: SPACING.sm, marginBottom: SPACING.xl },
  featuresWide: { flexDirection: 'row', flexWrap: 'wrap', columnGap: SPACING.md },
  feature: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  featureWide: { width: '48%', flexGrow: 1 },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8EEFA',
  },
  featureText: { flex: 1, fontSize: 15, lineHeight: 20, color: '#28334A' },
  sectionTitle: {
    marginBottom: SPACING.md,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: '#17223B',
  },
  plans: { gap: SPACING.md },
  plansWide: { flexDirection: 'row' },
  planCard: { borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 2 },
  planCardWide: { flex: 1 },
  planCardSelected: { borderColor: BRAND_BLUE, backgroundColor: '#FFFFFF', ...SHADOWS.sm },
  planCardUnselected: { borderColor: '#D8DCE6', backgroundColor: '#F1F3F7' },
  planTopRow: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  planName: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: '#17223B' },
  billedLabel: {
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.8,
    fontWeight: '700',
    color: '#69738A',
  },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', marginTop: 2 },
  billedPrice: {
    fontSize: 30,
    lineHeight: 37,
    letterSpacing: -0.4,
    fontWeight: '700',
    color: '#111B32',
  },
  billedPeriod: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: '#4E5970' },
  secondaryPrice: { marginTop: 2, fontSize: 12, lineHeight: 17, color: '#737D91' },
  purchaseButton: {
    minHeight: 56,
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: BRAND_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  purchaseButtonText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  disabled: { opacity: 0.55 },
  renewalSummary: {
    marginTop: SPACING.sm,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    color: '#69738A',
  },
  loadingBox: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  errorText: {
    marginTop: SPACING.sm,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    color: '#B42318',
  },
  retryButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: SPACING.lg },
  retryText: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: BRAND_BLUE },
  restoreButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  restoreText: { fontSize: 14, lineHeight: 19, fontWeight: '600', color: BRAND_BLUE },
  legal: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D8DCE6',
    paddingTop: SPACING.md,
  },
  legalText: { fontSize: 10, lineHeight: 15, textAlign: 'center', color: '#69738A' },
  legalLinks: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  legalLink: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    color: BRAND_BLUE,
    textDecorationLine: 'underline',
  },
  legalSeparator: { fontSize: 12, color: '#8790A1' },
  legalLinkButton: { minHeight: 44, justifyContent: 'center' },
});
