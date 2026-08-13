import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT, SHADOWS } from '../../src/theme/spacing';
import { Button } from '../../src/components/ui';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Hero Section */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(800).springify()}
          style={styles.heroSection}
        >
          {/* App icon/logo */}
          <View style={[styles.logoContainer, { backgroundColor: colors.card, ...SHADOWS.lg }]}>
            <Ionicons name="book" size={48} color={colors.onCard} />
          </View>

          <Animated.Text
            entering={FadeIn.delay(400).duration(600)}
            style={[styles.title, typography.displayMedium, { color: colors.text }]}
          >
            Study without{'\n'}cramming
          </Animated.Text>

          <Animated.Text
            entering={FadeIn.delay(600).duration(600)}
            style={[styles.subtitle, typography.bodyLarge, { color: colors.textSecondary }]}
          >
            Your personal study companion that helps you learn{' '}
            <Text style={{ color: colors.text, fontWeight: '600' }}>consistently</Text>, not just
            before exams.
          </Animated.Text>
        </Animated.View>

        {/* Features */}
        <Animated.View
          entering={FadeInUp.delay(800).duration(600)}
          style={styles.featuresContainer}
        >
          <FeatureItem
            icon="notifications-outline"
            title="Smart Reminders"
            description="Get personalized study nuggets at the right time"
            colors={colors}
          />
          <FeatureItem
            icon="sparkles-outline"
            title="AI Synthesis"
            description="Turn your notes into bite-sized study content"
            colors={colors}
          />
          <FeatureItem
            icon="trophy-outline"
            title="Better Retention"
            description="Learn gradually, remember longer"
            colors={colors}
          />
        </Animated.View>

        {/* CTA Buttons */}
        <Animated.View entering={FadeInUp.delay(1000).duration(600)} style={styles.ctaContainer}>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onPress={() => router.push('/(auth)/sign-up')}
          >
            Get Started
          </Button>

          <Button
            variant="ghost"
            size="lg"
            fullWidth
            style={styles.signInButton}
            onPress={() => router.push('/(auth)/sign-in')}
          >
            I already have an account
          </Button>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  colors: any;
}

function FeatureItem({ icon, title, description, colors }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: colors.glassBackground }]}>
        <Ionicons name={icon} size={20} color={colors.text} />
      </View>
      <View style={styles.featureText}>
        <Text style={[typography.titleSmall, { color: colors.text }]}>{title}</Text>
        <Text style={[typography.bodySmall, { color: colors.textTertiary, marginTop: 2 }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: LAYOUT.screenPadding,
  },
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SPACING['3xl'],
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
    lineHeight: 24,
  },
  featuresContainer: {
    gap: SPACING.lg,
    marginBottom: SPACING['3xl'],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
  },
  ctaContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  signInButton: {
    marginTop: SPACING.xs,
  },
});
