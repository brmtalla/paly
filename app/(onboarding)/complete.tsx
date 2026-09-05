import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT } from '../../src/theme/spacing';
import { Button } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function CompleteScreen() {
  const { colors } = useTheme();
  const { profile } = useAuthStore();

  // Celebration animation
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(200, withSpring(1, { damping: 8, stiffness: 100 }));
    rotation.value = withDelay(
      200,
      withSequence(
        withSpring(-5, { damping: 4 }),
        withSpring(5, { damping: 4 }),
        withSpring(0, { damping: 6 })
      )
    );
  }, [rotation, scale]);

  const celebrationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));

  const handleStart = () => {
    router.push('/(onboarding)/paywall');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.accentLight, colors.background]}
        style={styles.gradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Celebration icon */}
            <Animated.View style={[styles.iconContainer, celebrationStyle]}>
              <View style={[styles.iconBg, { backgroundColor: colors.accent }]}>
                <Ionicons name="checkmark" size={56} color="#FFFFFF" />
              </View>
            </Animated.View>

            {/* Title */}
            <Animated.View entering={FadeInUp.delay(400).duration(600).springify()}>
              <Text style={[typography.displayMedium, { color: colors.text, textAlign: 'center' }]}>
                You&apos;re all set!
              </Text>

              <Text
                style={[
                  typography.bodyLarge,
                  {
                    color: colors.textSecondary,
                    textAlign: 'center',
                    marginTop: SPACING.lg,
                    paddingHorizontal: SPACING.lg,
                  },
                ]}
              >
                {profile?.assistant_name || 'Paly'} is ready. Unlock texts to your phone — or start
                with study nuggets in the app.
              </Text>
            </Animated.View>

            {/* Features summary */}
            <Animated.View
              entering={FadeInUp.delay(600).duration(600).springify()}
              style={styles.featuresContainer}
            >
              <FeatureCheck
                icon="notifications"
                text="Class reminders are enabled"
                colors={colors}
              />
              <FeatureCheck icon="sparkles" text="AI synthesis ready to go" colors={colors} />
              <FeatureCheck icon="book" text="Daily study nuggets scheduled" colors={colors} />
            </Animated.View>
          </View>

          {/* CTA */}
          <Animated.View entering={FadeIn.delay(800).duration(600)} style={styles.cta}>
            <Button variant="primary" size="lg" fullWidth onPress={handleStart}>
              Continue
            </Button>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

interface FeatureCheckProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  colors: any;
}

function FeatureCheck({ icon, text, colors }: FeatureCheckProps) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: colors.accentLight }]}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>
      <Text style={[typography.bodyMedium, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: LAYOUT.screenPadding,
    paddingVertical: SPACING.xl,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: SPACING['2xl'],
  },
  iconBg: {
    width: 100,
    height: 100,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuresContainer: {
    marginTop: SPACING['3xl'],
    gap: SPACING.lg,
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cta: {
    marginTop: SPACING['2xl'],
  },
});
