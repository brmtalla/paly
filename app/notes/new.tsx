import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { format } from 'date-fns';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS } from '../../src/theme/spacing';
import { Card, Button } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/authStore';
import { useClassStore } from '../../src/stores/classStore';
import { useNoteStore } from '../../src/stores/noteStore';
import { Ionicons } from '@expo/vector-icons';

export default function NewNoteScreen() {
  const { colors } = useTheme();
  const { classId } = useLocalSearchParams<{ classId?: string }>();
  const { profile } = useAuthStore();
  const { classes, fetchClasses } = useClassStore();
  const { createNote, uploadFile, isSaving } = useNoteStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(classId || null);
  const [attachments, setAttachments] = useState<{ name: string; uri: string }[]>([]);

  useEffect(() => {
    if (profile?.id && classes.length === 0) {
      fetchClasses(profile.id);
    }
  }, [profile?.id]);

  const handlePickDocument = async () => {
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
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setAttachments([...attachments, { name: asset.name, uri: asset.uri }]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedClassId) {
      Alert.alert('Select Class', 'Please select a class for this note');
      return;
    }

    if (!content.trim() && attachments.length === 0) {
      Alert.alert('Add Content', 'Please add some notes or attachments');
      return;
    }

    try {
      const sessionDate = format(new Date(), 'yyyy-MM-dd');

      // Create the note
      const note = await createNote({
        class_id: selectedClassId,
        user_id: profile!.id,
        title: title.trim() || `Notes - ${format(new Date(), 'MMM d, yyyy')}`,
        content: content.trim(),
        session_date: sessionDate,
      });

      // Upload attachments
      for (const attachment of attachments) {
        await uploadFile(
          note.id,
          selectedClassId,
          profile!.id,
          sessionDate,
          attachment.uri,
          attachment.name
        );
      }

      Alert.alert('Success', 'Note saved successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('Error', 'Failed to save note');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[typography.titleLarge, { color: colors.text, flex: 1 }]}>New Note</Text>
          <Button
            variant="primary"
            size="sm"
            onPress={handleSave}
            loading={isSaving}
            disabled={!selectedClassId || (!content.trim() && attachments.length === 0)}
          >
            Save
          </Button>
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Class selector */}
            <Animated.View entering={FadeInUp.delay(200).duration(400)}>
              <Text
                style={[
                  typography.labelSmall,
                  { color: colors.textMuted, marginBottom: SPACING.sm },
                ]}
              >
                CLASS
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.classSelector}
              >
                {classes.map((classData) => (
                  <TouchableOpacity
                    key={classData.id}
                    onPress={() => setSelectedClassId(classData.id)}
                    style={[
                      styles.classChip,
                      {
                        backgroundColor:
                          selectedClassId === classData.id
                            ? colors.accent
                            : colors.backgroundSecondary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.labelMedium,
                        {
                          color:
                            selectedClassId === classData.id ? '#FFFFFF' : colors.textSecondary,
                        },
                      ]}
                    >
                      {classData.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>

            {/* Title input */}
            <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.inputSection}>
              <TextInput
                placeholder="Note title (optional)"
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
                style={[styles.titleInput, typography.headlineSmall, { color: colors.text }]}
              />
            </Animated.View>

            {/* Content input */}
            <Animated.View
              entering={FadeInUp.delay(400).duration(400)}
              style={styles.contentSection}
            >
              <TextInput
                placeholder="Start typing your notes..."
                placeholderTextColor={colors.textMuted}
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical="top"
                style={[styles.contentInput, typography.bodyLarge, { color: colors.text }]}
              />
            </Animated.View>

            {/* Attachments */}
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
                ATTACHMENTS
              </Text>

              {attachments.map((attachment, index) => (
                <Card key={index} variant="default" padding="md" style={styles.attachmentCard}>
                  <View style={styles.attachmentContent}>
                    <Ionicons name="document-outline" size={20} color={colors.accent} />
                    <Text
                      style={[typography.bodyMedium, { color: colors.text, flex: 1 }]}
                      numberOfLines={1}
                    >
                      {attachment.name}
                    </Text>
                    <TouchableOpacity onPress={() => handleRemoveAttachment(index)}>
                      <Ionicons name="close-circle" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </Card>
              ))}

              <TouchableOpacity
                onPress={handlePickDocument}
                style={[styles.addAttachment, { borderColor: colors.accent }]}
              >
                <Ionicons name="add" size={20} color={colors.accent} />
                <Text style={[typography.labelMedium, { color: colors.accent }]}>
                  Add PDF, PPT, or DOC
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.screenPadding,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  backButton: {
    padding: SPACING.xs,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingBottom: SPACING['3xl'],
  },
  classSelector: {
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  classChip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    marginRight: SPACING.sm,
  },
  inputSection: {
    marginTop: SPACING.xl,
  },
  titleInput: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  contentSection: {
    marginTop: SPACING.lg,
    flex: 1,
  },
  contentInput: {
    minHeight: 200,
    paddingVertical: SPACING.md,
    lineHeight: 24,
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
  addAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
});
