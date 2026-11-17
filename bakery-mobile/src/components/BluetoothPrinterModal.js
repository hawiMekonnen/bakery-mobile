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
          'Connected',
          `"${printer.name}" is verified and ready to print.`
        );
      } else {
        Alert.alert(
          'Connection Failed',
          result.message || 'Could not connect. Ensure printer is ON, has paper, and is within range.'
        );
      }
    } catch (err) {
      Alert.alert('Connection Error', err.message || 'Failed to connect to printer.');
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
      Alert.alert('Disconnect Error', err.message);
    }
  };

  const handleTestPrint = async () => {
    setIsPrinting(true);
    try {
      const result = await testPrintReceipt(businessName);
      if (result.success) {
        Alert.alert('Test Sent', 'Test receipt sent to printer.');
      } else {
        Alert.alert('Print Error', result.message || 'Could not print test slip.');
      }
    } catch (err) {
      Alert.alert('Print Error', err.message);
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintOrder = async () => {
    if (!orderToPrint) return;
    setIsPrinting(true);
    try {
      const result = await printToBluetoothPrinter(orderToPrint, businessName, paperWidth);
      if (result.success) {
        Alert.alert('Success', `Receipt #${orderToPrint.id} printed.`);
        if (onPrinted) onPrinted();
        onClose();
      } else {
        Alert.alert('Print Failed', result.message || 'Failed to print. Try printing via system spooler.');
      }
    } catch (err) {
      Alert.alert('Print Error', err.message);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSystemPrint = async () => {
    try {
      const result = await printViaSystemSpooler(
        orderToPrint || {
          id: 'TEST-' + Date.now().toString(36).toUpperCase(),
          items: [{ name: 'System Print Test', quantity: 1, price: 0 }],
          total: 0,
          customerName: 'System Spooler',
          createdAt: new Date().toISOString(),
        },
        businessName
      );
      if (result.success && onPrinted) onPrinted();
    } catch (err) {
      Alert.alert('System Print Error', err.message);
    }
  };

  const renderPrinterItem = ({ item }) => {
    const isConnected = connectedPrinter && connectedPrinter.address === item.address;
    const isConnecting = connectingAddress === item.address;

    return (
      <View style={[styles.deviceCard, isConnected && styles.deviceCardConnected]}>
        <View style={styles.deviceIcon}>
          <Ionicons
            name="print-outline"
            size={20}
            color={isConnected ? COLORS.brandGreenText : COLORS.muted}
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
              <Ionicons name="checkmark-circle" size={14} color={COLORS.brandGreenText} style={{ marginRight: 3 }} />
              <Text style={styles.connectedBadgeText}>Active</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.connectActionBtn}
              onPress={() => handleConnect(item)}
              disabled={isConnecting}
              activeOpacity={0.75}
            >
              {isConnecting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
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
          <View style={styles.sheetHandle} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTitleRow}>
              <View style={styles.printerIconBadge}>
                <Ionicons name="print-outline" size={20} color={COLORS.brandGreenText} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.modalTitle}>Thermal Printer</Text>
                <Text style={styles.modalSubtitle}>Bluetooth direct ESC/POS printing</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={COLORS.ink} />
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
                <Text style={styles.paperLabel}>Paper Width:</Text>
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
                  activeOpacity={0.88}
                >
                  {isPrinting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="print-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.printOrderPrimaryText}>Print Receipt #{orderToPrint.id}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.testPrintBtn}
                onPress={handleTestPrint}
                disabled={isPrinting}
                activeOpacity={0.8}
              >
                {isPrinting ? (
                  <ActivityIndicator size="small" color={COLORS.brandDarkGreen} />
                ) : (
                  <>
                    <Ionicons name="document-text-outline" size={16} color={COLORS.brandDarkGreen} style={{ marginRight: 6 }} />
                    <Text style={styles.testPrintBtnText}>Print Test Diagnostic</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Paired Printers List */}
          <View style={styles.devicesSection}>
            <View style={styles.devicesSectionHeader}>
              <Text style={styles.devicesSectionTitle}>AVAILABLE PRINTERS</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setShowAllDevices(!showAllDevices)}
                  style={styles.filterToggleBtn}
                >
                  <Text style={styles.filterToggleText}>
                    {showAllDevices ? 'Printers only' : 'Show all'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={loadPrinterData} disabled={isLoading} style={styles.refreshBtn}>
                  <Ionicons name="refresh" size={13} color={COLORS.brandDarkGreen} style={{ marginRight: 3 }} />
                  <Text style={styles.refreshBtnText}>Scan</Text>
                </TouchableOpacity>
              </View>
            </View>

            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={COLORS.brandGreen} />
                <Text style={styles.loadingText}>Reading Bluetooth devices...</Text>
              </View>
            ) : printers.length === 0 ? (
              <View style={styles.emptyPrintersBox}>
                <Ionicons name="print-outline" size={32} color={COLORS.muted} />
                <Text style={styles.emptyPrintersTitle}>No thermal printer found</Text>
                <Text style={styles.emptyPrintersDesc}>
                  Make sure your thermal printer is turned ON and paired in phone Bluetooth settings, then tap Scan.
                </Text>
              </View>
            ) : (
              <FlatList
                data={printers}
                keyExtractor={(item) => item.address}
                renderItem={renderPrinterItem}
                style={{ maxHeight: 200 }}
              />
            )}
          </View>

          {/* System Print Spooler Fallback */}
          <View style={styles.fallbackSection}>
            <TouchableOpacity style={styles.systemPrintBtn} onPress={handleSystemPrint} activeOpacity={0.8}>
              <Ionicons name="documents-outline" size={16} color={COLORS.ink} style={{ marginRight: 6 }} />
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
    backgroundColor: 'rgba(14, 31, 23, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    padding: 22,
    maxHeight: '88%',
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.hairline,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  printerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.tile,
    backgroundColor: COLORS.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: FONTS.h2,
    fontFamily: FONTS.extraBold,
    color: COLORS.ink,
  },
  modalSubtitle: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.appBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectedCard: {
    backgroundColor: COLORS.softGreen,
    borderRadius: RADIUS.card,
    padding: 16,
    marginBottom: 16,
  },
  connectedTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.brandGreen,
    marginRight: 6,
  },
  connectedStatusText: {
    fontSize: 10,
    fontFamily: FONTS.extraBold,
    color: COLORS.brandGreenText,
    letterSpacing: 0.5,
  },
  disconnectBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  disconnectBtnText: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: COLORS.dangerText,
  },
  printerName: {
    fontSize: FONTS.body,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
    marginTop: 6,
  },
  printerAddress: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
    marginTop: 1,
  },
  paperSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  paperLabel: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
  },
  paperToggle: {
    flexDirection: 'row',
    gap: 6,
  },
  paperBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.chip,
    backgroundColor: COLORS.card,
  },
  paperBtnActive: {
    backgroundColor: COLORS.brandDarkGreen,
  },
  paperBtnText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
  },
  paperBtnTextActive: {
    color: '#FFFFFF',
  },
  printOrderPrimaryBtn: {
    height: 48,
    borderRadius: RADIUS.chip,
    backgroundColor: COLORS.brandDarkGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  printOrderPrimaryText: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  testPrintBtn: {
    height: 42,
    borderRadius: RADIUS.chip,
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  testPrintBtnText: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: COLORS.brandDarkGreen,
  },
  devicesSection: {
    marginTop: 4,
  },
  devicesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  devicesSectionTitle: {
    fontSize: FONTS.overline,
    fontFamily: FONTS.extraBold,
    letterSpacing: 0.8,
    color: COLORS.muted,
  },
  filterToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  filterToggleText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.chip,
    backgroundColor: COLORS.appBg,
  },
  refreshBtnText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.brandDarkGreen,
  },
  loadingBox: {
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
    marginTop: 8,
  },
  emptyPrintersBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyPrintersTitle: {
    fontSize: FONTS.body,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
    marginTop: 8,
  },
  emptyPrintersDesc: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  deviceCardConnected: {
    backgroundColor: COLORS.softGreen,
    borderRadius: RADIUS.chip,
    paddingHorizontal: 8,
  },
  deviceIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.chip,
    backgroundColor: COLORS.appBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
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
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
  },
  printerTag: {
    backgroundColor: COLORS.softGreen,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  printerTagText: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    color: COLORS.brandGreenText,
  },
  deviceAddress: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
  },
  cardActionsRow: {
    marginLeft: 8,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectedBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.brandGreenText,
  },
  connectActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.chip,
    backgroundColor: COLORS.brandDarkGreen,
  },
  connectActionText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  fallbackSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
  },
  systemPrintBtn: {
    height: 44,
    borderRadius: RADIUS.chip,
    backgroundColor: COLORS.appBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemPrintText: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
  },
});
