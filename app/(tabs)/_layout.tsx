import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { LAYOUT, SHADOWS } from '../../src/theme/spacing';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.background, // Active = accent color (which is the background)
        tabBarInactiveTintColor: colors.cardTextMuted,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: colors.card,
          borderTopWidth: 0,
          height: LAYOUT.tabBarHeight,
          paddingTop: 12, // Increased padding
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          marginHorizontal: 16,
          marginBottom: Platform.OS === 'ios' ? 24 : 16,
          borderRadius: 24,
          ...SHADOWS.lg,
        },
        tabBarIconStyle: {
          marginBottom: 4, // Space between icon and label
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'today' : 'today-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: 'Classes',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'school' : 'school-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Notes',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'document-text' : 'document-text-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: 'Study',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
