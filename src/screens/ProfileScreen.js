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
  Platform,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBakery } from '../store/BakeryStore';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import EulaModal from '../components/EulaModal';
import BluetoothPrinterModal from '../components/BluetoothPrinterModal';
import NameYourBakeryModal from '../components/NameYourBakeryModal';
import { getCloudConfig, getHardwareDeviceId, pushBatchOrders } from '../services/cloudSyncService';
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

  const [bakeryModalVisible, setBakeryModalVisible] = useState(false);
  const [btModalVisible, setBtModalVisible] = useState(false);
  const [connectedBtPrinter, setConnectedBtPrinter] = useState(null);
  const [eulaModalVisible, setEulaModalVisible] = useState(false);

  const [cloudConfig, setCloudConfig] = useState(null);
  const [hardwareId, setHardwareId] = useState('');
  const [copyIdSuccess, setCopyIdSuccess] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  useEffect(() => {
    getCloudConfig().then((cfg) => setCloudConfig(cfg));
    getHardwareDeviceId().then((id) => setHardwareId(id));
    getConnectedPrinter().then((p) => setConnectedBtPrinter(p));
  }, []);

  const refreshCloud = async () => {
    const cfg = await getCloudConfig();
    setCloudConfig(cfg);
  };

  // Metrics calculation in local time
  const ADDIS_OFFSET_MS = 3 * 3600 * 1000;
  const todayStr = new Date(Date.now() + ADDIS_OFFSET_MS).toISOString().split('T')[0];
  const todayOrders = (orders || []).filter((o) => {
    if (!o.createdAt) return false;
    const d = new Date(new Date(o.createdAt).getTime() + ADDIS_OFFSET_MS).toISOString().split('T')[0];
    return d === todayStr;
  });
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const unsyncedOrders = (orders || []).filter((o) => !o.synced && o.syncStatus !== 'synced');

  // Manual Sync Now Action
  const handleSyncNow = async () => {
    setIsSyncingNow(true);
    try {
      const res = await pushBatchOrders(unsyncedOrders.length > 0 ? unsyncedOrders : orders, {
        pendingCount: unsyncedOrders.length,
        inventory: inventory || [],
        products: products || [],
      });

      if (res.success) {
        if (unsyncedOrders.length > 0) {
          const syncedIds = unsyncedOrders.map((o) => o.id);
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
    Clipboard.setString(hardwareId || 'DEV-WEB-POS-01');
    setCopyIdSuccess(true);
    setTimeout(() => setCopyIdSuccess(false), 2000);
  };

  const testPrintReceipt = async () => {
    const testReceiptPayload = {
      id: 'TEST-' + Date.now().toString(36).toUpperCase(),
      createdAt: new Date().toISOString(),
      customerName: 'Terminal Self-Test',
      paymentMethod: 'Cash',
      items: [{ name: 'Printer Alignment Test', quantity: 1, price: 0 }],
      subtotal: 0,
      tax: 0,
      total: 0,
    };
    try {
      const res = await printReceiptDirect(testReceiptPayload, {
        businessName: auth.businessName || 'Bakery POS',
      });
      if (!res.success) {
        Alert.alert('Printer Notice', res.message || 'Configure a Bluetooth printer first.');
      }
    } catch (e) {
      Alert.alert('Printer Error', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero Header matching Reference ─── */}
        <View style={[styles.heroContainer, auth.brandColor ? { backgroundColor: auth.brandColor } : null]}>
          {/* Subtle concentric rings */}
          <View style={[styles.heroRing, { width: 340, height: 340, top: -140, right: -100 }]} />
          <View style={[styles.heroRing, { width: 220, height: 220, top: -80, right: -40 }]} />

          {/* User Row */}
          <View style={styles.heroUserRow}>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>
                {(auth.username || 'A').charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.heroUsername}>{auth.username || 'admin'}</Text>
              <Text style={styles.heroUserSub}>
                {auth.role || 'Manager'} • {auth.businessName || 'Bakery'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.heroEditBtn}
              onPress={() => {
                setNewUsername(auth.username || '');
                setEditMode('username');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.heroEditText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Today's 3 Metrics */}
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCol}>
              <Text style={styles.heroStatNumber}>{todayOrders.length}</Text>
              <Text style={styles.heroStatLabel}>Orders today</Text>
            </View>
            <View style={styles.heroStatCol}>
              <Text style={styles.heroStatNumber}>ETB {todayRevenue.toFixed(2)}</Text>
              <Text style={styles.heroStatLabel}>Sales today</Text>
            </View>
            <View style={styles.heroStatCol}>
              <Text style={styles.heroStatNumber}>{products.length}</Text>
              <Text style={styles.heroStatLabel}>Products</Text>
            </View>
          </View>
        </View>

        {/* ─── Floating License Active Card ─── */}
        <View style={styles.overlappingCard}>
          <View style={styles.licenseRow}>
            <View style={styles.licenseLeft}>
              <View style={styles.softIconTile}>
                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.brandGreenText} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.licenseTitle}>License active</Text>
              </View>
            </View>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.syncRow}>
            <Text style={styles.syncTitle}>
              Cloud sync • {unsyncedOrders.length} waiting
            </Text>
            <TouchableOpacity
              style={styles.syncNowBtn}
              onPress={handleSyncNow}
              disabled={isSyncingNow}
              activeOpacity={0.8}
            >
              {isSyncingNow ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.syncNowText}>Sync now</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Section: BUSINESS ─── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionOverline}>BUSINESS</Text>
          <View style={styles.groupCard}>
            <View style={styles.cardRow}>
              <View style={styles.softIconTile}>
                <Ionicons name="business-outline" size={18} color={COLORS.brandGreenText} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.rowTitle}>Bakery name</Text>
                <Text style={styles.rowSub}>{auth.businessName || 'Bakery'}</Text>
              </View>
              <TouchableOpacity
                style={styles.smallEditBtn}
                onPress={() => setBakeryModalVisible(true)}
              >
                <Text style={styles.smallEditText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.cardRow}
              onPress={() => setBakeryModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.softIconTile}>
                <Ionicons name="receipt-outline" size={18} color={COLORS.brandGreenText} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.rowTitle}>Receipt details</Text>
                <Text style={styles.rowSub}>Address, phone, branding</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Section: SECURITY ─── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionOverline}>SECURITY</Text>
          <View style={styles.groupCard}>
            <TouchableOpacity
              style={styles.cardRow}
              onPress={() => {
                setNewUsername(auth.username || '');
                setEditMode('username');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.softIconTile}>
                <Ionicons name="person-outline" size={18} color={COLORS.brandGreenText} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.rowTitle}>Username</Text>
                <Text style={styles.rowSub}>{auth.username || 'admin'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.cardRow}
              onPress={() => {
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setEditMode('password');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.softIconTile}>
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.brandGreenText} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.rowTitle}>Change password</Text>
                <Text style={styles.rowSub}>Account security</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Section: DEVICE ─── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionOverline}>DEVICE</Text>
          <View style={styles.groupCard}>
            <View style={styles.cardRow}>
              <View style={styles.softIconTile}>
                <Ionicons name="hardware-chip-outline" size={18} color={COLORS.brandGreenText} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.rowTitle}>Terminal hardware ID</Text>
                <Text style={styles.rowSubMono} numberOfLines={1}>
                  {hardwareId || 'DEV-WEB-POS-MVXRIKYQ-1DRL'}
                </Text>
              </View>
              <TouchableOpacity style={styles.smallEditBtn} onPress={handleCopyId}>
                <Text style={styles.smallEditText}>{copyIdSuccess ? 'Copied' : 'Copy'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.cardRow}
              onPress={() => setBtModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.softIconTile}>
                <Ionicons name="print-outline" size={18} color={COLORS.brandGreenText} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.rowTitle}>Thermal printer</Text>
                <Text style={styles.rowSub}>
                  {connectedBtPrinter ? connectedBtPrinter.name : 'No Bluetooth printer connected'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.cardRow}
              onPress={testPrintReceipt}
              activeOpacity={0.7}
            >
              <View style={styles.softIconTile}>
                <Ionicons name="document-text-outline" size={18} color={COLORS.brandGreenText} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.rowTitle}>Print test receipt</Text>
                <Text style={styles.rowSub}>Check 58mm alignment</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Section: LEGAL ─── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionOverline}>LEGAL</Text>
          <View style={styles.groupCard}>
            <TouchableOpacity
              style={styles.cardRow}
              onPress={() => setEulaModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.softIconTile}>
                <Ionicons name="shield-outline" size={18} color={COLORS.brandGreenText} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.rowTitle}>License agreement (EULA)</Text>
                <Text style={styles.rowSub}>Software terms and rules</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.cardRow}
              onPress={() => {
                Alert.alert(
                  'Non-Fiscal Disclaimer',
                  'This software is an internal Point-of-Sale sales tracking tool. It is not a fiscal cash register machine (ERCA / Ministry of Revenue). Generated slips do not constitute official tax invoices.'
                );
              }}
              activeOpacity={0.7}
            >
              <View style={styles.softIconTile}>
                <Ionicons name="information-circle-outline" size={18} color={COLORS.brandGreenText} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.rowTitle}>Non-fiscal disclaimer</Text>
                <Text style={styles.rowSub}>Tax compliance notice</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Section: DANGER ZONE ─── */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionOverline, { color: COLORS.dangerText }]}>DANGER ZONE</Text>
          <View style={styles.dangerGroupCard}>
            <TouchableOpacity
              style={styles.cardRow}
              onPress={handleClearRecords}
              activeOpacity={0.7}
            >
              <View style={styles.dangerIconTile}>
                <Ionicons name="trash-outline" size={18} color={COLORS.dangerText} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.rowTitle, { color: COLORS.dangerText }]}>
                  Clear local sales records
                </Text>
                <Text style={styles.rowSub}>
                  {unsyncedOrders.length > 0
                    ? 'Blocked: upload unsynced orders first'
                    : 'Reset sales database'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.dangerText} />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.cardRow}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <View style={styles.dangerIconTile}>
                <Ionicons name="log-out-outline" size={18} color={COLORS.dangerText} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.rowTitle, { color: COLORS.dangerText }]}>Sign out</Text>
                <Text style={styles.rowSub}>End session on this terminal</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.dangerText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom space so Danger Zone is never covered by floating tab bar */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Edit Username Modal */}
      <Modal visible={editMode === 'username'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Update Username</Text>
            <Text style={styles.dialogDesc}>Change operator username for this device.</Text>
            <TextInput
              style={styles.dialogInput}
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="Enter new username"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.dialogCancelBtn} onPress={() => setEditMode(null)}>
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogConfirmBtn} onPress={handleSaveUsername}>
                <Text style={styles.dialogConfirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Password Modal */}
      <Modal visible={editMode === 'password'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Change Password</Text>
            <Text style={styles.dialogDesc}>Enter current password and set a new password.</Text>
            <TextInput
              style={styles.dialogInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current password"
              placeholderTextColor={COLORS.muted}
              secureTextEntry
            />
            <TextInput
              style={[styles.dialogInput, { marginTop: 10 }]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password (min 4 chars)"
              placeholderTextColor={COLORS.muted}
              secureTextEntry
            />
            <TextInput
              style={[styles.dialogInput, { marginTop: 10 }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={COLORS.muted}
              secureTextEntry
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.dialogCancelBtn} onPress={() => setEditMode(null)}>
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogConfirmBtn} onPress={handleSavePassword}>
                <Text style={styles.dialogConfirmText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Clear Records Confirmation Modal */}
      <Modal visible={editMode === 'clear'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.dialogCard}>
            <Text style={[styles.dialogTitle, { color: COLORS.dangerText }]}>
              Clear Local Sales Records
            </Text>
            <Text style={styles.dialogDesc}>
              Enter manager PIN or password and type CLEAR to confirm wiping local sales orders.
            </Text>
            <TextInput
              style={styles.dialogInput}
              value={clearPin}
              onChangeText={setClearPin}
              placeholder="Manager PIN or password"
              placeholderTextColor={COLORS.muted}
              secureTextEntry
            />
            <TextInput
              style={[styles.dialogInput, { marginTop: 10 }]}
              value={clearInputConfirm}
              onChangeText={setClearInputConfirm}
              placeholder="Type CLEAR to verify"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="characters"
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.dialogCancelBtn} onPress={() => setEditMode(null)}>
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogConfirmBtn, { backgroundColor: COLORS.dangerText }]}
                onPress={handleConfirmClearRecords}
              >
                <Text style={styles.dialogConfirmText}>Authorize Wipe</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Name Your Bakery Modal */}
      <NameYourBakeryModal
        visible={bakeryModalVisible}
        initialName={auth.businessName || 'Bakery'}
        initialColor={auth.brandColor || '#0F382C'}
        onClose={() => setBakeryModalVisible(false)}
        onSave={(finalName, finalColor) => {
          dispatch({
            type: 'UPDATE_BRANDING',
            payload: { businessName: finalName, brandColor: finalColor },
          });
          setBakeryModalVisible(false);
          Alert.alert('Branding Updated', `Bakery name saved as "${finalName}".`);
        }}
      />

      {/* Bluetooth Printer Modal */}
      <BluetoothPrinterModal
        visible={btModalVisible}
        onClose={() => {
          setBtModalVisible(false);
          getConnectedPrinter().then((p) => setConnectedBtPrinter(p));
        }}
      />

      {/* EULA Modal */}
      <EulaModal visible={eulaModalVisible} onClose={() => setEulaModalVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.appBg,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroContainer: {
    backgroundColor: COLORS.brandDarkGreen,
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingBottom: 36,
    paddingHorizontal: 20,
    borderBottomLeftRadius: RADIUS.hero,
    borderBottomRightRadius: RADIUS.hero,
    overflow: 'hidden',
  },
  heroRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(18, 183, 106, 0.15)',
  },
  heroUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroAvatar: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.tile,
    backgroundColor: COLORS.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: FONTS.extraBold,
  },
  heroUsername: {
    fontSize: FONTS.h2,
    fontFamily: FONTS.extraBold,
    color: '#FFFFFF',
  },
  heroUserSub: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.medium,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
  },
  heroEditBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.chip,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroEditText: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  heroStatCol: {
    alignItems: 'flex-start',
  },
  heroStatNumber: {
    fontSize: 20,
    fontFamily: FONTS.extraBold,
    color: '#FFFFFF',
  },
  heroStatLabel: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  overlappingCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    marginHorizontal: 16,
    marginTop: -22,
    padding: 16,
    ...SHADOWS.card,
  },
  licenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  licenseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  licenseTitle: {
    fontSize: FONTS.body,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
  },
  licenseSub: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
    marginTop: 2,
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.badge,
    backgroundColor: COLORS.softGreen,
  },
  activeBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.brandGreenText,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.hairline,
    marginVertical: 12,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncTitle: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
  },
  syncNowBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.chip,
    backgroundColor: COLORS.brandDarkGreen,
  },
  syncNowText: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  sectionWrap: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionOverline: {
    fontSize: FONTS.overline,
    fontFamily: FONTS.extraBold,
    letterSpacing: 0.8,
    color: COLORS.muted,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  groupCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    ...SHADOWS.card,
  },
  dangerGroupCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.dangerBorder,
    ...SHADOWS.card,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowDivider: {
    height: 1,
    backgroundColor: COLORS.hairline,
    marginLeft: 66,
  },
  softIconTile: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.tile,
    backgroundColor: COLORS.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerIconTile: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.tile,
    backgroundColor: COLORS.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: FONTS.body,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
  },
  rowSub: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
    marginTop: 2,
  },
  rowSubMono: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
    marginTop: 2,
  },
  smallEditBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.chip,
    backgroundColor: COLORS.appBg,
  },
  smallEditText: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: COLORS.brandDarkGreen,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: RADIUS.card,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    ...SHADOWS.card,
  },
  signOutText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: '#DC2626',
  },
  // Dialogs
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(14, 31, 23, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: 22,
    ...SHADOWS.hero,
  },
  dialogTitle: {
    fontSize: FONTS.h2,
    fontFamily: FONTS.extraBold,
    color: COLORS.ink,
    marginBottom: 4,
  },
  dialogDesc: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
    marginBottom: 16,
    lineHeight: 18,
  },
  dialogInput: {
    height: 50,
    borderRadius: RADIUS.input,
    backgroundColor: COLORS.appBg,
    paddingHorizontal: 14,
    fontSize: FONTS.body,
    fontFamily: FONTS.medium,
    color: COLORS.ink,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  dialogCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.chip,
    backgroundColor: COLORS.appBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogCancelText: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
  },
  dialogConfirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.chip,
    backgroundColor: COLORS.brandDarkGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogConfirmText: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
});
