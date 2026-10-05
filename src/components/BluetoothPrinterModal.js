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
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import {
  getConnectedPrinter,
  setConnectedPrinter,
  disconnectPrinter,
  getDiscoveredPrinters,
  addCustomPrinter,
  deleteCustomPrinter,
  printToBluetoothPrinter,
  testPrintReceipt,
  requestBluetoothPermissions,
  checkBluetoothPermissions,
  openPhoneBluetoothSettings,
} from '../services/bluetoothPrinterService';

export default function BluetoothPrinterModal({
  visible,
  onClose,
  orderToPrint = null,
  businessName = 'Bakery',
  onPrintSuccess = null,
  onFallbackSystemPrint = null,
}) {
  const [connectedPrinter, setConnected] = useState(null);
  const [printersList, setPrintersList] = useState([]);
  const [hasBtPermission, setHasBtPermission] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(false);
  const [connectingId, setConnectingId] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [paperWidth, setPaperWidth] = useState('58mm');

  // Custom device add form
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customAddress, setCustomAddress] = useState('');

  useEffect(() => {
    if (visible) {
      loadPrinterState();
      initBluetoothPermissions();
    }
  }, [visible]);

  const initBluetoothPermissions = async () => {
    setCheckingPermission(true);
    // Automatically trigger system Bluetooth permission dialog on phone
    const granted = await requestBluetoothPermissions();
    setHasBtPermission(granted);
    setCheckingPermission(false);
  };

  const handleRequestPermission = async () => {
    setCheckingPermission(true);
    const granted = await requestBluetoothPermissions();
    setHasBtPermission(granted);
    setCheckingPermission(false);
    if (granted) {
      Alert.alert('Permission Granted! ✓', 'Bluetooth access is enabled. You can now connect to your thermal printer.');
    } else {
      Alert.alert(
        'Permission Denied',
        'Bluetooth permission is required to communicate with thermal printers. Please grant permission in your phone settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openPhoneBluetoothSettings },
        ]
      );
    }
  };

  const loadPrinterState = async () => {
    const connected = await getConnectedPrinter();
    setConnected(connected);
    if (connected && connected.paperWidth) {
      setPaperWidth(connected.paperWidth);
    }
    const list = await getDiscoveredPrinters();
    setPrintersList(list);
  };

  const handleOpenPhoneBluetooth = async () => {
    await openPhoneBluetoothSettings();
  };

  const handleConnect = async (printer) => {
    setConnectingId(printer.id);
    setTimeout(async () => {
      const saved = await setConnectedPrinter({
        ...printer,
        paperWidth,
      });
      setConnected(saved);
      setConnectingId(null);

      // Auto-print receipt if an order was requested to be printed
      if (orderToPrint) {
        setPrinting(true);
        const result = await printToBluetoothPrinter(orderToPrint, businessName);
        setPrinting(false);
        if (result.success) {
          Alert.alert(
            'Connected & Printed! 🧾🖨️',
            `Connected to ${printer.name} and Receipt #${orderToPrint.id} was printed on ${paperWidth} thermal roll paper.`,
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
          return;
        }
      }

      Alert.alert(
        'Printer Connected! 🖨️',
        `Successfully paired with ${printer.name} (${paperWidth} Roll). Receipts will now print on this thermal printer.`
      );
    }, 700);
  };

  const handleDisconnect = async () => {
    Alert.alert(
      'Disconnect Printer',
      'Are you sure you want to disconnect from this thermal printer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await disconnectPrinter();
            setConnected(null);
          },
        },
      ]
    );
  };

  const handleDeleteSavedPrinter = (printer) => {
    Alert.alert(
      'Remove Printer',
      `Remove "${printer.name}" from your saved printer list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updated = await deleteCustomPrinter(printer.id);
            setPrintersList(updated);
            if (connectedPrinter && connectedPrinter.id === printer.id) {
              setConnected(null);
            }
          },
        },
      ]
    );
  };

  const handleTestPrint = async () => {
    setPrinting(true);
    const result = await testPrintReceipt(connectedPrinter, businessName);
    setPrinting(false);
    if (result.success) {
      Alert.alert('Test Receipt Sent! 🧾', `Test 58mm slip sent to ${result.printerName}.`);
    } else {
      Alert.alert('Print Error', result.message || 'Could not print to device.');
    }
  };

  const handlePrintOrder = async () => {
    if (!orderToPrint) return;
    setPrinting(true);
    const result = await printToBluetoothPrinter(orderToPrint, businessName);
    setPrinting(false);
    if (result.success) {
      Alert.alert(
        'Receipt Printed! 🖨️',
        `Receipt #${orderToPrint.id} printed on ${result.paperWidth || '58mm'} thermal roll paper.`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (onPrintSuccess) onPrintSuccess(result);
              onClose();
            },
          },
        ]
      );
    } else {
      Alert.alert('Print Error', result.message || 'Could not print receipt.');
    }
  };

  const handleAddCustom = async () => {
    if (!customName.trim()) {
      Alert.alert('Device Name Required', 'Please enter your thermal printer name (e.g. POS-58, MPT-II, Thermal Printer).');
      return;
    }
    const added = await addCustomPrinter(
      customName.trim(),
      customAddress.trim() || 'Paired Bluetooth',
      paperWidth
    );
    if (added) {
      setPrintersList(prev => [added, ...prev.filter(p => p.id !== added.id)]);
      setCustomName('');
      setCustomAddress('');
      setShowAddCustom(false);
      handleConnect(added);
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
                <Text style={styles.title}>Thermal Receipt Printer</Text>
                <Text style={styles.subtitle}>
                  {connectedPrinter ? `Connected • ${paperWidth} Thermal Roll` : '58mm Thermal Roll Printing'}
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
                      ? 'App can communicate with nearby paired receipt printers.'
                      : 'Tap button to allow Bluetooth access on your phone.'}
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
              onPress={handleOpenPhoneBluetooth}
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

            {/* Active Connected Printer Card */}
            {connectedPrinter ? (
              <View style={styles.connectedCard}>
                <View style={styles.connectedTop}>
                  <View style={styles.statusDotRow}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.connectedStatusText}>CONNECTED PRINTER</Text>
                  </View>
                  <TouchableOpacity onPress={handleDisconnect} style={styles.disconnectBtn}>
                    <Text style={styles.disconnectBtnText}>Disconnect</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.printerName}>{connectedPrinter.name}</Text>
                <Text style={styles.printerAddress}>Status: Paired & Ready for 58mm roll slips</Text>

                {/* Paper Width Selector */}
                <View style={styles.paperSelectorRow}>
                  <Text style={styles.paperLabel}>Paper Size:</Text>
                  <View style={styles.paperToggle}>
                    <TouchableOpacity
                      style={[styles.paperBtn, paperWidth === '58mm' && styles.paperBtnActive]}
                      onPress={() => setPaperWidth('58mm')}
                    >
                      <Text style={[styles.paperBtnText, paperWidth === '58mm' && styles.paperBtnTextActive]}>
                        58mm Roll (Mini POS)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.paperBtn, paperWidth === '80mm' && styles.paperBtnActive]}
                      onPress={() => setPaperWidth('80mm')}
                    >
                      <Text style={[styles.paperBtnText, paperWidth === '80mm' && styles.paperBtnTextActive]}>
                        80mm Roll
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Action: Print target order if provided */}
                {orderToPrint && (
                  <TouchableOpacity
                    style={styles.printOrderPrimaryBtn}
                    onPress={handlePrintOrder}
                    disabled={printing}
                    activeOpacity={0.8}
                  >
                    {printing ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="print" size={20} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.printOrderPrimaryText}>
                          Print 58mm Receipt #{orderToPrint.id}
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
                  <Ionicons name="receipt-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.testPrintBtnText}>Print Test 58mm Slip</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* No Printer Connected Prompt */
              <View style={styles.unconnectedPrompt}>
                <Ionicons name="receipt-outline" size={36} color={COLORS.primary} />
                <Text style={styles.promptTitle}>Connect 58mm Thermal Printer</Text>
                <Text style={styles.promptDesc}>
                  The app prints physical receipts on continuous 58mm roll paper. Please pair your Bluetooth printer above, then add it to print.
                </Text>
              </View>
            )}

            {/* Saved Printers List */}
            <View style={styles.devicesSection}>
              <View style={styles.devicesSectionHeader}>
                <Text style={styles.devicesSectionTitle}>
                  {connectedPrinter ? 'SAVED THERMAL PRINTERS' : 'PAIRED RECEIPT PRINTERS'}
                </Text>
              </View>

              {printersList.length === 0 ? (
                <View style={styles.emptyPrintersBox}>
                  <Text style={styles.emptyPrintersEmoji}>🖨️</Text>
                  <Text style={styles.emptyPrintersTitle}>No Thermal Printers Added Yet</Text>
                  <Text style={styles.emptyPrintersDesc}>
                    Tap "+ Add Paired Thermal Printer" below and enter your printer's name (e.g. POS-58, MPT-II).
                  </Text>
                </View>
              ) : (
                printersList.map(item => {
                  const isThisConnected = connectedPrinter && connectedPrinter.id === item.id;
                  const isConnectingThis = connectingId === item.id;

                  return (
                    <View
                      key={item.id}
                      style={[styles.deviceCard, isThisConnected && styles.deviceCardActive]}
                    >
                      <View style={styles.deviceInfo}>
                        <View style={styles.deviceTitleRow}>
                          <Ionicons
                            name="print"
                            size={18}
                            color={isThisConnected ? COLORS.primary : COLORS.textSecondary}
                            style={{ marginRight: 6 }}
                          />
                          <Text style={styles.deviceName} numberOfLines={1}>
                            {item.name}
                          </Text>
                        </View>
                        <View style={styles.deviceMetaRow}>
                          <View style={styles.chip}>
                            <Text style={styles.chipText}>{item.paperWidth || '58mm'}</Text>
                          </View>
                          <View style={[styles.chip, { backgroundColor: '#F0FDF4' }]}>
                            <Text style={[styles.chipText, { color: '#16A34A' }]}>Thermal Roll</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.cardActionsRow}>
                        <TouchableOpacity
                          style={[
                            styles.connectActionBtn,
                            isThisConnected && styles.connectActionBtnConnected,
                          ]}
                          onPress={() => !isThisConnected && handleConnect(item)}
                          disabled={isThisConnected || isConnectingThis}
                          activeOpacity={0.7}
                        >
                          {isConnectingThis ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : isThisConnected ? (
                            <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                          ) : (
                            <Text style={styles.connectActionText}>Connect</Text>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.deletePrinterBtn}
                          onPress={() => handleDeleteSavedPrinter(item)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={16} color={COLORS.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}

              {/* Add Custom Device Form */}
              {!showAddCustom ? (
                <TouchableOpacity
                  style={styles.addCustomToggle}
                  onPress={() => setShowAddCustom(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.addCustomToggleText}>Add Paired Thermal Printer</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.customAddCard}>
                  <Text style={styles.customAddTitle}>Add Paired Thermal Printer</Text>
                  <Text style={styles.customAddSub}>
                    Enter the name of the printer paired in your Bluetooth settings (e.g. POS-58, MPT-II, Bluetooth Printer).
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Printer Name (e.g. POS-58 Mobile)"
                    placeholderTextColor={COLORS.textMuted}
                    value={customName}
                    onChangeText={setCustomName}
                  />

                  <View style={styles.customAddBtnRow}>
                    <TouchableOpacity
                      style={styles.cancelCustomBtn}
                      onPress={() => setShowAddCustom(false)}
                    >
                      <Text style={styles.cancelCustomText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveCustomBtn}
                      onPress={handleAddCustom}
                    >
                      <Text style={styles.saveCustomText}>Save & Connect</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Direct Fallback to System Thermal Print */}
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
                  <Text style={styles.systemPrintText}>Direct Thermal Print (System Spooler)</Text>
                </TouchableOpacity>
                <Text style={styles.fallbackHint}>
                  Sends 58mm roll format directly to your phone's print service
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '92%',
    paddingBottom: 24,
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
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
  btIconBadge: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSubtle,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  // Permission banner
  permBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 10,
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
    fontSize: 12,
    fontWeight: '700',
  },
  permBannerDesc: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  grantPermBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    marginLeft: 10,
  },
  grantPermBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  // Open phone bluetooth settings card
  openSettingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 12,
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
  // Connected card
  connectedCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 14,
  },
  connectedTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  connectedStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
    letterSpacing: 0.5,
  },
  disconnectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: '#FEE2E2',
  },
  disconnectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  printerName: {
    fontSize: FONTS.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  printerAddress: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: 10,
  },
  paperSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  paperLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  paperToggle: {
    flexDirection: 'row',
    gap: 6,
  },
  paperBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paperBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  paperBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  paperBtnTextActive: {
    color: '#FFF',
  },
  printOrderPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    marginBottom: 8,
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
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  testPrintBtnText: {
    color: COLORS.primary,
    fontSize: FONTS.xs,
    fontWeight: '700',
  },
  unconnectedPrompt: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: RADIUS.lg,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  promptTitle: {
    fontSize: FONTS.sm,
    fontWeight: '800',
    color: '#B45309',
    marginTop: 6,
  },
  promptDesc: {
    fontSize: 11,
    color: '#78350F',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  devicesSection: {
    marginBottom: 16,
  },
  devicesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  devicesSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  emptyPrintersBox: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyPrintersEmoji: {
    fontSize: 26,
    marginBottom: 4,
  },
  emptyPrintersTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptyPrintersDesc: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 14,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  deviceCardActive: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceName: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  deviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  chipText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectActionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    minWidth: 72,
    alignItems: 'center',
  },
  connectActionBtnConnected: {
    backgroundColor: 'transparent',
    minWidth: 'auto',
    paddingHorizontal: 6,
  },
  connectActionText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  deletePrinterBtn: {
    padding: 6,
  },
  addCustomToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    marginTop: 4,
  },
  addCustomToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  customAddCard: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 12,
    marginTop: 6,
  },
  customAddTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  customAddSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 8,
    lineHeight: 14,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: FONTS.xs,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  customAddBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelCustomBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  cancelCustomText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  saveCustomBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  saveCustomText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  fallbackSection: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
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
