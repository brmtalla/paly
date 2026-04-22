import React, { useState, useEffect } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../src/theme/ThemeContext';
import { typography } from '../src/theme/typography';
import { SPACING, LAYOUT, RADIUS, SHADOWS } from '../src/theme/spacing';
import { useSubscriptionStore } from '../src/stores/subscriptionStore';
import { Ionicons } from '@expo/vector-icons';

const PRO_FEATURES = [
  { icon: 'infinite' as const, text: 'Unlimited classes' },
  { icon: 'chatbubbles' as const, text: 'SMS study prompts' },
  { icon: 'sparkles' as const, text: 'AI synthesis & flashcards' },
  { icon: 'help-circle' as const, text: 'Quizzes & smart review' },
  { icon: 'trophy' as const, text: 'Paly Points — earn a free month' },
];

export default function PaywallModal() {
  const { colors } = useTheme();
  const {
    monthlyPackage,
    annualPackage,
    isLoading,
    isRestoring,
    fetchOfferings,
    purchaseMonthly,
    purchaseAnnual,
    restorePurchases,
  } = useSubscriptionStore();

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');

  useEffect(() => {
    fetchOfferings();
  }, []);

  const handleSubscribe = async () => {
    const success =
      selectedPlan === 'annual' ? await purchaseAnnual() : await purchaseMonthly();
    if (success) {
      router.back();
    }
  };

  const handleRestore = async () => {
    const restored = await restorePurchases();
    if (restored) {
      Alert.alert('Restored!', 'Your Pro subscription has been restored.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('No Purchase Found', 'No active subscription was found to restore.');
    }
  };

  const monthlyPrice = monthlyPackage?.product.priceString || '$7.99';
  const annualPrice = annualPackage?.product.priceString || '$69.99';
  const annualMonthly = annualPackage
    ? `$${(annualPackage.product.price / 12).toFixed(2)}`
    : '$5.83';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={['#6366F120', colors.background]}
        style={styles.gradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </Animated.View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.delay(150).duration(600).springify()} style={styles.hero}>
            <View style={[styles.iconBg, { backgroundColor: '#6366F1' }]}>
              <Ionicons name="diamond" size={36} color="#FFFFFF" />
            </View>
            <Text style={[typography.displaySmall, { color: colors.text, textAlign: 'center', marginTop: SPACING.lg }]}>
              Upgrade to Paly Pro
            </Text>
            <Text style={[typography.bodyLarge, { color: colors.textSecondary, textAlign: 'center', marginTop: SPACING.sm }]}>
              Unlimited classes, AI prompts, and more.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(250).duration(600).springify()} style={styles.features}>
            {PRO_FEATURES.map((f) => (
              <View key={f.text} style={styles.featureRow}>
                <View style={[styles.featureIcon, { backgroundColor: '#6366F115' }]}>
                  <Ionicons name={f.icon} size={18} color="#6366F1" />
                </View>
                <Text style={[typography.bodyMedium, { color: colors.text }]}>{f.text}</Text>
              </View>
            ))}
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(350).duration(600).springify()} style={styles.planSelector}>
            <TouchableOpacity
              style={[styles.planCard, {
                borderColor: selectedPlan === 'annual' ? '#6366F1' : colors.backgroundSecondary,
                borderWidth: selectedPlan === 'annual' ? 2 : 1,
                backgroundColor: selectedPlan === 'annual' ? '#6366F110' : colors.card,
              }]}
              onPress={() => setSelectedPlan('annual')}
            >
              <View style={[styles.saveBadge, { backgroundColor: '#6366F1', alignSelf: 'flex-start', marginBottom: SPACING.xs }]}>
                <Text style={[typography.labelSmall, { color: '#fff' }]}>BEST VALUE</Text>
              </View>
              <Text style={[typography.titleSmall, { color: colors.text }]}>Annual</Text>
              <Text style={[typography.headlineSmall, { color: '#6366F1' }]}>{annualMonthly}/mo</Text>
              <Text style={[typography.labelSmall, { color: colors.textMuted }]}>{annualPrice}/year</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.planCard, {
                borderColor: selectedPlan === 'monthly' ? '#6366F1' : colors.backgroundSecondary,
                borderWidth: selectedPlan === 'monthly' ? 2 : 1,
                backgroundColor: selectedPlan === 'monthly' ? '#6366F110' : colors.card,
              }]}
              onPress={() => setSelectedPlan('monthly')}
            >
              <View style={{ height: 20, marginBottom: SPACING.xs }} />
              <Text style={[typography.titleSmall, { color: colors.text }]}>Monthly</Text>
              <Text style={[typography.headlineSmall, { color: colors.text }]}>{monthlyPrice}/mo</Text>
              <Text style={[typography.labelSmall, { color: colors.textMuted }]}>Cancel anytime</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(450).duration(600).springify()} style={styles.cta}>
            <TouchableOpacity
              style={[styles.subscribeButton, { backgroundColor: '#6366F1', ...SHADOWS.lg }]}
              onPress={handleSubscribe}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[typography.titleMedium, { color: '#fff' }]}>Try 7 Days Free</Text>
              )}
            </TouchableOpacity>

            <Text style={[typography.bodySmall, { color: colors.textMuted, textAlign: 'center' }]}>
              Free for 7 days, then {selectedPlan === 'annual' ? `${annualPrice}/year` : `${monthlyPrice}/month`}.
            </Text>

            <TouchableOpacity onPress={handleRestore} disabled={isRestoring} style={{ alignItems: 'center' }}>
              {isRestoring
                ? <ActivityIndicator size="small" color={colors.textMuted} />
                : <Text style={[typography.bodySmall, { color: colors.textMuted }]}>Restore Purchases</Text>
              }
            </TouchableOpacity>
          </Animated.View>

          <Text style={[typography.labelSmall, { color: colors.textMuted, textAlign: 'center', marginTop: SPACING.lg, paddingHorizontal: SPACING.xl }]}>
            Subscriptions auto-renew. Cancel any time in your App Store settings.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: '45%' },
  safeArea: { flex: 1 },
  headerRow: { paddingHorizontal: LAYOUT.screenPadding, paddingTop: SPACING.xs, alignItems: 'flex-end' },
  closeButton: { padding: SPACING.sm },
  scrollContent: { paddingHorizontal: LAYOUT.screenPadding, paddingBottom: SPACING['3xl'] },
  hero: { alignItems: 'center', paddingTop: SPACING.xl, paddingBottom: SPACING['2xl'] },
  iconBg: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  features: { gap: SPACING.md, marginBottom: SPACING['2xl'] },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  featureIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  planSelector: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING['2xl'] },
  planCard: { flex: 1, borderRadius: RADIUS.xl, padding: SPACING.lg, gap: 2 },
  saveBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm },
  cta: { gap: SPACING.md },
  subscribeButton: { borderRadius: RADIUS.xl, paddingVertical: SPACING.lg, alignItems: 'center' },
});
