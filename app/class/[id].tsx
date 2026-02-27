import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as DocumentPicker from 'expo-document-picker';
import { format, formatDistanceToNow } from 'date-fns';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS, SHADOWS } from '../../src/theme/spacing';
import { Card, Button, Background } from '../../src/components/ui';
import { useClassStore } from '../../src/stores/classStore';
import { useNoteStore } from '../../src/stores/noteStore';
import { useStudyStore } from '../../src/stores/studyStore';
import { useAuthStore } from '../../src/stores/authStore';
import { supabase } from '../../src/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function ClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, colorScheme } = useTheme();
  const { classes, deleteClass } = useClassStore();
  const { notes, fetchNotes, uploadFile } = useNoteStore();
  const { synthesizedContent, fetchSynthesizedContent, isSynthesizing, getOverdueQuizzes, getNextQuizDeadline } = useStudyStore();
  const { profile } = useAuthStore();
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const overdueQuizzes = id ? getOverdueQuizzes(id) : [];
  const nextQuizDeadline = id ? getNextQuizDeadline(id) : null;
  const streak = profile?.streak_count ?? 0;

  // Detect unsynthesized uploads for this class
  const classUploads = notes.flatMap(n => n.uploads).filter(u => u.class_id === id);
  const synthesizedDates = new Set(synthesizedContent.filter(c => c.class_id === id).map(c => c.session_date));
  const uploadDates = new Set(classUploads.map(u => u.session_date));
  const hasUnsynthesized = [...uploadDates].some(d => !synthesizedDates.has(d)) || (classUploads.length > 0 && synthesizedContent.filter(c => c.class_id === id).length === 0);

  // Glow animation for Synthesize button
  const glowOpacity = useSharedValue(0.4);
  useEffect(() => {
    if (hasUnsynthesized && !profile?.auto_synthesize) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      glowOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [hasUnsynthesized, profile?.auto_synthesize]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));
  
  const classData = classes.find(c => c.id === id);
  const classNotes = notes.filter(n => n.class_id === id);

  useEffect(() => {
    if (profile?.id && id) {
      fetchNotes(profile.id, id);
      fetchSynthesizedContent(profile.id, id);
    }
  }, [profile?.id, id]);

  const handleUploadSlides = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled || !result.assets?.length) return;

      setIsUploading(true);
      const sessionDate = format(new Date(), 'yyyy-MM-dd');

      for (const asset of result.assets) {
        await uploadFile(
          null,
          id!,
          profile!.id,
          sessionDate,
          asset.uri,
          asset.name
        );
      }

      const autoMode = profile?.auto_synthesize ?? false;
      Alert.alert(
        'Upload Complete',
        autoMode
          ? `${result.assets.length} file${result.assets.length > 1 ? 's' : ''} uploaded! Study texts will start arriving automatically.`
          : `${result.assets.length} file${result.assets.length > 1 ? 's' : ''} uploaded! Tap Synthesize when you're ready to generate study materials.`,
      );
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSynthesize = async () => {
    if (!profile?.id || !id) return;
    setIsProcessing(true);
    try {
      const sessionDate = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase.functions.invoke('process-upload', {
        body: {
          uploadId: 'manual-trigger',
          filePath: '',
          fileType: '',
          classId: id,
          userId: profile.id,
          sessionDate,
          skipExtraction: true,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.status === 'blocked_overdue_quiz') {
        Alert.alert('Quiz Required', 'Complete your overdue quiz first to synthesize new content.');
      } else {
        Alert.alert(
          'Synthesis Complete',
          `Study materials generated! ${data?.promptsScheduled || 0} study texts scheduled over ${data?.studyDays || 0} days.`,
        );
        fetchSynthesizedContent(profile.id, id);
      }
    } catch (error: any) {
      console.error('Synthesis error:', error);
      Alert.alert('Synthesis Failed', error.message || 'Make sure you have notes or uploaded files first.');
    } finally {
      setIsProcessing(false);
    }
  };

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
            style={styles.actionsGrid}
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
              onPress={handleUploadSlides}
              disabled={isUploading}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: colors.background }]}>
                {isUploading ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Ionicons name="cloud-upload-outline" size={24} color={colors.text} />
                )}
              </View>
              <Text style={[typography.labelMedium, { color: colors.cardText }]}>
                {isUploading ? 'Uploading...' : 'Upload Slides'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.card, ...SHADOWS.md, overflow: 'hidden' }]}
              onPress={handleSynthesize}
              disabled={isProcessing || isSynthesizing}
            >
              {hasUnsynthesized && !profile?.auto_synthesize && (
                <Animated.View
                  style={[StyleSheet.absoluteFill, { backgroundColor: '#8B5CF6' }, glowStyle]}
                  pointerEvents="none"
                />
              )}
              <View style={[styles.quickActionIcon, { backgroundColor: colors.background }]}>
                {isProcessing || isSynthesizing ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Ionicons name="sparkles-outline" size={24} color={hasUnsynthesized ? '#8B5CF6' : colors.text} />
                )}
              </View>
              <Text style={[typography.labelMedium, { color: hasUnsynthesized ? '#fff' : colors.cardText }]}>
                {isProcessing || isSynthesizing ? 'Synthesizing...' : 'Synthesize'}
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

          {/* Quiz & Streak Status */}
          <Animated.View
            entering={FadeInDown.delay(350).duration(600).springify()}
            style={{ marginBottom: SPACING.lg }}
          >
            {overdueQuizzes.length > 0 ? (
              <Card style={[styles.quizStatusCard, { borderLeftColor: colors.error, borderLeftWidth: 4 }]}>
                <View style={styles.quizStatusRow}>
                  <Ionicons name="alert-circle" size={28} color={colors.error} />
                  <View style={{ flex: 1, marginLeft: SPACING.md }}>
                    <Text style={[typography.titleSmall, { color: colors.error }]}>
                      Overdue Quiz
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.cardTextSecondary }]}>
                      Take the quiz to unlock new study material
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.takeQuizButton, { backgroundColor: colors.error }]}
                  onPress={() => router.push(`/class/${id}/study`)}
                >
                  <Text style={[typography.labelMedium, { color: '#fff' }]}>Take Quiz Now</Text>
                </TouchableOpacity>
              </Card>
            ) : (
              <Card style={styles.quizStatusCard}>
                <View style={styles.quizStatusRow}>
                  <View style={[styles.streakBadge, { backgroundColor: colors.background }]}>
                    <Text style={[typography.headlineSmall, { color: colors.text }]}>
                      {streak}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: SPACING.md }}>
                    <Text style={[typography.titleSmall, { color: colors.cardText }]}>
                      {streak > 0 ? `${streak} quiz streak` : 'No streak yet'}
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.cardTextSecondary }]}>
                      {nextQuizDeadline
                        ? `Next quiz due ${formatDistanceToNow(new Date(nextQuizDeadline + 'T00:00:00'), { addSuffix: true })}`
                        : 'Upload slides to start studying'}
                    </Text>
                  </View>
                  <Ionicons name="flame" size={24} color={streak > 0 ? '#FF6B35' : colors.cardTextMuted} />
                </View>
              </Card>
            )}
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
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  quickAction: {
    width: '47%',
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
  quizStatusCard: {
    marginBottom: 0,
  },
  quizStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakBadge: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  takeQuizButton: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
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
