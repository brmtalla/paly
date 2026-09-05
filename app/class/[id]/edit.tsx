import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../../src/theme/ThemeContext';
import { typography } from '../../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS } from '../../../src/theme/spacing';
import { Card, Button, Input, Background } from '../../../src/components/ui';
import { useClassStore } from '../../../src/stores/classStore';
import { Ionicons } from '@expo/vector-icons';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function EditClassScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { classes, updateClass } = useClassStore();

  const classData = classes.find((c) => c.id === id);

  // Basic info
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');

  // Schedule
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  // Semester dates
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Instructor
  const [instructorName, setInstructorName] = useState('');
  const [instructorEmail, setInstructorEmail] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (classData) {
      setName(classData.name);
      setLocation(classData.location || '');
      setStartDate(classData.start_date || '');
      setEndDate(classData.end_date || '');
      setInstructorName(classData.instructor_name || '');
      setInstructorEmail(classData.instructor_email || '');

      if (classData.class_sessions?.length) {
        setSelectedDays(classData.class_sessions.map((s) => s.day_of_week));
        setStartTime(classData.class_sessions[0].start_time);
        setEndTime(classData.class_sessions[0].end_time);
      }
    }
  }, [classData]);

  const toggleDay = (dayIndex: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex].sort()
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a class name');
      return;
    }

    if (selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one day');
      return;
    }

    if (!id) return;

    setIsLoading(true);
    try {
      await updateClass(id, {
        name: name.trim(),
        location: location.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        instructor_name: instructorName.trim() || null,
        instructor_email: instructorEmail.trim() || null,
      });
      router.back();
    } catch (error) {
      console.error('Error updating class:', error);
      Alert.alert('Error', 'Failed to update class. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!classData) {
    return (
      <Background>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            <Text style={[typography.bodyLarge, { color: colors.text }]}>Class not found</Text>
            <Button variant="ghost" onPress={() => router.back()}>
              Go Back
            </Button>
          </View>
        </SafeAreaView>
      </Background>
    );
  }

  return (
    <Background>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(600).springify()}
            style={styles.header}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>

            <Text
              style={[typography.titleLarge, { color: colors.text, flex: 1, textAlign: 'center' }]}
            >
              Edit Class
            </Text>

            <View style={{ width: LAYOUT.minTouchTarget }} />
          </Animated.View>

          {/* Basic Info */}
          <Animated.View entering={FadeInDown.delay(200).duration(600).springify()}>
            <Text
              style={[
                typography.labelSmall,
                { color: colors.textSecondary, marginBottom: SPACING.sm },
              ]}
            >
              CLASS INFO
            </Text>
            <Card style={styles.formCard}>
              <Input
                label="Class Name"
                labelColor={colors.cardText}
                placeholder="e.g., Biology 101"
                value={name}
                onChangeText={setName}
                leftIcon={<Ionicons name="book-outline" size={20} color={colors.cardTextMuted} />}
              />

              <Input
                label="Location"
                labelColor={colors.cardText}
                placeholder="e.g., Room 301, Science Building"
                value={location}
                onChangeText={setLocation}
                leftIcon={
                  <Ionicons name="location-outline" size={20} color={colors.cardTextMuted} />
                }
                containerStyle={{ marginTop: SPACING.sm }}
              />
            </Card>
          </Animated.View>

          {/* Schedule */}
          <Animated.View entering={FadeInDown.delay(300).duration(600).springify()}>
            <Text
              style={[
                typography.labelSmall,
                { color: colors.textSecondary, marginBottom: SPACING.sm },
              ]}
            >
              SCHEDULE
            </Text>
            <Card style={styles.formCard}>
              <Text
                style={[
                  typography.labelMedium,
                  { color: colors.cardText, marginBottom: SPACING.sm },
                ]}
              >
                Days
              </Text>
              <View style={styles.daysContainer}>
                {DAYS.map((day, index) => (
                  <TouchableOpacity
                    key={day}
                    accessibilityRole="checkbox"
                    accessibilityLabel={day}
                    accessibilityState={{ checked: selectedDays.includes(index) }}
                    onPress={() => toggleDay(index)}
                    style={[
                      styles.dayButton,
                      {
                        backgroundColor: selectedDays.includes(index)
                          ? colors.background
                          : colors.cardSecondary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.labelMedium,
                        {
                          color: selectedDays.includes(index)
                            ? colors.text
                            : colors.cardTextSecondary,
                        },
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.timeRow}>
                <View style={styles.timeInput}>
                  <Input
                    label="Start Time"
                    labelColor={colors.cardText}
                    placeholder="09:00"
                    value={startTime}
                    onChangeText={setStartTime}
                    leftIcon={
                      <Ionicons name="time-outline" size={20} color={colors.cardTextMuted} />
                    }
                  />
                </View>
                <View style={styles.timeInput}>
                  <Input
                    label="End Time"
                    labelColor={colors.cardText}
                    placeholder="10:00"
                    value={endTime}
                    onChangeText={setEndTime}
                    leftIcon={
                      <Ionicons name="time-outline" size={20} color={colors.cardTextMuted} />
                    }
                  />
                </View>
              </View>

              <Text
                style={[
                  typography.bodySmall,
                  { color: colors.cardTextMuted, marginTop: SPACING.md },
                ]}
              >
                Note: Schedule changes require recreating sessions (coming soon)
              </Text>
            </Card>
          </Animated.View>

          {/* Semester Dates */}
          <Animated.View entering={FadeInDown.delay(400).duration(600).springify()}>
            <Text
              style={[
                typography.labelSmall,
                { color: colors.textSecondary, marginBottom: SPACING.sm },
              ]}
            >
              SEMESTER DATES
            </Text>
            <Card style={styles.formCard}>
              <View style={styles.timeRow}>
                <View style={styles.timeInput}>
                  <Input
                    label="Start Date"
                    labelColor={colors.cardText}
                    placeholder="2025-01-15"
                    value={startDate}
                    onChangeText={setStartDate}
                    leftIcon={
                      <Ionicons name="calendar-outline" size={20} color={colors.cardTextMuted} />
                    }
                  />
                </View>
                <View style={styles.timeInput}>
                  <Input
                    label="End Date"
                    labelColor={colors.cardText}
                    placeholder="2025-05-15"
                    value={endDate}
                    onChangeText={setEndDate}
                    leftIcon={
                      <Ionicons name="calendar-outline" size={20} color={colors.cardTextMuted} />
                    }
                  />
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* Instructor */}
          <Animated.View entering={FadeInDown.delay(500).duration(600).springify()}>
            <Text
              style={[
                typography.labelSmall,
                { color: colors.textSecondary, marginBottom: SPACING.sm },
              ]}
            >
              INSTRUCTOR
            </Text>
            <Card style={styles.formCard}>
              <Input
                label="Instructor Name"
                labelColor={colors.cardText}
                placeholder="e.g., Dr. Smith"
                value={instructorName}
                onChangeText={setInstructorName}
                leftIcon={<Ionicons name="person-outline" size={20} color={colors.cardTextMuted} />}
              />

              <Input
                label="Instructor Email"
                labelColor={colors.cardText}
                placeholder="e.g., smith@university.edu"
                value={instructorEmail}
                onChangeText={setInstructorEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Ionicons name="mail-outline" size={20} color={colors.cardTextMuted} />}
                containerStyle={{ marginTop: SPACING.sm }}
              />
            </Card>
          </Animated.View>

          {/* Save Button */}
          <Animated.View
            entering={FadeInDown.delay(600).duration(600).springify()}
            style={styles.footer}
          >
            <Button variant="primary" size="lg" fullWidth loading={isLoading} onPress={handleSave}>
              Save Changes
            </Button>
          </Animated.View>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  backButton: {
    minWidth: LAYOUT.minTouchTarget,
    minHeight: LAYOUT.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    marginBottom: SPACING.lg,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  dayButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    minWidth: 44,
    minHeight: LAYOUT.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  timeInput: {
    flex: 1,
  },
  footer: {
    marginTop: SPACING.lg,
  },
});
