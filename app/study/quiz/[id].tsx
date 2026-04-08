import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../../src/theme/ThemeContext';
import { typography } from '../../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS, SHADOWS } from '../../../src/theme/spacing';
import { Card, Button, Background } from '../../../src/components/ui';
import { useStudyStore } from '../../../src/stores/studyStore';
import { useAuthStore } from '../../../src/stores/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, colorScheme } = useTheme();
  const {
    synthesizedContent,
    fetchSynthesizedContent,
    awardPoints,
    startQuiz,
    answerQuestion,
    completeQuiz,
  } = useStudyStore();
  const { profile } = useAuthStore();
  const pointsAwarded = useRef(false);
  const quizStarted = useRef(false);

  const content = synthesizedContent.find((c) => c.id === id);
  const questions = (content?.quiz_questions || []) as any[];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (content && profile?.id && !quizStarted.current && questions.length > 0) {
      quizStarted.current = true;
      startQuiz(content.class_id, profile.id, content.id).catch(console.error);
    }
  }, [content, profile?.id]);

  const handleSelectAnswer = (optionIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(optionIndex);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null) return;

    const isCorrect = selectedAnswer === questions[currentIndex].correct_index;
    if (isCorrect) {
      setScore(score + 1);
    }
    answerQuestion(isCorrect);
    setShowResult(true);
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      const finalScore = score + (selectedAnswer === questions[currentIndex].correct_index ? 1 : 0);
      const pct = finalScore / questions.length;
      if (pct >= 0.8 && profile?.id && !pointsAwarded.current) {
        pointsAwarded.current = true;
        awardPoints(profile.id, 10, 'quiz_pass');
      }
      await completeQuiz();
      if (profile?.id) {
        fetchSynthesizedContent(profile.id);
      }
      setIsComplete(true);
    }
  };

  if (!content || questions.length === 0) {
    return (
      <Background>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            <Ionicons
              name="help-circle-outline"
              size={64}
              color={colorScheme === 'dark' ? colors.text : colors.cardTextMuted}
            />
            <Text style={[typography.titleMedium, { color: colors.text, marginTop: SPACING.lg }]}>
              No quiz questions available
            </Text>
            <Button variant="ghost" onPress={() => router.back()}>
              Go Back
            </Button>
          </View>
        </SafeAreaView>
      </Background>
    );
  }

  if (isComplete) {
    const percentage = Math.round((score / questions.length) * 100);

    return (
      <Background>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            <Animated.View
              entering={FadeInUp.duration(600).springify()}
              style={[styles.scoreContainer, { backgroundColor: colors.card, ...SHADOWS.lg }]}
            >
              <Ionicons
                name={percentage >= 70 ? 'trophy' : 'ribbon'}
                size={64}
                color={percentage >= 70 ? colors.warning : colors.background}
              />
              <Text
                style={[
                  typography.displayMedium,
                  { color: colors.cardText, marginTop: SPACING.lg },
                ]}
              >
                {percentage}%
              </Text>
              <Text style={[typography.titleMedium, { color: colors.cardTextSecondary }]}>
                {score} / {questions.length} correct
              </Text>
              <Text
                style={[
                  typography.bodyMedium,
                  { color: colors.cardTextTertiary, marginTop: SPACING.md, textAlign: 'center' },
                ]}
              >
                {percentage >= 90
                  ? 'Excellent work!'
                  : percentage >= 70
                    ? 'Great job! Keep it up!'
                    : percentage >= 50
                      ? 'Good effort! Review and try again!'
                      : "Keep studying, you'll get there!"}
              </Text>
              {percentage >= 80 && (
                <Animated.View
                  entering={FadeInUp.delay(300).springify()}
                  style={styles.pointsEarned}
                >
                  <Ionicons name="star" size={18} color="#FFD700" />
                  <Text style={[typography.labelMedium, { color: '#FFD700', marginLeft: 6 }]}>
                    +10 Paly Points
                  </Text>
                </Animated.View>
              )}
            </Animated.View>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => router.back()}
              style={{ marginTop: SPACING.xl }}
              textStyle={{ color: colors.accent }}
            >
              Done
            </Button>
          </View>
        </SafeAreaView>
      </Background>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <Background>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={[typography.titleMedium, { color: colors.text }]}>
            Question {currentIndex + 1} / {questions.length}
          </Text>

          <View style={{ width: 40 }} />
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.glassBackground }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.card,
                  width: `${((currentIndex + 1) / questions.length) * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Question */}
          <Card style={styles.questionCard}>
            <Text style={[typography.titleLarge, { color: colors.cardText }]}>
              {currentQuestion.question}
            </Text>
          </Card>

          {/* Options */}
          <View style={styles.options}>
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === currentQuestion.correct_index;

              let backgroundColor = colors.card;
              let borderColor = 'transparent';

              if (showResult) {
                if (isCorrect) {
                  backgroundColor = colors.success + '20';
                  borderColor = colors.success;
                } else if (isSelected && !isCorrect) {
                  backgroundColor = colors.error + '20';
                  borderColor = colors.error;
                }
              } else if (isSelected) {
                backgroundColor = colors.background;
                borderColor = colors.text;
              }

              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleSelectAnswer(index)}
                  disabled={showResult}
                  style={[
                    styles.option,
                    {
                      backgroundColor,
                      borderColor,
                      borderWidth: isSelected || (showResult && isCorrect) ? 2 : 0,
                      ...SHADOWS.sm,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.optionLetter,
                      {
                        backgroundColor:
                          isSelected && !showResult
                            ? colors.text
                            : showResult && isCorrect
                              ? colors.success
                              : showResult && isSelected && !isCorrect
                                ? colors.error
                                : colors.cardSecondary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.labelMedium,
                        {
                          color:
                            isSelected || (showResult && (isCorrect || (isSelected && !isCorrect)))
                              ? '#FFFFFF'
                              : colors.cardText,
                        },
                      ]}
                    >
                      {String.fromCharCode(65 + index)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      typography.bodyMedium,
                      {
                        color: isSelected && !showResult ? colors.text : colors.cardText,
                        flex: 1,
                      },
                    ]}
                  >
                    {option}
                  </Text>
                  {showResult && isCorrect && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  )}
                  {showResult && isSelected && !isCorrect && (
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Explanation */}
          {showResult && currentQuestion.explanation && (
            <Animated.View entering={FadeInDown.duration(400)}>
              <Card style={[styles.explanationCard, { backgroundColor: colors.glassBackground }]}>
                <View style={styles.explanationHeader}>
                  <Ionicons name="bulb-outline" size={20} color={colors.text} />
                  <Text
                    style={[typography.labelMedium, { color: colors.text, marginLeft: SPACING.sm }]}
                  >
                    Explanation
                  </Text>
                </View>
                <Text
                  style={[
                    typography.bodyMedium,
                    { color: colors.textSecondary, marginTop: SPACING.sm },
                  ]}
                >
                  {currentQuestion.explanation}
                </Text>
              </Card>
            </Animated.View>
          )}
        </ScrollView>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          {!showResult ? (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={selectedAnswer === null}
              onPress={handleSubmit}
              textStyle={{ color: colors.accent }}
            >
              Submit Answer
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleNext}
              textStyle={{ color: colors.accent }}
            >
              {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
            </Button>
          )}
        </View>
      </SafeAreaView>
    </Background>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.screenPadding,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.screenPadding,
    paddingVertical: SPACING.md,
  },
  backButton: {
    padding: SPACING.sm,
  },
  progressContainer: {
    paddingHorizontal: LAYOUT.screenPadding,
    marginBottom: SPACING.lg,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  scrollContent: {
    padding: LAYOUT.screenPadding,
    paddingBottom: SPACING.xl,
  },
  questionCard: {
    marginBottom: SPACING.xl,
  },
  options: {
    gap: SPACING.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    gap: SPACING.md,
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  explanationCard: {
    marginTop: SPACING.xl,
    borderWidth: 0,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionContainer: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingVertical: SPACING.lg,
  },
  scoreContainer: {
    padding: SPACING['2xl'],
    borderRadius: RADIUS['2xl'],
    alignItems: 'center',
    width: '100%',
  },
  pointsEarned: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: '#FFD70015',
    borderRadius: RADIUS.lg,
  },
});
