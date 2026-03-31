import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS, SHADOWS } from '../../src/theme/spacing';
import { Card, Button } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/authStore';
import { supabase } from '../../src/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const PREMIUM_FEATURES = [
  { icon: 'chatbubbles', title: 'SMS Study Prompts', description: 'Get prompts via text message' },
  {
    icon: 'sparkles',
    title: 'Advanced Synthesis',
    description: 'Deeper analysis & more flashcards',
  },
  { icon: 'school', title: 'Exam Mode', description: 'Intensive review before exams' },
  { icon: 'infinite', title: 'Unlimited Classes', description: 'No limit on class count' },
  { icon: 'cloud-upload', title: 'More Storage', description: 'Upload larger files' },
];

export default function SubscriptionScreen() {
  const { colors } = useTheme();
  const { profile, updateProfile } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      // Call edge function to create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: 'price_paly_premium_monthly', // You'd create this in Stripe
          userId: profile?.id,
          email: profile?.email,
        },
      });

      if (error) throw error;

      // Open Stripe checkout URL
      if (data?.url) {
        await Linking.openURL(data.url);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start checkout');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading(true);
    try {
      // Call edge function to create Stripe customer portal session
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: {
          customerId: profile?.stripe_customer_id,
        },
      });

      if (error) throw error;

      if (data?.url) {
        await Linking.openURL(data.url);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to open subscription portal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[typography.titleLarge, { color: colors.text }]}>Subscription</Text>
          <View style={{ width: 40 }} />
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Current Plan */}
          <Animated.View entering={FadeInUp.delay(200).duration(600).springify()}>
            <Card
              variant={profile?.is_premium ? 'accent' : 'default'}
              padding="lg"
              style={styles.planCard}
            >
              <View style={styles.planHeader}>
                <View
                  style={[
                    styles.planIcon,
                    {
                      backgroundColor: profile?.is_premium
                        ? colors.accent
                        : colors.backgroundSecondary,
                    },
                  ]}
                >
                  <Ionicons
                    name={profile?.is_premium ? 'diamond' : 'gift'}
                    size={28}
                    color={profile?.is_premium ? '#FFFFFF' : colors.text}
                  />
                </View>
                <View>
                  <Text style={[typography.titleLarge, { color: colors.text }]}>
                    {profile?.is_premium ? 'Premium' : 'Free Plan'}
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                    {profile?.is_premium ? 'All features unlocked' : 'Basic features'}
                  </Text>
                </View>
              </View>

              {profile?.is_premium ? (
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onPress={handleManageSubscription}
                  loading={isLoading}
                  style={{ marginTop: SPACING.lg }}
                >
                  Manage Subscription
                </Button>
              ) : (
                <View style={styles.priceContainer}>
                  <Text style={[typography.displaySmall, { color: colors.accent }]}>$4.99</Text>
                  <Text style={[typography.bodySmall, { color: colors.textMuted }]}>/month</Text>
                </View>
              )}
            </Card>
          </Animated.View>

          {/* Premium Features */}
          <Animated.View
            entering={FadeInUp.delay(300).duration(600).springify()}
            style={styles.section}
          >
            <Text
              style={[typography.headlineSmall, { color: colors.text, marginBottom: SPACING.lg }]}
            >
              {profile?.is_premium ? 'Your Premium Features' : 'Upgrade to Premium'}
            </Text>

            {PREMIUM_FEATURES.map((feature, index) => (
              <Animated.View
                key={feature.title}
                entering={FadeInUp.delay(index * 100 + 400).duration(400)}
              >
                <View style={styles.featureItem}>
                  <View style={[styles.featureIcon, { backgroundColor: colors.accentLight }]}>
                    <Ionicons name={feature.icon as any} size={20} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.titleSmall, { color: colors.text }]}>
                      {feature.title}
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                      {feature.description}
                    </Text>
                  </View>
                  {profile?.is_premium && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                  )}
                </View>
              </Animated.View>
            ))}
          </Animated.View>

          {/* Free vs Premium comparison */}
          {!profile?.is_premium && (
            <Animated.View
              entering={FadeInUp.delay(600).duration(600).springify()}
              style={styles.section}
            >
              <Card variant="elevated" padding="lg">
                <Text
                  style={[typography.titleMedium, { color: colors.text, marginBottom: SPACING.lg }]}
                >
                  Compare Plans
                </Text>

                <ComparisonRow label="Classes" free="3 max" premium="Unlimited" colors={colors} />
                <ComparisonRow
                  label="Study Prompts"
                  free="Push only"
                  premium="Push + SMS"
                  colors={colors}
                />
                <ComparisonRow
                  label="Flashcards"
                  free="5 per session"
                  premium="Unlimited"
                  colors={colors}
                />
                <ComparisonRow
                  label="Quiz Questions"
                  free="5 per session"
                  premium="Unlimited"
                  colors={colors}
                />
                <ComparisonRow
                  label="File Uploads"
                  free="10MB max"
                  premium="50MB max"
                  colors={colors}
                  isLast
                />
              </Card>
            </Animated.View>
          )}

          {/* CTA */}
          {!profile?.is_premium && (
            <Animated.View
              entering={FadeInUp.delay(700).duration(600).springify()}
              style={styles.ctaSection}
            >
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onPress={handleSubscribe}
                loading={isLoading}
                icon={<Ionicons name="diamond" size={20} color="#FFFFFF" />}
              >
                Upgrade to Premium
              </Button>
              <Text
                style={[
                  typography.bodySmall,
                  { color: colors.textMuted, textAlign: 'center', marginTop: SPACING.md },
                ]}
              >
                Cancel anytime. 7-day free trial included.
              </Text>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

interface ComparisonRowProps {
  label: string;
  free: string;
  premium: string;
  colors: any;
  isLast?: boolean;
}

function ComparisonRow({ label, free, premium, colors, isLast }: ComparisonRowProps) {
  return (
    <View
      style={[
        styles.comparisonRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.backgroundSecondary },
      ]}
    >
      <Text style={[typography.bodyMedium, { color: colors.text, flex: 1 }]}>{label}</Text>
      <Text
        style={[typography.bodySmall, { color: colors.textMuted, width: 80, textAlign: 'center' }]}
      >
        {free}
      </Text>
      <Text
        style={[
          typography.bodySmall,
          { color: colors.accent, width: 80, textAlign: 'center', fontWeight: '600' },
        ]}
      >
        {premium}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.screenPadding,
    paddingVertical: SPACING.md,
  },
  backButton: {
    padding: SPACING.xs,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingBottom: SPACING['3xl'],
  },
  planCard: {
    marginBottom: SPACING.xl,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  planIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: SPACING.lg,
    gap: SPACING.xs,
  },
  section: {
    marginTop: SPACING.xl,
  },
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
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  ctaSection: {
    marginTop: SPACING['2xl'],
  },
});
