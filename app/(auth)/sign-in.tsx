import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useForm, Controller } from 'react-hook-form';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT } from '../../src/theme/spacing';
import { Button, Input } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/authStore';
import { Ionicons } from '@expo/vector-icons';

interface SignInForm {
  email: string;
  password: string;
}

export default function SignInScreen() {
  const { colors } = useTheme();
  const { signIn, isLoading } = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInForm>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: SignInForm) => {
    const { error } = await signIn(data.email, data.password);

    if (error) {
      Alert.alert('Sign In Failed', error.message);
    }
    // Navigation happens automatically via auth state change
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
            {/* Header */}
            <Animated.View entering={FadeInDown.delay(100).duration(600).springify()}>
              <Link href="/(auth)/welcome" asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Ionicons name="arrow-back" size={20} color={colors.text} />}
                  style={styles.backButton}
                  onPress={() => {}}
                >
                  Back
                </Button>
              </Link>

              <Text
                style={[typography.displaySmall, { color: colors.text, marginTop: SPACING.xl }]}
              >
                Welcome{'\n'}back
              </Text>

              <Text
                style={[
                  typography.bodyLarge,
                  { color: colors.textSecondary, marginTop: SPACING.md },
                ]}
              >
                Sign in to continue your study journey
              </Text>
            </Animated.View>

            {/* Form */}
            <Animated.View
              entering={FadeInUp.delay(300).duration(600).springify()}
              style={styles.form}
            >
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
                    label="Email"
                    placeholder="you@university.edu"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.email?.message}
                    leftIcon={
                      <Ionicons name="mail-outline" size={20} color={colors.cardTextMuted} />
                    }
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                rules={{
                  required: 'Password is required',
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Password"
                    placeholder="Enter your password"
                    isPassword
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                    leftIcon={
                      <Ionicons name="lock-closed-outline" size={20} color={colors.cardTextMuted} />
                    }
                  />
                )}
              />

              <Link href={'/(auth)/forgot-password' as any} asChild>
                <Text
                  style={[
                    typography.bodySmall,
                    { color: colors.textSecondary, textAlign: 'right', marginTop: SPACING.sm },
                  ]}
                >
                  Forgot password?
                </Text>
              </Link>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={isLoading}
                onPress={handleSubmit(onSubmit)}
                style={{ marginTop: SPACING.md }}
                textStyle={{ color: colors.accent }}
              >
                Sign In
              </Button>

              <View style={styles.signUpPrompt}>
                <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
                  Don&apos;t have an account?{' '}
                </Text>
                <Link href="/(auth)/sign-up" asChild>
                  <Text style={[typography.bodyMedium, { color: colors.text, fontWeight: '600' }]}>
                    Sign Up
                  </Text>
                </Link>
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
  signUpPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginTop: SPACING.xl,
  },
});
