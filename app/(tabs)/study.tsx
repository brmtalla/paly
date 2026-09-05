import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { format, parseISO } from 'date-fns';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS, SHADOWS } from '../../src/theme/spacing';
import { Card, Background, ErrorState } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/authStore';
import { useStudyStore } from '../../src/stores/studyStore';
import { useClassStore } from '../../src/stores/classStore';
import { toBullets } from '../../src/lib/bullets';
import { Ionicons } from '@expo/vector-icons';

export default function StudyScreen() {
  const { colors, colorScheme } = useTheme();
  const { profile } = useAuthStore();
  const {
    synthesizedContent,
    studyPrompts,
    fetchSynthesizedContent,
    fetchStudyPrompts,
    error: studyError,
  } = useStudyStore();
  const { classes, fetchClasses } = useClassStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompts' | 'flashcards' | 'quizzes'>('prompts');
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchSynthesizedContent(profile.id);
      fetchStudyPrompts(profile.id);
      fetchClasses(profile.id);
    }
  }, [profile?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (profile?.id) {
      await Promise.all([fetchSynthesizedContent(profile.id), fetchStudyPrompts(profile.id)]);
    }
    setRefreshing(false);
  };

  const getClassName = (classId: string) => {
    return classes.find((c) => c.id === classId)?.name || 'Unknown Class';
  };

  const unreadPrompts = studyPrompts.filter((p) => !p.read_at);
  const readPrompts = studyPrompts.filter((p) => p.read_at);

  return (
    <Background>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(600).springify()}
          style={styles.header}
        >
          <Text style={[typography.displaySmall, { color: colors.text }]}>Study</Text>
        </Animated.View>

        {/* Tab selector */}
        <Animated.View
          entering={FadeInUp.delay(200).duration(600).springify()}
          style={[styles.tabContainer, { backgroundColor: colors.whiteAlpha }]}
        >
          {(['prompts', 'flashcards', 'quizzes'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                activeTab === tab && { backgroundColor: colors.white, ...SHADOWS.sm },
              ]}
            >
              <Text
                style={[
                  typography.labelMedium,
                  { color: activeTab === tab ? colors.background : colors.textSecondary },
                ]}
              >
                {tab === 'prompts' ? 'Nuggets' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.white}
            />
          }
        >
          {studyError && <ErrorState message={studyError} onRetry={onRefresh} />}

          {!studyError && activeTab === 'prompts' && (
            <>
              {/* Unread prompts */}
              {unreadPrompts.length > 0 && (
                <Animated.View entering={FadeInUp.delay(300).duration(600).springify()}>
                  <Text
                    style={[
                      typography.labelSmall,
                      { color: colors.textSecondary, marginBottom: SPACING.sm },
                    ]}
                  >
                    UNREAD ({unreadPrompts.length})
                  </Text>
                  {unreadPrompts.map((prompt) => (
                    <Card
                      key={prompt.id}
                      variant="default"
                      padding="lg"
                      style={styles.promptCard}
                      onPress={() => router.push(`/prompt/${prompt.id}`)}
                    >
                      <View style={styles.promptHeader}>
                        <View
                          style={[
                            styles.promptIcon,
                            {
                              backgroundColor:
                                colorScheme === 'dark'
                                  ? colors.background
                                  : colors.background + '15',
                            },
                          ]}
                        >
                          <Ionicons
                            name={
                              prompt.prompt_type === 'quiz'
                                ? 'help-circle'
                                : prompt.prompt_type === 'flashcard'
                                  ? 'card'
                                  : 'bulb'
                            }
                            size={18}
                            color={colors.onCard}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[typography.labelSmall, { color: colors.cardText }]}>
                            {getClassName(prompt.class_id)}
                          </Text>
                          <Text style={[typography.titleSmall, { color: colors.cardText }]}>
                            {prompt.prompt_type.charAt(0).toUpperCase() +
                              prompt.prompt_type.slice(1)}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={colorScheme === 'dark' ? colors.white : colors.cardText}
                        />
                      </View>
                      <Text
                        style={[
                          typography.bodyMedium,
                          { color: colors.cardTextSecondary, marginTop: SPACING.sm },
                        ]}
                        numberOfLines={2}
                      >
                        {toBullets(prompt.content)}
                      </Text>
                    </Card>
                  ))}
                </Animated.View>
              )}

              {/* Read prompts */}
              {readPrompts.length > 0 && (
                <Animated.View
                  entering={FadeInUp.delay(400).duration(600).springify()}
                  style={{ marginTop: SPACING.xl }}
                >
                  <Text
                    style={[
                      typography.labelSmall,
                      { color: colors.textSecondary, marginBottom: SPACING.sm },
                    ]}
                  >
                    COMPLETED ({readPrompts.length})
                  </Text>
                  {(showAllCompleted ? readPrompts : readPrompts.slice(0, 5)).map((prompt) => (
                    <Card
                      key={prompt.id}
                      variant="default"
                      padding="md"
                      style={[styles.promptCard, { opacity: 0.7 }]}
                      onPress={() => router.push(`/prompt/${prompt.id}`)}
                    >
                      <View style={styles.completedPrompt}>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={colorScheme === 'dark' ? colors.white : colors.success}
                        />
                        <View style={{ flex: 1, marginLeft: SPACING.md }}>
                          <Text style={[typography.bodySmall, { color: colors.cardTextSecondary }]}>
                            {getClassName(prompt.class_id)}
                          </Text>
                          <Text
                            style={[typography.bodySmall, { color: colors.cardTextTertiary }]}
                            numberOfLines={1}
                          >
                            {toBullets(prompt.content)}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  ))}
                  {readPrompts.length > 5 && (
                    <TouchableOpacity
                      onPress={() => setShowAllCompleted(!showAllCompleted)}
                      style={{ alignItems: 'center', paddingVertical: SPACING.md }}
                    >
                      <Text style={[typography.labelMedium, { color: colors.white }]}>
                        {showAllCompleted ? 'Show Less' : `Show All ${readPrompts.length}`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </Animated.View>
              )}

              {/* Empty state */}
              {studyPrompts.length === 0 && (
                <Animated.View entering={FadeInUp.delay(300).duration(600).springify()}>
                  <Card variant="default" padding="xl">
                    <View style={styles.emptyState}>
                      <View
                        style={[
                          styles.emptyIcon,
                          {
                            backgroundColor:
                              colorScheme === 'dark' ? colors.whiteAlpha : colors.background + '15',
                          },
                        ]}
                      >
                        <Ionicons name="sparkles-outline" size={40} color={colors.onCard} />
                      </View>
                      <Text
                        style={[
                          typography.titleMedium,
                          { color: colors.cardText, marginTop: SPACING.lg },
                        ]}
                      >
                        No study nuggets yet
                      </Text>
                      <Text
                        style={[
                          typography.bodyMedium,
                          {
                            color: colors.cardTextSecondary,
                            textAlign: 'center',
                            marginTop: SPACING.sm,
                          },
                        ]}
                      >
                        Take notes during your classes and we&apos;ll generate personalized study
                        nuggets for you
                      </Text>
                    </View>
                  </Card>
                </Animated.View>
              )}
            </>
          )}

          {!studyError && activeTab === 'flashcards' && (
            <Animated.View entering={FadeInUp.delay(300).duration(600).springify()}>
              {synthesizedContent.length > 0 ? (
                synthesizedContent.map((content) => {
                  const flashcards = content.flashcards as any[];
                  if (!flashcards || flashcards.length === 0) return null;

                  const created = new Date(content.session_date + 'T00:00:00');
                  const now = new Date();
                  now.setHours(0, 0, 0, 0);
                  const studyDay = Math.max(
                    1,
                    Math.floor((now.getTime() - created.getTime()) / 86400000) + 1
                  );
                  const unlockedCount = flashcards.filter(
                    (c: any) => !c.day || c.day <= studyDay
                  ).length;

                  return (
                    <Card
                      key={content.id}
                      variant="default"
                      padding="lg"
                      style={styles.promptCard}
                      onPress={() => router.push(`/study/flashcards/${content.id}`)}
                    >
                      <View style={styles.flashcardHeader}>
                        <View
                          style={[
                            styles.flashcardIcon,
                            {
                              backgroundColor:
                                colorScheme === 'dark'
                                  ? colors.whiteAlpha
                                  : colors.background + '15',
                            },
                          ]}
                        >
                          <Ionicons name="card-outline" size={20} color={colors.onCard} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[typography.titleSmall, { color: colors.cardText }]}>
                            {getClassName(content.class_id)}
                          </Text>
                          <Text style={[typography.bodySmall, { color: colors.cardTextSecondary }]}>
                            {format(parseISO(content.session_date), 'MMM d, yyyy')}
                          </Text>
                        </View>
                        <View style={[styles.countBadge, { backgroundColor: colors.accent }]}>
                          <Text style={[typography.labelSmall, { color: colors.white }]}>
                            {unlockedCount}/{flashcards.length}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  );
                })
              ) : (
                <Card variant="default" padding="xl">
                  <View style={styles.emptyState}>
                    <View
                      style={[
                        styles.emptyIcon,
                        {
                          backgroundColor:
                            colorScheme === 'dark' ? colors.whiteAlpha : colors.background + '15',
                        },
                      ]}
                    >
                      <Ionicons name="card-outline" size={40} color={colors.onCard} />
                    </View>
                    <Text
                      style={[
                        typography.titleMedium,
                        { color: colors.cardText, marginTop: SPACING.lg },
                      ]}
                    >
                      No flashcards yet
                    </Text>
                    <Text
                      style={[
                        typography.bodyMedium,
                        {
                          color: colors.cardTextSecondary,
                          textAlign: 'center',
                          marginTop: SPACING.sm,
                        },
                      ]}
                    >
                      Flashcards are generated when you synthesize your notes
                    </Text>
                  </View>
                </Card>
              )}
            </Animated.View>
          )}

          {!studyError && activeTab === 'quizzes' && (
            <Animated.View entering={FadeInUp.delay(300).duration(600).springify()}>
              {synthesizedContent.length > 0 ? (
                synthesizedContent.map((content) => {
                  const questions = content.quiz_questions as any[];
                  if (!questions || questions.length === 0) return null;

                  return (
                    <Card
                      key={content.id}
                      variant="default"
                      padding="lg"
                      style={styles.promptCard}
                      onPress={() => router.push(`/study/quiz/${content.id}`)}
                    >
                      <View style={styles.flashcardHeader}>
                        <View
                          style={[
                            styles.flashcardIcon,
                            {
                              backgroundColor:
                                colorScheme === 'dark'
                                  ? colors.whiteAlpha
                                  : colors.background + '15',
                            },
                          ]}
                        >
                          <Ionicons name="help-circle-outline" size={20} color={colors.onCard} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[typography.titleSmall, { color: colors.cardText }]}>
                            {getClassName(content.class_id)}
                          </Text>
                          <Text style={[typography.bodySmall, { color: colors.cardTextSecondary }]}>
                            {format(parseISO(content.session_date), 'MMM d, yyyy')}
                          </Text>
                        </View>
                        <View style={[styles.countBadge, { backgroundColor: colors.accent }]}>
                          <Text style={[typography.labelSmall, { color: colors.white }]}>
                            {questions.length} Q
                          </Text>
                        </View>
                      </View>
                    </Card>
                  );
                })
              ) : (
                <Card variant="default" padding="xl">
                  <View style={styles.emptyState}>
                    <View
                      style={[
                        styles.emptyIcon,
                        {
                          backgroundColor:
                            colorScheme === 'dark' ? colors.whiteAlpha : colors.background + '15',
                        },
                      ]}
                    >
                      <Ionicons name="help-circle-outline" size={40} color={colors.onCard} />
                    </View>
                    <Text
                      style={[
                        typography.titleMedium,
                        { color: colors.cardText, marginTop: SPACING.lg },
                      ]}
                    >
                      No quizzes yet
                    </Text>
                    <Text
                      style={[
                        typography.bodyMedium,
                        {
                          color: colors.cardTextSecondary,
                          textAlign: 'center',
                          marginTop: SPACING.sm,
                        },
                      ]}
                    >
                      Quiz questions are generated when you synthesize your notes
                    </Text>
                  </View>
                </Card>
              )}
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingVertical: SPACING.md,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: LAYOUT.screenPadding,
    borderRadius: RADIUS.lg,
    padding: 4,
    marginBottom: SPACING.lg,
  },
  tab: {
    flex: 1,
    minHeight: LAYOUT.minTouchTarget,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingBottom: LAYOUT.tabBarContentInset,
  },
  promptCard: {
    marginBottom: SPACING.md,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promptIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  completedPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flashcardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flashcardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  countBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
