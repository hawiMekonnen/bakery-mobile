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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import {
  getServerUrl,
  setServerUrl,
  getLastSyncInfo,
  testServerConnection,
  pushSyncData,
  isAutoSyncEnabled,
  setAutoSyncEnabled,
  DEFAULT_SERVER_URL,
  SERVER_CANDIDATES,
} from '../services/syncService';
import { useBakery } from '../store/BakeryStore';

export default function WifiSyncModal({ visible, onClose, onSyncComplete = null }) {
  const { state } = useBakery();
  const [serverUrl, setUrlState] = useState(DEFAULT_SERVER_URL);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [autoSync, setAutoSync] = useState(true);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    const url = await getServerUrl();
    setUrlState(url);
    const last = await getLastSyncInfo();
    setLastSync(last);
    const auto = await isAutoSyncEnabled();
    setAutoSync(auto);
    handleTest(url);
  };

  const handleTest = async (urlToTest) => {
    setTesting(true);
    setTestResult(null);
    const res = await testServerConnection(urlToTest || serverUrl);
    setTestResult(res);
    setTesting(false);
  };

  const handleSaveUrl = async (newUrl) => {
    const clean = await setServerUrl(newUrl);
    setUrlState(clean);
    handleTest(clean);
  };

  const handleToggleAutoSync = async () => {
    const next = !autoSync;
    setAutoSync(next);
    await setAutoSyncEnabled(next);
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    const res = await pushSyncData(state, serverUrl);
    setSyncing(false);
    if (res.success) {
      setLastSync(res);
      Alert.alert(
        'Wi-Fi Sync Successful! 🚀',
        `Successfully synced ${res.ordersCount} orders and ${res.productsCount} products to Admin Server at ${res.serverUrl}`
      );
      if (onSyncComplete) onSyncComplete(res);
    } else {
      Alert.alert(
        'Sync Failed',
        `${res.message}\n\nPlease make sure your computer and phone are connected to the same Wi-Fi network and that the Admin Server is running.`
      );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconBadge}>
                <Ionicons name="wifi" size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.title}>Admin Portal Wi-Fi Sync</Text>
                <Text style={styles.subtitle}>Automatic Data Syncing over Wi-Fi</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Live Connection Status Card */}
            <View style={[styles.statusCard, testResult?.online ? styles.statusCardOnline : styles.statusCardOffline]}>
              <View style={styles.statusDotRow}>
                <View style={[styles.statusDot, { backgroundColor: testResult?.online ? '#16A34A' : '#DC2626' }]} />
                <Text style={[styles.statusLabel, { color: testResult?.online ? '#16A34A' : '#DC2626' }]}>
                  {testing ? 'CHECKING WI-FI CONNECTION...' : testResult?.online ? 'ADMIN SERVER ONLINE' : 'ADMIN SERVER UNREACHABLE'}
                </Text>
              </View>
              <Text style={styles.statusDetail}>
                {testResult?.online
                  ? `Connected to Admin Portal on ${serverUrl}. Ready for real-time synchronization.`
                  : `Cannot reach server at ${serverUrl}. Make sure your PC and mobile are on the same Wi-Fi network.`}
              </Text>
            </View>

            {/* Sync Now Action Button */}
            <TouchableOpacity
              style={styles.syncPrimaryBtn}
              onPress={handleSyncNow}
              disabled={syncing}
              activeOpacity={0.8}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.syncPrimaryText}>Sync All Data to Admin Now</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Auto-Sync Toggle */}
            <TouchableOpacity
              style={styles.autoSyncRow}
              onPress={handleToggleAutoSync}
              activeOpacity={0.7}
            >
              <View style={styles.autoSyncInfo}>
                <Text style={styles.autoSyncTitle}>Automatic Wi-Fi Sync</Text>
                <Text style={styles.autoSyncDesc}>
                  Sync orders and prepared stock automatically when connected
                </Text>
              </View>
              <View style={[styles.togglePill, autoSync && styles.togglePillActive]}>
                <View style={[styles.toggleCircle, autoSync && styles.toggleCircleActive]} />
              </View>
            </TouchableOpacity>

            {/* Server URL Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ADMIN PORTAL SERVER URL</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.urlInput}
                  value={serverUrl}
                  onChangeText={setUrlState}
                  placeholder="http://192.168.0.116:5000"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.testBtn}
                  onPress={() => handleTest(serverUrl)}
                  disabled={testing}
                >
                  {testing ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <Text style={styles.testBtnText}>Test</Text>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.saveUrlBtn}
                onPress={() => handleSaveUrl(serverUrl)}
              >
                <Text style={styles.saveUrlText}>Save Server URL</Text>
              </TouchableOpacity>

              {/* Quick Presets */}
              <Text style={styles.presetLabel}>Quick Presets:</Text>
              <View style={styles.presetRow}>
                {SERVER_CANDIDATES.map((cand, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.presetChip, serverUrl === cand && styles.presetChipActive]}
                    onPress={() => handleSaveUrl(cand)}
                  >
                    <Text style={[styles.presetChipText, serverUrl === cand && styles.presetChipTextActive]}>
                      {cand.includes('192.168') ? 'Wi-Fi LAN' : cand.includes('10.0.2.2') ? 'Android Sim' : 'Localhost'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Last Sync Info */}
            {lastSync && (
              <View style={styles.lastSyncCard}>
                <Text style={styles.lastSyncTitle}>LAST SYNC DETAILS</Text>
                <Text style={styles.lastSyncText}>
                  Time: {new Date(lastSync.timestamp).toLocaleString()}
                </Text>
                <Text style={styles.lastSyncText}>Status: {lastSync.status}</Text>
                <Text style={styles.lastSyncText}>Orders Synced: {lastSync.ordersCount ?? state.orders.length}</Text>
                <Text style={styles.lastSyncText}>Menu Items Synced: {lastSync.productsCount ?? state.products.length}</Text>
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
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONTS.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  statusCard: {
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  statusCardOnline: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  statusCardOffline: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statusDetail: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  syncPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  syncPrimaryText: {
    color: '#FFF',
    fontSize: FONTS.md,
    fontWeight: '800',
  },
  autoSyncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  autoSyncInfo: {
    flex: 1,
    marginRight: 10,
  },
  autoSyncTitle: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  autoSyncDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  togglePill: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    padding: 2,
    justifyContent: 'center',
  },
  togglePillActive: {
    backgroundColor: '#16A34A',
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF',
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  urlInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: FONTS.xs,
    color: COLORS.textPrimary,
  },
  testBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBtnText: {
    fontSize: FONTS.xs,
    fontWeight: '800',
    color: COLORS.primary,
  },
  saveUrlBtn: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveUrlText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  presetLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  presetChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  presetChipTextActive: {
    color: COLORS.primary,
  },
  lastSyncCard: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  lastSyncTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  lastSyncText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
});
