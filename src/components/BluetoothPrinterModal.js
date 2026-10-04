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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import {
  getConnectedPrinter,
  setConnectedPrinter,
  disconnectPrinter,
  getDiscoveredPrinters,
  addCustomPrinter,
  printToBluetoothPrinter,
  testPrintReceipt,
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
  const [scanning, setScanning] = useState(false);
  const [connectingId, setConnectingId] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [paperWidth, setPaperWidth] = useState('58mm');

  // Custom device add
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customAddress, setCustomAddress] = useState('');

  useEffect(() => {
    if (visible) {
      loadPrinterState();
    }
  }, [visible]);

  const loadPrinterState = async () => {
    const connected = await getConnectedPrinter();
    setConnected(connected);
    if (connected && connected.paperWidth) {
      setPaperWidth(connected.paperWidth);
    }
    const list = await getDiscoveredPrinters();
    setPrintersList(list);
  };

  const handleScan = async () => {
    setScanning(true);
    setTimeout(async () => {
      const list = await getDiscoveredPrinters();
      setPrintersList(list);
      setScanning(false);
    }, 1200);
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
      Alert.alert(
        'Printer Connected! 🖨️',
        `Successfully paired with ${printer.name}. You can now print receipts wirelessly over Bluetooth.`
      );
    }, 900);
  };

  const handleDisconnect = async () => {
    Alert.alert(
      'Disconnect Printer',
      'Are you sure you want to disconnect from this Bluetooth printer?',
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

  const handleTestPrint = async () => {
    setPrinting(true);
    const result = await testPrintReceipt(connectedPrinter, businessName);
    setPrinting(false);
    if (result.success) {
      Alert.alert('Test Receipt Sent! 🧾', `Test slip printed successfully on ${result.printerName}.`);
    } else {
      Alert.alert('Print Failed', result.message || 'Could not print to device.');
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
        `Receipt #${orderToPrint.id} sent to ${result.printerName} via Bluetooth.`,
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
      Alert.alert('Error', 'Please enter a device name');
      return;
    }
    const added = await addCustomPrinter(
      customName.trim(),
      customAddress.trim() || '00:11:22:33:44:55',
      paperWidth
    );
    if (added) {
      setPrintersList(prev => [added, ...prev]);
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
                <Ionicons name="bluetooth" size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.title}>Bluetooth Thermal Printer</Text>
                <Text style={styles.subtitle}>
                  {connectedPrinter ? 'Connected & Ready' : 'Pair with POS Thermal Printer'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Status Card: Connected */}
            {connectedPrinter ? (
              <View style={styles.connectedCard}>
                <View style={styles.connectedTop}>
                  <View style={styles.statusDotRow}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.connectedStatusText}>CONNECTED DEVICE</Text>
                  </View>
                  <TouchableOpacity onPress={handleDisconnect} style={styles.disconnectBtn}>
                    <Text style={styles.disconnectBtnText}>Disconnect</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.printerName}>{connectedPrinter.name}</Text>
                <Text style={styles.printerAddress}>MAC: {connectedPrinter.address}</Text>

                {/* Paper Width Selector */}
                <View style={styles.paperSelectorRow}>
                  <Text style={styles.paperLabel}>Paper Size:</Text>
                  <View style={styles.paperToggle}>
                    <TouchableOpacity
                      style={[styles.paperBtn, paperWidth === '58mm' && styles.paperBtnActive]}
                      onPress={() => setPaperWidth('58mm')}
                    >
                      <Text style={[styles.paperBtnText, paperWidth === '58mm' && styles.paperBtnTextActive]}>
                        58mm (Mini)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.paperBtn, paperWidth === '80mm' && styles.paperBtnActive]}
                      onPress={() => setPaperWidth('80mm')}
                    >
                      <Text style={[styles.paperBtnText, paperWidth === '80mm' && styles.paperBtnTextActive]}>
                        80mm (Standard)
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
                  <Ionicons name="receipt-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.testPrintBtnText}>Print Test Slip</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* No Printer Connected Prompt */
              <View style={styles.unconnectedPrompt}>
                <Ionicons name="print-outline" size={38} color={COLORS.primary} />
                <Text style={styles.promptTitle}>Bluetooth Printer Required</Text>
                <Text style={styles.promptDesc}>
                  To print physical paper receipts, please turn on your Bluetooth receipt printer (e.g. POS-58, MPT-II, Sunmi) and tap Connect below.
                </Text>
              </View>
            )}

            {/* Scanning / Available Devices List */}
            <View style={styles.devicesSection}>
              <View style={styles.devicesSectionHeader}>
                <Text style={styles.devicesSectionTitle}>
                  {connectedPrinter ? 'SWITCH OR PAIR ANOTHER PRINTER' : 'AVAILABLE BLUETOOTH PRINTERS'}
                </Text>
                <TouchableOpacity
                  style={styles.scanBtn}
                  onPress={handleScan}
                  disabled={scanning}
                  activeOpacity={0.7}
                >
                  {scanning ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                      <Text style={styles.scanBtnText}>Scan</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {printersList.map(item => {
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
                        <Text style={styles.deviceAddress}>{item.address}</Text>
                        <View style={styles.chip}>
                          <Text style={styles.chipText}>{item.paperWidth || '58mm'}</Text>
                        </View>
                        <View style={[styles.chip, { backgroundColor: '#F0FDF4' }]}>
                          <Text style={[styles.chipText, { color: '#16A34A' }]}>{item.signal || 'Strong'}</Text>
                        </View>
                      </View>
                    </View>

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
                  </View>
                );
              })}

              {/* Add Custom Device Accordion */}
              {!showAddCustom ? (
                <TouchableOpacity
                  style={styles.addCustomToggle}
                  onPress={() => setShowAddCustom(true)}
                >
                  <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.addCustomToggleText}>Add Custom Bluetooth Printer</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.customAddCard}>
                  <Text style={styles.customAddTitle}>Add Bluetooth Printer Manually</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Printer Name (e.g. POS-58 Mobile)"
                    placeholderTextColor={COLORS.textMuted}
                    value={customName}
                    onChangeText={setCustomName}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="MAC Address (e.g. 66:32:B1:84:90:A1)"
                    placeholderTextColor={COLORS.textMuted}
                    value={customAddress}
                    onChangeText={setCustomAddress}
                    autoCapitalize="characters"
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

            {/* Fallback to System / PDF Print */}
            {onFallbackSystemPrint && (
              <View style={styles.fallbackSection}>
                <TouchableOpacity
                  style={styles.fallbackBtn}
                  onPress={() => {
                    onClose();
                    onFallbackSystemPrint();
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-social-outline" size={18} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={styles.fallbackBtnText}>Or Print / Share via Phone System (AirPrint / PDF)</Text>
                </TouchableOpacity>
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
  btIconBadge: {
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
  connectedCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 20,
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
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16A34A',
  },
  connectedStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
    letterSpacing: 0.8,
  },
  disconnectBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FEE2E2',
    borderRadius: RADIUS.sm,
  },
  disconnectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.danger,
  },
  printerName: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  printerAddress: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: 12,
  },
  paperSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
  },
  paperLabel: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  paperToggle: {
    flexDirection: 'row',
    gap: 6,
  },
  paperBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#BBF7D0',
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
  printOrderPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  printOrderPrimaryText: {
    color: '#FFF',
    fontSize: FONTS.md,
    fontWeight: '800',
  },
  testPrintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  testPrintBtnText: {
    color: COLORS.primary,
    fontSize: FONTS.xs,
    fontWeight: '800',
  },
  unconnectedPrompt: {
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight + '50',
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: RADIUS.lg,
    padding: 20,
    marginBottom: 20,
  },
  promptTitle: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 8,
    marginBottom: 4,
  },
  promptDesc: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  devicesSection: {
    marginBottom: 20,
  },
  devicesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  devicesSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
  },
  scanBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 8,
  },
  deviceCardActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  deviceInfo: {
    flex: 1,
    marginRight: 10,
  },
  deviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceName: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  deviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  deviceAddress: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  chip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.borderLight,
  },
  chipText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  connectActionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
  },
  connectActionBtnConnected: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  connectActionText: {
    color: '#FFF',
    fontSize: FONTS.xs,
    fontWeight: '800',
  },
  addCustomToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    marginTop: 4,
  },
  addCustomToggleText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.primary,
  },
  customAddCard: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 8,
  },
  customAddTitle: {
    fontSize: FONTS.xs,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
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
    fontSize: FONTS.xs,
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
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: '#FFF',
  },
  fallbackSection: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginBottom: 20,
  },
  fallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fallbackBtnText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
});
