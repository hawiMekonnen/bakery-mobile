import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import {
  getPrinterPaperWidth,
  setPrinterPaperWidth,
  printToBluetoothPrinter,
  testPrintReceipt,
  requestBluetoothPermissions,
  checkBluetoothPermissions,
  openPhoneBluetoothSettings,
  openRawBtPlayStore,
  isRawBtAvailable,
} from '../services/bluetoothPrinterService';

export default function BluetoothPrinterModal({
  visible,
  onClose,
  orderToPrint = null,
  businessName = 'Bakery',
  onPrintSuccess = null,
  onFallbackSystemPrint = null,
}) {
  const [hasBtPermission, setHasBtPermission] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [paperWidth, setPaperWidth] = useState('58mm');
  const [rawBtInstalled, setRawBtInstalled] = useState(false);

  useEffect(() => {
    if (visible) {
      loadPrinterState();
      initBluetoothPermissions();
      checkRawBt();
    }
  }, [visible]);

  const loadPrinterState = async () => {
    const width = await getPrinterPaperWidth();
    setPaperWidth(width);
  };

  const initBluetoothPermissions = async () => {
    setCheckingPermission(true);
    const granted = await requestBluetoothPermissions();
    setHasBtPermission(granted);
    setCheckingPermission(false);
  };

  const checkRawBt = async () => {
    const available = await isRawBtAvailable();
    setRawBtInstalled(available);
  };

  const handleRequestPermission = async () => {
    setCheckingPermission(true);
    const granted = await requestBluetoothPermissions();
    setHasBtPermission(granted);
    setCheckingPermission(false);
    if (granted) {
      Alert.alert('Permission Granted! ✓', 'Bluetooth access is active. You can now communicate with your receipt printer.');
    } else {
      Alert.alert(
        'Permission Required',
        'Bluetooth permission is required to detect nearby thermal printers. Please allow in your phone settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openPhoneBluetoothSettings },
        ]
      );
    }
  };

  const handleSelectPaperWidth = async (width) => {
    setPaperWidth(width);
    await setPrinterPaperWidth(width);
  };

  const handlePrintOrder = async () => {
    if (!orderToPrint) return;
    setPrinting(true);
    const result = await printToBluetoothPrinter(orderToPrint, businessName, paperWidth);
    setPrinting(false);
    if (result.success) {
      Alert.alert(
        'Receipt Sent! 🧾🖨️',
        `Receipt #${orderToPrint.id} sent to printer (${paperWidth} roll format).`,
        [
          {
            text: 'Done',
            onPress: () => {
              if (onPrintSuccess) onPrintSuccess(result);
              onClose();
            },
          },
        ]
      );
    } else {
      if (result.error !== 'PRINT_FAILED') {
        Alert.alert('Print Notice', result.message || 'Could not complete print job.');
      }
    }
  };

  const handleTestPrint = async () => {
    setPrinting(true);
    const result = await testPrintReceipt(businessName, paperWidth);
    setPrinting(false);
    if (result.success) {
      Alert.alert(
        'Test Slip Sent! 🧾',
        `Test receipt sent to printer (${paperWidth} roll). Check your printer output.`
      );
    } else {
      if (result.error !== 'PRINT_FAILED') {
        Alert.alert('Print Notice', result.message || 'Could not complete test print.');
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.btIconBadge}>
                <Ionicons name="print" size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.title}>Printer</Text>
                <Text style={styles.subtitle}>
                  Continuous Thermal Roll ({paperWidth})
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Bluetooth Permission Banner */}
            <View style={[styles.permBanner, hasBtPermission ? styles.permBannerGranted : styles.permBannerNeeded]}>
              <View style={styles.permBannerLeft}>
                <Ionicons
                  name={hasBtPermission ? 'checkmark-circle' : 'bluetooth'}
                  size={20}
                  color={hasBtPermission ? '#16A34A' : '#D97706'}
                />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={[styles.permBannerTitle, { color: hasBtPermission ? '#15803D' : '#B45309' }]}>
                    {hasBtPermission ? 'Bluetooth Permission Active' : 'Bluetooth Permission Required'}
                  </Text>
                  <Text style={styles.permBannerDesc}>
                    {hasBtPermission
                      ? 'App can communicate with nearby receipt printers.'
                      : 'Tap Allow to enable Bluetooth access on your phone.'}
                  </Text>
                </View>
              </View>
              {!hasBtPermission && (
                <TouchableOpacity
                  style={styles.grantPermBtn}
                  onPress={handleRequestPermission}
                  disabled={checkingPermission}
                >
                  {checkingPermission ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.grantPermBtnText}>Allow</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* 1-Tap Open Phone Bluetooth Settings */}
            <TouchableOpacity
              style={styles.openSettingsCard}
              onPress={openPhoneBluetoothSettings}
              activeOpacity={0.8}
            >
              <View style={styles.openSettingsIconBg}>
                <Ionicons name="bluetooth-outline" size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.openSettingsTitle}>Phone Bluetooth Settings</Text>
                <Text style={styles.openSettingsSub}>
                  Turn on printer & pair here first (PIN: 0000 or 1234)
                </Text>
              </View>
              <Ionicons name="open-outline" size={18} color="#2563EB" />
            </TouchableOpacity>

            {/* Paper Width Selector */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="options-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={styles.sectionCardTitle}>Paper Roll Width</Text>
              </View>
              <Text style={styles.sectionCardSub}>
                Receipts are formatted specifically to fit continuous roll paper without empty margins.
              </Text>
              <View style={styles.paperToggleRow}>
                <TouchableOpacity
                  style={[styles.paperBtn, paperWidth === '58mm' && styles.paperBtnActive]}
                  onPress={() => handleSelectPaperWidth('58mm')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="receipt-outline"
                    size={16}
                    color={paperWidth === '58mm' ? '#FFF' : COLORS.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.paperBtnText, paperWidth === '58mm' && styles.paperBtnTextActive]}>
                    58mm Roll (Mini POS)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.paperBtn, paperWidth === '80mm' && styles.paperBtnActive]}
                  onPress={() => handleSelectPaperWidth('80mm')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="receipt-outline"
                    size={16}
                    color={paperWidth === '80mm' ? '#FFF' : COLORS.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.paperBtnText, paperWidth === '80mm' && styles.paperBtnTextActive]}>
                    80mm Roll
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Print Actions Section */}
            <View style={styles.actionCard}>
              <Text style={styles.actionCardTitle}>PRINT RECEIPT</Text>

              {/* Action: Print target order if provided */}
              {orderToPrint && (
                <TouchableOpacity
                  style={styles.printOrderPrimaryBtn}
                  onPress={handlePrintOrder}
                  disabled={printing}
                  activeOpacity={0.85}
                >
                  {printing ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="print" size={20} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={styles.printOrderPrimaryText}>
                        Print Receipt #{orderToPrint.id}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Action: Test Print */}
              <TouchableOpacity
                style={styles.testPrintBtn}
                onPress={handleTestPrint}
                disabled={printing}
                activeOpacity={0.8}
              >
                {printing ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <>
                    <Ionicons name="receipt-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.testPrintBtnText}>Print Test Slip ({paperWidth})</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Direct Bluetooth (ESC/POS) Info & Driver Option */}
            <View style={styles.driverCard}>
              <View style={styles.driverHeaderRow}>
                <Ionicons name="flash-outline" size={16} color="#7C3AED" style={{ marginRight: 6 }} />
                <Text style={styles.driverTitle}>Direct Bluetooth 1-Tap Driver</Text>
              </View>
              <Text style={styles.driverDesc}>
                {rawBtInstalled
                  ? 'RawBT ESC/POS driver detected! Receipts print silently over Bluetooth in 1-tap without print dialogs.'
                  : 'For instant 1-tap silent printing directly over Bluetooth without opening the Android print dialog, install the free RawBT ESC/POS driver.'}
              </Text>
              <TouchableOpacity
                style={styles.driverBtn}
                onPress={openRawBtPlayStore}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-google-playstore" size={16} color="#7C3AED" style={{ marginRight: 6 }} />
                <Text style={styles.driverBtnText}>
                  {rawBtInstalled ? 'Open RawBT Driver' : 'Get ESC/POS Driver (Play Store)'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Direct Fallback to System Spooler */}
            {onFallbackSystemPrint && (
              <View style={styles.fallbackSection}>
                <TouchableOpacity
                  style={styles.systemPrintBtn}
                  onPress={async () => {
                    onClose();
                    await onFallbackSystemPrint();
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="paper-plane-outline" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.systemPrintText}>Direct Print (System Spooler)</Text>
                </TouchableOpacity>
                <Text style={styles.fallbackHint}>
                  Print directly using your phone's Android print service
                </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '88%',
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btIconBadge: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: FONTS.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    marginBottom: 6,
  },
  permBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: 10,
    borderWidth: 1,
  },
  permBannerGranted: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  permBannerNeeded: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  permBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  permBannerTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  permBannerDesc: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  grantPermBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    marginLeft: 8,
  },
  grantPermBtnText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  openSettingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 14,
  },
  openSettingsIconBg: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openSettingsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  openSettingsSub: {
    fontSize: 10,
    color: '#3B82F6',
    marginTop: 1,
  },
  sectionCard: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionCardSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 10,
    lineHeight: 14,
  },
  paperToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paperBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paperBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  paperBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  paperBtnTextActive: {
    color: '#FFF',
  },
  actionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 14,
  },
  actionCardTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  printOrderPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    marginBottom: 10,
    ...SHADOWS.sm,
  },
  printOrderPrimaryText: {
    color: '#FFF',
    fontSize: FONTS.sm,
    fontWeight: '800',
  },
  testPrintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
  },
  testPrintBtnText: {
    color: COLORS.primary,
    fontSize: FONTS.xs,
    fontWeight: '700',
  },
  driverCard: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 14,
  },
  driverHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  driverTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B21A8',
  },
  driverDesc: {
    fontSize: 10,
    color: '#7E22CE',
    lineHeight: 14,
    marginBottom: 8,
  },
  driverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  driverBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D28D9',
  },
  fallbackSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
    marginBottom: 10,
  },
  systemPrintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    width: '100%',
  },
  systemPrintText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  fallbackHint: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});
