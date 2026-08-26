import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AUTH_CANCELLED,
  isAppleSignInAvailable,
  isGoogleSignInConfigured,
} from '../lib/socialAuth';
import { useAuthStore } from '../stores/authStore';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SPACING } from '../theme/spacing';
import { typography } from '../theme/typography';

type Provider = 'apple' | 'google';

/**
 * Apple and Google sign-in, shown above the email form.
 *
 * Guideline 4.8: offering Google means an equivalent privacy-preserving option
 * has to be offered too, which is what Sign In with Apple is here. If Apple's
 * button ever fails to render, Google must not be left on screen alone.
 */
export function SocialAuthButtons({ onSuccess }: { onSuccess?: () => void }) {
  const { colors } = useTheme();
  const { signInWithApple, signInWithGoogle } = useAuthStore();

  const [appleReady, setAppleReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState<Provider | null>(null);

  const googleReady = isGoogleSignInConfigured();

  useEffect(() => {
    let active = true;
    void isAppleSignInAvailable().then((ok) => {
      if (active) {
        setAppleReady(ok);
        setChecked(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const run = async (provider: Provider) => {
    if (busy) return;
    setBusy(provider);
    const { error } = provider === 'apple' ? await signInWithApple() : await signInWithGoogle();
    setBusy(null);

    if (error) {
      // Backing out of the native sheet is not a failure worth alerting about.
      if ((error as { code?: string }).code === AUTH_CANCELLED) return;
      Alert.alert('Could not sign in', error.message || 'Please try again.');
      return;
    }
    onSuccess?.();
  };

  // Nothing to show until the Apple check resolves, and never Google on its own.
  if (!checked) return null;
  if (!appleReady && !googleReady) return null;
  if (!appleReady) return null;

  return (
    <View style={styles.wrap}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={RADIUS.lg}
        style={styles.appleButton}
        onPress={() => void run('apple')}
      />

      {googleReady && (
        <Pressable
          onPress={() => void run('google')}
          disabled={!!busy}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}
        >
          {busy === 'google' ? (
            <ActivityIndicator color="#1F1F1F" />
          ) : (
            <>
              <Ionicons name="logo-google" size={18} color="#1F1F1F" />
              <Text style={styles.googleLabel}>Continue with Google</Text>
            </>
          )}
        </Pressable>
      )}

      <View style={styles.dividerRow}>
        <View style={[styles.rule, { backgroundColor: colors.glassBackground }]} />
        <Text style={[typography.labelSmall, { color: colors.textMuted }]}>OR</Text>
        <View style={[styles.rule, { backgroundColor: colors.glassBackground }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: SPACING.sm,
  },
  // Apple requires their own button component at a minimum height of 44.
  appleButton: {
    height: 50,
    width: '100%',
  },
  // Google's branding guidelines: white surface, dark text, their mark.
  googleButton: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DADCE0',
  },
  pressed: {
    opacity: 0.85,
  },
  googleLabel: {
    color: '#1F1F1F',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
});
