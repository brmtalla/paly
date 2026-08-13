import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { format, parseISO } from 'date-fns';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS, SHADOWS } from '../../src/theme/spacing';
import { Card, Button, Background, ErrorState } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/authStore';
import { useNoteStore } from '../../src/stores/noteStore';
import { useClassStore } from '../../src/stores/classStore';
import { NoteWithUploads } from '../../src/types/database';
import { Ionicons } from '@expo/vector-icons';

export default function NotesScreen() {
  const { colors } = useTheme();
  const { profile } = useAuthStore();
  const { notes, fetchNotes, error: notesError } = useNoteStore();
  const { classes, fetchClasses } = useClassStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) {
      fetchNotes(profile.id);
      fetchClasses(profile.id);
    }
  }, [profile?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (profile?.id) {
      await fetchNotes(profile.id, selectedClassId || undefined);
    }
    setRefreshing(false);
  };

  const filteredNotes = selectedClassId
    ? notes.filter((n) => n.class_id === selectedClassId)
    : notes;

  const getClassName = (classId: string) => {
    return classes.find((c) => c.id === classId)?.name || 'Unknown Class';
  };

  const groupedNotes = filteredNotes.reduce(
    (acc, note) => {
      const date = note.session_date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(note);
      return acc;
    },
    {} as Record<string, NoteWithUploads[]>
  );

  const sortedDates = Object.keys(groupedNotes).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <Background>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(600).springify()}
          style={styles.header}
        >
          <Text style={[typography.displaySmall, { color: colors.text }]}>Notes</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.white, ...SHADOWS.md }]}
            onPress={() => router.push('/notes/new')}
          >
            <Ionicons name="add" size={24} color={colors.accent} />
          </TouchableOpacity>
        </Animated.View>

        {/* Filter tabs */}
        <Animated.View entering={FadeInUp.delay(200).duration(600).springify()}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          >
            <TouchableOpacity
              onPress={() => setSelectedClassId(null)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: !selectedClassId ? colors.white : colors.whiteAlpha,
                },
              ]}
            >
              <Text
                style={[
                  typography.labelMedium,
                  { color: !selectedClassId ? colors.accent : colors.textSecondary },
                ]}
              >
                All Notes
              </Text>
            </TouchableOpacity>
            {classes.map((classData) => (
              <TouchableOpacity
                key={classData.id}
                onPress={() => setSelectedClassId(classData.id)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      selectedClassId === classData.id ? colors.white : colors.whiteAlpha,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.labelMedium,
                    {
                      color:
                        selectedClassId === classData.id ? colors.accent : colors.textSecondary,
                    },
                  ]}
                >
                  {classData.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
          {notesError ? (
            <ErrorState message={notesError} onRetry={onRefresh} />
          ) : sortedDates.length > 0 ? (
            sortedDates.map((date, dateIndex) => (
              <Animated.View
                key={date}
                entering={FadeInUp.delay(dateIndex * 100 + 300).duration(400)}
                style={styles.dateGroup}
              >
                <Text
                  style={[
                    typography.labelSmall,
                    { color: colors.textSecondary, marginBottom: SPACING.sm },
                  ]}
                >
                  {format(parseISO(date), 'EEEE, MMMM d, yyyy').toUpperCase()}
                </Text>

                {groupedNotes[date].map((note) => (
                  <Card
                    key={note.id}
                    variant="default"
                    padding="lg"
                    style={styles.noteCard}
                    onPress={() => router.push(`/notes/${note.id}`)}
                  >
                    <View style={styles.noteHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[typography.titleMedium, { color: colors.cardText }]}>
                          {note.title || 'Untitled Note'}
                        </Text>
                        <Text
                          style={[
                            typography.bodySmall,
                            { color: colors.cardTextSecondary, marginTop: 4 },
                          ]}
                        >
                          {getClassName(note.class_id)}
                        </Text>
                      </View>
                      {note.is_synthesized && (
                        <View
                          style={[
                            styles.synthesizedBadge,
                            { backgroundColor: colors.accent + '20' },
                          ]}
                        >
                          <Ionicons name="sparkles" size={12} color={colors.onCard} />
                        </View>
                      )}
                    </View>

                    {note.content && (
                      <Text
                        style={[
                          typography.bodySmall,
                          { color: colors.cardTextTertiary, marginTop: SPACING.sm },
                        ]}
                        numberOfLines={2}
                      >
                        {note.content.slice(0, 150)}...
                      </Text>
                    )}

                    {/* Attachments indicator */}
                    {note.uploads && note.uploads.length > 0 && (
                      <View style={styles.attachments}>
                        <Ionicons name="attach" size={14} color={colors.cardTextMuted} />
                        <Text style={[typography.labelSmall, { color: colors.cardTextMuted }]}>
                          {note.uploads.length} attachment
                          {note.uploads.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                  </Card>
                ))}
              </Animated.View>
            ))
          ) : (
            <Animated.View entering={FadeInUp.delay(300).duration(600).springify()}>
              <Card variant="default" padding="xl">
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIcon, { backgroundColor: colors.whiteAlpha }]}>
                    <Ionicons name="document-text-outline" size={40} color={colors.white} />
                  </View>
                  <Text
                    style={[
                      typography.titleMedium,
                      { color: colors.cardText, marginTop: SPACING.lg },
                    ]}
                  >
                    No notes yet
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
                    Start taking notes during your classes to build your study materials
                  </Text>
                  <Button
                    variant="primary"
                    size="md"
                    style={{ marginTop: SPACING.xl }}
                    onPress={() => router.push('/notes/new')}
                    icon={<Ionicons name="create-outline" size={20} color={colors.accent} />}
                  >
                    Create Note
                  </Button>
                </View>
              </Card>
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
  filterContainer: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  filterChip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    marginRight: SPACING.sm,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingBottom: LAYOUT.tabBarHeight + SPACING.xl,
  },
  dateGroup: {
    marginBottom: SPACING.xl,
  },
  noteCard: {
    marginBottom: SPACING.sm,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  synthesizedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachments: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
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
