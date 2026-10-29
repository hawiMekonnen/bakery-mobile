import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import {
  getConnectedPrinter,
  getPairedBluetoothPrinters,
  connectToPrinter,
  disconnectPrinter,
  getPrinterPaperWidth,
  setPrinterPaperWidth,
  testPrintReceipt,
  printToBluetoothPrinter,
  printViaSystemSpooler,
  isBluetoothConnected,
} from '../services/bluetoothPrinterService';
import { isNativeAvailable } from 'bluetooth-printer';

export default function BluetoothPrinterModal({
  visible,
  onClose,
  businessName = 'Bakery',
  orderToPrint = null,
  onPrinted = null,
}) {
  const [printers, setPrinters] = useState([]);
  const [connectedPrinter, setConnectedPrinterState] = useState(null);
  const [paperWidth, setPaperWidthState] = useState('58mm');
  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [connectingAddress, setConnectingAddress] = useState(null);
  const [showAllDevices, setShowAllDevices] = useState(false);

  useEffect(() => {
    if (visible) {
      loadPrinterData();
    }
  }, [visible, showAllDevices]);

  const loadPrinterData = async () => {
    setIsLoading(true);
    try {
      const [connected, width, paired] = await Promise.all([
        getConnectedPrinter(),
        getPrinterPaperWidth(),
        getPairedBluetoothPrinters(showAllDevices),
      ]);

      // If connected printer is an audio device or not a true printer, disconnect it
      if (connected) {
        const nameLower = (connected.name || '').toLowerCase();
        if (nameLower.includes('airpod') || nameLower.includes('earbud') || nameLower.includes('lulu')) {
          await disconnectPrinter();
          setConnectedPrinterState(null);
        } else {
          setConnectedPrinterState(connected);
        }
      } else {
        setConnectedPrinterState(null);
      }

      setPaperWidthState(width);
      setPrinters(paired);
    } catch (err) {
      console.warn('Error loading printer data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPaperWidth = async (width) => {
    await setPrinterPaperWidth(width);
    setPaperWidthState(width);
    if (connectedPrinter) {
      setConnectedPrinterState({ ...connectedPrinter, paperWidth: width });
    }
  };

  const handleConnect = async (printer) => {
    setConnectingAddress(printer.address);
    try {
      const result = await connectToPrinter(printer);
      if (result.success) {
        setConnectedPrinterState(result.printer);
        Alert.alert(
          'Connected! 🖨️',
          `"${printer.name}" is verified and ready to print.`
        );
      } else {
        Alert.alert(
          'Connection Failed ⚠️',
          result.message || 'Could not connect. Ensure printer is turned ON, has paper, and is within range.'
        );
      }
    } catch (err) {
      Alert.alert(
        'Connection Error',
        err.message || 'Failed to connect to printer.'
      );
    } finally {
      setConnectingAddress(null);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectPrinter();
      setConnectedPrinterState(null);
      Alert.alert('Disconnected', 'Printer disconnected.');
    } catch (err) {
      Alert.alert('Error', 'Failed to disconnect.');
    }
  };

  const handleTestPrint = async () => {
    if (!connectedPrinter) {
      Alert.alert('No Printer Connected', 'Please tap Connect on your thermal printer (e.g. P58E) first.');
      return;
    }
    setIsPrinting(true);
    try {
      const result = await testPrintReceipt(connectedPrinter, businessName);
      if (result.success) {
        Alert.alert(
          'Test Printed! 🖨️',
          `Slip printed successfully on ${result.printerName || 'Bluetooth thermal printer'}.`
        );
      } else {
        Alert.alert('Print Error', result.message || 'Could not print test slip.');
      }
    } catch (err) {
      Alert.alert('Print Error', err.message || 'Failed to print test slip.');
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintOrder = async () => {
    if (!orderToPrint) return;
    if (!connectedPrinter) {
      Alert.alert('No Printer Connected', 'Please tap Connect on your thermal printer (e.g. P58E) first.');
      return;
    }
    setIsPrinting(true);
    try {
      const result = await printToBluetoothPrinter(orderToPrint, businessName, paperWidth);
      if (result.success) {
        Alert.alert(
          'Receipt Printed! 🖨️',
          `Receipt #${orderToPrint.id} printed directly to ${result.printerName || 'printer'}.`
        );
        if (onPrinted) onPrinted(result);
        onClose();
      } else {
        Alert.alert('Print Error', result.message || 'Could not complete print job.');
      }
    } catch (err) {
      Alert.alert('Print Error', err.message || 'Failed to print receipt.');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSystemPrint = async () => {
    if (!orderToPrint) {
      await handleTestPrint();
      return;
    }
    setIsPrinting(true);
    try {
      await printViaSystemSpooler(orderToPrint, businessName, paperWidth);
      if (onPrinted) onPrinted({ success: true, method: 'system_spooler' });
    } catch (e) {
      Alert.alert('Print Error', 'Could not open system print.');
    } finally {
      setIsPrinting(false);
    }
  };

  const renderPrinterItem = ({ item }) => {
    const isConnected = connectedPrinter && connectedPrinter.address === item.address;
    const isConnecting = connectingAddress === item.address;

    return (
      <View style={[styles.deviceCard, isConnected && styles.deviceCardActive]}>
        <View style={[styles.deviceIconBg, item.isPrinter && styles.deviceIconBgPrinter]}>
          <Ionicons
            name={item.isPrinter ? 'print' : 'bluetooth'}
            size={20}
            color={isConnected ? '#16A34A' : item.isPrinter ? COLORS.primary : COLORS.textMuted}
          />
        </View>

        <View style={styles.deviceInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.deviceName}>{item.name || 'Bluetooth Printer'}</Text>
            {item.isPrinter && (
              <View style={styles.printerTag}>
                <Text style={styles.printerTagText}>PRINTER</Text>
              </View>
            )}
          </View>
          <Text style={styles.deviceAddress}>{item.address}</Text>
        </View>

        <View style={styles.cardActionsRow}>
          {isConnected ? (
            <View style={styles.connectedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
              <Text style={styles.connectedBadgeText}>Active</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.connectActionBtn, !item.isPrinter && styles.connectActionBtnMuted]}
              onPress={() => handleConnect(item)}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.connectActionText}>Connect</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTitleRow}>
              <View style={styles.printerIconBadge}>
                <Ionicons name="print" size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Printer Setup</Text>
                <Text style={styles.modalSubtitle}>Direct Bluetooth thermal printing</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Connected Printer Card */}
          {connectedPrinter ? (
            <View style={styles.connectedCard}>
              <View style={styles.connectedTop}>
                <View style={styles.statusDotRow}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.connectedStatusText}>READY TO PRINT</Text>
                </View>
                <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
                  <Text style={styles.disconnectBtnText}>Disconnect</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.printerName}>{connectedPrinter.name || 'Bluetooth Printer'}</Text>
              <Text style={styles.printerAddress}>{connectedPrinter.address}</Text>

              {/* Paper Roll Width Selector */}
              <View style={styles.paperSelectorRow}>
                <Text style={styles.paperLabel}>Paper Size:</Text>
                <View style={styles.paperToggle}>
                  <TouchableOpacity
                    style={[styles.paperBtn, paperWidth === '58mm' && styles.paperBtnActive]}
                    onPress={() => handleSelectPaperWidth('58mm')}
                  >
                    <Text style={[styles.paperBtnText, paperWidth === '58mm' && styles.paperBtnTextActive]}>
                      58mm Roll
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.paperBtn, paperWidth === '80mm' && styles.paperBtnActive]}
                    onPress={() => handleSelectPaperWidth('80mm')}
                  >
                    <Text style={[styles.paperBtnText, paperWidth === '80mm' && styles.paperBtnTextActive]}>
                      80mm Roll
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Action Buttons */}
              {orderToPrint && (
                <TouchableOpacity
                  style={styles.printOrderPrimaryBtn}
                  onPress={handlePrintOrder}
                  disabled={isPrinting}
                >
                  {isPrinting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="print-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={styles.printOrderPrimaryText}>Print Receipt #{orderToPrint.id}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.testPrintBtn}
                onPress={handleTestPrint}
                disabled={isPrinting}
              >
                {isPrinting ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <>
                    <Ionicons name="document-text-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.testPrintBtnText}>Print Test Slip</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Paired Printers List */}
          <View style={styles.devicesSection}>
            <View style={styles.devicesSectionHeader}>
              <Text style={styles.devicesSectionTitle}>AVAILABLE PRINTERS</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setShowAllDevices(!showAllDevices)}
                  style={styles.filterToggleBtn}
                >
                  <Text style={styles.filterToggleText}>
                    {showAllDevices ? 'Printers only' : 'Show all'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={loadPrinterData} disabled={isLoading} style={styles.refreshBtn}>
                  <Ionicons name="refresh" size={14} color={COLORS.primary} />
                  <Text style={styles.refreshBtnText}>Scan</Text>
                </TouchableOpacity>
              </View>
            </View>

            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>Reading Bluetooth printers...</Text>
              </View>
            ) : printers.length === 0 ? (
              <View style={styles.emptyPrintersBox}>
                <Ionicons name="print-outline" size={32} color={COLORS.textMuted} />
                <Text style={styles.emptyPrintersTitle}>No Thermal Printer Found</Text>
                <Text style={styles.emptyPrintersDesc}>
                  Make sure your thermal printer (e.g. P58E) is turned ON and paired in phone Bluetooth settings, then tap Scan.
                </Text>
              </View>
            ) : (
              <FlatList
                data={printers}
                keyExtractor={(item) => item.address}
                renderItem={renderPrinterItem}
                style={{ maxHeight: 220 }}
              />
            )}
          </View>

          {/* System Print Spooler Fallback */}
          <View style={styles.fallbackSection}>
            <TouchableOpacity style={styles.systemPrintBtn} onPress={handleSystemPrint}>
              <Ionicons name="documents-outline" size={16} color={COLORS.textPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.systemPrintText}>Open System Print Dialog</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 20,
    maxHeight: '90%',
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  printerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: FONTS.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
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
    paddingVertical: 12,
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
    paddingVertical: 9,
    borderRadius: RADIUS.md,
  },
  testPrintBtnText: {
    color: COLORS.primary,
    fontSize: FONTS.xs,
    fontWeight: '700',
  },
  devicesSection: {
    marginBottom: 14,
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
  filterToggleBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.surfaceSubtle,
  },
  filterToggleText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  refreshBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  loadingText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  emptyPrintersBox: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyPrintersTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 6,
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
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 10,
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  deviceCardActive: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  deviceIconBg: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  deviceIconBgPrinter: {
    backgroundColor: '#FEF3C7',
  },
  deviceInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deviceName: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  printerTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  printerTagText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#15803D',
  },
  deviceAddress: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectActionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  connectActionBtnMuted: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  connectActionText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  connectedBadgeText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '800',
  },
  fallbackSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  systemPrintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
  },
  systemPrintText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
