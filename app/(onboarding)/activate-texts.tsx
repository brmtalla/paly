import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, AppState, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS } from '../../src/theme/spacing';
import { Button, GlassCard } from '../../src/components/ui';
import { IMessagePreview } from '../../src/components/iMessagePreview';
import { useAuthStore } from '../../src/stores/authStore';
import { PALY_SMS_NUMBER } from '../../src/lib/constants';
import { Ionicons } from '@expo/vector-icons';

export default function ActivateTextsScreen() {
  const { colors } = useTheme();
  const { profile, fetchProfile } = useAuthStore();
  const [isChecking, setIsChecking] = useState(false);
  const appState = useRef(AppState.currentState);

  const linkCode = profile?.sms_link_code;
  // The webhook writes phone_number the moment it resolves the code, so a
  // populated number is proof the link actually landed — not merely that the
  // student left the app and came back.
  const isLinked = !!profile?.phone_number;

  // The opt-in text has to carry the code; a bare "Hi" gives the webhook a phone
  // number with no way to tell which account it belongs to.
  const optInMessage = linkCode ? `Link my Paly account: ${linkCode}` : 'Link my Paly account';

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const returning = appState.current.match(/inactive|background/) && nextAppState === 'active';
      appState.current = nextAppState;

      // Coming back from Messages is the moment the link is most likely to have
      // just happened, so that is when it is worth re-reading the profile.
      if (returning && !isLinked) {
        setIsChecking(true);
        fetchProfile().finally(() => setIsChecking(false));
      }
    });

    return () => subscription.remove();
  }, [isLinked, fetchProfile]);

  const openSms = () => {
    const separator = Platform.OS === 'ios' ? '&' : '?';
    const smsUrl = `sms:${PALY_SMS_NUMBER}${separator}body=${encodeURIComponent(optInMessage)}`;
    Linking.openURL(smsUrl);
  };

  const handleContinue = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Progress */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.progress}>
          <View style={[styles.progressBar, { backgroundColor: colors.glassBackground }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.card, width: '20%' }]} />
          </View>
          <Text style={[typography.labelSmall, { color: colors.textSecondary }]}>1 OF 5</Text>
        </Animated.View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.delay(200).duration(600).springify()}>
            <View style={[styles.iconContainer, { backgroundColor: colors.glassBackground }]}>
              <Ionicons
                name={isLinked ? 'checkmark-circle' : 'chatbubble-ellipses'}
                size={40}
                color={isLinked ? colors.success : colors.text}
              />
            </View>

            <Text style={[typography.displaySmall, { color: colors.text, textAlign: 'center' }]}>
              {isLinked ? `You're all set` : `Get texts from\n${profile?.assistant_name || 'Paly'}`}
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
              {isLinked
                ? 'Your number is linked. Daily chunks will land in your messages — and you can text back with a question any time.'
                : 'Pro is on. Link your number and the same study nuggets you see in the app will also arrive as texts.'}
            </Text>
          </Animated.View>

          {/* What Pro texting actually looks like */}
          <Animated.View
            entering={FadeInUp.delay(400).duration(600).springify()}
            style={styles.stepsContainer}
          >
            <IMessagePreview
              delay={500}
              assistantName={profile?.assistant_name || 'Paly'}
              caption="This is what a study text looks like once your number is linked."
            />
          </Animated.View>

          {/* Free tier reassurance + opt-in steps */}
          <Animated.View entering={FadeInUp.delay(700).duration(600).springify()}>
            <GlassCard padding="lg">
              <Text style={[typography.labelMedium, { color: colors.text }]}>
                Same nuggets, now in Messages
              </Text>
              <Text
                style={[
                  typography.bodySmall,
                  { color: colors.textSecondary, marginTop: SPACING.xs },
                ]}
              >
                Everything still shows up in the app. Linking your number is how those chunks also
                arrive as texts you can reply to.
              </Text>

              {!isLinked && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.glassBackground }]} />

                  <Text
                    style={[
                      typography.labelSmall,
                      { color: colors.textMuted, marginBottom: SPACING.sm },
                    ]}
                  >
                    TO RECEIVE TEXTS, LINK YOUR NUMBER
                  </Text>

                  <Step
                    number="1"
                    text="Tap below — it opens Messages with your personal code already filled in"
                    colors={colors}
                  />
                  <View style={[styles.divider, { backgroundColor: colors.glassBackground }]} />
                  <Step
                    number="2"
                    text="Hit send, then come back — we'll confirm it here"
                    colors={colors}
                  />

                  {linkCode && (
                    <View style={[styles.codeChip, { backgroundColor: colors.glassBackground }]}>
                      <Text style={[typography.labelSmall, { color: colors.textMuted }]}>
                        YOUR CODE
                      </Text>
                      <Text style={[styles.codeText, { color: colors.text }]}>{linkCode}</Text>
                    </View>
                  )}
                </>
              )}
            </GlassCard>
          </Animated.View>

          {/* SMS button, or the confirmed state */}
          {!isLinked && (
            <Animated.View
              entering={FadeInUp.delay(800).duration(600).springify()}
              style={{ marginTop: SPACING.lg }}
            >
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onPress={openSms}
                loading={isChecking}
                disabled={!linkCode}
              >
                <View style={styles.buttonInner}>
                  <Ionicons
                    name="chatbubble"
                    size={18}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[typography.labelLarge, { color: '#FFFFFF' }]}>
                    Text {PALY_SMS_NUMBER}
                  </Text>
                </View>
              </Button>

              {/* Required disclosure for A2P messaging. */}
              <Text
                style={[
                  typography.bodySmall,
                  { color: colors.textMuted, textAlign: 'center', marginTop: SPACING.sm },
                ]}
              >
                Msg &amp; data rates may apply. Reply STOP at any time to opt out.
              </Text>
            </Animated.View>
          )}
        </ScrollView>

        {/* Continue */}
        <Animated.View entering={FadeInUp.delay(800).duration(600).springify()} style={styles.cta}>
          {isLinked ? (
            <Button variant="primary" size="lg" fullWidth onPress={handleContinue}>
              Continue
            </Button>
          ) : (
            <Button variant="ghost" size="md" onPress={handleContinue}>
              I&apos;ll link my number later
            </Button>
          )}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

function Step({ number, text, colors }: { number: string; text: string; colors: any }) {
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
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
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
  codeChip: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: 2,
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
