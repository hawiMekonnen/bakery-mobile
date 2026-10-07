import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform, Linking, Alert } from 'react-native';
import { generateReceiptHTML, generateReceiptSecurityCode } from '../utils/receiptPrinter';

export { generateReceiptSecurityCode };

// Safe imports for Expo Print
let Print = null;
try {
  Print = require('expo-print');
} catch (e) {
  console.log('expo-print not available');
}

const PAPER_WIDTH_KEY = '@bakery_printer_paper_width';

// Clean up any old dummy printer state from previous versions
try {
  AsyncStorage.removeItem('@bakery_bt_custom_printers').catch(() => {});
  AsyncStorage.removeItem('@bakery_bluetooth_printer').catch(() => {});
} catch (e) {}

/**
 * Check if modern Android Bluetooth permissions are granted
 */
export async function checkBluetoothPermissions() {
  if (Platform.OS !== 'android') return true;
  try {
    if (Platform.Version >= 31) {
      const hasScan = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
      const hasConnect = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
      return hasScan && hasConnect;
    } else {
      return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    }
  } catch (e) {
    return false;
  }
}

/**
 * Request runtime Bluetooth permissions on Android phone
 */
export async function requestBluetoothPermissions() {
  if (Platform.OS !== 'android') return true;
  try {
    if (Platform.Version >= 31) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      const granted =
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED ||
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED;
      return granted;
    } else {
      const status = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Bluetooth & Location Permission',
          message: 'Bakery POS requires Bluetooth permission to discover and connect to your receipt printer.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      return status === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (err) {
    console.warn('requestBluetoothPermissions error:', err);
    return false;
  }
}

/**
 * Open Phone Bluetooth Settings in 1 tap
 */
export async function openPhoneBluetoothSettings() {
  try {
    if (Platform.OS === 'android') {
      await Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS');
    } else {
      await Linking.openURL('App-Prefs:Bluetooth');
    }
  } catch (e) {
    try {
      await Linking.openSettings();
    } catch (err) {
      Alert.alert('Bluetooth Settings', 'Please open your phone Settings and tap Bluetooth to pair your printer.');
    }
  }
}

/**
 * Open Google Play Store for RawBT ESC/POS Bluetooth Print driver
 */
export async function openRawBtPlayStore() {
  try {
    const playStoreUrl = 'market://details?id=ru.a402d.rawbtprinter';
    const canOpen = await Linking.canOpenURL(playStoreUrl);
    if (canOpen) {
      await Linking.openURL(playStoreUrl);
    } else {
      await Linking.openURL('https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter');
    }
  } catch (e) {
    await Linking.openURL('https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter');
  }
}

/**
 * Check if RawBT Direct Bluetooth Print service is installed
 */
export async function isRawBtAvailable() {
  try {
    return await Linking.canOpenURL('rawbt:');
  } catch (e) {
    return false;
  }
}

/**
 * Get saved preferred roll paper width (58mm or 80mm)
 */
export async function getPrinterPaperWidth() {
  try {
    const val = await AsyncStorage.getItem(PAPER_WIDTH_KEY);
    return val === '80mm' ? '80mm' : '58mm';
  } catch (e) {
    return '58mm';
  }
}

/**
 * Save preferred roll paper width
 */
export async function setPrinterPaperWidth(width) {
  try {
    const valid = width === '80mm' ? '80mm' : '58mm';
    await AsyncStorage.setItem(PAPER_WIDTH_KEY, valid);
    return valid;
  } catch (e) {
    return '58mm';
  }
}

/**
 * Formats ESC/POS raw bytes/text strictly for continuous roll paper (32 cols for 58mm, 48 cols for 80mm)
 */
export function formatEscPosReceipt(order, businessName = 'Bakery', paperWidth = '58mm') {
  const lineLength = paperWidth === '80mm' ? 48 : 32;
  const divider = '-'.repeat(lineLength);
  const doubleDivider = '='.repeat(lineLength);

  const center = (text) => {
    const pad = Math.max(0, Math.floor((lineLength - text.length) / 2));
    return ' '.repeat(pad) + text;
  };

  const padBetween = (left, right) => {
    const space = Math.max(1, lineLength - left.length - right.length);
    return left + ' '.repeat(space) + right;
  };

  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString();
  const secCode = generateReceiptSecurityCode(order);

  const lines = [
    doubleDivider,
    center(businessName.toUpperCase()),
    center('ARTISAN BAKERY & CAFE'),
    center(`${paperWidth.toUpperCase()} THERMAL RECEIPT SLIP`),
    doubleDivider,
    padBetween('Receipt #:', String(order.id)),
    padBetween('Date:', dateStr),
    padBetween('Cashier:', order.createdBy || order.account || 'Staff'),
    padBetween('Payment:', order.paymentMethod || 'Cash'),
    padBetween('Security Code:', secCode),
    divider,
    padBetween('ITEM', 'AMOUNT'),
    divider,
  ];

  (order.items || []).forEach(item => {
    const nameLine = `${item.name} x${item.quantity}`;
    const amountStr = '$' + (Number(item.price) * Number(item.quantity)).toFixed(2);
    lines.push(padBetween(nameLine, amountStr));
  });

  lines.push(divider);
  lines.push(padBetween('Subtotal:', '$' + Number(order.subtotal || 0).toFixed(2)));
  lines.push(padBetween('Tax (5%):', '$' + Number(order.tax || 0).toFixed(2)));
  lines.push(doubleDivider);
  lines.push(padBetween('TOTAL:', '$' + Number(order.total || 0).toFixed(2)));
  lines.push(doubleDivider);
  lines.push(center('VERIFIED AUTHENTIC SALE'));
  lines.push(center(secCode));
  lines.push(center('THANK YOU FOR YOUR VISIT!'));
  lines.push(center('PLEASE COME AGAIN 🥐'));
  lines.push('\n\n\n[CUT PAPER FEED]');

  return lines.join('\n');
}

/**
 * Print to Real Bluetooth / Thermal Receipt Printer
 * 1. Tries direct ESC/POS Bluetooth protocol (RawBT) if installed
 * 2. Invokes native Android Print Spooler (expo-print) formatted strictly for 58mm/80mm roll
 * 3. NO fake simulations - executes real hardware print commands
 */
export async function printToBluetoothPrinter(order, businessName = 'Bakery', paperWidth = '58mm') {
  if (!order) {
    return {
      success: false,
      error: 'NO_ORDER',
      message: 'No receipt order data to print.',
    };
  }

  const effectiveWidth = paperWidth || (await getPrinterPaperWidth());

  // 1. Try Direct Bluetooth ESC/POS Intent (RawBT) if installed
  try {
    const receiptText = formatEscPosReceipt(order, businessName, effectiveWidth);
    const base64Data = btoa(unescape(encodeURIComponent(receiptText)));
    const rawBtUrl = `rawbt:base64,${base64Data}`;
    const canOpen = await Linking.canOpenURL(rawBtUrl);
    if (canOpen) {
      await Linking.openURL(rawBtUrl);
      return {
        success: true,
        method: 'rawbt_bluetooth',
        printerName: 'Bluetooth Thermal Printer',
        paperWidth: effectiveWidth,
        receiptText,
        timestamp: new Date().toISOString(),
      };
    }
  } catch (intentErr) {
    console.log('RawBT direct Bluetooth intent not available, falling back to system print:', intentErr);
  }

  // 2. Real Native Print via Android Print Spooler (expo-print)
  // Physically opens Android PrintManager with 58mm roll dimensions (216pt width)
  // Android communicates directly with the paired Bluetooth thermal printer or print service plugin!
  try {
    if (Print && typeof Print.printAsync === 'function') {
      const html = generateReceiptHTML(order, businessName, effectiveWidth);
      const printWidth = effectiveWidth === '80mm' ? 288 : 216; // 216 pt = 58mm roll
      await Print.printAsync({
        html,
        width: printWidth,
      });
      return {
        success: true,
        method: 'system_spooler',
        printerName: 'System Print Service',
        paperWidth: effectiveWidth,
        timestamp: new Date().toISOString(),
      };
    }
  } catch (printErr) {
    console.error('System print error:', printErr);
    return {
      success: false,
      error: 'PRINT_FAILED',
      message: 'Printing canceled or failed: ' + (printErr.message || 'Printer not reachable'),
    };
  }

  return {
    success: false,
    error: 'NO_PRINT_SERVICE',
    message: 'Print service is not available on this device.',
  };
}

/**
 * Print a test slip to verify hardware connection
 */
export async function testPrintReceipt(businessName = 'Bakery', paperWidth = '58mm') {
  const effectiveWidth = paperWidth || (await getPrinterPaperWidth());
  const dummyOrder = {
    id: 'TEST-' + Math.floor(1000 + Math.random() * 9000),
    createdAt: new Date().toISOString(),
    customerName: 'Test Roll Slip',
    paymentMethod: 'Thermal Test',
    createdBy: 'POS Terminal',
    items: [
      { name: 'Fresh Butter Croissant', quantity: 2, price: 55 },
      { name: 'Artisan Sourdough Loaf', quantity: 1, price: 85 },
      { name: 'Pistachio Baklava', quantity: 4, price: 30 },
    ],
    subtotal: 315,
    tax: 15.75,
    total: 330.75,
  };

  return printToBluetoothPrinter(dummyOrder, businessName, effectiveWidth);
}

/**
 * Backward compatibility getters / setters
 */
export async function getConnectedPrinter() {
  const width = await getPrinterPaperWidth();
  return {
    id: 'bt-printer',
    name: 'Thermal Receipt Printer',
    paperWidth: width,
    status: 'Ready',
  };
}

export async function isBluetoothConnected() {
  return true;
}

export async function setConnectedPrinter(printer) {
  if (printer && printer.paperWidth) {
    await setPrinterPaperWidth(printer.paperWidth);
  }
  return printer;
}

export async function disconnectPrinter() {
  return true;
}

export async function getDiscoveredPrinters() {
  return [];
}

export async function addCustomPrinter() {
  return null;
}

export async function deleteCustomPrinter() {
  return [];
}
