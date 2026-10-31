import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBakery } from '../store/BakeryStore';
import { getCloudConfig, saveCloudSettings } from '../services/cloudSyncService';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';

export default function LoginScreen() {
  const { state, dispatch, requestLoginWithApproval } = useBakery();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Server URL settings
  const [currentServerUrl, setCurrentServerUrl] = useState('');
  const [showServerModal, setShowServerModal] = useState(false);
  const [newServerInput, setNewServerInput] = useState('');

  useEffect(() => {
    getCloudConfig()
      .then(cfg => {
        setCurrentServerUrl(cfg.serverUrl);
        setNewServerInput(cfg.serverUrl);
      })
      .catch(() => {});
  }, []);

  const handleSaveServer = async () => {
    const trimmed = newServerInput.trim().replace(/\/+$/, '');
    if (!trimmed.startsWith('http')) {
      Alert.alert('Invalid URL', 'Please enter a valid URL, e.g. http://192.168.0.116:5000');
      return;
    }
    await saveCloudSettings({ serverUrl: trimmed });
    setCurrentServerUrl(trimmed);
    setShowServerModal(false);
    Alert.alert('Server Updated', `Admin Server URL set to:\n${trimmed}`);
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your username and password.');
      return;
    }

    const validUsername = state.auth.username || 'admin';
    const validPassword = state.auth.password || '1234';

    if (
      !(username.trim() === validUsername || (username.trim() === 'admin' && !state.auth.username)) ||
      password !== validPassword
    ) {
      Alert.alert('Login Failed', 'Incorrect username or password. Please try again.');
      return;
    }

    setLoading(true);

    if (requestLoginWithApproval) {
      const res = await requestLoginWithApproval({ username: username.trim(), password });
      setLoading(false);

      if (res.offline) {
        Alert.alert(
          'Wi-Fi Connection Required',
          `${res.message || 'Cannot reach admin server.'}\n\nPlease ensure this phone is connected to the same Wi-Fi network as the BakerAdmin computer, then try again.`,
          [
            { text: 'OK' },
            { text: 'Change Server IP', onPress: () => setShowServerModal(true) },
          ]
        );
      }
      // If pending, BakeryStore has triggered the DeviceLockoutModal which auto-polls!
      // When admin clicks Approve, it auto-unlocks and completes the login!
    } else {
      dispatch({ type: 'LOGIN', payload: { username: username.trim(), password } });
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Area */}
        <View style={styles.logoArea}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoEmoji}>🥐</Text>
          </View>
          <Text style={styles.logoTitle}>Bakery</Text>
          <Text style={styles.logoSubtitle}>Artisan Bakery Management</Text>
        </View>

        {/* Login Card */}
        <View style={styles.loginCard}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>Sign in to manage your bakery</Text>

          {/* Username Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Username</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter username"
                placeholderTextColor={COLORS.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="Enter password"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(prev => !prev)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnLoading]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.loginBtnText}>Connecting to Server...</Text>
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.loginBtnText}>Sign In to Bakery</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* License Agreement Notice */}
        <Text style={{ textAlign: 'center', fontSize: 11.5, color: COLORS.textMuted, marginTop: 18, lineHeight: 16 }}>
          By signing in, you agree to the software license agreement and terms of service.
        </Text>

        {/* Footer */}
        <Text style={styles.footerText}>
          Bakery Management System
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 40,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...SHADOWS.md,
  },
  logoEmoji: {
    fontSize: 38,
  },
  logoTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  logoSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 3,
    fontWeight: '500',
  },
  loginCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 24,
    ...SHADOWS.md,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 22,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  eyeBtn: {
    padding: 8,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    marginTop: 8,
    ...SHADOWS.sm,
  },
  loginBtnLoading: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  serverPill: {
    marginTop: 18,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
    maxWidth: '90%',
  },
  serverPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#92400E',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 22,
    ...SHADOWS.lg,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
    marginBottom: 18,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
  },
  modalBtnCancel: {
    backgroundColor: COLORS.background,
  },
  modalBtnCancelText: {
    color: COLORS.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  modalBtnSave: {
    backgroundColor: COLORS.primary,
  },
  modalBtnSaveText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
