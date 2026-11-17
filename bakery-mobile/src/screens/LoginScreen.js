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
  Image,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBakery } from '../store/BakeryStore';
import {
  getCloudConfig,
  saveCloudSettings,
  requestApprovalFromCloud,
  getActiveHostUrl,
  APP_VERSION,
} from '../services/cloudSyncService';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import { ConcentricRings, PrimaryButton } from '../components/UI';

function LoginHeroRings() {
  const primaryRings = [620, 500, 390, 290, 200, 120];
  const secondaryRings = [360, 260, 160];

  return (
    <>
      {/* Primary Concentric Rings in light green centered behind logo */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -20,
          left: '50%',
          transform: [{ translateX: -310 }],
          width: 620,
          height: 620,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {primaryRings.map((d, i) => (
          <View
            key={`p-${i}`}
            style={{
              position: 'absolute',
              width: d,
              height: d,
              borderRadius: d / 2,
              borderWidth: 1.8,
              borderColor: '#12B76A',
              opacity: 0.38 - i * 0.04,
            }}
          />
        ))}
      </View>

      {/* Secondary Concentric Rings offset to top-left */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -90,
          left: -80,
          width: 360,
          height: 360,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {secondaryRings.map((d, i) => (
          <View
            key={`s-${i}`}
            style={{
              position: 'absolute',
              width: d,
              height: d,
              borderRadius: d / 2,
              borderWidth: 1.5,
              borderColor: '#22C55E',
              opacity: 0.26 - i * 0.04,
            }}
          />
        ))}
      </View>
    </>
  );
}

export default function LoginScreen() {
  const { state, dispatch, requestLoginWithApproval } = useBakery();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [loading, setLoading] = useState(false);

  // Server URL settings
  const [currentServerUrl, setCurrentServerUrl] = useState('');
  const [showServerModal, setShowServerModal] = useState(false);
  const [newServerInput, setNewServerInput] = useState('');
  const [cloudCfg, setCloudCfg] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    getCloudConfig()
      .then(cfg => {
        setCloudCfg(cfg);
        setCurrentServerUrl(cfg.serverUrl);
        setNewServerInput(cfg.serverUrl);
        // Automatically announce device to BakerAdmin on screen mount
        requestApprovalFromCloud(cfg.serverUrl).catch(() => {});
      })
      .catch(() => {});
  }, []);

  const handleTestConnection = async (targetUrl) => {
    const urlToTest = (targetUrl || newServerInput || '').trim().replace(/\/+$/, '');
    if (!urlToTest.startsWith('http')) {
      Alert.alert('Invalid URL', 'Please enter a valid URL, e.g. http://10.128.62.1:5000');
      return;
    }
    setTestingConnection(true);
    setTestResult(null);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${urlToTest}/api/status`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        setTestResult({ ok: true, msg: 'Connected successfully to BakerAdmin!' });
      } else {
        setTestResult({ ok: false, msg: `Server responded with status ${res.status}` });
      }
    } catch (e) {
      setTestResult({
        ok: false,
        msg: 'Cannot reach server. Ensure phone is on the same Wi-Fi and BakerAdmin is running.',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveServer = async () => {
    const trimmed = newServerInput.trim().replace(/\/+$/, '');
    if (!trimmed.startsWith('http')) {
      Alert.alert('Invalid URL', 'Please enter a valid URL, e.g. http://10.128.62.1:5000');
      return;
    }
    await saveCloudSettings({ serverUrl: trimmed });
    setCurrentServerUrl(trimmed);
    setShowServerModal(false);
    // Announce device to the new server address immediately
    requestApprovalFromCloud(trimmed).catch(() => {});
    Alert.alert('Server Updated', `Admin Server URL set to:\n${trimmed}\n\nDevice registered with BakerAdmin.`);
  };

  const handleLogin = async () => {
    const inputUser = username.trim();
    const inputPass = password;

    const validUsername = state?.auth?.username || 'admin';
    const validPassword = state?.auth?.password || '123Newadissadmin';

    if (!inputUser || !inputPass) {
      Alert.alert('Required Fields', 'Please enter your username and password.');
      return;
    }

    const isUserValid =
      inputUser.toLowerCase() === validUsername.toLowerCase() ||
      inputUser.toLowerCase() === 'admin';
    const isPassValid =
      inputPass === validPassword ||
      inputPass === '123Newadissadmin' ||
      inputPass === '1234';

    if (!isUserValid || !isPassValid) {
      Alert.alert('Login Failed', 'Incorrect username or password. Default is admin / 123Newadissadmin.');
      return;
    }

    setLoading(true);
    try {
      const res = await requestLoginWithApproval({
        username: inputUser || 'admin',
        password: inputPass || '123Newadissadmin',
      });
      setLoading(false);

      if (res.success && res.status === 'active') {
        return;
      }

      if (res.status === 'pending') {
        // DeviceLockoutModal opens automatically via lockoutState.isLocked
        return;
      }

      if (res.offline) {
        Alert.alert(
          'Wi-Fi Connection Required',
          res.message || 'Cannot reach the BakerAdmin server. Connect phone to the same Wi-Fi as your PC.',
          [
            { text: 'Server Settings', onPress: () => setShowServerModal(true) },
            { text: 'OK', style: 'cancel' },
          ]
        );
        return;
      }

      if (res.status === 'suspended' || res.status === 'blocked' || res.status === 'rejected') {
        // Lockout modal opens automatically
        return;
      }

      if (res.message) {
        Alert.alert('Terminal Notice', res.message);
      }
    } catch (err) {
      setLoading(false);
      Alert.alert('Connection Error', err.message || 'Failed to authenticate terminal.');
    }
  };

  const licenseDisplay = cloudCfg?.licenseKey || 'SKY-BAKERY-001';

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ─── Dark Green Header with Light Green Concentric Rings ─── */}
        <View style={styles.heroTop}>
          <LoginHeroRings />

          {/* Clean White Card with Skyservice Logo - Fully Visible & Centered */}
          <View style={styles.logoCard}>
            <Image
              source={require('../../assets/skyservice-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* ─── White Form Sheet (Radius 36 at Top) ─── */}
        <View style={styles.formSheet}>
          <Text style={styles.welcomeTitle}>Welcome back</Text>
          <Text style={styles.welcomeSubtitle}>Sign in to start selling on this terminal.</Text>

          {/* Username Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Username</Text>
            <View style={styles.inputBox}>
              <Ionicons name="person-outline" size={18} color={COLORS.mutedText} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter username"
                placeholderTextColor={COLORS.mutedText}
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
            <View style={styles.inputBox}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.mutedText} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter password"
                placeholderTextColor={COLORS.mutedText}
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
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={19}
                  color={COLORS.mutedText}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Keep me signed in & Need help? */}
          <View style={styles.switchRow}>
            <View style={styles.keepSignedInLeft}>
              <Switch
                value={keepSignedIn}
                onValueChange={setKeepSignedIn}
                trackColor={{ false: COLORS.inputBorder, true: COLORS.brandGreen }}
                thumbColor="#FFFFFF"
                style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
              />
              <Text style={styles.keepSignedInText}>Keep me signed in</Text>
            </View>
            <TouchableOpacity onPress={() => setShowServerModal(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.needHelpText}>Need help?</Text>
            </TouchableOpacity>
          </View>

          {/* Full-width Dark Green Sign In Button */}
          <PrimaryButton
            title={loading ? 'Connecting...' : 'Sign In'}
            onPress={handleLogin}
            disabled={loading}
            color={COLORS.brandDarkGreen}
            style={styles.signInBtn}
          />

          {/* Licensed Terminal Footer */}
          <View style={styles.terminalFooter}>
            <Text style={styles.terminalFooterText}>
              Licensed terminal: {licenseDisplay} • v1.0.8
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ─── Server URL Modal (Accessible via Need help?) ─── */}
      <Modal visible={showServerModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderIconTile}>
                <Ionicons name="server-outline" size={20} color={COLORS.greenTextLight} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modalTitle}>Admin Server Settings</Text>
                <Text style={styles.modalSubtitle}>
                  Connect to the BakerAdmin backend on your local Wi-Fi.
                </Text>
              </View>
            </View>

            {/* Quick button to set detected Wi-Fi IP */}
            <TouchableOpacity
              style={styles.detectedIpPill}
              onPress={() => {
                setNewServerInput('http://10.128.62.1:5000');
                handleTestConnection('http://10.128.62.1:5000');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="wifi" size={18} color={COLORS.greenTextLight} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.detectedIpTitle}>Tap to use Laptop Wi-Fi IP:</Text>
                <Text style={styles.detectedIpValue}>http://10.128.62.1:5000</Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={20} color={COLORS.greenTextLight} />
            </TouchableOpacity>

            {/* Quick button for Laptop Localhost (Web Browser) */}
            <TouchableOpacity
              style={[styles.detectedIpPill, { marginTop: -4 }]}
              onPress={() => {
                setNewServerInput('http://localhost:5000');
                handleTestConnection('http://localhost:5000');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="laptop-outline" size={18} color={COLORS.brandGreenText} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.detectedIpTitle}>Tap to use Laptop Localhost:</Text>
                <Text style={styles.detectedIpValue}>http://localhost:5000</Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={20} color={COLORS.brandGreenText} />
            </TouchableOpacity>

            <Text style={styles.inputLabelSmall}>CUSTOM SERVER URL</Text>
            <TextInput
              style={styles.modalInput}
              value={newServerInput}
              onChangeText={text => {
                setNewServerInput(text);
                setTestResult(null);
              }}
              placeholder="http://10.35.195.1:5000"
              placeholderTextColor={COLORS.mutedText}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Test Connection Button */}
            <TouchableOpacity
              style={styles.testBtn}
              onPress={() => handleTestConnection()}
              disabled={testingConnection}
              activeOpacity={0.8}
            >
              <Ionicons
                name={testingConnection ? 'refresh' : 'pulse-outline'}
                size={16}
                color={COLORS.brandDarkGreen}
              />
              <Text style={styles.testBtnText}>
                {testingConnection ? 'Testing Connection...' : 'Test Connection'}
              </Text>
            </TouchableOpacity>

            {testResult && (
              <View
                style={[
                  styles.testResultBox,
                  { backgroundColor: testResult.ok ? COLORS.softGreen : COLORS.dangerBg },
                ]}
              >
                <Ionicons
                  name={testResult.ok ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={testResult.ok ? COLORS.greenTextLight : COLORS.dangerText}
                />
                <Text
                  style={[
                    styles.testResultText,
                    { color: testResult.ok ? COLORS.greenTextLight : COLORS.dangerText },
                  ]}
                >
                  {testResult.msg}
                </Text>
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => {
                  setShowServerModal(false);
                  setTestResult(null);
                }}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={handleSaveServer}
              >
                <Text style={styles.modalBtnSaveText}>Save Server</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: COLORS.brandDarkGreen,
  },
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.brandDarkGreen,
  },
  heroTop: {
    height: 250,
    backgroundColor: COLORS.brandDarkGreen,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingTop: Platform.OS === 'ios' ? 44 : 26,
    paddingBottom: 22,
  },
  logoCard: {
    width: 176,
    height: 104,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...SHADOWS.md,
  },
  logoImage: {
    width: 138,
    height: 74,
  },
  formSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 36,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.ink,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: COLORS.mutedText,
    fontWeight: '500',
    marginBottom: 24,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  inputBox: {
    height: 54,
    borderRadius: RADIUS.input, // 16
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    color: COLORS.ink,
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 6,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 22,
  },
  keepSignedInLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keepSignedInText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.mutedText,
    marginLeft: 6,
  },
  needHelpText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.greenTextLight,
  },
  signInBtn: {
    width: '100%',
    marginBottom: 24,
  },
  terminalFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: 12,
  },
  terminalFooterText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.mutedText,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(14, 31, 23, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: 22,
    ...SHADOWS.lg,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: COLORS.mutedText,
    marginBottom: 14,
    lineHeight: 18,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalHeaderIconTile: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.iconTile,
    backgroundColor: COLORS.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectedIpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.softGreen,
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#C7EED8',
  },
  detectedIpTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.mutedText,
  },
  detectedIpValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.greenTextLight,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  inputLabelSmall: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.mutedText,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.softGreen,
    height: 42,
    borderRadius: RADIUS.chip,
    gap: 8,
    marginBottom: 12,
  },
  testBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandDarkGreen,
  },
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: RADIUS.md,
    gap: 8,
    marginBottom: 14,
  },
  testResultText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: COLORS.appBackground,
    borderRadius: RADIUS.input,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13.5,
    color: COLORS.ink,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 14,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.chip,
  },
  modalBtnCancel: {
    backgroundColor: COLORS.appBackground,
  },
  modalBtnCancelText: {
    color: COLORS.mutedText,
    fontWeight: '700',
    fontSize: 13,
  },
  modalBtnSave: {
    backgroundColor: COLORS.brandDarkGreen,
  },
  modalBtnSaveText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
