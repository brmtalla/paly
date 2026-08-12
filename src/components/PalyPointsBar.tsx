import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { SPACING, RADIUS } from '../theme/spacing';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { PALY_POINTS_FREE_MONTH_THRESHOLD } from '../lib/constants';
import { Ionicons } from '@expo/vector-icons';

export function PalyPointsBar() {
  const { colors } = useTheme();
  const { profile } = useAuthStore();
  const [points, setPoints] = useState(0);
  const [_month, setMonth] = useState('');
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    if (!profile?.id) return;

    const currentMonth = new Date().toISOString().substring(0, 7);
    const fetchPoints = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('paly_points, paly_points_month')
        .eq('id', profile.id)
        .single();

      if (data) {
        const m = data.paly_points_month || currentMonth;
        const p = m === currentMonth ? data.paly_points || 0 : 0;
        setPoints(p);
        setMonth(m);
        progressWidth.value = withSpring(Math.min(p / PALY_POINTS_FREE_MONTH_THRESHOLD, 1), {
          damping: 15,
        });
      }
    };

    fetchPoints();

    const channel = supabase
      .channel('points-bar')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profile.id}`,
        },
        (payload: any) => {
          const newPoints = payload.new.paly_points || 0;
          setPoints(newPoints);
          progressWidth.value = withSpring(
            Math.min(newPoints / PALY_POINTS_FREE_MONTH_THRESHOLD, 1),
            { damping: 15 }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, progressWidth]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  const isProUnlocked = points >= PALY_POINTS_FREE_MONTH_THRESHOLD;

  if (!profile?.id) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={[styles.container, { backgroundColor: colors.card }]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          <Ionicons name="star" size={16} color={isProUnlocked ? '#FFD700' : '#FFD70080'} />
          <Text style={[typography.labelMedium, { color: colors.cardText, marginLeft: 6 }]}>
            {points}
          </Text>
          <Text style={[typography.labelSmall, { color: colors.cardTextMuted, marginLeft: 4 }]}>
            / {PALY_POINTS_FREE_MONTH_THRESHOLD}
          </Text>
        </View>
        {isProUnlocked && (
          <View style={styles.proBadge}>
            <Text
              style={[typography.labelSmall, { color: '#FFD700', fontSize: 10, fontWeight: '800' }]}
            >
              PRO
            </Text>
          </View>
        )}
      </View>
      <View style={[styles.trackBar, { backgroundColor: colors.background }]}>
        <Animated.View
          style={[
            styles.fillBar,
            { backgroundColor: isProUnlocked ? '#FFD700' : '#8B5CF6' },
            animatedBarStyle,
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#FFD70020',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFD70040',
  },
  trackBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fillBar: {
    height: '100%',
    borderRadius: 2,
  },
});
