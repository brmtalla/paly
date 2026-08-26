import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useForm, Controller } from 'react-hook-form';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT } from '../../src/theme/spacing';
import { Button, Input } from '../../src/components/ui';
import { SocialAuthButtons } from '../../src/components/SocialAuthButtons';
import { useAuthStore } from '../../src/stores/authStore';
import { Ionicons } from '@expo/vector-icons';

interface SignUpForm {
  email: string;
  password: string;
  confirmPassword: string;
}

export default function SignUpScreen() {
  const { colors } = useTheme();
  const { signUp, isLoading } = useAuthStore();
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SignUpForm>({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  const onSubmit = async (data: SignUpForm) => {
    const { error } = await signUp(data.email, data.password);

    if (error) {
      Alert.alert('Sign Up Failed', error.message);
    } else {
      setShowSuccess(true);
    }
  };

  if (showSuccess) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.safeArea}>
          <Animated.View
            entering={FadeInUp.duration(600).springify()}
            style={styles.successContainer}
          >
            <View style={[styles.successIcon, { backgroundColor: colors.glassBackground }]}>
              <Ionicons name="mail-outline" size={48} color={colors.text} />
            </View>

            <Text style={[typography.headlineMedium, { color: colors.text, textAlign: 'center' }]}>
              Check your email
            </Text>

            <Text
              style={[
                typography.bodyLarge,
                {
                  color: colors.textSecondary,
                  textAlign: 'center',
                  marginTop: SPACING.md,
                },
              ]}
            >
              We&apos;ve sent you a confirmation link. Tap it on this phone and Paly will reopen
              directly in setup.
            </Text>

            <Button
              variant="ghost"
              size="lg"
              fullWidth
              style={{ marginTop: SPACING['2xl'] }}
              onPress={() => router.replace('/(auth)/welcome')}
            >
              Back to Welcome
            </Button>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

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
            {/* Header */}
            <Animated.View entering={FadeInDown.delay(100).duration(600).springify()}>
              <Button
                variant="ghost"
                size="sm"
                icon={<Ionicons name="arrow-back" size={20} color={colors.text} />}
                style={styles.backButton}
                onPress={() => router.back()}
              >
                Back
              </Button>

              <Text
                style={[typography.displaySmall, { color: colors.text, marginTop: SPACING.xl }]}
              >
                Create your{'\n'}account
              </Text>

              <Text
                style={[
                  typography.bodyLarge,
                  { color: colors.textSecondary, marginTop: SPACING.md },
                ]}
              >
                Join thousands of students studying smarter
              </Text>
            </Animated.View>

            {/* Form */}
            <Animated.View
              entering={FadeInUp.delay(300).duration(600).springify()}
              style={styles.form}
            >
              <SocialAuthButtons />

              <Controller
                control={control}
                name="email"
                rules={{
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Please enter a valid email',
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    variant="glass"
                    label="Email"
                    placeholder="you@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.email?.message}
                    leftIcon={<Ionicons name="mail-outline" size={20} color={colors.textMuted} />}
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                rules={{
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters',
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    variant="glass"
                    label="Password"
                    placeholder="Create a password"
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
                    label="Confirm Password"
                    placeholder="Confirm your password"
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
                loading={isLoading}
                onPress={handleSubmit(onSubmit)}
                style={{ marginTop: SPACING.md }}
              >
                Create Account
              </Button>

              <View style={styles.signInPrompt}>
                <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
                  Already have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')}>
                  <Text style={[typography.bodyMedium, { color: colors.text, fontWeight: '600' }]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
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
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: LAYOUT.screenPadding,
    paddingBottom: SPACING['3xl'],
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  form: {
    marginTop: SPACING['3xl'],
  },
  signInPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginTop: SPACING.xl,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.screenPadding,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
});
