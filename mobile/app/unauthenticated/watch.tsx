import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function SpectatorWatchPortal() {
  const router = useRouter();
  const [slug, setSlug] = useState('');

  const handleWatch = () => {
    const formattedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    if (!formattedSlug) {
      Alert.alert('Invalid Code', 'Please enter a valid tournament slug or code.');
      return;
    }
    router.push(`/unauthenticated/${formattedSlug}`);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Spectator Watch</Text>
        <Text style={styles.subtitle}>Enter a tournament slug to view live leaderboards.</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Tournament Slug</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. bible-temple-primary-school"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            autoCorrect={false}
            value={slug}
            onChangeText={setSlug}
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleWatch}>
          <Text style={styles.buttonText}>Watch Live Leaderboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.backButtonText}>← Go Back to Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#10b981',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 30,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 25,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#f8fafc',
  },
  button: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  backButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
});
