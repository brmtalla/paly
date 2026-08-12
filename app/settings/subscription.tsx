import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS, SHADOWS } from '../../src/theme/spacing';
import { Card, Button } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/authStore';
import {
  useSubscriptionStore,
  FREE_CLASS_LIMIT,
  PALY_POINTS_FREE_MONTH_THRESHOLD,
} from '../../src/stores/subscriptionStore';
import { TRIAL_DAYS } from '../../src/lib/constants';
import { getTrialStatus, trialLabel } from '../../src/lib/trial';
import { Ionicons } from '@expo/vector-icons';

// Free tier: daily study chunks in-app, push notifications, and quizzes.
// Pro adds the things below — texting is the headline.
const PRO_FEATURES = [
  {
    icon: 'chatbubbles',
    title: 'Study Texts',
    description: 'Daily chunks sent straight to your messages',
  },
  {
    icon: 'chatbubble-ellipses',
    title: 'Ask Anything',
    description: 'Text back a question in Messages — answered from your own material',
  },
  {
    icon: 'layers',
    title: 'Flashcards',
    description: 'AI-generated cards for every lecture',
  },
  {
    icon: 'flash',
    title: 'Chunks On Demand',
    description: 'Pull tomorrow’s material early whenever you want',
  },
  {
    icon: 'infinite',
    title: 'Unlimited Classes',
    description: `Free plan is limited to ${FREE_CLASS_LIMIT} classes`,
  },
  {
    icon: 'trophy',
    title: 'Paly Points',
    description: `Earn ${PALY_POINTS_FREE_MONTH_THRESHOLD} pts = 1 free month`,
  },
];

export default function SubscriptionScreen() {
  const { colors } = useTheme();
  const { profile } = useAuthStore();
  const {
    isPro,
    customerInfo,
    monthlyPackage,
    annualPackage,
    isLoading,
    isRestoring,
    fetchOfferings,
    restorePurchases,
    refreshCustomerInfo,
    presentPaywall,
    presentCustomerCenter,
  } = useSubscriptionStore();

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [managingLoading, setManagingLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const trial = getTrialStatus(profile);

  useEffect(() => {
    fetchOfferings();
    refreshCustomerInfo();
  }, []);

  const handleSubscribe = async () => {
    // Use the RevenueCat-hosted paywall — fully styled, A/B-testable, includes
    // the trial copy and product list configured in the RC dashboard.
    const success = await presentPaywall();
    if (success) {
      Alert.alert('Welcome to Pro!', 'You now have access to all Paly Pro features.');
    }
  };

  const handleManage = async () => {
    setManagingLoading(true);
    try {
      // RevenueCat Customer Center: cancel, refund, swap plan, billing-issue UI,
      // promo offers — all RC-hosted with no extra UI work.
      await presentCustomerCenter();
    } finally {
      setManagingLoading(false);
    }
  };

  const handleRestore = async () => {
    const restored = await restorePurchases();
    if (restored) {
      Alert.alert('Restored!', 'Your Pro subscription has been restored.');
    } else {
      Alert.alert('No Purchase Found', 'No active subscription was found to restore.');
    }
  };

  const scrollToSubscribe = () => {
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  const monthlyPrice = monthlyPackage?.product.priceString || '$7.99';
  const annualPrice = annualPackage?.product.priceString || '$69.99';
  const annualMonthly = annualPackage
    ? `$${(annualPackage.product.price / 12).toFixed(2)}`
    : '$5.83';

  const expirationDate = customerInfo?.entitlements.active['pro']?.expirationDate;
  const renewsAt = expirationDate
    ? new Date(expirationDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[typography.titleLarge, { color: colors.text }]}>Subscription</Text>
          <View style={{ width: 40 }} />
        </Animated.View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Current Plan Card */}
          <Animated.View entering={FadeInUp.delay(200).duration(600).springify()}>
            <Card variant={isPro ? 'elevated' : 'default'} padding="lg" style={styles.planCard}>
              <View style={styles.planHeader}>
                <View
                  style={[
                    styles.planIcon,
                    { backgroundColor: isPro ? '#6366F1' : colors.backgroundSecondary },
                  ]}
                >
                  <Ionicons
                    name={isPro ? 'diamond' : 'gift'}
                    size={28}
                    color={isPro ? '#FFFFFF' : colors.text}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.titleLarge, { color: colors.text }]}>
                    {trial.isTrialing ? 'Paly Pro — Free Trial' : isPro ? 'Paly Pro' : 'Free Plan'}
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                    {trial.isTrialing
                      ? `${trialLabel(trial)}${renewsAt ? ` · Becomes paid ${renewsAt}` : ''}`
                      : isPro
                        ? renewsAt
                          ? `Renews ${renewsAt}`
                          : 'All features unlocked'
                        : `Up to ${FREE_CLASS_LIMIT} classes`}
                  </Text>
                </View>
              </View>

              {isPro ? (
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onPress={handleManage}
                  loading={managingLoading}
                  style={{ marginTop: SPACING.lg }}
                >
                  Manage Subscription
                </Button>
              ) : (
                <>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityHint="Scrolls to the Paly Pro trial button"
                    style={[styles.textingButton, { backgroundColor: '#6366F1' }]}
                    onPress={scrollToSubscribe}
                  >
                    <Ionicons name="chatbubble-ellipses" size={19} color="#FFFFFF" />
                    <Text style={[typography.titleSmall, styles.textingButtonText]}>
                      Want {profile?.assistant_name || 'Paly'} to text you?
                    </Text>
                    <Ionicons name="arrow-down" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                  {!trial.hasUsedTrial && (
                    <Text
                      style={[
                        typography.bodySmall,
                        { color: colors.textSecondary, textAlign: 'center' },
                      ]}
                    >
                      Start with {TRIAL_DAYS} days free — cancel anytime.
                    </Text>
                  )}
                </>
              )}
            </Card>
          </Animated.View>

          {/* Paly Points progress */}
          {!isPro && (
            <Animated.View
              entering={FadeInUp.delay(280).duration(600).springify()}
              style={styles.section}
            >
              <Card variant="default" padding="lg">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
                  <Ionicons name="star" size={24} color="#F59E0B" />
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.titleSmall, { color: colors.text }]}>Paly Points</Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                      {profile?.paly_points || 0} / {PALY_POINTS_FREE_MONTH_THRESHOLD} pts toward a
                      free month
                    </Text>
                  </View>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.backgroundSecondary }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: '#F59E0B',
                        width: `${Math.min(100, ((profile?.paly_points || 0) / PALY_POINTS_FREE_MONTH_THRESHOLD) * 100)}%`,
                      },
                    ]}
                  />
                </View>
              </Card>
            </Animated.View>
          )}

          {/* Features */}
          <Animated.View
            entering={FadeInUp.delay(300).duration(600).springify()}
            style={styles.section}
          >
            <Text
              style={[typography.headlineSmall, { color: colors.text, marginBottom: SPACING.lg }]}
            >
              {isPro
                ? 'Your Pro Features'
                : trial.hasUsedTrial
                  ? 'Upgrade to Pro'
                  : `Try Pro free for ${TRIAL_DAYS} days`}
            </Text>
            {PRO_FEATURES.map((f) => (
              <View key={f.title} style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#6366F115' }]}>
                  <Ionicons name={f.icon as any} size={20} color="#6366F1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.titleSmall, { color: colors.text }]}>{f.title}</Text>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                    {f.description}
                  </Text>
                </View>
                {isPro && <Ionicons name="checkmark-circle" size={22} color={colors.success} />}
              </View>
            ))}
          </Animated.View>

          {/* Plan selector + CTA (only for free users) */}
          {!isPro && (
            <>
              <Animated.View
                entering={FadeInUp.delay(400).duration(600).springify()}
                style={styles.section}
              >
                <View style={styles.planSelector}>
                  {/* Annual */}
                  <TouchableOpacity
                    style={[
                      styles.planCard2,
                      {
                        borderColor:
                          selectedPlan === 'annual' ? '#6366F1' : colors.backgroundSecondary,
                        borderWidth: selectedPlan === 'annual' ? 2 : 1,
                        backgroundColor: selectedPlan === 'annual' ? '#6366F110' : colors.card,
                      },
                    ]}
                    onPress={() => setSelectedPlan('annual')}
                  >
                    <View
                      style={[
                        styles.saveBadge,
                        {
                          backgroundColor: '#6366F1',
                          alignSelf: 'flex-start',
                          marginBottom: SPACING.xs,
                        },
                      ]}
                    >
                      <Text style={[typography.labelSmall, { color: '#fff' }]}>BEST VALUE</Text>
                    </View>
                    <Text style={[typography.titleSmall, { color: colors.text }]}>Annual</Text>
                    <Text style={[typography.headlineSmall, { color: '#6366F1' }]}>
                      {annualMonthly}/mo
                    </Text>
                    <Text style={[typography.labelSmall, { color: colors.textMuted }]}>
                      {annualPrice}/year
                    </Text>
                  </TouchableOpacity>

                  {/* Monthly */}
                  <TouchableOpacity
                    style={[
                      styles.planCard2,
                      {
                        borderColor:
                          selectedPlan === 'monthly' ? '#6366F1' : colors.backgroundSecondary,
                        borderWidth: selectedPlan === 'monthly' ? 2 : 1,
                        backgroundColor: selectedPlan === 'monthly' ? '#6366F110' : colors.card,
                      },
                    ]}
                    onPress={() => setSelectedPlan('monthly')}
                  >
                    <View style={{ height: 20, marginBottom: SPACING.xs }} />
                    <Text style={[typography.titleSmall, { color: colors.text }]}>Monthly</Text>
                    <Text style={[typography.headlineSmall, { color: colors.text }]}>
                      {monthlyPrice}/mo
                    </Text>
                    <Text style={[typography.labelSmall, { color: colors.textMuted }]}>
                      Billed monthly
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>

              <Animated.View
                entering={FadeInUp.delay(500).duration(600).springify()}
                style={styles.ctaSection}
              >
                <TouchableOpacity
                  style={[styles.subscribeButton, { backgroundColor: '#6366F1', ...SHADOWS.lg }]}
                  onPress={handleSubscribe}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={[typography.titleMedium, { color: '#fff' }]}>
                      {trial.hasUsedTrial ? 'Get Paly Pro' : `Try ${TRIAL_DAYS} Days Free`}
                    </Text>
                  )}
                </TouchableOpacity>

                <Text
                  style={[typography.bodySmall, { color: colors.textMuted, textAlign: 'center' }]}
                >
                  {trial.hasUsedTrial
                    ? `${selectedPlan === 'annual' ? `${annualPrice}/year` : `${monthlyPrice}/month`}. Cancel anytime.`
                    : `Free for ${TRIAL_DAYS} days, then ${
                        selectedPlan === 'annual' ? `${annualPrice}/year` : `${monthlyPrice}/month`
                      }. Cancel anytime.`}
                </Text>

                <TouchableOpacity
                  onPress={handleRestore}
                  disabled={isRestoring}
                  style={{ alignItems: 'center' }}
                >
                  {isRestoring ? (
                    <ActivityIndicator size="small" color={colors.textMuted} />
                  ) : (
                    <Text style={[typography.bodySmall, { color: colors.textMuted }]}>
                      Restore Purchases
                    </Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.screenPadding,
    paddingVertical: SPACING.md,
  },
  backButton: { padding: SPACING.xs },
  scrollContent: { paddingHorizontal: LAYOUT.screenPadding, paddingBottom: SPACING['3xl'] },
  planCard: { marginBottom: SPACING.xl },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  planIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  textingButtonText: {
    color: '#FFFFFF',
    flexShrink: 1,
    textAlign: 'center',
  },
  section: { marginTop: SPACING.xl },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: { height: 6, borderRadius: 3, marginTop: SPACING.md, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  planSelector: { flexDirection: 'row', gap: SPACING.md },
  planCard2: { flex: 1, borderRadius: RADIUS.xl, padding: SPACING.lg, gap: 2 },
  saveBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm },
  ctaSection: { marginTop: SPACING['2xl'], gap: SPACING.md },
  subscribeButton: { borderRadius: RADIUS.xl, paddingVertical: SPACING.lg, alignItems: 'center' },
});
