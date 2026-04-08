import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT, SHADOWS, RADIUS } from '../../src/theme/spacing';
import { Button, Input, Card, GlassCard } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/authStore';
import { Ionicons } from '@expo/vector-icons';

const SUGGESTED_NAMES = ['Paly', 'Athena', 'Nova', 'Sage', 'Echo', 'Quinn'];

export default function AssistantScreen() {
  const { colors } = useTheme();
  const { updateProfile } = useAuthStore();
  const [assistantName, setAssistantName] = useState('Paly');
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (!assistantName.trim()) return;

    setIsLoading(true);
    try {
      await updateProfile({ assistant_name: assistantName.trim() });
      router.push('/(onboarding)/theme');
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Progress indicator */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.progress}
        >
          <View style={[styles.progressBar, { backgroundColor: colors.glassBackground }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.card, width: '40%' },
              ]}
            />
          </View>
          <Text style={[typography.labelSmall, { color: colors.textSecondary }]}>
            2 OF 5
          </Text>
        </Animated.View>

        {/* Content */}
        <View style={styles.content}>
          <Animated.View entering={FadeInDown.delay(200).duration(600).springify()}>
            {/* Avatar */}
            <View style={[styles.avatar, { backgroundColor: colors.glassBackground }]}>
              <Ionicons name="chatbubbles" size={40} color={colors.text} />
            </View>

            <Text
              style={[
                typography.displaySmall,
                { color: colors.text, textAlign: 'center' },
              ]}
            >
              Name your{'\n'}study companion
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
              Your companion will send you personalized study prompts and help
              you stay consistent.
            </Text>
          </Animated.View>

          {/* Name Input */}
          <Animated.View
            entering={FadeInUp.delay(400).duration(600).springify()}
            style={styles.inputSection}
          >
            <Input
              label="Companion Name"
              placeholder="Enter a name"
              value={assistantName}
              onChangeText={setAssistantName}
              maxLength={20}
            />

            {/* Suggested names */}
            <Text
              style={[
                typography.labelSmall,
                { color: colors.textSecondary, marginBottom: SPACING.sm },
              ]}
            >
              SUGGESTIONS
            </Text>
            <View style={styles.suggestions}>
              {SUGGESTED_NAMES.map(name => (
                <TouchableOpacity
                  key={name}
                  onPress={() => setAssistantName(name)}
                  style={[
                    styles.suggestionChip,
                    {
                      backgroundColor: assistantName === name 
                        ? colors.card 
                        : colors.glassBackground,
                      ...SHADOWS.sm,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.labelMedium,
                      {
                        color: assistantName === name
                          ? colors.cardText
                          : colors.text,
                      },
                    ]}
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </View>

        {/* Preview */}
        <Animated.View
          entering={FadeInUp.delay(600).duration(600).springify()}
          style={styles.preview}
        >
          <GlassCard padding="md">
            <View style={styles.previewHeader}>
              <View style={[styles.previewAvatar, { backgroundColor: colors.card }]}>
                <Text style={{ color: colors.background, fontWeight: '600' }}>
                  {assistantName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={[typography.titleSmall, { color: colors.text }]}>
                {assistantName || 'Your companion'}
              </Text>
            </View>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
              "Hey! Time for a quick review of your Biology notes. Ready to
              reinforce what you learned?"
            </Text>
          </GlassCard>
        </Animated.View>

        {/* CTA */}
        <Animated.View
          entering={FadeInUp.delay(800).duration(600).springify()}
          style={styles.cta}
        >
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            disabled={!assistantName.trim()}
            onPress={handleContinue}
          >
            Continue
          </Button>
        </Animated.View>
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
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.xl,
  },
  inputSection: {
    marginTop: SPACING['2xl'],
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  suggestionChip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  preview: {
    marginBottom: SPACING.xl,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  previewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cta: {
    marginBottom: SPACING.lg,
  },
});
