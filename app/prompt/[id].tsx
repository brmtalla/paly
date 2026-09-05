import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { format } from 'date-fns';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS, SHADOWS } from '../../src/theme/spacing';
import { Card, Button, Background } from '../../src/components/ui';
import { useStudyStore } from '../../src/stores/studyStore';
import { useClassStore } from '../../src/stores/classStore';
import { toBullets } from '../../src/lib/bullets';
import { Ionicons } from '@expo/vector-icons';

export default function PromptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { studyPrompts, todaysPrompts, markPromptAsRead } = useStudyStore();
  const { classes } = useClassStore();

  const prompt = [...studyPrompts, ...todaysPrompts].find((p) => p.id === id);
  const classData = classes.find((c) => c.id === prompt?.class_id);

  useEffect(() => {
    if (id && prompt && !prompt.read_at) {
      markPromptAsRead(id);
    }
  }, [id, markPromptAsRead, prompt]);

  const getPromptIcon = (type: string) => {
    switch (type) {
      case 'flashcard':
        return 'layers-outline';
      case 'quiz':
        return 'help-circle-outline';
      case 'summary':
        return 'document-text-outline';
      default:
        return 'sparkles-outline';
    }
  };

  if (!prompt) {
    return (
      <Background>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            <Text style={[typography.bodyLarge, { color: colors.text }]}>
              Study nugget not found
            </Text>
            <Button variant="ghost" onPress={() => router.back()}>
              Go Back
            </Button>
          </View>
        </SafeAreaView>
      </Background>
    );
  }

  return (
    <Background>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(600).springify()}
            style={styles.header}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          </Animated.View>

          {/* Prompt Content */}
          <Animated.View
            entering={FadeInUp.delay(200).duration(600).springify()}
            style={styles.content}
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.card, ...SHADOWS.lg }]}>
              <Ionicons name={getPromptIcon(prompt.prompt_type)} size={48} color={colors.onCard} />
            </View>

            <Text
              style={[
                typography.headlineMedium,
                { color: colors.text, textAlign: 'center', marginTop: SPACING.xl },
              ]}
            >
              {classData?.name || 'Study Time'}
            </Text>

            <Text
              style={[typography.bodySmall, { color: colors.textSecondary, marginTop: SPACING.sm }]}
            >
              {format(new Date(prompt.scheduled_for), 'EEEE, MMMM d • h:mm a')}
            </Text>

            <Card style={styles.promptCard}>
              <Text style={[typography.bodyLarge, { color: colors.cardText, lineHeight: 28 }]}>
                {toBullets(prompt.content)}
              </Text>
            </Card>

            {/* Action Buttons */}
            <View style={styles.actions}>
              {prompt.prompt_type === 'flashcard' && prompt.synthesized_content_id && (
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon={<Ionicons name="layers-outline" size={20} color={colors.accent} />}
                  onPress={() => router.push(`/study/flashcards/${prompt.synthesized_content_id}`)}
                >
                  Review Flashcards
                </Button>
              )}

              {prompt.prompt_type === 'quiz' && prompt.synthesized_content_id && (
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon={<Ionicons name="help-circle-outline" size={20} color={colors.accent} />}
                  onPress={() => router.push(`/study/quiz/${prompt.synthesized_content_id}`)}
                >
                  Take Quiz
                </Button>
              )}

              <Button variant="primary" size="lg" fullWidth onPress={() => router.back()}>
                Done
              </Button>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: LAYOUT.screenPadding,
    paddingBottom: SPACING['3xl'],
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  backButton: {
    minWidth: LAYOUT.minTouchTarget,
    minHeight: LAYOUT.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: RADIUS['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptCard: {
    marginTop: SPACING.xl,
    width: '100%',
  },
  actions: {
    marginTop: SPACING['2xl'],
    width: '100%',
    gap: SPACING.md,
  },
});
