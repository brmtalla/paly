import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../../src/theme/ThemeContext';
import { typography } from '../../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS, SHADOWS } from '../../../src/theme/spacing';
import { Card, Background } from '../../../src/components/ui';
import { useClassStore } from '../../../src/stores/classStore';
import { useStudyStore } from '../../../src/stores/studyStore';
import { useAuthStore } from '../../../src/stores/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function ClassStudyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, colorScheme } = useTheme();
  const { classes } = useClassStore();
  const { synthesizedContent, fetchSynthesizedContent } = useStudyStore();
  const { profile } = useAuthStore();
  
  const classData = classes.find(c => c.id === id);
  const classContent = synthesizedContent.filter(c => c.class_id === id);

  useEffect(() => {
    if (profile?.id && id) {
      fetchSynthesizedContent(profile.id, id);
    }
  }, [profile?.id, id]);

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
            
            <Text style={[typography.titleLarge, { color: colors.text }]}>
              Study {classData?.name}
            </Text>
            
            <View style={{ width: 40 }} />
          </Animated.View>

          {/* Study Options */}
          {classContent.length === 0 ? (
            <Animated.View
              entering={FadeInDown.delay(200).duration(600).springify()}
            >
              <Card style={styles.emptyCard}>
                <Ionicons 
                  name="school-outline" 
                  size={48} 
                  color={colorScheme === 'dark' ? colors.text : colors.cardTextMuted} 
                />
                <Text style={[typography.titleMedium, { color: colors.cardText, marginTop: SPACING.md }]}>
                  No study materials yet
                </Text>
                <Text style={[typography.bodySmall, { color: colors.cardTextSecondary, textAlign: 'center', marginTop: SPACING.sm }]}>
                  Take some notes and they'll be automatically synthesized into flashcards and quizzes
                </Text>
              </Card>
            </Animated.View>
          ) : (
            <>
              {/* Flashcards */}
              <Animated.View
                entering={FadeInDown.delay(200).duration(600).springify()}
              >
                <Text style={[typography.titleMedium, { color: colors.text, marginBottom: SPACING.md }]}>
                  Flashcards
                </Text>
                {classContent.map((content) => (
                  <TouchableOpacity
                    key={`flash-${content.id}`}
                    onPress={() => router.push(`/study/flashcards/${content.id}`)}
                  >
                    <Card style={styles.studyCard}>
                      <View style={[styles.studyIcon, { backgroundColor: colors.background }]}>
                        <Ionicons name="layers-outline" size={24} color={colors.text} />
                      </View>
                      <View style={styles.studyContent}>
                        <Text style={[typography.titleSmall, { color: colors.cardText }]}>
                          {content.session_date} Session
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.cardTextSecondary }]}>
                          {content.flashcards?.length || 0} cards
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.cardTextMuted} />
                    </Card>
                  </TouchableOpacity>
                ))}
              </Animated.View>

              {/* Quizzes */}
              <Animated.View
                entering={FadeInDown.delay(300).duration(600).springify()}
                style={{ marginTop: SPACING.xl }}
              >
                <Text style={[typography.titleMedium, { color: colors.text, marginBottom: SPACING.md }]}>
                  Quizzes
                </Text>
                {classContent.map((content) => (
                  <TouchableOpacity
                    key={`quiz-${content.id}`}
                    onPress={() => router.push(`/study/quiz/${content.id}`)}
                  >
                    <Card style={styles.studyCard}>
                      <View style={[styles.studyIcon, { backgroundColor: colors.background }]}>
                        <Ionicons name="help-circle-outline" size={24} color={colors.text} />
                      </View>
                      <View style={styles.studyContent}>
                        <Text style={[typography.titleSmall, { color: colors.cardText }]}>
                          {content.session_date} Quiz
                        </Text>
                        <Text style={[typography.bodySmall, { color: colors.cardTextSecondary }]}>
                          {content.quiz_questions?.length || 0} questions
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
    padding: SPACING.sm,
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
});
