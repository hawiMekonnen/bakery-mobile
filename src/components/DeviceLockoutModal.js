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
  Platform,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import {
  checkApprovalStatus,
  saveCloudSettings,
  getRemainingOfflineHours,
} from '../services/cloudSyncService';

export default function DeviceLockoutModal({
  visible,
  deviceStatus = 'pending',
  lockoutMessage = '',
  serverUrl = '',
  deviceId = '',
  deviceModel = '',
  offlineToken = null,
  onAuthorized,
  onUnlinked,
}) {
  const [editingSettings, setEditingSettings] = useState(false);
  const [inputUrl, setInputUrl] = useState(serverUrl || '');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [unlockedSuccess, setUnlockedSuccess] = useState(false);

  const isPending = deviceStatus === 'pending';
  const isSuspended = deviceStatus === 'suspended';
  const isBlocked = deviceStatus === 'blocked' || deviceStatus === 'rejected';
  const isUnlinked = deviceStatus === 'unlinked';
  const isOfflineExpired = deviceStatus === 'offline_expired';

  const remainingHours = getRemainingOfflineHours(offlineToken);

  // Auto-polling check every 5 seconds when modal is visible
  useEffect(() => {
    if (!visible) return;
    let isMounted = true;

    const interval = setInterval(async () => {
      try {
        const res = await checkApprovalStatus();
        if (!isMounted) return;
        if (res.success && res.status === 'active') {
          setUnlockedSuccess(true);
          setTimeout(() => {
            if (onAuthorized) onAuthorized();
          }, 1000);
        } else if (res.status === 'unlinked') {
          if (onUnlinked) onUnlinked();
        }
      } catch {}
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [visible]);

  if (!visible) return null;

  const handleCopyId = () => {
    try {
      Clipboard.setString(deviceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleCheckNow = async () => {
    setLoading(true);
    if (editingSettings && inputUrl.trim()) {
      await saveCloudSettings({ serverUrl: inputUrl.trim() });
    }

    const res = await checkApprovalStatus(inputUrl.trim() || undefined);
    setLoading(false);

    if (res.success && res.status === 'active') {
      setUnlockedSuccess(true);
      setTimeout(() => {
        if (onAuthorized) onAuthorized();
      }, 1000);
      return;
    }

    if (res.status === 'unlinked') {
      if (onUnlinked) onUnlinked();
      return;
    }

    if (res.networkOffline) {
      Alert.alert(
        'Server Unreachable',
        `Cannot connect to BakerAdmin server at ${inputUrl || serverUrl}. Please ensure this terminal is on the same Wi-Fi network.`
      );
    } else {
      Alert.alert('Status Check', res.reason || res.message || `Terminal status: ${res.status}`);
    }
  };

  const getStatusBadge = () => {
    if (isPending) return { label: 'PENDING APPROVAL', color: COLORS.warningText, bg: COLORS.warningBg, icon: 'time-outline' };
    if (isSuspended) return { label: 'TERMINAL SUSPENDED', color: COLORS.warningText, bg: COLORS.warningBg, icon: 'pause-circle-outline' };
    if (isBlocked) return { label: 'ACCESS BLOCKED', color: COLORS.dangerText, bg: COLORS.dangerBg, icon: 'close-circle-outline' };
    if (isUnlinked) return { label: 'DEVICE UNLINKED', color: COLORS.muted, bg: COLORS.appBg, icon: 'unlink-outline' };
    if (isOfflineExpired) return { label: 'OFFLINE LIMIT EXPIRED', color: COLORS.dangerText, bg: COLORS.dangerBg, icon: 'cloud-offline-outline' };
    return { label: 'RESTRICTED', color: COLORS.dangerText, bg: COLORS.dangerBg, icon: 'shield-outline' };
  };

  const badge = getStatusBadge();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {unlockedSuccess ? (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <View style={[styles.statusIconBox, { backgroundColor: COLORS.softGreen }]}>
                <Ionicons name="checkmark-sharp" size={32} color={COLORS.brandGreenText} />
              </View>
              <Text style={[styles.title, { color: COLORS.brandGreenText, marginTop: 12 }]}>Terminal Authorized</Text>
              <Text style={styles.subtitle}>Unlocking Point-of-Sale...</Text>
            </View>
          ) : (
            <>
              {/* Status Header Badge */}
              <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                <Ionicons name={badge.icon} size={15} color={badge.color} style={{ marginRight: 6 }} />
                <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>

              <Text style={styles.title}>
                {isPending && 'Approval Required'}
                {isSuspended && 'Terminal Suspended'}
                {isBlocked && 'Access Blocked'}
                {isUnlinked && 'Terminal Unlinked'}
                {isOfflineExpired && 'Offline Time Expired'}
              </Text>

              <Text style={styles.subtitle}>
                {isPending && 'This phone requested terminal access. An administrator must approve it in the BakerAdmin dashboard.'}
                {isSuspended && (lockoutMessage || 'This terminal has been temporarily suspended. Contact your administrator.')}
                {isBlocked && (lockoutMessage || 'This device has been permanently blocked from operating on this shop.')}
                {isUnlinked && 'This terminal was unlinked from its license in BakerAdmin. Local orders remain intact.'}
                {isOfflineExpired && 'The 72-hour offline tolerance limit has elapsed. Reconnect to Wi-Fi to validate the terminal license.'}
              </Text>

              {/* Offline Grace Timer if applicable */}
              {remainingHours > 0 && !isOfflineExpired && (
                <View style={styles.offlineBox}>
                  <Ionicons name="timer-outline" size={16} color={COLORS.warningText} />
                  <Text style={styles.offlineText}>
                    Offline tolerance active: {remainingHours} hours remaining
                  </Text>
                </View>
              )}

              {/* Hardware Spec Card */}
              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Device Model</Text>
                  <Text style={styles.infoValue}>{deviceModel || 'Terminal Device'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Support Contact</Text>
                  <Text style={[styles.infoValue, { fontWeight: '700' }]}>+251 911 234 567</Text>
                </View>
                <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.infoLabel}>Hardware ID</Text>
                  <TouchableOpacity onPress={handleCopyId} style={styles.copyBtn} activeOpacity={0.7}>
                    <Text style={styles.infoIdText} numberOfLines={1}>
                      {deviceId || 'UNKNOWN'}
                    </Text>
                    <Ionicons
                      name={copied ? 'checkmark' : 'copy-outline'}
                      size={14}
                      color={copied ? COLORS.brandGreenText : COLORS.muted}
                      style={{ marginLeft: 6 }}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Server URL Config Toggle */}
              {editingSettings ? (
                <View style={styles.editUrlBox}>
                  <Text style={styles.editUrlLabel}>BakerAdmin Server URL</Text>
                  <TextInput
                    style={styles.urlInput}
                    value={inputUrl}
                    onChangeText={setInputUrl}
                    placeholder="http://192.168.0.116:5000"
                    placeholderTextColor={COLORS.muted}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setEditingSettings(true)}
                  style={styles.toggleUrlBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toggleUrlText}>Change Server Connection IP</Text>
                </TouchableOpacity>
              )}

              {/* Action Buttons */}
              <View style={styles.btnRow}>
                {isUnlinked ? (
                  <TouchableOpacity
                    style={[styles.btn, styles.btnPrimary]}
                    onPress={onUnlinked}
                    activeOpacity={0.88}
                  >
                    <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.btnPrimaryText}>Re-register Terminal</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.btn, styles.btnPrimary]}
                    onPress={handleCheckNow}
                    disabled={loading}
                    activeOpacity={0.88}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="sync-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.btnPrimaryText}>Check Status</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
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
    backgroundColor: 'rgba(14, 31, 23, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: 24,
    alignItems: 'center',
    ...SHADOWS.hero,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.badge,
    marginBottom: 14,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    letterSpacing: 0.5,
  },
  statusIconBox: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.tile,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FONTS.h2,
    fontFamily: FONTS.extraBold,
    color: COLORS.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  offlineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.warningBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.chip,
    marginBottom: 16,
    width: '100%',
  },
  offlineText: {
    fontSize: 12,
    color: COLORS.warningText,
    fontFamily: FONTS.bold,
    flex: 1,
  },
  infoBox: {
    width: '100%',
    backgroundColor: COLORS.appBg,
    borderRadius: RADIUS.chip,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontFamily: FONTS.medium,
  },
  infoValue: {
    fontSize: 12,
    color: COLORS.ink,
    fontFamily: FONTS.bold,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 200,
  },
  infoIdText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: COLORS.ink,
    fontWeight: '700',
  },
  toggleUrlBtn: {
    paddingVertical: 6,
    marginBottom: 12,
  },
  toggleUrlText: {
    fontSize: 12,
    color: COLORS.brandGreenText,
    fontFamily: FONTS.bold,
  },
  editUrlBox: {
    width: '100%',
    marginBottom: 14,
  },
  editUrlLabel: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.muted,
    marginBottom: 4,
  },
  urlInput: {
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    borderRadius: RADIUS.input,
    paddingHorizontal: 12,
    height: 46,
    fontSize: 13,
    color: COLORS.ink,
    backgroundColor: COLORS.card,
  },
  btnRow: {
    width: '100%',
    marginTop: 4,
  },
  btn: {
    height: 50,
    borderRadius: RADIUS.button,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  btnPrimary: {
    backgroundColor: COLORS.brandDarkGreen,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: FONTS.body,
    fontFamily: FONTS.extraBold,
  },
});
