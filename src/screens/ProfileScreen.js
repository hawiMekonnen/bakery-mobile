import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBakery } from '../store/BakeryStore';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';
import BluetoothPrinterModal from '../components/BluetoothPrinterModal';
import WifiSyncModal from '../components/WifiSyncModal';
import { getConnectedPrinter } from '../services/bluetoothPrinterService';
import { getServerUrl, setServerUrl, getLastSyncInfo, pushSyncData, DEFAULT_SERVER_URL } from '../services/syncService';


export default function ProfileScreen({ navigation }) {
  const { state, dispatch } = useBakery();
  const { auth, orders, products, inventory } = state;

  const [editMode, setEditMode] = useState(null); // 'username' | 'password' | 'business' | null
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [serverUrl, setServerUrlState] = useState(DEFAULT_SERVER_URL);
  const [newServerUrl, setNewServerUrl] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [btModalVisible, setBtModalVisible] = useState(false);
  const [wifiModalVisible, setWifiModalVisible] = useState(false);
  const [connectedBtPrinter, setConnectedBtPrinter] = useState(null);
  const [lastSyncInfo, setLastSyncInfo] = useState(null);

  React.useEffect(() => {
    getServerUrl().then(url => {
      setServerUrlState(url);
      setNewServerUrl(url);
    });
    getLastSyncInfo().then(info => setLastSyncInfo(info));
    getConnectedPrinter().then(p => setConnectedBtPrinter(p));
  }, []);

  const handleSyncNow = async () => {
    setSyncing(true);
    const result = await pushSyncData(state);
    setSyncing(false);
    if (result.success) {
      setLastSyncInfo(result);
      Alert.alert(
        'Cloud Sync Successful! 🚀',
        `Successfully synced ${state.orders.length} orders and ${state.products.length} menu items to your Admin Server.`
      );
    } else {
      Alert.alert(
        'Server Unreachable ⚠️',
        `${result.message}

Please verify your phone is connected to the same Wi-Fi/network and check your Server URL.`
      );
    }
  };

  const handleSaveServerUrl = async () => {
    if (!newServerUrl.trim()) {
      Alert.alert('Error', 'Server URL cannot be empty.');
      return;
    }
    const saved = await setServerUrl(newServerUrl.trim());
    setServerUrlState(saved);
    setEditMode(null);
    Alert.alert('Saved', `Server URL set to: ${saved}`);
  };


  const canGoBack = navigation && typeof navigation.canGoBack === 'function' && navigation.canGoBack();

  const openEdit = (mode) => {
    if (mode === 'server') { setNewServerUrl(serverUrl); setEditMode('server'); return; }
    setEditMode(mode);
    setNewUsername(auth.username);
    setNewPassword('');
    setConfirmPassword('');
    setCurrentPassword('');
    setBusinessName(auth.businessName || '');
    setShowPass(false);
    setShowNewPass(false);
  };

  const handleSaveUsername = () => {
    if (!newUsername.trim()) {
      Alert.alert('Error', 'Username cannot be empty.');
      return;
    }
    dispatch({
      type: 'UPDATE_CREDENTIALS',
      payload: { newUsername: newUsername.trim() },
    });
    Alert.alert('Success', 'Username updated successfully!');
    setEditMode(null);
  };

  const handleSavePassword = () => {
    if (currentPassword !== auth.password) {
      Alert.alert('Error', 'Current password is incorrect.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      Alert.alert('Error', 'New password must be at least 4 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
    dispatch({
      type: 'UPDATE_CREDENTIALS',
      payload: { newPassword },
    });
    Alert.alert('Success', 'Password changed successfully!');
    setEditMode(null);
  };

  const handleSaveBusinessName = () => {
    if (!businessName.trim()) {
      Alert.alert('Error', 'Business name cannot be empty.');
      return;
    }
    dispatch({
      type: 'UPDATE_CREDENTIALS',
      payload: { businessName: businessName.trim() },
    });
    Alert.alert('Success', 'Business name updated!');
    setEditMode(null);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => dispatch({ type: 'LOGOUT' }),
        },
      ]
    );
  };

  const handleResetSales = () => {
    Alert.alert(
      'Clear Sales Records',
      'Are you sure you want to clear all order history and reset daily sales to zero? (Your products and inventory will remain safe)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Sales',
          style: 'destructive',
          onPress: () => {
            dispatch({ type: 'RESET_ORDERS' });
            Alert.alert('Cleared', 'All sales records have been cleared to zero.');
          },
        },
      ]
    );
  };

  const handleExportBackup = async () => {
    try {
      const backupData = JSON.stringify(
        {
          app: 'Bakery Mobile System',
          version: '2.0',
          exportedAt: new Date().toISOString(),
          products,
          inventory,
          orders,
          auth: { ...auth, isLoggedIn: false },
        },
        null,
        2
      );

      await Share.share({
        title: `Bakery Backup - ${new Date().toISOString().split('T')[0]}`,
        message: backupData,
      });
    } catch (e) {
      Alert.alert('Export', 'Backup data prepared.');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o => o.createdAt && o.createdAt.startsWith(todayStr));
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  return (
    <View style={styles.container}>
      {/* ─── Interactive Screen Header ─── */}
      <ScreenHeader
        canGoBack={canGoBack}
        onBack={() => navigation.goBack()}
        emoji="👤"
        title="My Profile"
        subtitle={`${auth.role || 'Manager'} • Active Session`}
        rightAction={
          <TouchableOpacity
            style={styles.headerLogoutBtn}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={16} color={COLORS.danger} style={{ marginRight: 4 }} />
            <Text style={styles.headerLogoutText}>Logout</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Hero Card */}
        <View style={styles.profileHero}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>
              {(auth.username || 'A').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.displayName}>{auth.username}</Text>
          <Text style={styles.displayRole}>{auth.role || 'Bakery Manager'}</Text>
          <Text style={styles.displayBusiness}>{auth.businessName || 'Bakery'}</Text>

          <View style={styles.statRow}>
            <View style={styles.statPill}>
              <Text style={styles.statPillValue}>{orders.length}</Text>
              <Text style={styles.statPillLabel}>All Orders</Text>
            </View>
            <View style={[styles.statPill, styles.statPillHighlight]}>
              <Text style={[styles.statPillValue, { color: COLORS.primary }]}>
                ${todayRevenue.toFixed(2)}
              </Text>
              <Text style={styles.statPillLabel}>Today</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillValue}>{products.length}</Text>
              <Text style={styles.statPillLabel}>Products</Text>
            </View>
          </View>
        </View>

                {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT CREDENTIALS</Text>

          {/* Change Username */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => openEdit('username')}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="person-outline" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Username</Text>
              <Text style={styles.settingValue}>{auth.username}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Change Password */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => openEdit('password')}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIcon, { backgroundColor: COLORS.infoLight }]}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.info} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Password</Text>
              <Text style={styles.settingValue}>{'•'.repeat(auth.password?.length || 4)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Business Name */}
          <TouchableOpacity
            style={[styles.settingRow, styles.lastRow]}
            onPress={() => openEdit('business')}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIcon, { backgroundColor: COLORS.successLight }]}>
              <Ionicons name="storefront-outline" size={18} color={COLORS.success} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Bakery Name</Text>
              <Text style={styles.settingValue} numberOfLines={1}>{auth.businessName || 'Bakery'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Bluetooth Receipt Printer Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>RECEIPT PRINTING (BLUETOOTH)</Text>

          <TouchableOpacity
            style={[styles.settingRow, styles.lastRow]}
            onPress={() => setBtModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="bluetooth" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Bluetooth Thermal Printer</Text>
              <Text style={[styles.settingValue, connectedBtPrinter && { color: '#16A34A', fontWeight: '700' }]}>
                {connectedBtPrinter ? `Connected: ${connectedBtPrinter.name}` : 'Not Connected • Tap to Connect'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Wi-Fi Admin Sync Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>WI-FI ADMIN PORTAL SYNC</Text>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setWifiModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="wifi" size={18} color="#2563EB" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Admin Server URL</Text>
              <Text style={styles.settingValue} numberOfLines={1}>{serverUrl}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.syncNowBtn}
            onPress={handleSyncNow}
            disabled={syncing}
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-upload-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.syncNowBtnText}>
              {syncing ? 'Syncing to Admin...' : 'Sync Data Now to Admin'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SYSTEM STATUS</Text>

          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.purple} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Application Version</Text>
              <Text style={styles.settingValue}>Bakery System v2.0</Text>
            </View>
          </View>

          <View style={[styles.settingRow, styles.lastRow]}>
            <View style={[styles.settingIcon, { backgroundColor: COLORS.successLight }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.success} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Local Database Mode</Text>
              <Text style={[styles.settingValue, { color: COLORS.success, fontWeight: '700' }]}>
                Ready & Offline Capable
              </Text>
            </View>
          </View>
        </View>

        {/* Clear Sales Data / Reset Button */}
        <TouchableOpacity
          style={styles.clearDataBtn}
          onPress={handleResetSales}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-circle-outline" size={18} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.clearDataText}>Reset / Clear Sales Records</Text>
        </TouchableOpacity>

        {/* Sign Out Action Button */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} style={{ marginRight: 8 }} />
          <Text style={styles.signOutText}>Sign Out from Terminal</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Modal: Username */}
      {editMode === 'username' && (
        <View style={styles.editOverlay}>
          <View style={styles.editBox}>
            <Text style={styles.editTitle}>Change Username</Text>
            <TextInput
              style={styles.editInput}
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="New username"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.editCancelBtn} onPress={() => setEditMode(null)}>
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editSaveBtn} onPress={handleSaveUsername}>
                <Text style={styles.editSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Edit Modal: Password */}
      {editMode === 'password' && (
        <View style={styles.editOverlay}>
          <View style={styles.editBox}>
            <Text style={styles.editTitle}>Change Password</Text>
            <TextInput
              style={styles.editInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current password"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showPass}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.editInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password (min 4 characters)"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showNewPass}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.editInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showNewPass}
              autoCapitalize="none"
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.editCancelBtn} onPress={() => setEditMode(null)}>
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editSaveBtn} onPress={handleSavePassword}>
                <Text style={styles.editSaveText}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Edit Modal: Business Name */}
      {editMode === 'business' && (
        <View style={styles.editOverlay}>
          <View style={styles.editBox}>
            <Text style={styles.editTitle}>Update Bakery Name</Text>
            <TextInput
              style={styles.editInput}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Bakery Name"
              placeholderTextColor={COLORS.textMuted}
              autoFocus
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.editCancelBtn} onPress={() => setEditMode(null)}>
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editSaveBtn} onPress={handleSaveBusinessName}>
                <Text style={styles.editSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
          <BluetoothPrinterModal
        visible={btModalVisible}
        onClose={() => {
          setBtModalVisible(false);
          getConnectedPrinter().then(p => setConnectedBtPrinter(p));
        }}
        businessName={auth.businessName || 'Bakery'}
      />
      <WifiSyncModal
        visible={wifiModalVisible}
        onClose={() => setWifiModalVisible(false)}
        onSyncComplete={(res) => {
          setServerUrlState(res.serverUrl);
          setLastSyncInfo(res);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  headerLogoutText: {
    color: COLORS.danger,
    fontSize: FONTS.xs,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 110,
  },
  profileHero: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  avatarLetter: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
  },
  displayName: {
    fontSize: FONTS.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  displayRole: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  displayBusiness: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
    width: '100%',
  },
  statPill: {
    flex: 1,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  statPillHighlight: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary + '33',
  },
  statPillValue: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statPillLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  // Storage Status Card
  storageStatusCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 16,
  },
  storageStatusTitle: {
    fontSize: FONTS.sm,
    fontWeight: '800',
    color: '#15803D',
  },
  storageStatusSub: {
    fontSize: FONTS.xs,
    color: '#166534',
    lineHeight: 18,
    marginBottom: 10,
  },
  storageStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  storageStatText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  backupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backupBtnText: {
    fontSize: FONTS.xs,
    fontWeight: '800',
    color: COLORS.primary,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  settingValue: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  clearDataBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clearDataText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.xs,
    fontWeight: '700',
  },
    syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    marginTop: 10,
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  syncNowBtnText: {
    color: '#FFF',
    fontSize: FONTS.sm,
    fontWeight: '800',
  },
signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLORS.danger + '33',
  },
  signOutText: {
    color: COLORS.danger,
    fontSize: FONTS.sm,
    fontWeight: '800',
  },
  // Edit Overlay Modals
  editOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 99,
  },
  editBox: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 20,
    ...SHADOWS.lg,
  },
  editTitle: {
    fontSize: FONTS.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
  editInput: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: FONTS.sm,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  editCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSubtle,
  },
  editCancelText: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  editSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  editSaveText: {
    fontSize: FONTS.sm,
    fontWeight: '800',
    color: '#FFF',
  },
});
