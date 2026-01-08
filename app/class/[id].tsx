import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { format } from 'date-fns';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS, SHADOWS } from '../../src/theme/spacing';
import { Card, Button, Background } from '../../src/components/ui';
import { useClassStore } from '../../src/stores/classStore';
import { useNoteStore } from '../../src/stores/noteStore';
import { useAuthStore } from '../../src/stores/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function ClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, colorScheme } = useTheme();
  const { classes, deleteClass } = useClassStore();
  const { notes, fetchNotes } = useNoteStore();
  const { profile } = useAuthStore();
  
  const classData = classes.find(c => c.id === id);
  const classNotes = notes.filter(n => n.class_id === id);

  useEffect(() => {
    if (profile?.id && id) {
      fetchNotes(profile.id, id);
    }
  }, [profile?.id, id]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Class',
      `Are you sure you want to delete "${classData?.name}"? This will also delete all notes and study materials.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (id) {
              await deleteClass(id);
              router.back();
            }
          },
        },
      ]
    );
  };

  const handleEmailInstructor = () => {
    if (classData?.instructor_email) {
      Linking.openURL(`mailto:${classData.instructor_email}`);
    }
  };

  if (!classData) {
    return (
      <Background>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            <Text style={[typography.bodyLarge, { color: colors.text }]}>
              Class not found
            </Text>
            <Button variant="ghost" onPress={() => router.back()}>
              Go Back
            </Button>
          </View>
        </SafeAreaView>
      </Background>
    );
  }

  const getDayLabel = (day: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[day];
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
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
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => router.push(`/class/${id}/edit` as any)}
                style={[styles.actionButton, { backgroundColor: colors.glassBackground }]}
              >
                <Ionicons name="pencil-outline" size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                style={[styles.actionButton, { backgroundColor: colors.error + '20' }]}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Class Info */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(600).springify()}
          >
            <Card style={styles.infoCard}>
              <Text style={[typography.headlineMedium, { color: colors.cardText }]}>
                {classData.name}
              </Text>
              
              {/* Location */}
              {classData.location && (
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={18} color={colors.cardTextSecondary} />
                  <Text style={[typography.bodyMedium, { color: colors.cardTextSecondary, marginLeft: SPACING.sm }]}>
                    {classData.location}
                  </Text>
                </View>
              )}
              
              {/* Schedule */}
              <View style={styles.schedule}>
                <View style={styles.days}>
                  {classData.class_sessions?.map((session, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dayBadge,
                        { backgroundColor: colors.background },
                      ]}
                    >
                      <Text style={[typography.labelSmall, { color: colors.text }]}>
                        {getDayLabel(session.day_of_week)}
                      </Text>
                    </View>
                  ))}
                </View>
                
                {classData.class_sessions?.[0] && (
                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={18} color={colors.cardTextSecondary} />
                    <Text style={[typography.bodyMedium, { color: colors.cardTextSecondary, marginLeft: SPACING.sm }]}>
                      {classData.class_sessions[0].start_time} - {classData.class_sessions[0].end_time}
                    </Text>
                  </View>
                )}
              </View>

              {/* Semester Dates */}
              {(classData.start_date || classData.end_date) && (
                <View style={[styles.infoRow, { marginTop: SPACING.md }]}>
                  <Ionicons name="calendar-outline" size={18} color={colors.cardTextSecondary} />
                  <Text style={[typography.bodyMedium, { color: colors.cardTextSecondary, marginLeft: SPACING.sm }]}>
                    {formatDate(classData.start_date)} — {formatDate(classData.end_date)}
                  </Text>
                </View>
              )}
            </Card>
          </Animated.View>

          {/* Instructor Info */}
          {(classData.instructor_name || classData.instructor_email) && (
            <Animated.View
              entering={FadeInDown.delay(250).duration(600).springify()}
            >
              <Card style={styles.instructorCard}>
                <View style={styles.instructorHeader}>
                  <View style={[styles.instructorAvatar, { backgroundColor: colors.background }]}>
                    <Ionicons name="person" size={20} color={colors.text} />
                  </View>
                  <View style={styles.instructorInfo}>
                    <Text style={[typography.titleSmall, { color: colors.cardText }]}>
                      {classData.instructor_name || 'Instructor'}
                    </Text>
                    {classData.instructor_email && (
                      <Text style={[typography.bodySmall, { color: colors.cardTextSecondary }]}>
                        {classData.instructor_email}
                      </Text>
                    )}
                  </View>
                </View>
                
                {classData.instructor_email && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Ionicons name="mail-outline" size={16} color={colors.text} />}
                    onPress={handleEmailInstructor}
                    style={{ marginTop: SPACING.md }}
                  >
                    Email Instructor
                  </Button>
                )}
              </Card>
            </Animated.View>
          )}

          {/* Quick Actions */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(600).springify()}
            style={styles.actions}
          >
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.card, ...SHADOWS.md }]}
              onPress={() => router.push(`/notes/new?classId=${id}`)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.background }]}>
                <Ionicons name="create-outline" size={24} color={colors.text} />
              </View>
              <Text style={[typography.labelMedium, { color: colors.cardText }]}>
                Take Notes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.card, ...SHADOWS.md }]}
              onPress={() => router.push(`/class/${id}/study`)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.background }]}>
                <Ionicons name="book-outline" size={24} color={colors.text} />
              </View>
              <Text style={[typography.labelMedium, { color: colors.cardText }]}>
                Study
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Notes Section */}
          <Animated.View
            entering={FadeInDown.delay(400).duration(600).springify()}
          >
            <Text style={[typography.titleMedium, { color: colors.text, marginBottom: SPACING.md }]}>
              Notes ({classNotes.length})
            </Text>

            {classNotes.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons 
                  name="document-text-outline" 
                  size={48} 
                  color={colorScheme === 'dark' ? colors.text : colors.cardTextMuted} 
                />
                <Text style={[typography.bodyLarge, { color: colors.cardText, marginTop: SPACING.md }]}>
                  No notes yet
                </Text>
                <Text style={[typography.bodySmall, { color: colors.cardTextSecondary, textAlign: 'center' }]}>
                  Take notes during class to generate study materials
                </Text>
              </Card>
            ) : (
              classNotes.map((note, index) => (
                <TouchableOpacity
                  key={note.id}
                  onPress={() => router.push(`/notes/${note.id}`)}
                >
                  <Card style={styles.noteCard}>
                    <View style={styles.noteHeader}>
                      <Text style={[typography.titleSmall, { color: colors.cardText }]}>
                        {format(new Date(note.session_date), 'EEEE, MMM d')}
                      </Text>
                      {note.is_synthesized && (
                        <View style={[styles.synthesizedBadge, { backgroundColor: colors.success + '20' }]}>
                          <Ionicons name="sparkles" size={12} color={colors.success} />
                          <Text style={[typography.labelSmall, { color: colors.success, marginLeft: 4 }]}>
                            Synthesized
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text 
                      style={[typography.bodySmall, { color: colors.cardTextSecondary }]}
                      numberOfLines={2}
                    >
                      {note.content || 'No content'}
                    </Text>
                  </Card>
                </TouchableOpacity>
              ))
            )}
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
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  backButton: {
    padding: SPACING.sm,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    padding: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  infoCard: {
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  schedule: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  days: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  dayBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  instructorCard: {
    marginBottom: SPACING.lg,
  },
  instructorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructorInfo: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    gap: SPACING.sm,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SPACING['2xl'],
  },
  noteCard: {
    marginBottom: SPACING.md,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  synthesizedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
});
