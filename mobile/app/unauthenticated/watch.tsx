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
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';

export default function SpectatorWatchPortal() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
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
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.topBar}>
        <ThemeToggle />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
        <Text style={[styles.title, { color: colors.success }]}>Spectator Watch</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Enter a tournament slug to view live leaderboards.</Text>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Tournament Slug</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
                color: colors.inputText,
              },
            ]}
            placeholder="e.g. bible-temple-primary-school"
            placeholderTextColor={colors.inputPlaceholder}
            autoCapitalize="none"
            autoCorrect={false}
            value={slug}
            onChangeText={setSlug}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.success }]}
          onPress={handleWatch}
        >
          <Text style={styles.buttonText}>Watch Live Leaderboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/login')}
        >
          <Text style={[styles.backButtonText, { color: colors.textMuted }]}>← Go Back to Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    top: 48,
    right: 16,
    zIndex: 20,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 24,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  button: {
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
    fontSize: 14,
    fontWeight: '600',
  },
});
