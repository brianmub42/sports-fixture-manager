import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function EntryPoint() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && user) {
      if (user.role === 'admin' || user.role === 'scorekeeper' || user.role === 'superadmin') {
        router.replace('/(scorekeeper)/fixtures');
      } else {
        router.replace('/unauthenticated/watch');
      }
    } else {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, user]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
