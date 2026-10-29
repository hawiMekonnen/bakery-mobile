import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '../theme/colors';
import { registerWithCloud, saveCloudSettings } from '../services/cloudSyncService';

export default function DeviceLockoutModal({
  visible,
  deviceStatus,
  lockoutMessage,
  licenseKey,
  serverUrl,
  deviceId,
  deviceModel,
  onAuthorized,
}) {
  const [editingSettings, setEditingSettings] = useState(false);
  const [inputLicense, setInputLicense] = useState(licenseKey || '');
  const [inputUrl, setInputUrl] = useState(serverUrl || '');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!visible) return null;

  const isSuspended = deviceStatus === 'suspended';
  const isRevoked = deviceStatus === 'revoked';

  const handleCopyId = () => {
    try {
      Clipboard.setString(deviceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const handleRetry = async () => {
    setLoading(true);
    const targetUrl = editingSettings ? inputUrl : serverUrl;
    const targetKey = editingSettings ? inputLicense : licenseKey;

    if (editingSettings) {
      await saveCloudSettings({ serverUrl: targetUrl, licenseKey: targetKey });
    }

    const res = await registerWithCloud(targetUrl, targetKey);
    setLoading(false);

    if (res.success && res.status === 'active') {
      Alert.alert('Device Authorized! 🎉', 'Your license has been verified. Welcome to Bakery Mobile.');
      if (onAuthorized) onAuthorized();
    } else if (res.networkOffline) {
      Alert.alert(
        'Offline',
        'Cannot reach cloud server. Please check your internet connection or server IP.'
      );
    } else {
      Alert.alert('Verification Failed', res.message || 'Device is not authorized.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Status Header Badge */}
          <View style={[styles.iconCircle, isSuspended ? styles.iconCircleWarn : styles.iconCircleDanger]}>
            <Ionicons
              name={isSuspended ? 'pause-circle' : 'shield-half'}
              size={48}
              color={isSuspended ? '#D97706' : '#DC2626'}
            />
          </View>

          <Text style={styles.title}>
            {isSuspended
              ? 'Terminal Suspended'
              : isRevoked
              ? 'License Revoked'
              : 'Unauthorized Device'}
          </Text>

          <Text style={styles.subtitle}>
            {lockoutMessage ||
              'This license is bound to another phone. APK copying or unauthorized device sharing is prohibited.'}
          </Text>

          {/* Hardware Device Spec Box */}
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Device Model:</Text>
              <Text style={styles.infoValue}>{deviceModel || 'Android'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>License Key:</Text>
              <Text style={[styles.infoValue, { fontWeight: '700', color: COLORS.primary }]}>
                {licenseKey || 'None'}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Hardware ID:</Text>
              <TouchableOpacity onPress={handleCopyId} style={styles.copyBtn} activeOpacity={0.7}>
                <Text style={styles.infoIdText} numberOfLines={1}>
                  {deviceId || 'UNKNOWN'}
                </Text>
                <Ionicons
                  name={copied ? 'checkmark-circle' : 'copy-outline'}
                  size={14}
                  color={copied ? '#16A34A' : COLORS.textMuted}
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Collapsible License / Server Edit Inputs */}
          {editingSettings ? (
            <View style={styles.editSection}>
              <Text style={styles.inputLabel}>License Key:</Text>
              <TextInput
                style={styles.input}
                value={inputLicense}
                onChangeText={setInputLicense}
                placeholder="SKY-BAKERY-001"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="characters"
              />

              <Text style={[styles.inputLabel, { marginTop: 8 }]}>Admin Server URL:</Text>
              <TextInput
                style={styles.input}
                value={inputUrl}
                onChangeText={setInputUrl}
                placeholder="http://192.168.0.116:5000"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
              />
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setEditingSettings(true)}
              style={styles.changeKeyBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="key-outline" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
              <Text style={styles.changeKeyText}>Change License Key or Server URL</Text>
            </TouchableOpacity>
          )}

          {/* Primary Action Button */}
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={handleRetry}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="refresh" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.retryBtnText}>Verify & Unlock App</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            If you replaced or upgraded your phone, ask your administrator to click "Authorize Device Swap" in the Admin Dashboard.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircleDanger: {
    backgroundColor: '#FEE2E2',
  },
  iconCircleWarn: {
    backgroundColor: '#FEF3C7',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  infoBox: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '65%',
  },
  infoIdText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
  editSection: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  changeKeyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 12,
  },
  changeKeyText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    width: '100%',
    ...SHADOWS.sm,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  footerNote: {
    marginTop: 14,
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
