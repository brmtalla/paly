import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeContext';

export default function NotesLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="new" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}


