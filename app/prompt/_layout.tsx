import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeContext';

export default function PromptLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
