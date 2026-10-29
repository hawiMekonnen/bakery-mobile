import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '../theme/colors';
import {
  getCloudConfig,
  getDeviceInfo,
  saveCloudSettings,
  testCloudConnection,
  registerWithCloud,
  pushCloudSync,
  restoreCloudData,
  DEFAULT_SERVER_URL,
} from '../services/cloudSyncService';
import { useBakery } from '../store/BakeryStore';

export default function CloudSyncModal({ visible, onClose, onSyncComplete = null }) {
  const { state, dispatch } = useBakery();
  const [config, setConfig] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [serverUrlInput, setServerUrlInput] = useState('');
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (visible) {
      loadAll();
    }
  }, [visible]);

  const loadAll = async () => {
    const [cfg, info] = await Promise.all([getCloudConfig(), getDeviceInfo()]);
    setConfig(cfg);
    setDeviceInfo(info);
    setServerUrlInput(cfg.serverUrl || DEFAULT_SERVER_URL);
    setLicenseKeyInput(cfg.licenseKey || '');
    handleTest(cfg.serverUrl);
  };

  const handleTest = async (url) => {
    setTesting(true);
    setTestResult(null);
    const res = await testCloudConnection(url || serverUrlInput);
    setTestResult(res);
    setTesting(false);
  };

  const handleSaveAndVerify = async () => {
    if (!serverUrlInput.trim() || !licenseKeyInput.trim()) {
      Alert.alert('Missing Fields', 'Please enter both the Cloud Server URL and License Key.');
      return;
    }

    setTesting(true);
    await saveCloudSettings({
      serverUrl: serverUrlInput.trim(),
      licenseKey: licenseKeyInput.trim(),
    });

    const reg = await registerWithCloud(
      serverUrlInput.trim(),
      licenseKeyInput.trim(),
      state.auth?.businessName || 'Bakery'
    );
    setTesting(false);

    if (reg.success) {
      Alert.alert('License Verified! ✓', `Device bound to license ${licenseKeyInput.toUpperCase()}`);
      loadAll();
    } else if (reg.networkOffline) {
      Alert.alert('Saved (Offline)', 'Settings saved. Server could not be reached right now.');
    } else {
      Alert.alert('Verification Alert', reg.message || 'Unauthorized license or device.');
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    const res = await pushCloudSync(state, serverUrlInput);
    setSyncing(false);

    if (res.success) {
      Alert.alert(
        'Cloud Sync Successful! 🚀',
        `Successfully synced ${res.ordersCount} orders and ${res.productsCount} products to Admin Server.`
      );
      loadAll();
      if (onSyncComplete) onSyncComplete(res);
    } else {
      Alert.alert(
        'Sync Failed',
        `${res.message || 'Cannot reach Cloud Admin Server.'}\n\nAll orders remain safely stored on this phone and will upload when internet connects.`
      );
    }
  };

  const handleRestoreFromCloud = () => {
    Alert.alert(
      'Restore From Cloud Backup?',
      'This will download all historical orders, products, and inventory stored on your company cloud server for this license.\n\nUseful when replacing or switching to a new authorized phone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore Now',
          style: 'destructive',
          onPress: async () => {
            setRestoring(true);
            const res = await restoreCloudData(serverUrlInput, licenseKeyInput);
            setRestoring(false);

            if (res.success) {
              dispatch({
                type: 'RESTORE_CLOUD_BACKUP',
                payload: {
                  orders: res.orders,
                  products: res.products,
                  inventory: res.inventory,
                  shopName: res.shopName,
                },
              });
              Alert.alert('Disaster Recovery Complete! ✓', res.message);
              onClose();
            } else {
              Alert.alert('Restore Failed', res.message);
            }
          },
        },
      ]
    );
  };

  const handleCopyId = () => {
    if (deviceInfo?.deviceId) {
      Clipboard.setString(deviceInfo.deviceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isOnline = testResult?.online;
  const isAuthorized = config?.deviceStatus === 'active';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconBadge}>
                <Ionicons name="cloud-done" size={22} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.title}>Cloud Sync & Licensing</Text>
                <Text style={styles.subtitle}>Anti-Transfer Device Binding</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Live Status Card */}
            <View
              style={[
                styles.statusCard,
                isOnline && isAuthorized
                  ? styles.statusCardOnline
                  : !isAuthorized
                  ? styles.statusCardDanger
                  : styles.statusCardOffline,
              ]}
            >
              <View style={styles.statusDotRow}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        isOnline && isAuthorized
                          ? '#16A34A'
                          : !isAuthorized
                          ? '#DC2626'
                          : '#D97706',
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusLabel,
                    {
                      color:
                        isOnline && isAuthorized
                          ? '#16A34A'
                          : !isAuthorized
                          ? '#DC2626'
                          : '#D97706',
                    },
                  ]}
                >
                  {testing
                    ? 'CHECKING CLOUD SERVER...'
                    : isOnline && isAuthorized
                    ? 'CLOUD CONNECTED & AUTHORIZED'
                    : !isAuthorized
                    ? 'TERMINAL UNAUTHORIZED / SUSPENDED'
                    : 'OFFLINE-FIRST (SAVING LOCALLY)'}
                </Text>
              </View>
              <Text style={styles.statusDetail}>
                {isOnline && isAuthorized
                  ? `Connected to Admin Server at ${config?.serverUrl}. Transactions sync automatically when data/Wi-Fi is active.`
                  : !isAuthorized
                  ? 'This phone is not authorized on the cloud server. APK copying is prohibited.'
                  : `Admin server unreachable. The POS operates 100% offline; pending orders will upload immediately when connected.`}
              </Text>
            </View>

            {/* Sync Now Primary Action */}
            <TouchableOpacity
              style={styles.syncPrimaryBtn}
              onPress={handleSyncNow}
              disabled={syncing}
              activeOpacity={0.85}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.syncPrimaryText}>Sync All Records to Cloud Now</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Hardware Identity Box */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeader}>HARDWARE DEVICE IDENTIFIER</Text>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Phone Model:</Text>
                <Text style={styles.fieldValue}>{deviceInfo?.model || 'Android'}</Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>OS Version:</Text>
                <Text style={styles.fieldValue}>{deviceInfo?.osVersion || 'Android'}</Text>
              </View>
              <View style={[styles.fieldRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.fieldLabel}>Hardware ID:</Text>
                <TouchableOpacity onPress={handleCopyId} style={styles.copyIdBtn} activeOpacity={0.7}>
                  <Text style={styles.idText} numberOfLines={1}>
                    {deviceInfo?.deviceId || 'UNKNOWN'}
                  </Text>
                  <Ionicons
                    name={copied ? 'checkmark-circle' : 'copy-outline'}
                    size={14}
                    color={copied ? '#16A34A' : COLORS.primary}
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Server & License Configuration Form */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeader}>SERVER & LICENSE CONFIGURATION</Text>

              <Text style={styles.inputTitle}>License Key</Text>
              <TextInput
                style={styles.input}
                value={licenseKeyInput}
                onChangeText={setLicenseKeyInput}
                placeholder="SKY-BAKERY-001"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="characters"
              />

              <Text style={[styles.inputTitle, { marginTop: 12 }]}>Cloud Server URL</Text>
              <TextInput
                style={styles.input}
                value={serverUrlInput}
                onChangeText={setServerUrlInput}
                placeholder="http://192.168.0.116:5000"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={styles.verifyBtn}
                onPress={handleSaveAndVerify}
                disabled={testing}
                activeOpacity={0.8}
              >
                {testing ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="key" size={16} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.verifyBtnText}>Save & Verify License</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Disaster Recovery: Restore from Cloud */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeader}>DISASTER RECOVERY / PHONE REPLACEMENT</Text>
              <Text style={styles.recoveryNotice}>
                If this is a replacement phone authorized by your administrator, pull all historical bakery data from the cloud server.
              </Text>
              <TouchableOpacity
                style={styles.restoreBtn}
                onPress={handleRestoreFromCloud}
                disabled={restoring}
                activeOpacity={0.8}
              >
                {restoring ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-download-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.restoreBtnText}>Restore All Records from Cloud</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Last Sync Info */}
            {config?.lastSync && (
              <View style={styles.lastSyncCard}>
                <Text style={styles.lastSyncTitle}>LAST CLOUD SYNC</Text>
                <Text style={styles.lastSyncText}>
                  Timestamp: {new Date(config.lastSync.timestamp).toLocaleString()}
                </Text>
                <Text style={styles.lastSyncText}>Orders Synced: {config.lastSync.ordersCount || 0}</Text>
                <Text style={styles.lastSyncText}>Server: {config.lastSync.serverUrl}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '90%',
    paddingBottom: 24,
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  statusCard: {
    padding: 14,
    borderRadius: RADIUS.md,
    marginBottom: 16,
    borderWidth: 1,
  },
  statusCardOnline: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  statusCardOffline: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statusCardDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  syncPrimaryBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  syncPrimaryText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  fieldLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  fieldValue: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  copyIdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '65%',
  },
  idText: {
    fontSize: 11,
    color: COLORS.primary,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  inputTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  verifyBtn: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    paddingVertical: 11,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  verifyBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  recoveryNotice: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 16,
    marginBottom: 10,
  },
  restoreBtn: {
    flexDirection: 'row',
    backgroundColor: '#2563EB',
    paddingVertical: 11,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  lastSyncCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 20,
  },
  lastSyncTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  lastSyncText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
});
