import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';

export default function ScorekeeperLayout() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
        tabBarIconStyle: { display: 'none' }, // Hide empty icon slots for centered text-only tabs
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopWidth: 1,
          borderColor: '#334155',
          paddingBottom: insets.bottom > 0 ? insets.bottom - 4 : 4,
          height: 48 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '800',
        },
        headerStyle: {
          backgroundColor: '#0f172a',
          borderBottomWidth: 1,
          borderColor: '#1e293b',
        },
        headerTintColor: '#f8fafc',
        headerTitleStyle: {
          fontWeight: '800',
        },
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
