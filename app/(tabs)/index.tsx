import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { format } from 'date-fns';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS, SHADOWS } from '../../src/theme/spacing';
import { Card, Background, ErrorState } from '../../src/components/ui';
import { PalyPointsBar } from '../../src/components/PalyPointsBar';
import { useAuthStore } from '../../src/stores/authStore';
import { useClassStore } from '../../src/stores/classStore';
import { useStudyStore } from '../../src/stores/studyStore';
import { Ionicons } from '@expo/vector-icons';
import { ProfileAvatar } from '../../src/components/ProfileAvatar';

export default function TodayScreen() {
  const { colors, colorScheme } = useTheme();
  const { profile } = useAuthStore();
  const { fetchClasses, getTodaysClasses, getUpcomingClass } = useClassStore();
  const {
    todaysPrompts,
    fetchTodaysPrompts,
    fetchSynthesizedContent,
    getAllOverdueQuizzes,
    error: studyError,
  } = useStudyStore();
  const { error: classError } = useClassStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const todaysClasses = getTodaysClasses();
  const upcomingClass = getUpcomingClass();
  const overdueQuizzes = getAllOverdueQuizzes();

  useEffect(() => {
    if (profile?.id) {
      fetchClasses(profile.id);
      fetchTodaysPrompts(profile.id);
      fetchSynthesizedContent(profile.id);
    }
  }, [profile?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (profile?.id) {
      await Promise.all([
        fetchClasses(profile.id),
        fetchTodaysPrompts(profile.id),
        fetchSynthesizedContent(profile.id),
      ]);
    }
    setRefreshing(false);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <Background>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <PalyPointsBar />
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
          {/* Header */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(600).springify()}
            style={styles.header}
          >
            <View>
              <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
                {format(new Date(), 'EEEE, MMMM d')}
              </Text>
              <Text style={[typography.headlineLarge, { color: colors.text }]}>
                {greeting()}, {profile?.full_name || 'there'}!
              </Text>
            </View>

            <TouchableOpacity
              style={styles.avatarButton}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <ProfileAvatar
                avatarUrl={profile?.avatar_url}
                fallback={profile?.full_name || profile?.email || 'U'}
                size={48}
                borderRadius={16}
                style={SHADOWS.md}
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Today's Overview Card */}
          <Animated.View entering={FadeInUp.delay(200).duration(600).springify()}>
            <Card variant="default" padding="lg" style={styles.overviewCard}>
              <View style={styles.overviewHeader}>
                <View
                  style={[styles.overviewIcon, { backgroundColor: colors.white, ...SHADOWS.sm }]}
                >
                  <Ionicons
                    name="today"
                    size={20}
                    color={colorScheme === 'dark' ? colors.background : colors.background}
                  />
                </View>
                <Text style={[typography.titleMedium, { color: colors.cardText }]}>
                  Today&apos;s Overview
                </Text>
              </View>

              <View style={styles.statsRow}>
                <StatItem label="Classes" value={todaysClasses.length.toString()} colors={colors} />
                <StatItem label="Nuggets" value={todaysPrompts.length.toString()} colors={colors} />
                <StatItem
                  label="Completed"
                  value={todaysPrompts.filter((p) => p.read_at).length.toString()}
                  colors={colors}
                />
              </View>
            </Card>
          </Animated.View>

          {/* Error State */}
          {(classError || studyError) && (
            <Animated.View entering={FadeInUp.delay(200).duration(400)}>
              <ErrorState message={classError || studyError || undefined} onRetry={onRefresh} />
            </Animated.View>
          )}

          {/* Overdue Quiz Warning */}
          {overdueQuizzes.length > 0 && (
            <Animated.View entering={FadeInUp.delay(250).duration(600).springify()}>
              <Card variant="default" padding="lg" style={styles.overdueCard}>
                <View style={styles.overdueContent}>
                  <Ionicons name="alert-circle" size={32} color="#FF3B30" />
                  <View style={{ marginLeft: SPACING.md, flex: 1 }}>
                    <Text style={[typography.titleSmall, { color: '#FF3B30' }]}>
                      {overdueQuizzes.length} overdue quiz{overdueQuizzes.length > 1 ? 'zes' : ''}
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.cardTextSecondary }]}>
                      New study content is blocked. Take {overdueQuizzes.length > 1 ? 'them' : 'it'}{' '}
                      to resume.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.overdueButton}
                  onPress={() => {
                    const first = overdueQuizzes[0];
                    router.push(`/class/${first.class_id}/study` as any);
                  }}
                >
                  <Text style={[typography.labelMedium, { color: '#fff' }]}>Take Quiz Now</Text>
                </TouchableOpacity>
              </Card>
            </Animated.View>
          )}

          {/* Upcoming Class */}
          {upcomingClass && (
            <Animated.View entering={FadeInUp.delay(300).duration(600).springify()}>
              <Text
                style={[
                  typography.labelSmall,
                  { color: colors.textSecondary, marginBottom: SPACING.sm },
                ]}
              >
                NEXT CLASS
              </Text>
              <Card
                variant="default"
                padding="lg"
                onPress={() => router.push(`/class/${upcomingClass.classData.id}` as any)}
              >
                <View style={styles.classCardContent}>
                  <View>
                    <Text style={[typography.titleLarge, { color: colors.cardText }]}>
                      {upcomingClass.classData.name}
                    </Text>
                    <Text
                      style={[
                        typography.bodyMedium,
                        { color: colors.cardTextSecondary, marginTop: 4 },
                      ]}
                    >
                      {upcomingClass.session.start_time.slice(0, 5)} -{' '}
                      {upcomingClass.session.end_time.slice(0, 5)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.takeNotesButton, { backgroundColor: colors.background }]}
                    onPress={() => router.push(`/notes/new?classId=${upcomingClass.classData.id}`)}
                  >
                    <Ionicons name="create-outline" size={18} color={colors.white} />
                    <Text style={[typography.labelMedium, { color: colors.white }]}>
                      Take Notes
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </Animated.View>
          )}

          {/* Study Nuggets */}
          <Animated.View
            entering={FadeInUp.delay(400).duration(600).springify()}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Text style={[typography.headlineSmall, { color: colors.text }]}>Study Nuggets</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/study')}>
                <Text style={[typography.labelMedium, { color: colors.white }]}>See All</Text>
              </TouchableOpacity>
            </View>

            {todaysPrompts.length > 0 ? (
              todaysPrompts.slice(0, 3).map((prompt) => (
                <Card
                  key={prompt.id}
                  variant="default"
                  padding="lg"
                  style={{ marginBottom: SPACING.md }}
                  onPress={() => router.push(`/prompt/${prompt.id}` as any)}
                >
                  <View style={styles.promptHeader}>
                    <View
                      style={[styles.promptIcon, { backgroundColor: colors.white, ...SHADOWS.sm }]}
                    >
                      <Ionicons
                        name={
                          prompt.prompt_type === 'quiz'
                            ? 'help-circle'
                            : prompt.prompt_type === 'flashcard'
                              ? 'card'
                              : 'bulb'
                        }
                        size={16}
                        color={colors.background}
                      />
                    </View>
                    <Text style={[typography.labelSmall, { color: colors.cardText }]}>
                      {prompt.prompt_type.toUpperCase()}
                    </Text>
                  </View>
                  <Text
                    style={[typography.bodyMedium, { color: colors.cardText }]}
                    numberOfLines={2}
                  >
                    {prompt.content}
                  </Text>
                </Card>
              ))
            ) : (
              <Card variant="default" padding="xl">
                <View style={styles.emptyState}>
                  <Ionicons
                    name="sparkles-outline"
                    size={40}
                    color={colorScheme === 'dark' ? colors.white : colors.background + '30'}
                  />
                  <Text
                    style={[
                      typography.bodyMedium,
                      {
                        color: colors.cardTextSecondary,
                        textAlign: 'center',
                        marginTop: SPACING.md,
                      },
                    ]}
                  >
                    No study nuggets yet.{'\n'}They&apos;ll appear after your classes!
                  </Text>
                </View>
              </Card>
            )}
          </Animated.View>

          {/* Today's Classes */}
          <Animated.View
            entering={FadeInUp.delay(500).duration(600).springify()}
            style={styles.section}
          >
            <Text
              style={[typography.headlineSmall, { color: colors.text, marginBottom: SPACING.md }]}
            >
              Today&apos;s Classes
            </Text>

            {todaysClasses.length > 0 ? (
              todaysClasses.map((classData) => (
                <Card
                  key={classData.id}
                  variant="default"
                  padding="md"
                  style={{ marginBottom: SPACING.sm }}
                  onPress={() => router.push(`/class/${classData.id}` as any)}
                >
                  <View style={styles.classItem}>
                    <View
                      style={[
                        styles.classColor,
                        { backgroundColor: classData.color || colors.background },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.titleSmall, { color: colors.cardText }]}>
                        {classData.name}
                      </Text>
                      <Text style={[typography.bodySmall, { color: colors.cardTextTertiary }]}>
                        {classData.class_sessions
                          .filter((s) => s.day_of_week === new Date().getDay())
                          .map((s) => `${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}`)
                          .join(', ')}
                      </Text>
                    </View>
                    <View
                      style={[styles.classIcon, { backgroundColor: colors.white, ...SHADOWS.sm }]}
                    >
                      <Ionicons name="chevron-forward" size={16} color={colors.background} />
                    </View>
                  </View>
                </Card>
              ))
            ) : (
              <Card variant="default" padding="lg">
                <View style={styles.emptyState}>
                  <Ionicons
                    name="calendar-outline"
                    size={32}
                    color={colorScheme === 'dark' ? colors.white : colors.background + '30'}
                  />
                  <Text
                    style={[
                      typography.bodyMedium,
                      { color: colors.cardTextSecondary, marginTop: SPACING.sm },
                    ]}
                  >
                    No classes today. Enjoy your day off!
                  </Text>
                </View>
              </Card>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}

interface StatItemProps {
  label: string;
  value: string;
  colors: any;
}

function StatItem({ label, value, colors }: StatItemProps) {
  return (
    <View style={styles.statItem}>
      <Text style={[typography.headlineMedium, { color: colors.cardText }]}>{value}</Text>
      <Text style={[typography.labelSmall, { color: colors.cardTextSecondary }]}>{label}</Text>
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
  scrollContent: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingBottom: LAYOUT.tabBarHeight + SPACING['3xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  avatarButton: {
    width: 48,
    height: 48,
  },
  overviewCard: {
    marginBottom: SPACING.xl,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  overviewIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  classCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  takeNotesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  section: {
    marginTop: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  promptIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  classColor: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  classIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overdueCard: {
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  overdueContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overdueButton: {
    marginTop: SPACING.md,
    backgroundColor: '#FF3B30',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
});
