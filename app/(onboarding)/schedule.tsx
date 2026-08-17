import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS } from '../../src/theme/spacing';
import { Button, Input, Card } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/authStore';
import { useClassStore } from '../../src/stores/classStore';
import { Ionicons } from '@expo/vector-icons';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ClassFormData {
  id: string;
  name: string;
  days: number[];
  startTime: string;
  endTime: string;
}

export default function ScheduleScreen() {
  const { colors } = useTheme();
  const { profile } = useAuthStore();
  const { createClass } = useClassStore();
  const [classes, setClasses] = useState<ClassFormData[]>([
    { id: '1', name: '', days: [], startTime: '09:00', endTime: '10:00' },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const addNewClass = () => {
    setClasses([
      ...classes,
      {
        id: Date.now().toString(),
        name: '',
        days: [],
        startTime: '09:00',
        endTime: '10:00',
      },
    ]);
  };

  const updateClass = (id: string, updates: Partial<ClassFormData>) => {
    setClasses(classes.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const removeClass = (id: string) => {
    if (classes.length === 1) {
      Alert.alert('Cannot Remove', 'You need at least one class to continue.');
      return;
    }
    setClasses(classes.filter((c) => c.id !== id));
  };

  const toggleDay = (classId: string, dayIndex: number) => {
    const classData = classes.find((c) => c.id === classId);
    if (!classData) return;

    const newDays = classData.days.includes(dayIndex)
      ? classData.days.filter((d) => d !== dayIndex)
      : [...classData.days, dayIndex].sort();

    updateClass(classId, { days: newDays });
  };

  const handleContinue = async () => {
    // Validate classes
    const validClasses = classes.filter((c) => c.name.trim() && c.days.length > 0);

    if (validClasses.length === 0) {
      Alert.alert('Add Your Classes', 'Please add at least one class with a name and schedule.');
      return;
    }

    setIsLoading(true);
    try {
      // Create all classes
      for (const classData of validClasses) {
        const sessions = classData.days.map((day) => ({
          day_of_week: day,
          start_time: classData.startTime,
          end_time: classData.endTime,
        }));

        await createClass(
          {
            user_id: profile!.id,
            name: classData.name,
            is_active: true,
          },
          sessions
        );
      }

      router.push('/(onboarding)/availability');
    } catch (error) {
      console.error('Error creating classes:', error);
      Alert.alert('Error', 'Failed to save classes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Progress indicator */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.progress}>
          <View style={[styles.progressBar, { backgroundColor: colors.backgroundTertiary }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.accent, width: '80%' }]} />
          </View>
          <Text style={[typography.labelSmall, { color: colors.textMuted }]}>4 OF 5</Text>
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(600).springify()}
            style={styles.header}
          >
            <Text style={[typography.displaySmall, { color: colors.text }]}>Add your classes</Text>
            <Text
              style={[typography.bodyLarge, { color: colors.textSecondary, marginTop: SPACING.md }]}
            >
              We&apos;ll remind you to take notes during class and send study nuggets based on your
              schedule.
            </Text>
          </Animated.View>

          {/* Classes list */}
          {classes.map((classData, index) => (
            <Animated.View
              key={classData.id}
              entering={FadeIn.delay(index * 100 + 300).duration(400)}
            >
              <ClassForm
                classData={classData}
                colors={colors}
                onUpdate={(updates) => updateClass(classData.id, updates)}
                onRemove={() => removeClass(classData.id)}
                onToggleDay={(day) => toggleDay(classData.id, day)}
                showRemove={classes.length > 1}
              />
            </Animated.View>
          ))}

          {/* Add class button */}
          <Animated.View entering={FadeInUp.delay(500).duration(400)}>
            <TouchableOpacity
              onPress={addNewClass}
              style={[styles.addButton, { borderColor: colors.white }]}
            >
              <Ionicons name="add" size={24} color={colors.white} />
              <Text style={[typography.labelLarge, { color: colors.white }]}>
                Add Another Class
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>

        {/* CTA */}
        <Animated.View entering={FadeInUp.delay(600).duration(600).springify()} style={styles.cta}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            onPress={handleContinue}
          >
            Continue
          </Button>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

interface ClassFormProps {
  classData: ClassFormData;
  colors: any;
  onUpdate: (updates: Partial<ClassFormData>) => void;
  onRemove: () => void;
  onToggleDay: (day: number) => void;
  showRemove: boolean;
}

function ClassForm({
  classData,
  colors,
  onUpdate,
  onRemove,
  onToggleDay,
  showRemove,
}: ClassFormProps) {
  return (
    <Card variant="elevated" padding="lg" style={styles.classCard}>
      <View style={styles.classHeader}>
        <Input
          placeholder="Class name (e.g., Biology 101)"
          value={classData.name}
          onChangeText={(name) => onUpdate({ name })}
          containerStyle={{ flex: 1, marginBottom: 0 }}
        />
        {showRemove && (
          <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {/* Days selector */}
      <Text
        style={[
          typography.labelSmall,
          { color: colors.textMuted, marginTop: SPACING.lg, marginBottom: SPACING.sm },
        ]}
      >
        CLASS DAYS
      </Text>
      <View style={styles.daysContainer}>
        {DAYS.map((day, index) => (
          <TouchableOpacity
            key={day}
            onPress={() => onToggleDay(index)}
            style={[
              styles.dayButton,
              {
                backgroundColor: classData.days.includes(index)
                  ? colors.accent
                  : colors.backgroundTertiary,
              },
            ]}
          >
            <Text
              style={[
                typography.labelMedium,
                {
                  color: classData.days.includes(index) ? '#FFFFFF' : colors.textSecondary,
                },
              ]}
            >
              {day}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Time inputs */}
      <View style={styles.timeContainer}>
        <View style={styles.timeInput}>
          <Text
            style={[typography.labelSmall, { color: colors.textMuted, marginBottom: SPACING.sm }]}
          >
            START TIME
          </Text>
          <Input
            value={classData.startTime}
            onChangeText={(startTime) => onUpdate({ startTime })}
            placeholder="09:00"
            containerStyle={{ marginBottom: 0 }}
          />
        </View>
        <View style={styles.timeInput}>
          <Text
            style={[typography.labelSmall, { color: colors.textMuted, marginBottom: SPACING.sm }]}
          >
            END TIME
          </Text>
          <Input
            value={classData.endTime}
            onChangeText={(endTime) => onUpdate({ endTime })}
            placeholder="10:00"
            containerStyle={{ marginBottom: 0 }}
          />
        </View>
      </View>

      {/* Summary */}
      {classData.days.length > 0 && (
        <View style={[styles.summary, { backgroundColor: colors.accentLight }]}>
          <Ionicons name="calendar-outline" size={16} color={colors.accent} />
          <Text style={[typography.bodySmall, { color: colors.accent, flex: 1 }]}>
            {classData.days.map((d) => DAY_FULL[d]).join(', ')} at {classData.startTime}
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: LAYOUT.screenPadding,
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  scrollContent: {
    paddingBottom: SPACING['3xl'],
  },
  header: {
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  classCard: {
    marginBottom: SPACING.lg,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  removeButton: {
    padding: SPACING.md,
    marginTop: SPACING.xl,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  dayButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginTop: SPACING.lg,
  },
  timeInput: {
    flex: 1,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  cta: {
    marginBottom: SPACING.lg,
  },
});
