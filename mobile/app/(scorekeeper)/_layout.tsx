import React from 'react';
import { Tabs } from 'expo-router';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function ScorekeeperLayout() {
  const { logout } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopWidth: 1,
          borderColor: '#334155',
          paddingBottom: 6,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
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
          headerTitle: 'Scorekeeper Console',
          headerRight: () => (
            <Pressable onPress={logout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          title: 'Sync Queue',
          headerTitle: 'Offline Sync Queue',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  logoutButton: {
    marginRight: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#ef444420',
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 13,
  },
});
