import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { EmailOtpType, Session } from '@supabase/supabase-js';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/ui';
import { mergeAuthLinkParams } from '../../src/lib/authLinks';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { LAYOUT, SPACING } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import { useTheme } from '../../src/theme/ThemeContext';

type ConfirmationStatus = 'checking' | 'invalid';

export default function ConfirmEmailScreen() {
  const { colors } = useTheme();
  const url = Linking.useURL();
  const routeParams = useLocalSearchParams<Record<string, string | string[]>>();
  const handledLinkRef = useRef(false);
  const [status, setStatus] = useState<ConfirmationStatus>('checking');
  const [message, setMessage] = useState('Confirming your email...');

  useEffect(() => {
    if (handledLinkRef.current) return;

    const confirmEmail = async () => {
      handledLinkRef.current = true;
      const initialUrl = url ?? (await Linking.getInitialURL());
      const params = mergeAuthLinkParams(routeParams, initialUrl);

      if (params.error || params.error_description) {
        setStatus('invalid');
        setMessage(
          params.error_description || params.error || 'This confirmation link is invalid.'
        );
        return;
      }

      let session: Session | null = null;
      let error: Error | null = null;

      if (params.code) {
        const result = await supabase.auth.exchangeCodeForSession(params.code);
        session = result.data.session;
        error = result.error;
      } else if (params.access_token && params.refresh_token) {
        const result = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        session = result.data.session;
        error = result.error;
      } else if (params.token_hash) {
        const result = await supabase.auth.verifyOtp({
          token_hash: params.token_hash,
          type: (params.type || 'signup') as EmailOtpType,
        });
        session = result.data.session;
        error = result.error;
      } else {
        const result = await supabase.auth.getSession();
        session = result.data.session;
        error = result.error;
      }

      if (error || !session?.user) {
        setStatus('invalid');
        setMessage(error?.message || 'This confirmation link is missing its sign-in session.');
        return;
      }

      await useAuthStore.getState().fetchProfile();
      const profile = useAuthStore.getState().profile;
      router.replace(profile?.onboarding_completed ? '/(tabs)' : '/(onboarding)/activate-texts');
    };

    void confirmEmail();
  }, [routeParams, url]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(500)} style={styles.content}>
            <View style={[styles.icon, { backgroundColor: colors.glassBackground }]}>
              <Ionicons
                name={status === 'checking' ? 'mail-open-outline' : 'alert-circle-outline'}
                size={42}
                color={colors.text}
              />
            </View>

            <Text style={[typography.headlineMedium, styles.centerText, { color: colors.text }]}>
              {status === 'checking' ? 'Opening Paly' : 'Link expired'}
            </Text>
            <Text style={[typography.bodyLarge, styles.message, { color: colors.textSecondary }]}>
              {message}
            </Text>

            {status === 'invalid' ? (
              <Animated.View entering={FadeInUp.duration(400)} style={styles.actions}>
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onPress={() => router.replace('/(auth)/sign-up')}
                >
                  Create Account Again
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  fullWidth
                  onPress={() => router.replace('/(auth)/sign-in')}
                >
                  Sign In Instead
                </Button>
              </Animated.View>
            ) : null}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: LAYOUT.screenPadding,
  },
  icon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  centerText: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  actions: {
    width: '100%',
    gap: SPACING.sm,
    marginTop: SPACING['2xl'],
  },
});
