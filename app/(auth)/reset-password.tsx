import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { Button, Input } from '../../src/components/ui';
import { mergeAuthLinkParams } from '../../src/lib/authLinks';
import { supabase } from '../../src/lib/supabase';
import { LAYOUT, SPACING } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import { useTheme } from '../../src/theme/ThemeContext';

interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

type LinkStatus = 'checking' | 'ready' | 'invalid';

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const url = Linking.useURL();
  const routeParams = useLocalSearchParams<Record<string, string | string[]>>();
  const handledLinkRef = useRef(false);
  const [status, setStatus] = useState<LinkStatus>('checking');
  const [statusMessage, setStatusMessage] = useState('Opening reset link...');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  useEffect(() => {
    if (handledLinkRef.current) {
      return;
    }

    const openRecoverySession = async () => {
      handledLinkRef.current = true;
      const initialUrl = url ?? (await Linking.getInitialURL());
      const params = mergeAuthLinkParams(routeParams, initialUrl);

      if (params.error || params.error_description) {
        setStatus('invalid');
        setStatusMessage(params.error_description || params.error || 'This reset link is invalid.');
        return;
      }

      if (params.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(params.code);
        if (error) {
          setStatus('invalid');
          setStatusMessage(error.message);
          return;
        }

        setStatus('ready');
        setStatusMessage('Choose a new password.');
        return;
      }

      if (params.access_token && params.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        if (error) {
          setStatus('invalid');
          setStatusMessage(error.message);
          return;
        }

        setStatus('ready');
        setStatusMessage('Choose a new password.');
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setStatus('ready');
        setStatusMessage('Choose a new password.');
        return;
      }

      setStatus('invalid');
      setStatusMessage('This reset link is missing its recovery token. Request a fresh link.');
    };

    void openRecoverySession();
  }, [routeParams, url]);

  const onSubmit = async (data: ResetPasswordForm) => {
    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: data.password });
    setIsSubmitting(false);

    if (error) {
      Alert.alert('Update Failed', error.message);
      return;
    }

    await supabase.auth.signOut();
    Alert.alert('Password Updated', 'Sign in with your new password.', [
      { text: 'OK', onPress: () => router.replace('/(auth)/sign-in') },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeInDown.delay(100).duration(600).springify()}>
              <View style={[styles.icon, { backgroundColor: colors.glassBackground }]}>
                <Ionicons name="key-outline" size={34} color={colors.text} />
              </View>

              <Text
                style={[typography.displaySmall, { color: colors.text, marginTop: SPACING.xl }]}
              >
                Set a new{'\n'}password
              </Text>

              <Text
                style={[
                  typography.bodyLarge,
                  { color: colors.textSecondary, marginTop: SPACING.md },
                ]}
              >
                {statusMessage}
              </Text>
            </Animated.View>

            {status === 'ready' && (
              <Animated.View
                entering={FadeInUp.delay(250).duration(600).springify()}
                style={styles.form}
              >
                <Controller
                  control={control}
                  name="password"
                  rules={{
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Use at least 8 characters',
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      variant="glass"
                      label="New password"
                      placeholder="Enter a new password"
                      isPassword
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.password?.message}
                      leftIcon={
                        <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
                      }
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="confirmPassword"
                  rules={{
                    required: 'Please confirm your password',
                    validate: (value) => value === password || 'Passwords do not match',
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      variant="glass"
                      label="Confirm password"
                      placeholder="Confirm your new password"
                      isPassword
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.confirmPassword?.message}
                      leftIcon={
                        <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
                      }
                    />
                  )}
                />

                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  loading={isSubmitting}
                  onPress={handleSubmit(onSubmit)}
                  style={{ marginTop: SPACING.md }}
                >
                  Update Password
                </Button>
              </Animated.View>
            )}

            {status === 'invalid' && (
              <Animated.View
                entering={FadeInUp.delay(250).duration(600).springify()}
                style={styles.form}
              >
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onPress={() => router.replace('/(auth)/forgot-password')}
                >
                  Request New Link
                </Button>
              </Animated.View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.screenPadding,
    paddingBottom: SPACING['3xl'],
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    marginTop: SPACING['3xl'],
  },
});
