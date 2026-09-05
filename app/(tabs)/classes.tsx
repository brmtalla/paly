import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS, SHADOWS } from '../../src/theme/spacing';
import { Card, Button, Background, ErrorState } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/authStore';
import { useClassStore } from '../../src/stores/classStore';
import { useSubscriptionStore, FREE_CLASS_LIMIT } from '../../src/stores/subscriptionStore';
import { ClassWithSessions } from '../../src/types/database';
import { Ionicons } from '@expo/vector-icons';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ClassesScreen() {
  const { colors } = useTheme();
  const { profile } = useAuthStore();
  const { classes, fetchClasses, deleteClass, error: classesError } = useClassStore();
  const { isPro } = useSubscriptionStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleAddClass = () => {
    if (!isPro && classes.length >= FREE_CLASS_LIMIT) {
      router.push('/paywall');
      return;
    }
    router.push('/class/new');
  };

  useEffect(() => {
    if (profile?.id) {
      fetchClasses(profile.id);
    }
  }, [fetchClasses, profile?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (profile?.id) {
      await fetchClasses(profile.id);
    }
    setRefreshing(false);
  };

  const handleClassMenu = (classData: ClassWithSessions) => {
    Alert.alert(classData.name, 'What would you like to do?', [
      {
        text: 'Edit',
        onPress: () => router.push(`/class/${classData.id}/edit` as any),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => confirmDeleteClass(classData),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const confirmDeleteClass = (classData: ClassWithSessions) => {
    Alert.alert(
      'Delete Class',
      `Are you sure you want to delete "${classData.name}"? This will also delete all notes and study materials.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteClass(classData.id),
        },
      ]
    );
  };

  const getScheduleSummary = (classData: ClassWithSessions) => {
    const days = [...new Set(classData.class_sessions.map((s) => s.day_of_week))].sort();
    if (days.length === 0) return 'No schedule set';

    const dayNames = days.map((d) => DAYS[d]).join(', ');
    const firstSession = classData.class_sessions[0];
    return `${dayNames} at ${firstSession?.start_time?.slice(0, 5) || 'TBD'}`;
  };

  return (
    <Background>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(600).springify()}
          style={styles.header}
        >
          <Text style={[typography.displaySmall, { color: colors.text }]}>Classes</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Add class"
            style={[styles.addButton, { backgroundColor: colors.white, ...SHADOWS.md }]}
            onPress={handleAddClass}
          >
            <Ionicons name="add" size={24} color={colors.accent} />
          </TouchableOpacity>
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
          {/* Stats */}
          <Animated.View
            entering={FadeInUp.delay(200).duration(600).springify()}
            style={styles.statsContainer}
          >
            <View style={[styles.statCard, { backgroundColor: colors.white, ...SHADOWS.md }]}>
              <Text style={[typography.headlineLarge, { color: colors.accent }]}>
                {classes.length}
              </Text>
              <Text style={[typography.labelSmall, { color: colors.accent }]}>ACTIVE CLASSES</Text>
            </View>
            <View
              style={[styles.statCard, { backgroundColor: colors.glassBackground, ...SHADOWS.md }]}
            >
              <Text style={[typography.headlineLarge, { color: colors.white }]}>
                {classes.reduce((acc, c) => acc + c.class_sessions.length, 0)}
              </Text>
              <Text style={[typography.labelSmall, { color: colors.textSecondary }]}>
                SESSIONS/WEEK
              </Text>
            </View>
          </Animated.View>

          {/* Error State */}
          {classesError && <ErrorState message={classesError} onRetry={onRefresh} />}

          {/* Classes list */}
          {!classesError && classes.length > 0 ? (
            classes.map((classData, index) => (
              <Animated.View
                key={classData.id}
                entering={FadeInUp.delay(index * 100 + 300).duration(400)}
              >
                <Card
                  variant="default"
                  padding="lg"
                  style={styles.classCard}
                  onPress={() => router.push(`/class/${classData.id}`)}
                >
                  <View style={styles.classHeader}>
                    <View
                      style={[
                        styles.classIndicator,
                        { backgroundColor: classData.color || colors.background },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.titleLarge, { color: colors.cardText }]}>
                        {classData.name}
                      </Text>
                      <Text
                        style={[
                          typography.bodySmall,
                          { color: colors.cardTextSecondary, marginTop: 4 },
                        ]}
                      >
                        {getScheduleSummary(classData)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`More options for ${classData.name}`}
                      onPress={() => handleClassMenu(classData)}
                      style={styles.menuButton}
                    >
                      <Ionicons
                        name="ellipsis-vertical"
                        size={20}
                        color={colors.cardTextTertiary}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Days indicator */}
                  <View style={styles.daysContainer}>
                    {DAYS.map((day, dayIndex) => {
                      const hasSession = classData.class_sessions.some(
                        (s) => s.day_of_week === dayIndex
                      );
                      return (
                        <View
                          key={day}
                          style={[
                            styles.dayDot,
                            {
                              backgroundColor: hasSession
                                ? classData.color || colors.background
                                : colors.cardSecondary,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              {
                                color: hasSession ? colors.white : colors.cardTextTertiary,
                              },
                            ]}
                          >
                            {day.charAt(0)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Quick actions */}
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Create a note for ${classData.name}`}
                      style={[styles.actionButton, { backgroundColor: colors.accent }]}
                      onPress={() => router.push(`/notes/new?classId=${classData.id}`)}
                    >
                      <Ionicons name="create-outline" size={16} color={colors.white} />
                      <Text style={[typography.labelSmall, { color: colors.white }]}>New Note</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Study ${classData.name}`}
                      style={[styles.actionButton, { backgroundColor: colors.cardSecondary }]}
                      onPress={() => router.push(`/class/${classData.id}/study`)}
                    >
                      <Ionicons name="sparkles-outline" size={16} color={colors.cardText} />
                      <Text style={[typography.labelSmall, { color: colors.cardText }]}>Study</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              </Animated.View>
            ))
          ) : !classesError ? (
            <Animated.View entering={FadeInUp.delay(300).duration(600).springify()}>
              <Card variant="default" padding="xl">
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIcon, { backgroundColor: colors.cardTertiary }]}>
                    <Ionicons name="school-outline" size={40} color={colors.onCard} />
                  </View>
                  <Text
                    style={[
                      typography.titleMedium,
                      { color: colors.cardText, marginTop: SPACING.lg },
                    ]}
                  >
                    No classes yet
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
                    Add your first class to start receiving personalized study reminders
                  </Text>
                  <Button
                    variant="primary"
                    size="md"
                    style={{ marginTop: SPACING.xl }}
                    onPress={handleAddClass}
                    icon={<Ionicons name="add" size={20} color={colors.accent} />}
                  >
                    Add Class
                  </Button>
                </View>
              </Card>
            </Animated.View>
          ) : null}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.screenPadding,
    paddingVertical: SPACING.md,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingBottom: LAYOUT.tabBarContentInset,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  classCard: {
    marginBottom: SPACING.md,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  classIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  menuButton: {
    minWidth: LAYOUT.minTouchTarget,
    minHeight: LAYOUT.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    minHeight: LAYOUT.minTouchTarget,
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
