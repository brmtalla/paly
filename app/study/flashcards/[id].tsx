import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  FadeIn,
} from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme } from '../../../src/theme/ThemeContext';
import { typography } from '../../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS, SHADOWS } from '../../../src/theme/spacing';
import { Button, Background, GlassCard } from '../../../src/components/ui';
import { useStudyStore } from '../../../src/stores/studyStore';
import { useSubscriptionStore } from '../../../src/stores/subscriptionStore';
import { useAuthStore } from '../../../src/stores/authStore';
import { TRIAL_DAYS } from '../../../src/lib/constants';
import { getTrialStatus } from '../../../src/lib/trial';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - SPACING.xl * 2;

function getStudyDay(sessionDate: string): number {
  const created = new Date(sessionDate + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffMs = now.getTime() - created.getTime();
  return Math.max(1, Math.floor(diffMs / 86400000) + 1);
}

const STORAGE_KEY_PREFIX = 'flipped_cards_';

export default function FlashcardsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, colorScheme } = useTheme();
  const { synthesizedContent, awardPoints } = useStudyStore();
  const { isPro, presentPaywall } = useSubscriptionStore();
  const { profile } = useAuthStore();
  const { hasUsedTrial } = getTrialStatus(profile);

  const content = synthesizedContent.find((c) => c.id === id);
  const allFlashcards = (content?.flashcards || []) as {
    front: string;
    back: string;
    day?: number;
  }[];

  const currentStudyDay = content?.session_date ? getStudyDay(content.session_date) : 1;

  const [showAll, setShowAll] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [_persistedFlipped, setPersistedFlipped] = useState<Set<number>>(new Set());
  const [pointsEarned, setPointsEarned] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const flipProgress = useSharedValue(0);

  useEffect(() => {
    if (!id) return;
    AsyncStorage.getItem(STORAGE_KEY_PREFIX + id).then((val) => {
      if (val) {
        const indices: number[] = JSON.parse(val);
        setPersistedFlipped(new Set(indices));
        setFlippedCards(new Set(indices));
      }
      setLoaded(true);
    });
  }, [id]);

  const persistFlipped = useCallback(
    (updated: Set<number>) => {
      if (!id) return;
      AsyncStorage.setItem(STORAGE_KEY_PREFIX + id, JSON.stringify([...updated]));
    },
    [id]
  );

  const unlockedCards = allFlashcards.filter((card) => {
    if (!card.day) return true;
    return card.day <= currentStudyDay;
  });

  const visibleCards = showAll ? allFlashcards : unlockedCards;
  const lockedCount = allFlashcards.length - unlockedCards.length;

  const unflippedUnlockedCount = unlockedCards.filter((_, idx) => {
    const globalIdx = allFlashcards.indexOf(unlockedCards[idx]);
    return !flippedCards.has(globalIdx);
  }).length;

  const handleFlip = () => {
    flipProgress.value = withSpring(isFlipped ? 0 : 1, { damping: 15 });
    const globalIndex = allFlashcards.indexOf(visibleCards[currentIndex]);
    if (!isFlipped && !flippedCards.has(globalIndex)) {
      const updated = new Set(flippedCards).add(globalIndex);
      setFlippedCards(updated);
      persistFlipped(updated);
      if (id) {
        // The server decides the payout and refuses a card it has already paid for.
        awardPoints('flashcard_flip', `${id}:${globalIndex}`).then((result) => {
          if (result?.awarded) setPointsEarned((prev) => prev + result.points);
        });
      }
    }
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (currentIndex < visibleCards.length - 1) {
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

  const toggleShowAll = () => {
    setShowAll(!showAll);
    setCurrentIndex(0);
    setIsFlipped(false);
    flipProgress.value = 0;
  };

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [0, 180]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden' as const,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [180, 360]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden' as const,
    };
  });

  if (!loaded) return null;

  // Flashcards are a Paly Pro feature. Free users still get their daily study
  // chunks and quizzes — this shows what upgrading adds rather than a dead end.
  if (!isPro) {
    return (
      <Background>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[typography.titleMedium, { color: colors.text }]}>Flashcards</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.centered}>
            <Animated.View entering={FadeIn.duration(400)} style={{ width: '100%' }}>
              <GlassCard padding="lg">
                <View style={styles.lockBadge}>
                  <Ionicons name="diamond" size={28} color={colors.onCard} />
                </View>

                <Text
                  style={[
                    typography.titleLarge,
                    { color: colors.text, textAlign: 'center', marginTop: SPACING.md },
                  ]}
                >
                  Flashcards are a Pro feature
                </Text>

                <Text
                  style={[
                    typography.bodyMedium,
                    {
                      color: colors.textSecondary,
                      textAlign: 'center',
                      marginTop: SPACING.sm,
                    },
                  ]}
                >
                  {allFlashcards.length > 0
                    ? `${allFlashcards.length} cards are ready for this lecture. Upgrade to start reviewing — and earn Paly Points for every card you flip.`
                    : 'Upgrade to unlock AI-generated flashcards for every lecture, and earn Paly Points for every card you flip.'}
                </Text>

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onPress={presentPaywall}
                  style={{ marginTop: SPACING.xl }}
                >
                  {hasUsedTrial ? 'Unlock Flashcards' : `Try Pro Free for ${TRIAL_DAYS} Days`}
                </Button>

                <TouchableOpacity onPress={() => router.back()} style={styles.notNow}>
                  <Text style={[typography.labelLarge, { color: colors.white }]}>Not now</Text>
                </TouchableOpacity>
              </GlassCard>
            </Animated.View>
          </View>
        </SafeAreaView>
      </Background>
    );
  }

  if (!content || allFlashcards.length === 0) {
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

  if (visibleCards.length === 0) {
    return (
      <Background>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            <Ionicons
              name="time-outline"
              size={64}
              color={colorScheme === 'dark' ? colors.text : colors.cardTextMuted}
            />
            <Text style={[typography.titleMedium, { color: colors.text, marginTop: SPACING.lg }]}>
              No cards unlocked yet
            </Text>
            <Text
              style={[
                typography.bodyMedium,
                { color: colors.textSecondary, textAlign: 'center', marginTop: SPACING.sm },
              ]}
            >
              New flashcards unlock each day of your study schedule. Check back tomorrow!
            </Text>
            <Button variant="ghost" onPress={() => router.back()} style={{ marginTop: SPACING.lg }}>
              Go Back
            </Button>
          </View>
        </SafeAreaView>
      </Background>
    );
  }

  const currentCard = visibleCards[currentIndex];
  const globalIdx = allFlashcards.indexOf(currentCard);
  const isCurrentFlipped = flippedCards.has(globalIdx);
  const isLocked = showAll && currentCard.day && currentCard.day > currentStudyDay;

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
              {currentIndex + 1} / {visibleCards.length}
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

          {/* Day info + View All toggle */}
          <View style={styles.dayInfoRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={[typography.labelSmall, { color: colors.textSecondary, marginLeft: 4 }]}>
                Day {currentStudyDay}
                {unflippedUnlockedCount > 0 && !showAll ? ` · ${unflippedUnlockedCount} new` : ''}
                {lockedCount > 0 && !showAll ? ` · ${lockedCount} locked` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={toggleShowAll} style={styles.viewAllButton}>
              <Ionicons
                name={showAll ? 'lock-open-outline' : 'grid-outline'}
                size={14}
                color={colors.text}
              />
              <Text
                style={[
                  typography.labelSmall,
                  { color: colors.text, marginLeft: 4 },
                ]}
              >
                {showAll ? 'Scheduled Only' : 'View All'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Progress */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.glassBackground }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.card,
                    width: `${((currentIndex + 1) / visibleCards.length) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>

          {/* Flashcard */}
          <View style={styles.cardContainer}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={isLocked ? undefined : handleFlip}
              style={styles.cardWrapper}
            >
              {/* Locked overlay for future-day cards in "View All" mode */}
              {isLocked ? (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      opacity: 0.6,
                      ...SHADOWS.lg,
                    },
                  ]}
                >
                  <Ionicons name="lock-closed" size={32} color={colors.cardTextMuted} />
                  <Text
                    style={[
                      typography.labelMedium,
                      { color: colors.cardTextMuted, marginTop: SPACING.md },
                    ]}
                  >
                    Unlocks Day {currentCard.day}
                  </Text>
                  <Text
                    style={[
                      typography.bodySmall,
                      {
                        color: colors.cardTextMuted,
                        textAlign: 'center',
                        marginTop: SPACING.sm,
                        paddingHorizontal: SPACING.lg,
                      },
                    ]}
                  >
                    {currentCard.front}
                  </Text>
                </Animated.View>
              ) : (
                <>
                  {/* Front */}
                  <Animated.View
                    style={[
                      styles.card,
                      { backgroundColor: colors.card, ...SHADOWS.lg },
                      frontAnimatedStyle,
                    ]}
                  >
                    {isCurrentFlipped && (
                      <View style={[styles.completedDot, { backgroundColor: '#22C55E' }]} />
                    )}
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
                      style={[
                        typography.headlineSmall,
                        { color: colors.text, textAlign: 'center' },
                      ]}
                    >
                      {currentCard.back}
                    </Text>
                  </Animated.View>
                </>
              )}
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

            {!isLocked && (
              <TouchableOpacity
                onPress={handleFlip}
                style={[styles.flipButton, { backgroundColor: colors.card, ...SHADOWS.md }]}
              >
                <Ionicons name="refresh" size={24} color={colors.cardText} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleNext}
              disabled={currentIndex === visibleCards.length - 1}
              style={[
                styles.navButton,
                {
                  backgroundColor: colors.glassBackground,
                  opacity: currentIndex === visibleCards.length - 1 ? 0.5 : 1,
                },
              ]}
            >
              <Ionicons name="arrow-forward" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Complete Button */}
          {currentIndex === visibleCards.length - 1 && (
            <View style={styles.completeContainer}>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onPress={() => router.back()}
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
  lockBadge: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  notNow: {
    alignSelf: 'center',
    paddingVertical: SPACING.sm,
  },
  dayInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.screenPadding,
    marginBottom: SPACING.sm,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
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
  completedDot: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    width: 10,
    height: 10,
    borderRadius: 5,
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
