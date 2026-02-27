import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInDown, SlideInUp } from 'react-native-reanimated';
import { useTheme } from '../../../src/theme/ThemeContext';
import { typography } from '../../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS } from '../../../src/theme/spacing';
import { Card, Background } from '../../../src/components/ui';
import { useStudyStore } from '../../../src/stores/studyStore';
import { useAuthStore } from '../../../src/stores/authStore';
import { supabase } from '../../../src/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

export default function ChunkViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { markPromptScrolledToBottom } = useStudyStore();
  const { profile } = useAuthStore();
  const [reachedBottom, setReachedBottom] = useState(false);
  const [prompt, setPrompt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const hasMarked = useRef(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('study_prompts')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setPrompt(data);
        if (data?.read_at_bottom) {
          setReachedBottom(true);
          hasMarked.current = true;
        }
        setLoading(false);
      });
  }, [id]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (hasMarked.current) return;
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
    if (isAtBottom) {
      setReachedBottom(true);
      hasMarked.current = true;
      if (profile?.id && id) {
        markPromptScrolledToBottom(id, profile.id);
      }
    }
  }, [id, profile?.id]);

  if (!prompt) {
    return (
      <Background>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[typography.titleLarge, { color: colors.text }]}>Study Chunk</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.emptyContainer}>
            <Text style={[typography.bodyMedium, { color: colors.cardTextSecondary }]}>
              Content not found
            </Text>
          </View>
        </SafeAreaView>
      </Background>
    );
  }

  const typeLabel = prompt.prompt_type === 'takeaway' ? 'Takeaway' : prompt.prompt_type === 'recall' ? 'Recall' : 'Study';
  const typeIcon = prompt.prompt_type === 'takeaway' ? 'bulb-outline' : prompt.prompt_type === 'recall' ? 'refresh-outline' : 'book-outline';

  return (
    <Background>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Ionicons name={typeIcon as any} size={18} color={colors.text} style={{ marginRight: 6 }} />
            <Text style={[typography.titleMedium, { color: colors.text }]}>{typeLabel}</Text>
          </View>
          <View style={{ width: 40 }}>
            {reachedBottom && (
              <Animated.View entering={SlideInUp.springify()}>
                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
              </Animated.View>
            )}
          </View>
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          onScroll={handleScroll}
          scrollEventThrottle={100}
        >
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <Card style={styles.contentCard}>
              <Text style={[typography.bodyLarge, { color: colors.cardText, lineHeight: 26 }]}>
                {prompt.content}
              </Text>
            </Card>
          </Animated.View>

          <View style={styles.bottomSpacer}>
            {!reachedBottom ? (
              <Animated.View entering={FadeIn.delay(500)}>
                <View style={styles.scrollHint}>
                  <Ionicons name="chevron-down" size={20} color={colors.cardTextMuted} />
                  <Text style={[typography.labelSmall, { color: colors.cardTextMuted, marginTop: 4 }]}>
                    Scroll to finish reading
                  </Text>
                </View>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeIn.duration(400)} style={styles.completedBanner}>
                <Ionicons name="checkmark-circle" size={28} color="#34C759" />
                <Text style={[typography.titleSmall, { color: '#34C759', marginLeft: SPACING.sm }]}>
                  Read complete! Streak updated.
                </Text>
              </Animated.View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.screenPadding,
    paddingVertical: SPACING.md,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { padding: SPACING.sm },
  scrollContent: {
    padding: LAYOUT.screenPadding,
    paddingBottom: SPACING['3xl'],
  },
  contentCard: {
    padding: SPACING.xl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSpacer: {
    marginTop: SPACING.xl,
    alignItems: 'center',
    paddingBottom: SPACING['2xl'],
  },
  scrollHint: {
    alignItems: 'center',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: '#34C75910',
  },
});
