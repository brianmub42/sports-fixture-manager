import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/api';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot Password Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'otp' | 'success'>('request');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Validation Error', 'Please fill in both email and password.');
      return;
    }

    setLoading(true);
    try {
      const cleanedEmail = email.trim().toLowerCase();
      const role = await login(cleanedEmail, password);
      setLoading(false);
      
      // Route based on role
      if (role === 'admin' || role === 'scorekeeper' || role === 'superadmin') {
        router.replace('/(scorekeeper)/fixtures');
      } else {
        // Fallback for generic authenticated users
        router.replace('/unauthenticated/watch');
      }
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Login Failed', err.message || 'Invalid email or password.');
    }
  };

  const handleSpectatorAccess = () => {
    router.push('/unauthenticated/watch');
  };

  const handleRequestOtp = async () => {
    if (!forgotEmail || !forgotEmail.trim()) {
      Alert.alert('Validation Error', 'Please enter your account email.');
      return;
    }

    setForgotLoading(true);
    try {
      await authService.forgotPassword(forgotEmail.trim().toLowerCase());
      setForgotLoading(false);
      setForgotStep('otp');
      Alert.alert('Code Sent', 'If an account exists, a 6-digit code has been sent to your email.');
    } catch (err: any) {
      setForgotLoading(false);
      Alert.alert('Error', err.response?.data?.error || 'Failed to send recovery code.');
    }
  };

  const handleResetPassword = async () => {
    if (!forgotOtp || forgotOtp.trim().length !== 6) {
      Alert.alert('Validation Error', 'Please enter the 6-digit verification code.');
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match.');
      return;
    }

    setForgotLoading(true);
    try {
      await authService.resetPassword({
        email: forgotEmail.trim().toLowerCase(),
        otp: forgotOtp.trim(),
        newPassword: forgotNewPassword,
      });
      setForgotLoading(false);
      setForgotStep('success');
    } catch (err: any) {
      setForgotLoading(false);
      Alert.alert('Reset Failed', err.response?.data?.error || 'Failed to reset password. Please check your code.');
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setForgotStep('request');
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>FixtureGrid</Text>
        <Text style={styles.subtitle}>Tournament Manager</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="enter official email..."
            placeholderTextColor="#64748b"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Password</Text>
            <TouchableOpacity
              onPress={() => {
                setForgotEmail(email);
                setModalVisible(true);
              }}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.passwordWrapper}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
              placeholderTextColor="#64748b"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Text style={styles.toggleText}>
                {showPassword ? 'HIDE' : 'SHOW'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Login as Official</Text>
          )}
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity
          style={styles.spectatorButton}
          onPress={handleSpectatorAccess}
        >
          <Text style={styles.spectatorButtonText}>Watch Live (No Login)</Text>
        </TouchableOpacity>
      </View>

      {/* Forgot Password Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {forgotStep === 'success' ? 'Password Updated!' : 'Reset Password'}
                </Text>
                <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {forgotStep === 'request' && (
                <View>
                  <Text style={styles.modalDescription}>
                    Enter your official account email to receive a 6-digit verification code.
                  </Text>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Account Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="official@sportsday.com"
                      placeholderTextColor="#64748b"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={forgotEmail}
                      onChangeText={setForgotEmail}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.button}
                    onPress={handleRequestOtp}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.buttonText}>Send 6-Digit Code</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.switchStepButton}
                    onPress={() => setForgotStep('otp')}
                  >
                    <Text style={styles.switchStepText}>Already have a code? Enter code</Text>
                  </TouchableOpacity>
                </View>
              )}

              {forgotStep === 'otp' && (
                <View>
                  <Text style={styles.modalDescription}>
                    Enter the 6-digit code sent to your email along with your new password.
                  </Text>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>6-Digit Verification Code</Text>
                    <TextInput
                      style={[styles.input, styles.otpInput]}
                      placeholder="123456"
                      placeholderTextColor="#64748b"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={forgotOtp}
                      onChangeText={(t) => setForgotOtp(t.replace(/\D/g, ''))}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>New Password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Minimum 6 characters"
                      placeholderTextColor="#64748b"
                      secureTextEntry
                      value={forgotNewPassword}
                      onChangeText={setForgotNewPassword}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Confirm New Password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Repeat new password"
                      placeholderTextColor="#64748b"
                      secureTextEntry
                      value={forgotConfirmPassword}
                      onChangeText={setForgotConfirmPassword}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.button}
                    onPress={handleResetPassword}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.buttonText}>Set New Password</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.switchStepButton}
                    onPress={() => setForgotStep('request')}
                  >
                    <Text style={styles.switchStepText}>Back to Email Request</Text>
                  </TouchableOpacity>
                </View>
              )}

              {forgotStep === 'success' && (
                <View style={styles.successContainer}>
                  <Text style={styles.successMessage}>
                    Your password has been reset successfully. You can now login with your new password.
                  </Text>

                  <TouchableOpacity
                    style={styles.button}
                    onPress={() => {
                      setEmail(forgotEmail);
                      closeModal();
                    }}
                  >
                    <Text style={styles.buttonText}>Return to Login</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    fontSize: 32,
    fontWeight: '800',
    color: '#3b82f6',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
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
  otpInput: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 8,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#f8fafc',
  },
  eyeButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerText: {
    color: '#64748b',
    marginHorizontal: 12,
    fontWeight: '600',
  },
  spectatorButton: {
    borderColor: '#3b82f6',
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  spectatorButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3b82f6',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#94a3b8',
    fontWeight: '600',
  },
  modalDescription: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 20,
  },
  switchStepButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchStepText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
  },
  successContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  successMessage: {
    fontSize: 14,
    color: '#10b981',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
});
