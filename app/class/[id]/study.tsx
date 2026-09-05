import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from '../../../src/theme/ThemeContext';
import { typography } from '../../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS, SHADOWS } from '../../../src/theme/spacing';
import { Card, Background } from '../../../src/components/ui';
import { useClassStore } from '../../../src/stores/classStore';
import { useStudyStore } from '../../../src/stores/studyStore';
import { useAuthStore } from '../../../src/stores/authStore';
import { supabase } from '../../../src/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function ClassStudyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, colorScheme } = useTheme();
  const { classes } = useClassStore();
  const {
    synthesizedContent,
    fetchSynthesizedContent,
    fetchClassPrompts,
    getOverdueQuizzes,
    requestNextChunk,
  } = useStudyStore();
  const { profile } = useAuthStore();
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [requestingChunk, setRequestingChunk] = useState(false);
  const [weeklyUsage, setWeeklyUsage] = useState<{ used: number; limit: number } | null>(null);
  const [classPrompts, setClassPrompts] = useState<any[]>([]);

  const classData = classes.find((c) => c.id === id);
  const classContent = synthesizedContent.filter((c) => c.class_id === id);
  const overdueQuizzes = id ? getOverdueQuizzes(id) : [];
  const streak = profile?.reading_streak ?? 0;

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (profile?.id && id) {
      fetchSynthesizedContent(profile.id, id);
      fetchClassPrompts(profile.id, id).then(setClassPrompts);
    }
  }, [fetchClassPrompts, fetchSynthesizedContent, id, profile?.id]);

  const todaysChunks = classPrompts.filter(
    (p) =>
      p.scheduled_for?.split('T')[0] <= today &&
      (p.prompt_type === 'takeaway' || p.prompt_type === 'recall')
  );
  const unreadChunks = todaysChunks.filter((p) => !p.read_at_bottom);

  const offerUpgrade = (message: string) =>
    Alert.alert('Paly Pro', message, [
      { text: 'Not now', style: 'cancel' },
      { text: 'See Pro', onPress: () => router.push('/paywall') },
    ]);

  const handleSendNow = async (contentId: string) => {
    if (!profile?.id) return;
    setSendingId(contentId);
    try {
      const { data, error } = await supabase.functions.invoke('send-now', {
        body: { synthesizedContentId: contentId },
      });

      // A 403 arrives as a FunctionsHttpError; the structured body says why.
      if (error) {
        const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
        if (body?.error === 'pro_required') {
          offerUpgrade(body.message);
          return;
        }
        throw error;
      }
      if (data?.error) throw new Error(data.message || data.error);

      Alert.alert('Sent!', `${data.sent.type} texted to you.`);
    } catch (err: any) {
      Alert.alert('Failed', err.message || 'Could not send text');
    } finally {
      setSendingId(null);
    }
  };

  const handleRequestChunk = async (spendPoints = false) => {
    if (!profile?.id || !id) return;
    setRequestingChunk(true);
    try {
      const result = await requestNextChunk(id, spendPoints);
      if (result?.success) {
        setWeeklyUsage({ used: result.usage.usedThisWeek, limit: result.usage.weeklyLimit });
        Alert.alert(
          'Chunk Sent!',
          `Day ${result.chunk.dayIndex} ${result.chunk.type} for ${result.chunk.className} texted to you.`
        );
      } else if (result?.error === 'weekly_limit_reached') {
        setWeeklyUsage({ used: result.usedThisWeek, limit: result.limit });
        Alert.alert('Weekly Limit Reached', result.message, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: `Spend ${result.pointsCost} pts`,
            onPress: () => handleRequestChunk(true),
          },
        ]);
      } else if (result?.error === 'pro_required') {
        offerUpgrade(result.message);
      } else if (result?.error === 'insufficient_points') {
        Alert.alert('Not Enough Points', result.message);
      } else if (result?.error === 'no_chunks_available') {
        Alert.alert('No Chunks Left', result.message);
      } else {
        Alert.alert('Error', result?.message || result?.error || 'Something went wrong');
      }
    } catch (err: any) {
      console.error('Request chunk error:', err);
      Alert.alert('Failed', err.message || 'Could not request chunk');
    } finally {
      setRequestingChunk(false);
    }
  };

  const getQuizStatus = (content: any): 'overdue' | 'due_soon' | 'upcoming' | 'none' => {
    if (!content.next_class_date) return 'none';
    if (content.next_class_date <= today && content.quiz_deadline_notified > 0) return 'overdue';
    const deadline = new Date(content.next_class_date + 'T00:00:00');
    const dayBefore = new Date(deadline);
    dayBefore.setDate(dayBefore.getDate() - 1);
    if (dayBefore.toISOString().split('T')[0] <= today) return 'due_soon';
    return 'upcoming';
  };

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

            <Text
              style={[typography.titleLarge, { color: colors.text, flex: 1, textAlign: 'center' }]}
            >
              Study {classData?.name}
            </Text>

            <View style={{ width: LAYOUT.minTouchTarget }} />
          </Animated.View>

          {/* Streak Display */}
          <Animated.View entering={FadeInDown.delay(150).duration(600).springify()}>
            <Card style={styles.streakCard}>
              <Ionicons
                name="flame"
                size={28}
                color={streak > 0 ? '#FF6B35' : colors.cardTextMuted}
              />
              <View style={{ marginLeft: SPACING.md, flex: 1 }}>
                <Text style={[typography.titleSmall, { color: colors.cardText }]}>
                  {streak > 0 ? `${streak}-day reading streak` : 'Start your streak'}
                </Text>
                <Text style={[typography.bodySmall, { color: colors.cardTextSecondary }]}>
                  {streak > 0
                    ? 'Read a daily chunk to keep it going'
                    : 'Open and read through a study chunk'}
                </Text>
              </View>
              {(profile?.streak_count ?? 0) > 0 && (
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="checkbox-outline" size={18} color="#34C759" />
                  <Text style={[typography.labelSmall, { color: '#34C759' }]}>
                    {profile?.streak_count} quiz
                  </Text>
                </View>
              )}
            </Card>
          </Animated.View>

          {/* Overdue Quiz Banner */}
          {overdueQuizzes.length > 0 && (
            <Animated.View entering={FadeInDown.delay(175).duration(600).springify()}>
              <Card style={[styles.overdueBanner, { borderColor: colors.error, borderWidth: 1 }]}>
                <View style={styles.overdueBannerContent}>
                  <Ionicons name="alert-circle" size={32} color={colors.error} />
                  <View style={{ marginLeft: SPACING.md, flex: 1 }}>
                    <Text style={[typography.titleSmall, { color: colors.error }]}>
                      {overdueQuizzes.length} overdue quiz{overdueQuizzes.length > 1 ? 'zes' : ''}
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.cardTextSecondary }]}>
                      New study content is blocked until you complete{' '}
                      {overdueQuizzes.length > 1 ? 'these' : 'this'}
                    </Text>
                  </View>
                </View>
              </Card>
            </Animated.View>
          )}

          {/* Daily Study Chunks */}
          {todaysChunks.length > 0 && (
            <Animated.View entering={FadeInDown.delay(185).duration(600).springify()}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}
              >
                <Text style={[typography.titleMedium, { color: colors.text }]}>Daily Chunks</Text>
                {unreadChunks.length > 0 && (
                  <View style={[styles.unreadBadge, { backgroundColor: colors.error }]}>
                    <Text style={[typography.labelSmall, { color: '#fff' }]}>
                      {unreadChunks.length}
                    </Text>
                  </View>
                )}
              </View>
              {todaysChunks.map((prompt: any) => {
                const isRead = !!prompt.read_at_bottom;
                return (
                  <TouchableOpacity
                    key={prompt.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${prompt.prompt_type === 'takeaway' ? 'takeaway' : 'recall'} study chunk${isRead ? ', read' : ', unread'}`}
                    onPress={() => router.push(`/study/chunk/${prompt.id}`)}
                  >
                    <Card style={[styles.studyCard, { position: 'relative' as const }]}>
                      {!isRead && (
                        <View style={[styles.redDot, { backgroundColor: colors.error }]} />
                      )}
                      <View
                        style={[
                          styles.studyIcon,
                          { backgroundColor: isRead ? '#34C75920' : colors.accent },
                        ]}
                      >
                        <Ionicons
                          name={
                            prompt.prompt_type === 'takeaway' ? 'bulb-outline' : 'refresh-outline'
                          }
                          size={24}
                          color={isRead ? '#34C759' : colors.text}
                        />
                      </View>
                      <View style={styles.studyContent}>
                        <Text style={[typography.titleSmall, { color: colors.cardText }]}>
                          {prompt.prompt_type === 'takeaway' ? 'Takeaway' : 'Recall'}
                        </Text>
                        <Text
                          style={[typography.bodySmall, { color: colors.cardTextSecondary }]}
                          numberOfLines={2}
                        >
                          {prompt.content?.substring(0, 80)}...
                        </Text>
                      </View>
                      {isRead ? (
                        <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                      ) : (
                        <Ionicons name="chevron-forward" size={20} color={colors.cardTextMuted} />
                      )}
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
          )}

          {/* Study Options */}
          {classContent.length === 0 && todaysChunks.length === 0 ? (
            <Animated.View entering={FadeInDown.delay(200).duration(600).springify()}>
              <Card style={styles.emptyCard}>
                <Ionicons
                  name="school-outline"
                  size={48}
                  color={colorScheme === 'dark' ? colors.text : colors.cardTextMuted}
                />
                <Text
                  style={[
                    typography.titleMedium,
                    { color: colors.cardText, marginTop: SPACING.md },
                  ]}
                >
                  No study materials yet
                </Text>
                <Text
                  style={[
                    typography.bodySmall,
                    { color: colors.cardTextSecondary, textAlign: 'center', marginTop: SPACING.sm },
                  ]}
                >
                  Upload slides and they&apos;ll be automatically synthesized into study texts,
                  flashcards, and quizzes
                </Text>
              </Card>
            </Animated.View>
          ) : (
            <>
              {/* Quizzes — shown first since they're mandatory */}
              <Animated.View entering={FadeInDown.delay(200).duration(600).springify()}>
                <Text
                  style={[typography.titleMedium, { color: colors.text, marginBottom: SPACING.md }]}
                >
                  Quizzes
                </Text>
                {classContent.map((content) => {
                  const status = getQuizStatus(content);
                  const isOverdue = status === 'overdue';
                  const isDueSoon = status === 'due_soon';

                  return (
                    <TouchableOpacity
                      key={`quiz-${content.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${content.session_date} quiz${isOverdue ? ', overdue' : isDueSoon ? ', due today' : ''}`}
                      onPress={() => router.push(`/study/quiz/${content.id}`)}
                    >
                      <Card
                        style={[
                          styles.studyCard,
                          isOverdue && { borderLeftWidth: 3, borderLeftColor: colors.error },
                          isDueSoon && { borderLeftWidth: 3, borderLeftColor: '#FF9500' },
                        ]}
                      >
                        <View
                          style={[
                            styles.studyIcon,
                            {
                              backgroundColor: isOverdue
                                ? colors.error + '20'
                                : isDueSoon
                                  ? '#FF950020'
                                  : colors.accent,
                            },
                          ]}
                        >
                          <Ionicons
                            name={isOverdue ? 'alert-circle' : 'help-circle-outline'}
                            size={24}
                            color={isOverdue ? colors.error : isDueSoon ? '#FF9500' : colors.text}
                          />
                        </View>
                        <View style={styles.studyContent}>
                          <Text
                            style={[
                              typography.titleSmall,
                              { color: isOverdue ? colors.error : colors.cardText },
                            ]}
                          >
                            {content.session_date} Quiz
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text
                              style={[typography.bodySmall, { color: colors.cardTextSecondary }]}
                            >
                              {(content.quiz_questions as any[])?.length || 0} questions
                            </Text>
                            {content.next_class_date && (
                              <Text
                                style={[
                                  typography.labelSmall,
                                  {
                                    color: isOverdue
                                      ? colors.error
                                      : isDueSoon
                                        ? '#FF9500'
                                        : colors.cardTextMuted,
                                  },
                                ]}
                              >
                                {isOverdue
                                  ? 'OVERDUE'
                                  : isDueSoon
                                    ? 'DUE TODAY'
                                    : `Due ${formatDistanceToNow(new Date(content.next_class_date + 'T00:00:00'), { addSuffix: true })}`}
                              </Text>
                            )}
                          </View>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={isOverdue ? colors.error : colors.cardTextMuted}
                        />
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </Animated.View>

              {/* Request Next Chunk */}
              <Animated.View
                entering={FadeInDown.delay(250).duration(600).springify()}
                style={{ marginTop: SPACING.xl }}
              >
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={
                    requestingChunk ? 'Requesting next study chunk' : 'Request next study chunk'
                  }
                  accessibilityState={{ disabled: requestingChunk, busy: requestingChunk }}
                  onPress={() => handleRequestChunk(false)}
                  disabled={requestingChunk}
                  style={[
                    styles.requestChunkButton,
                    { backgroundColor: colors.card, ...SHADOWS.md },
                  ]}
                >
                  <View style={[styles.studyIcon, { backgroundColor: colors.accent }]}>
                    {requestingChunk ? (
                      <ActivityIndicator size="small" color={colors.text} />
                    ) : (
                      <Ionicons name="flash" size={24} color="#8B5CF6" />
                    )}
                  </View>
                  <View style={styles.studyContent}>
                    <Text style={[typography.titleSmall, { color: colors.cardText }]}>
                      {requestingChunk ? 'Sending...' : 'Request Next Chunk'}
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.cardTextSecondary }]}>
                      {weeklyUsage
                        ? `${weeklyUsage.used}/${weeklyUsage.limit} used this week`
                        : '5 free per week'}
                    </Text>
                  </View>
                  <View style={[styles.textMeButton, { backgroundColor: '#8B5CF620' }]}>
                    <Ionicons name="paper-plane" size={14} color="#8B5CF6" />
                    <Text style={[typography.labelSmall, { color: '#8B5CF6', marginLeft: 4 }]}>
                      Send
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>

              {/* Text Me — on-demand SMS per session */}
              <Animated.View
                entering={FadeInDown.delay(300).duration(600).springify()}
                style={{ marginTop: SPACING.xl }}
              >
                <Text
                  style={[typography.titleMedium, { color: colors.text, marginBottom: SPACING.md }]}
                >
                  Text Me
                </Text>
                {classContent.map((content) => (
                  <Card key={`sms-${content.id}`} style={styles.studyCard}>
                    <View style={[styles.studyIcon, { backgroundColor: colors.accent }]}>
                      <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.text} />
                    </View>
                    <View style={styles.studyContent}>
                      <Text style={[typography.titleSmall, { color: colors.cardText }]}>
                        {content.session_date} Session
                      </Text>
                      <Text style={[typography.bodySmall, { color: colors.cardTextSecondary }]}>
                        {content.summary?.substring(0, 60)}...
                      </Text>
                    </View>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Text me the ${content.session_date} study session`}
                      accessibilityState={{
                        disabled: sendingId === content.id,
                        busy: sendingId === content.id,
                      }}
                      onPress={() => handleSendNow(content.id)}
                      disabled={sendingId === content.id}
                      style={[styles.textMeButton, { backgroundColor: colors.accent }]}
                    >
                      {sendingId === content.id ? (
                        <ActivityIndicator size="small" color={colors.text} />
                      ) : (
                        <>
                          <Ionicons name="paper-plane" size={14} color={colors.text} />
                          <Text
                            style={[typography.labelSmall, { color: colors.text, marginLeft: 4 }]}
                          >
                            Text me
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </Card>
                ))}
              </Animated.View>

              {/* Flashcards */}
              <Animated.View
                entering={FadeInDown.delay(400).duration(600).springify()}
                style={{ marginTop: SPACING.xl }}
              >
                <Text
                  style={[typography.titleMedium, { color: colors.text, marginBottom: SPACING.md }]}
                >
                  Flashcards
                </Text>
                {classContent.map((content) => (
                  <TouchableOpacity
                    key={`flash-${content.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${content.session_date} flashcards`}
                    onPress={() => router.push(`/study/flashcards/${content.id}`)}
                  >
                    <Card style={styles.studyCard}>
                      <View style={[styles.studyIcon, { backgroundColor: colors.accent }]}>
                        <Ionicons name="layers-outline" size={24} color={colors.text} />
                      </View>
                      <View style={styles.studyContent}>
                        <Text style={[typography.titleSmall, { color: colors.cardText }]}>
                          {content.session_date} Session
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.cardTextSecondary }]}>
                          {(content.flashcards as any[])?.length || 0} cards
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.cardTextMuted} />
                    </Card>
                  </TouchableOpacity>
                ))}
              </Animated.View>
            </>
          )}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  backButton: {
    minWidth: LAYOUT.minTouchTarget,
    minHeight: LAYOUT.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  overdueBanner: {
    marginBottom: SPACING.lg,
  },
  overdueBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SPACING['2xl'],
  },
  studyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  studyIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  studyContent: {
    flex: 1,
  },
  textMeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    minWidth: 80,
    minHeight: LAYOUT.minTouchTarget,
    justifyContent: 'center',
  },
  redDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    zIndex: 1,
  },
  unreadBadge: {
    marginLeft: SPACING.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  requestChunkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    minHeight: LAYOUT.minTouchTarget,
    borderRadius: RADIUS.lg,
  },
});
