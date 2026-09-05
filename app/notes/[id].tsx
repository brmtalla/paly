import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { format, parseISO } from 'date-fns';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS } from '../../src/theme/spacing';
import { Card, Button } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/authStore';
import { useNoteStore } from '../../src/stores/noteStore';
import { useClassStore } from '../../src/stores/classStore';
import { useStudyStore } from '../../src/stores/studyStore';
import { Ionicons } from '@expo/vector-icons';

export default function NoteDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuthStore();
  const { notes, updateNote, deleteNote, isSaving } = useNoteStore();
  const { classes } = useClassStore();
  const { synthesizeContent, isSynthesizing } = useStudyStore();

  const note = notes.find((n) => n.id === id);
  const classData = classes.find((c) => c.id === note?.class_id);

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(note?.content || '');
  const [editedTitle, setEditedTitle] = useState(note?.title || '');

  useEffect(() => {
    if (note) {
      setEditedContent(note.content || '');
      setEditedTitle(note.title || '');
    }
  }, [note]);

  if (!note) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.safeArea}>
          <Text
            style={[
              typography.bodyLarge,
              { color: colors.text, textAlign: 'center', marginTop: 100 },
            ]}
          >
            Note not found
          </Text>
          <Button variant="ghost" onPress={() => router.back()} style={{ marginTop: SPACING.lg }}>
            Go Back
          </Button>
        </SafeAreaView>
      </View>
    );
  }

  const handleSave = async () => {
    try {
      await updateNote(note.id, {
        title: editedTitle.trim(),
        content: editedContent.trim(),
      });
      setIsEditing(false);
    } catch {
      Alert.alert('Error', 'Failed to save note');
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteNote(note.id);
            router.back();
          } catch {
            Alert.alert('Error', 'Failed to delete note');
          }
        },
      },
    ]);
  };

  const handleSynthesize = async () => {
    if (!note.content || note.content.length < 50) {
      Alert.alert('Not Enough Content', 'Please add more notes before synthesizing.');
      return;
    }

    try {
      await synthesizeContent(note.class_id, profile!.id, note.session_date);
      Alert.alert(
        'Success',
        'Your notes have been synthesized! Check the Study tab for flashcards and quizzes.'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to synthesize content');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" onPress={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onPress={handleSave} loading={isSaving}>
                Save
              </Button>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.iconButton}>
                <Ionicons name="create-outline" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
                <Ionicons name="trash-outline" size={22} color={colors.error} />
              </TouchableOpacity>
            </>
          )}
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Class & Date info */}
          <Animated.View entering={FadeInUp.delay(200).duration(400)}>
            <View style={styles.metaRow}>
              <View style={[styles.classBadge, { backgroundColor: colors.accentLight }]}>
                <Text style={[typography.labelMedium, { color: colors.accent }]}>
                  {classData?.name || 'Unknown Class'}
                </Text>
              </View>
              <Text style={[typography.bodySmall, { color: colors.textMuted }]}>
                {format(parseISO(note.session_date), 'MMMM d, yyyy')}
              </Text>
            </View>
          </Animated.View>

          {/* Title */}
          <Animated.View entering={FadeInUp.delay(300).duration(400)}>
            {isEditing ? (
              <TextInput
                value={editedTitle}
                onChangeText={setEditedTitle}
                placeholder="Note title"
                placeholderTextColor={colors.textMuted}
                style={[styles.titleInput, typography.headlineMedium, { color: colors.text }]}
              />
            ) : (
              <Text style={[typography.headlineMedium, { color: colors.text }]}>
                {note.title || 'Untitled Note'}
              </Text>
            )}
          </Animated.View>

          {/* Content */}
          <Animated.View entering={FadeInUp.delay(400).duration(400)} style={styles.contentSection}>
            {isEditing ? (
              <TextInput
                value={editedContent}
                onChangeText={setEditedContent}
                placeholder="Start typing..."
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
                style={[styles.contentInput, typography.bodyLarge, { color: colors.text }]}
              />
            ) : (
              <Text style={[typography.bodyLarge, { color: colors.textSecondary, lineHeight: 26 }]}>
                {note.content || 'No content yet'}
              </Text>
            )}
          </Animated.View>

          {/* Attachments */}
          {note.uploads && note.uploads.length > 0 && (
            <Animated.View
              entering={FadeInUp.delay(500).duration(400)}
              style={styles.attachmentsSection}
            >
              <Text
                style={[
                  typography.labelSmall,
                  { color: colors.textMuted, marginBottom: SPACING.sm },
                ]}
              >
                ATTACHMENTS ({note.uploads.length})
              </Text>
              {note.uploads.map((upload) => (
                <Card key={upload.id} variant="default" padding="md" style={styles.attachmentCard}>
                  <View style={styles.attachmentContent}>
                    <Ionicons name="document-outline" size={20} color={colors.accent} />
                    <Text
                      style={[typography.bodyMedium, { color: colors.text, flex: 1 }]}
                      numberOfLines={1}
                    >
                      {upload.file_name}
                    </Text>
                  </View>
                </Card>
              ))}
            </Animated.View>
          )}

          {/* Synthesize button */}
          {!note.is_synthesized && !isEditing && (
            <Animated.View
              entering={FadeInUp.delay(600).duration(400)}
              style={styles.synthesizeSection}
            >
              <Card variant="accent" padding="lg">
                <View style={styles.synthesizeContent}>
                  <View style={[styles.synthesizeIcon, { backgroundColor: colors.accent }]}>
                    <Ionicons name="sparkles" size={24} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.titleMedium, { color: colors.text }]}>
                      Ready to study?
                    </Text>
                    <Text
                      style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}
                    >
                      Generate flashcards, quizzes, and study nuggets from your notes
                    </Text>
                  </View>
                </View>
                <Button
                  variant="primary"
                  fullWidth
                  onPress={handleSynthesize}
                  loading={isSynthesizing}
                  style={{ marginTop: SPACING.lg }}
                  icon={<Ionicons name="sparkles" size={18} color="#FFFFFF" />}
                >
                  Synthesize Notes
                </Button>
              </Card>
            </Animated.View>
          )}

          {note.is_synthesized && (
            <Animated.View entering={FadeInUp.delay(600).duration(400)}>
              <View style={[styles.synthesizedBadge, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={[typography.labelMedium, { color: colors.success }]}>
                  Synthesized - Check Study tab
                </Text>
              </View>
            </Animated.View>
          )}
        </ScrollView>
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
    width: '100%',
    maxWidth: LAYOUT.maxAppWidth,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.screenPadding,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  backButton: {
    width: LAYOUT.minTouchTarget,
    height: LAYOUT.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    minWidth: LAYOUT.minTouchTarget,
    minHeight: LAYOUT.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingBottom: SPACING['3xl'],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  classBadge: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
  },
  titleInput: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  contentSection: {
    marginTop: SPACING.xl,
  },
  contentInput: {
    minHeight: 200,
    lineHeight: 26,
  },
  attachmentsSection: {
    marginTop: SPACING.xl,
  },
  attachmentCard: {
    marginBottom: SPACING.sm,
  },
  attachmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  synthesizeSection: {
    marginTop: SPACING['2xl'],
  },
  synthesizeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  synthesizeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  synthesizedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginTop: SPACING['2xl'],
  },
});
