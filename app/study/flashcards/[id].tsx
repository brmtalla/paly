import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme } from '../../../src/theme/ThemeContext';
import { typography } from '../../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS, SHADOWS } from '../../../src/theme/spacing';
import { Button, Background } from '../../../src/components/ui';
import { useStudyStore } from '../../../src/stores/studyStore';
import { useAuthStore } from '../../../src/stores/authStore';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - SPACING.xl * 2;

export default function FlashcardsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, colorScheme } = useTheme();
  const { synthesizedContent, awardPoints } = useStudyStore();
  const { profile } = useAuthStore();

  const content = synthesizedContent.find((c) => c.id === id);
  const flashcards = content?.flashcards || [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [pointsEarned, setPointsEarned] = useState(0);

  const flipProgress = useSharedValue(0);

  const handleFlip = () => {
    flipProgress.value = withSpring(isFlipped ? 0 : 1, { damping: 15 });
    if (!isFlipped && !flippedCards.has(currentIndex)) {
      setFlippedCards((prev) => new Set(prev).add(currentIndex));
      setPointsEarned((prev) => prev + 5);
      if (profile?.id) {
        awardPoints(profile.id, 5, 'flashcard_flip');
      }
    }
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      flipProgress.value = 0;
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
      flipProgress.value = 0;
    }
  };

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [0, 180]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden',
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [180, 360]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden',
    };
  });

  if (!content || flashcards.length === 0) {
    return (
      <Background>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            <Ionicons
              name="layers-outline"
              size={64}
              color={colorScheme === 'dark' ? colors.text : colors.cardTextMuted}
            />
            <Text style={[typography.titleMedium, { color: colors.text, marginTop: SPACING.lg }]}>
              No flashcards available
            </Text>
            <Button variant="ghost" onPress={() => router.back()}>
              Go Back
            </Button>
          </View>
        </SafeAreaView>
      </Background>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Background>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>

            <Text style={[typography.titleMedium, { color: colors.text }]}>
              {currentIndex + 1} / {flashcards.length}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', minWidth: 40 }}>
              {pointsEarned > 0 && (
                <>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={[typography.labelSmall, { color: '#FFD700', marginLeft: 3 }]}>
                    +{pointsEarned}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Progress */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.glassBackground }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.card,
                    width: `${((currentIndex + 1) / flashcards.length) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>

          {/* Flashcard */}
          <View style={styles.cardContainer}>
            <TouchableOpacity activeOpacity={0.9} onPress={handleFlip} style={styles.cardWrapper}>
              {/* Front */}
              <Animated.View
                style={[
                  styles.card,
                  { backgroundColor: colors.card, ...SHADOWS.lg },
                  frontAnimatedStyle,
                ]}
              >
                <Text
                  style={[
                    typography.labelSmall,
                    { color: colors.cardTextMuted, marginBottom: SPACING.md },
                  ]}
                >
                  QUESTION
                </Text>
                <Text
                  style={[
                    typography.headlineSmall,
                    { color: colors.cardText, textAlign: 'center' },
                  ]}
                >
                  {currentCard.front}
                </Text>
                <Text
                  style={[
                    typography.bodySmall,
                    { color: colors.cardTextMuted, marginTop: SPACING.xl },
                  ]}
                >
                  Tap to reveal answer
                </Text>
              </Animated.View>

              {/* Back */}
              <Animated.View
                style={[
                  styles.card,
                  styles.cardBack,
                  { backgroundColor: colors.background, ...SHADOWS.lg },
                  backAnimatedStyle,
                ]}
              >
                <Text
                  style={[
                    typography.labelSmall,
                    { color: colors.textSecondary, marginBottom: SPACING.md },
                  ]}
                >
                  ANSWER
                </Text>
                <Text
                  style={[typography.headlineSmall, { color: colors.text, textAlign: 'center' }]}
                >
                  {currentCard.back}
                </Text>
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Navigation */}
          <View style={styles.navigation}>
            <TouchableOpacity
              onPress={handlePrevious}
              disabled={currentIndex === 0}
              style={[
                styles.navButton,
                {
                  backgroundColor: colors.glassBackground,
                  opacity: currentIndex === 0 ? 0.5 : 1,
                },
              ]}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleFlip}
              style={[styles.flipButton, { backgroundColor: colors.card, ...SHADOWS.md }]}
            >
              <Ionicons name="refresh" size={24} color={colors.cardText} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNext}
              disabled={currentIndex === flashcards.length - 1}
              style={[
                styles.navButton,
                {
                  backgroundColor: colors.glassBackground,
                  opacity: currentIndex === flashcards.length - 1 ? 0.5 : 1,
                },
              ]}
            >
              <Ionicons name="arrow-forward" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Complete Button */}
          {currentIndex === flashcards.length - 1 && (
            <View style={styles.completeContainer}>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onPress={() => router.back()}
                textStyle={{ color: colors.accent }}
              >
                Complete Session
              </Button>
            </View>
          )}
        </SafeAreaView>
      </Background>
    </GestureHandlerRootView>
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
    marginBottom: SPACING.xl,
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
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.screenPadding,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.2,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: RADIUS['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  cardBack: {
    position: 'absolute',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xl,
    paddingVertical: SPACING.xl,
  },
  navButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeContainer: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingBottom: SPACING.xl,
  },
});
