import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBakery } from '../store/BakeryStore';
import { COLORS, SHADOWS } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';
import EulaModal from '../components/EulaModal';
import BluetoothPrinterModal from '../components/BluetoothPrinterModal';
import { getCloudConfig, getHardwareDeviceId, pushBatchOrders } from '../services/cloudSyncService';
import { Clipboard } from 'react-native';
import { getConnectedPrinter, printReceiptDirect } from '../services/bluetoothPrinterService';

export default function ProfileScreen({ navigation }) {
  const { state, dispatch } = useBakery();
  const { auth, orders, products, inventory } = state;

  // Dialogs and Modals
  const [editMode, setEditMode] = useState(null); // 'username' | 'password' | 'clear' | null
  const [newUsername, setNewUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [clearInputConfirm, setClearInputConfirm] = useState('');
  const [clearPin, setClearPin] = useState('');

  const [btModalVisible, setBtModalVisible] = useState(false);
  const [connectedBtPrinter, setConnectedBtPrinter] = useState(null);
  const [eulaModalVisible, setEulaModalVisible] = useState(false);
  const [legalDocType, setLegalDocType] = useState('eula'); // 'eula' | 'tax' | 'ownership'

  const [cloudConfig, setCloudConfig] = useState(null);
  const [hardwareId, setHardwareId] = useState('');
  const [copyIdSuccess, setCopyIdSuccess] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  useEffect(() => {
    getCloudConfig().then(cfg => setCloudConfig(cfg));
    getHardwareDeviceId().then(id => setHardwareId(id));
    getConnectedPrinter().then(p => setConnectedBtPrinter(p));
  }, []);

  const refreshCloud = async () => {
    const cfg = await getCloudConfig();
    setCloudConfig(cfg);
  };

  const canGoBack = navigation && typeof navigation.canGoBack === 'function' && navigation.canGoBack();

  // Metrics calculation in Addis Ababa local date
  const ADDIS_OFFSET_MS = 3 * 3600 * 1000;
  const todayStr = new Date(Date.now() + ADDIS_OFFSET_MS).toISOString().split('T')[0];
  const todayOrders = (orders || []).filter(o => {
    if (!o.createdAt) return false;
    const d = new Date(new Date(o.createdAt).getTime() + ADDIS_OFFSET_MS).toISOString().split('T')[0];
    return d === todayStr;
  });
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const unsyncedOrders = (orders || []).filter(o => o.syncStatus !== 'synced');

  // Manual Sync Now Action
  const handleSyncNow = async () => {
    setIsSyncingNow(true);
    try {
      const res = await pushBatchOrders(unsyncedOrders.length > 0 ? unsyncedOrders : orders, {
        pendingCount: unsyncedOrders.length,
        inventory: inventory || [],
        products: products || []
      });

      if (res.success) {
        if (unsyncedOrders.length > 0) {
          const syncedIds = unsyncedOrders.map(o => o.id);
          dispatch({ type: 'MARK_ORDERS_SYNCED', payload: { syncedOrderIds: syncedIds } });
        }
        await refreshCloud();
        Alert.alert('Synchronization Complete', `${res.syncedCount || 0} orders uploaded. All records in sync with server.`);
      } else if (res.blocked) {
        Alert.alert('Terminal Suspended', res.reason || 'Terminal access has been suspended in BakerAdmin.');
      } else {
        Alert.alert('Sync Notice', res.message || 'Server unreachable. Orders remain safely stored on this phone.');
      }
    } catch (err) {
      Alert.alert('Sync Error', 'Failed to reach cloud server.');
    } finally {
      setIsSyncingNow(false);
    }
  };

  // Credentials actions
  const handleSaveUsername = () => {
    if (!newUsername.trim()) {
      Alert.alert('Validation Error', 'Username cannot be blank.');
      return;
    }
    dispatch({ type: 'UPDATE_CREDENTIALS', payload: { newUsername: newUsername.trim() } });
    Alert.alert('Success', 'Username updated successfully.');
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
    dispatch({ type: 'UPDATE_CREDENTIALS', payload: { newPassword } });
    Alert.alert('Success', 'Password changed successfully.');
    setEditMode(null);
  };

  // Danger Zone: Clear Sales Records
  const handleClearRecords = () => {
    if (unsyncedOrders.length > 0) {
      Alert.alert(
        'Action Blocked',
        `You have ${unsyncedOrders.length} unsynced orders waiting for upload. You cannot clear sales records until all orders have uploaded to BakerAdmin.`
      );
      return;
    }
    setClearInputConfirm('');
    setClearPin('');
    setEditMode('clear');
  };

  const handleConfirmClearRecords = () => {
    if (clearPin !== '1234' && clearPin !== auth.password) {
      Alert.alert('Access Denied', 'Manager PIN or current password is incorrect.');
      return;
    }
    if (clearInputConfirm.trim().toUpperCase() !== 'CLEAR') {
      Alert.alert('Verification Failed', 'Please type CLEAR to confirm.');
      return;
    }

    dispatch({ type: 'RESET_ORDERS' });
    setEditMode(null);
    Alert.alert('Records Cleared', 'Local sales orders have been wiped. Inventory remains intact.');
  };

  // Sign out confirmation
  const handleSignOut = () => {
    Alert.alert(
      'Confirm Sign Out',
      'Are you sure you want to sign out of this terminal session?',
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

  const handleCopyId = () => {
    Clipboard.setString(hardwareId);
    setCopyIdSuccess(true);
    setTimeout(() => setCopyIdSuccess(false), 2000);
  };

  const testPrintReceipt = async () => {
    const dummyOrder = {
      id: 'TEST-PRINT',
      createdAt: new Date().toISOString(),
      customerName: 'Terminal Self-Test',
      paymentMethod: 'Cash',
      items: [{ name: 'Artisan Sourdough Loaf', quantity: 1, price: 85 }],
      subtotal: 85,
      tax: 0,
      total: 85
    };
    try {
      const res = await printReceiptDirect(dummyOrder, { businessName: auth.businessName || 'Bakery POS' });
      if (!res.success) {
        Alert.alert('Printer Notice', res.message || 'Configure a Bluetooth printer first.');
      }
    } catch (e) {
      Alert.alert('Printer Error', e.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* ─── Enterprise Clean Screen Header (No Emojis, No Header Logout) ─── */}
      <ScreenHeader
        canGoBack={canGoBack}
        onBack={() => navigation.goBack()}
        title="Profile"
        subtitle="Terminal Account and Device Controls"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── 1. Account Summary Card ─── */}
        <View style={styles.accountCard}>
          <View style={styles.accountHeaderRow}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarLetter}>
                {(auth.username || 'A').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.accountTextCol}>
              <Text style={styles.accountName}>{auth.username || 'Administrator'}</Text>
              <Text style={styles.accountRole}>{auth.role || 'POS Operator'}</Text>
              <Text style={styles.accountShop}>{auth.businessName || 'SkyKin Artisan Bakery'}</Text>
            </View>
          </View>
        </View>

        {/* ─── 2. Metric Summary Row (Bordered Card, Neutral Figures) ─── */}
        <View style={styles.metricsCard}>
          <View style={styles.metricCell}>
            <Text style={styles.metricValue}>{todayOrders.length}</Text>
            <Text style={styles.metricLabel}>Orders Today</Text>
          </View>
          <View style={[styles.metricCell, styles.metricCellBorder]}>
            <Text style={[styles.metricValue, { color: COLORS.primary }]}>
              ETB {todayRevenue.toFixed(2)}
            </Text>
            <Text style={styles.metricLabel}>Sales Today</Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={styles.metricValue}>{products.length}</Text>
            <Text style={styles.metricLabel}>Products</Text>
          </View>
        </View>

        {/* ─── 3. Section: Account ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ACCOUNT</Text>
          <View style={styles.listCard}>
            <TouchableOpacity
              style={styles.listRow}
              onPress={() => { setNewUsername(auth.username); setEditMode('username'); }}
              activeOpacity={0.7}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="person-outline" size={17} color="#475569" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>Username</Text>
                <Text style={styles.rowSubtitle}>{auth.username}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.listRow, styles.listRowBorder]}
              onPress={() => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setEditMode('password'); }}
              activeOpacity={0.7}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="key-outline" size={17} color="#475569" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>Change Password</Text>
                <Text style={styles.rowSubtitle}>Account security credentials</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <View style={[styles.listRow, styles.listRowBorder]}>
              <View style={styles.rowIcon}>
                <Ionicons name="business-outline" size={17} color="#475569" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>Shop Client</Text>
                <Text style={styles.rowSubtitle}>{auth.businessName || 'SkyKin Artisan Bakery'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ─── 4. Section: Device & Licensing ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>DEVICE AND LICENSING</Text>
          <View style={styles.listCard}>
            <View style={styles.listRow}>
              <View style={styles.rowIcon}>
                <Ionicons name="hardware-chip-outline" size={17} color="#475569" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>Terminal Hardware ID</Text>
                <Text style={styles.rowSubtitleMono}>{hardwareId || 'IDENTIFYING...'}</Text>
              </View>
              <TouchableOpacity onPress={handleCopyId} style={styles.actionPillBtn} activeOpacity={0.7}>
                <Ionicons name={copyIdSuccess ? 'checkmark' : 'copy-outline'} size={13} color="#475569" />
                <Text style={styles.actionPillText}>{copyIdSuccess ? 'Copied' : 'Copy'}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.listRow, styles.listRowBorder]}>
              <View style={styles.rowIcon}>
                <Ionicons name="shield-checkmark-outline" size={17} color="#475569" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>License Status</Text>
                <Text style={styles.rowSubtitle}>
                  Key: {cloudConfig?.licenseKey || 'SKY-BAKERY-001'}
                </Text>
              </View>
              <View style={styles.statusBadgeActive}>
                <Text style={styles.statusBadgeTextActive}>ACTIVE</Text>
              </View>
            </View>

            <View style={[styles.listRow, styles.listRowBorder]}>
              <View style={styles.rowIcon}>
                <Ionicons name="cloud-upload-outline" size={17} color="#475569" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>Cloud Data Sync</Text>
                <Text style={styles.rowSubtitle}>
                  {unsyncedOrders.length > 0
                    ? `${unsyncedOrders.length} pending orders to upload`
                    : 'All records synced to BakerAdmin'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleSyncNow}
                disabled={isSyncingNow}
                style={[styles.btnActionPrimary, isSyncingNow && { opacity: 0.6 }]}
                activeOpacity={0.8}
              >
                {isSyncingNow ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="sync" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.btnActionPrimaryText}>Sync Now</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={[styles.listRow, styles.listRowBorder]}>
              <View style={styles.rowIcon}>
                <Ionicons name="information-circle-outline" size={17} color="#475569" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>Application Version</Text>
                <Text style={styles.rowSubtitle}>v1.0.8 (BakerAdmin Enterprise POS)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ─── 5. Section: Receipt Printer ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>RECEIPT PRINTER</Text>
          <View style={styles.listCard}>
            <TouchableOpacity
              style={styles.listRow}
              onPress={() => setBtModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="print-outline" size={17} color="#475569" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>Thermal Printer</Text>
                <Text style={styles.rowSubtitle}>
                  {connectedBtPrinter ? connectedBtPrinter.name : 'No Bluetooth printer connected'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.listRow, styles.listRowBorder]}
              onPress={testPrintReceipt}
              activeOpacity={0.7}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="document-text-outline" size={17} color="#475569" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>Print Diagnostic Receipt</Text>
                <Text style={styles.rowSubtitle}>Send test print to check 58mm alignment</Text>
              </View>
              <Ionicons name="play-outline" size={16} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 6. Section: Legal & Compliance ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>LEGAL AND REGULATORY NOTICES</Text>
          <View style={styles.listCard}>
            <TouchableOpacity
              style={styles.listRow}
              onPress={() => { setLegalDocType('eula'); setEulaModalVisible(true); }}
              activeOpacity={0.7}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="document-outline" size={17} color="#475569" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>License Agreement (EULA)</Text>
                <Text style={styles.rowSubtitle}>Internal software terms and operational rules</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.listRow, styles.listRowBorder]}
              onPress={() => {
                Alert.alert(
                  'Tax & Regulatory Notice',
                  'This software is an internal Point-of-Sale sales tracking tool. It is NOT a registered fiscal cash register machine (ERCA / Ministry of Revenue). Generated slips do not constitute official tax invoices.'
                );
              }}
              activeOpacity={0.7}
            >
              <View style={styles.rowIcon}>
                <Ionicons name="alert-circle-outline" size={17} color="#475569" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>Non-Fiscal Disclaimer</Text>
                <Text style={styles.rowSubtitle}>Statutory and tax compliance notice</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 7. Danger Zone ─── */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: '#DC2626' }]}>DANGER ZONE</Text>
          <View style={[styles.listCard, styles.dangerCard]}>
            <View style={styles.listRow}>
              <View style={styles.rowIcon}>
                <Ionicons name="trash-outline" size={17} color="#DC2626" />
              </View>
              <View style={styles.rowBody}>
                <Text style={[styles.rowTitle, { color: '#DC2626' }]}>Clear Local Sales Records</Text>
                <Text style={styles.rowSubtitle}>
                  {unsyncedOrders.length > 0
                    ? 'Blocked: upload unsynced orders first'
                    : 'Requires manager PIN and typed confirmation'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClearRecords}
                style={[styles.btnOutlineDanger, unsyncedOrders.length > 0 && { opacity: 0.5 }]}
                disabled={unsyncedOrders.length > 0}
                activeOpacity={0.8}
              >
                <Text style={styles.btnOutlineDangerText}>Clear</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.listRow, styles.listRowBorder]}>
              <View style={styles.rowIcon}>
                <Ionicons name="log-out-outline" size={17} color="#475569" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>Sign Out</Text>
                <Text style={styles.rowSubtitle}>End session on this terminal</Text>
              </View>
              <TouchableOpacity
                onPress={handleSignOut}
                style={styles.btnOutlineSecondary}
                activeOpacity={0.8}
              >
                <Text style={styles.btnOutlineSecondaryText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── Edit Username Modal ─── */}
      <Modal visible={editMode === 'username'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalDialog}>
            <Text style={styles.modalTitle}>Update Username</Text>
            <Text style={styles.modalDesc}>Change the operator username for this device.</Text>
            <TextInput
              style={styles.formInput}
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="Enter new username"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
            />
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.btnModalSecondary} onPress={() => setEditMode(null)}>
                <Text style={styles.btnModalSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnModalPrimary} onPress={handleSaveUsername}>
                <Text style={styles.btnModalPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Edit Password Modal ─── */}
      <Modal visible={editMode === 'password'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalDialog}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <Text style={styles.modalDesc}>Verify current password and set a new password.</Text>
            <TextInput
              style={styles.formInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
            />
            <TextInput
              style={[styles.formInput, { marginTop: 10 }]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password (minimum 4 characters)"
              placeholderTextColor="#94A3B8"
              secureTextEntry
            />
            <TextInput
              style={[styles.formInput, { marginTop: 10 }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
            />
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.btnModalSecondary} onPress={() => setEditMode(null)}>
                <Text style={styles.btnModalSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnModalPrimary} onPress={handleSavePassword}>
                <Text style={styles.btnModalPrimaryText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Danger Confirmation Modal ─── */}
      <Modal visible={editMode === 'clear'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalDialog}>
            <Text style={[styles.modalTitle, { color: '#DC2626' }]}>Clear Local Sales Records</Text>
            <Text style={styles.modalDesc}>
              This will wipe past order history from this terminal. To authorize, enter the manager PIN or current password and type CLEAR below.
            </Text>
            <TextInput
              style={styles.formInput}
              value={clearPin}
              onChangeText={setClearPin}
              placeholder="Manager PIN or password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
            />
            <TextInput
              style={[styles.formInput, { marginTop: 10 }]}
              value={clearInputConfirm}
              onChangeText={setClearInputConfirm}
              placeholder="Type CLEAR to verify"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
            />
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.btnModalSecondary} onPress={() => setEditMode(null)}>
                <Text style={styles.btnModalSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnModalPrimary, { backgroundColor: '#DC2626' }]}
                onPress={handleConfirmClearRecords}
              >
                <Text style={styles.btnModalPrimaryText}>Authorize Wipe</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bluetooth Printer Modal */}
      <BluetoothPrinterModal
        visible={btModalVisible}
        onClose={() => {
          setBtModalVisible(false);
          getConnectedPrinter().then(p => setConnectedBtPrinter(p));
        }}
      />

      {/* Plain text EULA agreement modal */}
      <EulaModal
        visible={eulaModalVisible}
        onClose={() => setEulaModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  accountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  accountHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarLetter: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  accountTextCol: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  accountRole: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 1,
  },
  accountShop: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '600',
    marginTop: 2,
  },
  metricsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    marginBottom: 16,
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCellBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#F1F5F9',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
    fontWeight: '500',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#64748B',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  dangerCard: {
    borderColor: '#FCA5A5',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
  },
  listRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  rowIcon: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  rowSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  rowSubtitleMono: {
    fontSize: 11,
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '600',
    marginTop: 1,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  statusBadgeActive: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeTextActive: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
    letterSpacing: 0.5,
  },
  btnActionPrimary: {
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnActionPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  btnOutlineDanger: {
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  btnOutlineDangerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  btnOutlineSecondary: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  btnOutlineSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalDialog: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  btnModalSecondary: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  btnModalSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  btnModalPrimary: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#D97706',
  },
  btnModalPrimaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
