import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';

export default function ScorekeeperLayout() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarIconStyle: { display: 'none' }, // Hide empty icon slots for centered text-only tabs
        tabBarStyle: {
          backgroundColor: colors.tabBg,
          borderTopWidth: 1,
          borderColor: colors.tabBorder,
          paddingBottom: insets.bottom > 0 ? insets.bottom - 4 : 4,
          height: 48 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '800',
        },
        headerStyle: {
          backgroundColor: colors.headerBg,
          borderBottomWidth: 1,
          borderColor: colors.headerBorder,
        },
        headerTintColor: colors.headerTint,
        headerTitleStyle: {
          fontWeight: '800',
        },
        headerRight: () => <ThemeToggle compact={false} />,
      }}
    >
      <Tabs.Screen
        name="fixtures"
        options={{
          title: 'Fixtures',
          tabBarLabel: '📋 Fixtures',
          headerTitle: 'Scorekeeper Console',
        }}
      />
      <Tabs.Screen
        name="standings"
        options={{
          title: 'Leaderboard',
          tabBarLabel: '🏆 Leaderboard',
          headerTitle: 'Overall Standings',
          href: user?.role === 'scorekeeper' ? null : '/(scorekeeper)/standings',
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          title: 'Sync Queue',
          tabBarLabel: '☁ Sync Queue',
          headerTitle: 'Offline Sync Queue',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: '⚙ Settings',
          headerTitle: 'Settings & Diagnostics',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
