import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeContext';

export default function OnboardingLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="assistant" />
      <Stack.Screen name="theme" />
      <Stack.Screen name="schedule" />
      <Stack.Screen name="availability" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}


