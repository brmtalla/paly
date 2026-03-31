import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeContext';

export default function SettingsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="subscription" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="companion" />
      <Stack.Screen name="availability" />
    </Stack>
  );
}
