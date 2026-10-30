import React, { useState, useEffect } from 'react';
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
import {
  checkApprovalStatus,
  requestApprovalFromCloud,
  saveCloudSettings
} from '../services/cloudSyncService';

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
  const [inputUrl, setInputUrl] = useState(serverUrl || '');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [approvedSuccess, setApprovedSuccess] = useState(false);

  const isPending = deviceStatus === 'pending';
  const isSuspended = deviceStatus === 'suspended';
  const isRevoked = deviceStatus === 'revoked' || deviceStatus === 'rejected';

  // Auto-polling when pending approval
  useEffect(() => {
    if (!visible || !isPending) return;
    let isMounted = true;

    const interval = setInterval(async () => {
      try {
        const res = await checkApprovalStatus();
        if (!isMounted) return;
        if (res.success && res.status === 'active') {
          setApprovedSuccess(true);
          setTimeout(() => {
            if (onAuthorized) onAuthorized();
          }, 1200);
        }
      } catch {}
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [visible, isPending]);

  if (!visible) return null;

  const handleCopyId = () => {
    try {
      Clipboard.setString(deviceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const handleCheckNow = async () => {
    setLoading(true);
    if (editingSettings) {
      await saveCloudSettings({ serverUrl: inputUrl });
    }

    // Try check status first
    const res = await checkApprovalStatus(inputUrl);
    if (res.success && res.status === 'active') {
      setApprovedSuccess(true);
      setLoading(false);
      setTimeout(() => {
        if (onAuthorized) onAuthorized();
      }, 1000);
      return;
    }

    // Re-submit request if needed
    const req = await requestApprovalFromCloud(inputUrl);
    setLoading(false);

    if (req.success && req.status === 'active') {
      setApprovedSuccess(true);
      setTimeout(() => {
        if (onAuthorized) onAuthorized();
      }, 1000);
    } else if (req.status === 'pending') {
      Alert.alert(
        'Waiting for Approval',
        'Request submitted to server. Please ask the administrator to click "Approve Terminal" in the BakerAdmin portal.'
      );
    } else if (req.networkOffline) {
      Alert.alert(
        'Wi-Fi Server Unreachable',
        `Cannot connect to Admin Server at ${inputUrl || serverUrl}.\n\nPlease ensure this phone and your computer are on the same Wi-Fi network.`
      );
    } else {
      Alert.alert('Status Alert', req.message || 'Waiting for approval.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {approvedSuccess ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7', marginBottom: 16 }]}>
                <Ionicons name="checkmark-circle" size={54} color="#16A34A" />
              </View>
              <Text style={[styles.title, { color: '#16A34A' }]}>Terminal Approved! 🎉</Text>
              <Text style={styles.subtitle}>Welcome to Bakery POS. Unlocking system...</Text>
            </View>
          ) : (
            <>
              {/* Header Badge */}
              <View
                style={[
                  styles.iconCircle,
                  isPending
                    ? styles.iconCirclePending
                    : isSuspended
                    ? styles.iconCircleWarn
                    : styles.iconCircleDanger,
                ]}
              >
                <Ionicons
                  name={
                    isPending
                      ? 'time'
                      : isSuspended
                      ? 'pause-circle'
                      : 'shield-half'
                  }
                  size={46}
                  color={
                    isPending
                      ? '#D97706'
                      : isSuspended
                      ? '#D97706'
                      : '#DC2626'
                  }
                />
              </View>

              <Text style={styles.title}>
                {isPending
                  ? 'Awaiting Admin Approval'
                  : isSuspended
                  ? 'Terminal Suspended'
                  : 'Access Restricted'}
              </Text>

              <Text style={styles.subtitle}>
                {isPending
                  ? 'This phone is connected as a new terminal. Please ask your administrator to click "Approve Terminal" in the BakerAdmin dashboard.'
                  : lockoutMessage || 'This device is not authorized to access the system.'}
              </Text>

              {/* Hardware Spec Box */}
              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Device Model:</Text>
                  <Text style={styles.infoValue}>{deviceModel || 'Android Phone'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Server URL:</Text>
                  <Text style={[styles.infoValue, { fontSize: 11 }]}>{inputUrl || serverUrl}</Text>
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

              {/* Server URL Change Input */}
              {editingSettings ? (
                <View style={styles.editSection}>
                  <Text style={styles.inputLabel}>Admin Server Wi-Fi URL:</Text>
                  <TextInput
                    style={styles.input}
                    value={inputUrl}
                    onChangeText={setInputUrl}
                    placeholder="http://10.35.195.1:5000"
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
                  <Ionicons name="settings-outline" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.changeKeyText}>Change Server IP / Wi-Fi URL</Text>
                </TouchableOpacity>
              )}

              {/* Action Button */}
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={handleCheckNow}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="refresh" size={18} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.retryBtnText}>
                      {isPending ? 'Check Approval Status' : 'Verify & Unlock App'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {isPending && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
                  <ActivityIndicator size="small" color="#D97706" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '600' }}>
                    Auto-checking server every 3 seconds...
                  </Text>
                </View>
              )}
            </>
          )}
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
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCirclePending: {
    backgroundColor: '#FEF3C7',
  },
  iconCircleDanger: {
    backgroundColor: '#FEE2E2',
  },
  iconCircleWarn: {
    backgroundColor: '#FEF3C7',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12.5,
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
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
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
    fontWeight: '700',
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
    marginBottom: 14,
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
    paddingVertical: 6,
    marginBottom: 10,
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
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    width: '100%',
    ...SHADOWS.sm,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
