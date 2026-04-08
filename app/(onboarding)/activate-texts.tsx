import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Linking, AppState, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS, SHADOWS } from '../../src/theme/spacing';
import { Button, GlassCard } from '../../src/components/ui';
import { Ionicons } from '@expo/vector-icons';

const SENDBLUE_NUMBER = '+19293649402';
const OPT_IN_MESSAGE = 'Hi';

export default function ActivateTextsScreen() {
  const { colors } = useTheme();
  const [hasSent, setHasSent] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (!hasSent) {
          setHasSent(true);
        }
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [hasSent]);

  const openSms = () => {
    const separator = Platform.OS === 'ios' ? '&' : '?';
    const smsUrl = `sms:${SENDBLUE_NUMBER}${separator}body=${encodeURIComponent(OPT_IN_MESSAGE)}`;
    Linking.openURL(smsUrl);
  };

  const handleContinue = () => {
    router.push('/(onboarding)/assistant');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Progress */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.progress}>
          <View style={[styles.progressBar, { backgroundColor: colors.glassBackground }]}>
            <View
              style={[styles.progressFill, { backgroundColor: colors.card, width: '20%' }]}
            />
          </View>
          <Text style={[typography.labelSmall, { color: colors.textSecondary }]}>1 OF 5</Text>
        </Animated.View>

        {/* Content */}
        <View style={styles.content}>
          <Animated.View entering={FadeInDown.delay(200).duration(600).springify()}>
            <View style={[styles.iconContainer, { backgroundColor: colors.glassBackground }]}>
              <Ionicons name="chatbubble-ellipses" size={40} color={colors.text} />
            </View>

            <Text
              style={[typography.displaySmall, { color: colors.text, textAlign: 'center' }]}
            >
              Activate{'\n'}study texts
            </Text>

            <Text
              style={[
                typography.bodyLarge,
                {
                  color: colors.textSecondary,
                  textAlign: 'center',
                  marginTop: SPACING.md,
                  paddingHorizontal: SPACING.sm,
                },
              ]}
            >
              Paly sends you daily study prompts via text. To enable this, you
              need to send a quick text to our number first.
            </Text>
          </Animated.View>

          {/* Steps */}
          <Animated.View
            entering={FadeInUp.delay(400).duration(600).springify()}
            style={styles.stepsContainer}
          >
            <GlassCard padding="lg">
              <Step
                number="1"
                text={`Tap the button below — it'll open your messages with our number pre-filled`}
                colors={colors}
              />
              <View style={[styles.divider, { backgroundColor: colors.glassBackground }]} />
              <Step number="2" text="Hit send" colors={colors} />
              <View style={[styles.divider, { backgroundColor: colors.glassBackground }]} />
              <Step number="3" text="Come back here and tap Continue" colors={colors} />
            </GlassCard>
          </Animated.View>

          {/* SMS Button */}
          <Animated.View entering={FadeInUp.delay(600).duration(600).springify()}>
            <Button variant="primary" size="lg" fullWidth onPress={openSms}>
              <View style={styles.buttonInner}>
                <Ionicons name="chatbubble" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={[typography.labelLarge, { color: '#FFFFFF' }]}>
                  Text {SENDBLUE_NUMBER}
                </Text>
              </View>
            </Button>
          </Animated.View>
        </View>

        {/* Continue */}
        <Animated.View
          entering={FadeInUp.delay(800).duration(600).springify()}
          style={styles.cta}
        >
          {hasSent ? (
            <Button variant="primary" size="lg" fullWidth onPress={handleContinue}>
              Continue
            </Button>
          ) : (
            <Button variant="ghost" size="md" onPress={handleContinue}>
              I'll do this later
            </Button>
          )}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

function Step({
  number,
  text,
  colors,
}: {
  number: string;
  text: string;
  colors: any;
}) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepBadge, { backgroundColor: colors.card }]}>
        <Text style={[typography.labelMedium, { color: colors.cardText }]}>{number}</Text>
      </View>
      <Text style={[typography.bodyMedium, { color: colors.text, flex: 1 }]}>{text}</Text>
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
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.xl,
  },
  stepsContainer: {
    marginTop: SPACING['2xl'],
    marginBottom: SPACING.xl,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginVertical: SPACING.sm,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
});
