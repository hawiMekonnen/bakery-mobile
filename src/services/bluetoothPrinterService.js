import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform, Linking, Alert } from 'react-native';
import { generateReceiptHTML, generateReceiptSecurityCode } from '../utils/receiptPrinter';

export { generateReceiptSecurityCode };

// Safe import for Expo Print
let Print = null;
try {
  Print = require('expo-print');
} catch (e) {
  console.log('expo-print not available');
}

const BLUETOOTH_PRINTER_KEY = '@bakery_bluetooth_printer';
const BLUETOOTH_CUSTOM_PRINTERS_KEY = '@bakery_bt_custom_printers';
const PAPER_WIDTH_KEY = '@bakery_printer_paper_width';

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
    await Linking.openURL(playStoreUrl);
  } catch (e) {
    try {
      await Linking.openURL('https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter');
    } catch (err) {
      Alert.alert('Google Play', 'Please install RawBT Print Service from the Google Play Store.');
    }
  }
}

/**
 * Check if RawBT Direct Bluetooth Print service is installed
 * Note: on Android 11+ canOpenURL may return false without package visibility queries,
 * so we handle actual open attempts with direct try/catch.
 */
export async function isRawBtAvailable() {
  try {
    return await Linking.canOpenURL('rawbt:');
  } catch (e) {
    return false;
  }
}

/**
 * Get the currently connected printer from storage
 */
export async function getConnectedPrinter() {
  try {
    const raw = await AsyncStorage.getItem(BLUETOOTH_PRINTER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export async function isBluetoothConnected() {
  const printer = await getConnectedPrinter();
  return !!printer;
}

export async function setConnectedPrinter(printer) {
  try {
    if (!printer) {
      await AsyncStorage.removeItem(BLUETOOTH_PRINTER_KEY);
      return null;
    }
    const data = {
      ...printer,
      connectedAt: new Date().toISOString(),
      status: 'connected',
    };
    await AsyncStorage.setItem(BLUETOOTH_PRINTER_KEY, JSON.stringify(data));
    if (printer.paperWidth) {
      await AsyncStorage.setItem(PAPER_WIDTH_KEY, printer.paperWidth);
    }
    return data;
  } catch (e) {
    return null;
  }
}

export async function disconnectPrinter() {
  try {
    await AsyncStorage.removeItem(BLUETOOTH_PRINTER_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get all real printers added by the user
 */
export async function getDiscoveredPrinters() {
  try {
    const rawCustom = await AsyncStorage.getItem(BLUETOOTH_CUSTOM_PRINTERS_KEY);
    return rawCustom ? JSON.parse(rawCustom) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Add a new paired Bluetooth printer
 */
export async function addCustomPrinter(name, address = 'Bluetooth Thermal', paperWidth = '58mm') {
  try {
    const raw = await AsyncStorage.getItem(BLUETOOTH_CUSTOM_PRINTERS_KEY);
    const custom = raw ? JSON.parse(raw) : [];
    const newPrinter = {
      id: 'printer-' + Date.now(),
      name: name.trim() || 'POS-58 Mobile',
      address: address.trim() || 'Paired Bluetooth',
      paperWidth: paperWidth || '58mm',
      type: 'ESC/POS',
      signal: 'Paired & Ready',
      createdAt: new Date().toISOString(),
    };
    const updated = [newPrinter, ...custom];
    await AsyncStorage.setItem(BLUETOOTH_CUSTOM_PRINTERS_KEY, JSON.stringify(updated));
    return newPrinter;
  } catch (e) {
    return null;
  }
}

export async function deleteCustomPrinter(id) {
  try {
    const raw = await AsyncStorage.getItem(BLUETOOTH_CUSTOM_PRINTERS_KEY);
    const custom = raw ? JSON.parse(raw) : [];
    const updated = custom.filter(p => p.id !== id);
    await AsyncStorage.setItem(BLUETOOTH_CUSTOM_PRINTERS_KEY, JSON.stringify(updated));

    const connected = await getConnectedPrinter();
    if (connected && connected.id === id) {
      await disconnectPrinter();
    }
    return updated;
  } catch (e) {
    return [];
  }
}

/**
 * Preferred paper width
 */
export async function getPrinterPaperWidth() {
  try {
    const val = await AsyncStorage.getItem(PAPER_WIDTH_KEY);
    return val === '80mm' ? '80mm' : '58mm';
  } catch (e) {
    return '58mm';
  }
}

export async function setPrinterPaperWidth(width) {
  try {
    const valid = width === '80mm' ? '80mm' : '58mm';
    await AsyncStorage.setItem(PAPER_WIDTH_KEY, valid);
    const connected = await getConnectedPrinter();
    if (connected) {
      connected.paperWidth = valid;
      await setConnectedPrinter(connected);
    }
    return valid;
  } catch (e) {
    return '58mm';
  }
}

/**
 * Pure JS Base64 encoder that safely converts Uint8Array binary bytes to Base64
 */
export function bytesToBase64(bytes) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let base64 = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    base64 += chars[b0 >> 2];
    base64 += chars[((b0 & 3) << 4) | (b1 >> 4)];
    base64 += i + 1 < len ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    base64 += i + 2 < len ? chars[b2 & 63] : '=';
  }
  return base64;
}

/**
 * Builds standard ESC/POS hardware byte commands strictly for thermal roll printers
 */
export function buildEscPosBytes(order, businessName = 'Bakery', paperWidth = '58mm') {
  const lineLength = paperWidth === '80mm' ? 48 : 32;
  const divider = '-'.repeat(lineLength);
  const doubleDivider = '='.repeat(lineLength);
  const bytes = [];

  const addBytes = (...b) => {
    for (let i = 0; i < b.length; i++) bytes.push(b[i]);
  };

  const addText = (str) => {
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code < 128) {
        bytes.push(code);
      } else if (code < 2048) {
        bytes.push(192 | (code >> 6));
        bytes.push(128 | (code & 63));
      } else {
        bytes.push(224 | (code >> 12));
        bytes.push(128 | ((code >> 6) & 63));
        bytes.push(128 | (code & 63));
      }
    }
  };

  const addLine = (str = '') => {
    addText(str + '\n');
  };

  const padBetween = (left, right) => {
    const space = Math.max(1, lineLength - left.length - right.length);
    return left + ' '.repeat(space) + right;
  };

  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString();
  const secCode = generateReceiptSecurityCode(order);

  // 1. Initialize printer (ESC @)
  addBytes(0x1B, 0x40);

  // 2. Header (Centered, Bold, Double Size)
  addBytes(0x1B, 0x61, 0x01); // Center
  addBytes(0x1B, 0x45, 0x01); // Bold ON
  addBytes(0x1D, 0x21, 0x11); // Double size
  addLine(businessName.toUpperCase());
  addBytes(0x1D, 0x21, 0x00); // Normal size
  addLine('ARTISAN BAKERY & CAFE');
  addBytes(0x1B, 0x45, 0x00); // Bold OFF
  addLine(doubleDivider);

  // 3. Receipt Details (Left aligned)
  addBytes(0x1B, 0x61, 0x00); // Left
  addLine(padBetween('Receipt #:', String(order.id)));
  addLine(padBetween('Date:', dateStr));
  addLine(padBetween('Cashier:', order.createdBy || order.account || 'Staff'));
  addLine(padBetween('Payment:', order.paymentMethod || 'Cash'));
  addLine(padBetween('Security Code:', secCode));
  addLine(divider);
  addLine(padBetween('ITEM', 'AMOUNT'));
  addLine(divider);

  // 4. Items List
  (order.items || []).forEach(item => {
    const nameLine = `${item.name} x${item.quantity}`;
    const amountStr = '$' + (Number(item.price) * Number(item.quantity)).toFixed(2);
    addLine(padBetween(nameLine, amountStr));
  });

  // 5. Totals
  addLine(divider);
  addLine(padBetween('Subtotal:', '$' + Number(order.subtotal || 0).toFixed(2)));
  addLine(padBetween('Tax (5%):', '$' + Number(order.tax || 0).toFixed(2)));
  addLine(doubleDivider);
  addBytes(0x1B, 0x45, 0x01); // Bold ON
  addLine(padBetween('TOTAL:', '$' + Number(order.total || 0).toFixed(2)));
  addBytes(0x1B, 0x45, 0x00); // Bold OFF
  addLine(doubleDivider);

  // 6. Footer (Centered)
  addBytes(0x1B, 0x61, 0x01); // Center
  addLine('VERIFIED AUTHENTIC SALE');
  addLine(secCode);
  addLine('THANK YOU FOR YOUR VISIT!');
  addLine('PLEASE COME AGAIN');

  // 7. Paper Feed past tear bar & Cut
  addBytes(0x0A, 0x0A, 0x0A, 0x0A);
  addBytes(0x1D, 0x56, 0x42, 0x00); // Partial cut

  return new Uint8Array(bytes);
}

/**
 * Text formatter for preview / logs
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
    center(`${paperWidth.toUpperCase()} RECEIPT SLIP`),
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
 * Send raw ESC/POS bytes directly to the Bluetooth thermal printer via RawBT driver
 */
export async function sendEscPosToPrinter(order, businessName = 'Bakery', paperWidth = '58mm') {
  const escBytes = buildEscPosBytes(order, businessName, paperWidth);
  const base64Data = bytesToBase64(escBytes);

  const rawbtUrl = `rawbt:base64,${base64Data}`;
  const intentUrl = `intent:base64,${base64Data}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;

  // Attempt direct open without relying on canOpenURL (which fails on Android 11+ due to package visibility)
  try {
    await Linking.openURL(rawbtUrl);
    return {
      success: true,
      method: 'rawbt_direct',
      paperWidth,
      timestamp: new Date().toISOString(),
    };
  } catch (err1) {
    try {
      await Linking.openURL(intentUrl);
      return {
        success: true,
        method: 'rawbt_intent',
        paperWidth,
        timestamp: new Date().toISOString(),
      };
    } catch (err2) {
      return {
        success: false,
        error: 'DRIVER_REQUIRED',
        message: 'RawBT ESC/POS driver is required to stream receipts to your Bluetooth thermal printer.',
      };
    }
  }
}

/**
 * Print via Android native Print Spooler (expo-print)
 */
export async function printViaSystemSpooler(order, businessName = 'Bakery', paperWidth = '58mm') {
  if (!order) return { success: false, error: 'NO_ORDER' };
  try {
    if (Print && typeof Print.printAsync === 'function') {
      const html = generateReceiptHTML(order, businessName, paperWidth);
      const printWidth = paperWidth === '80mm' ? 288 : 216; // 216 pt = 58mm roll
      await Print.printAsync({
        html,
        width: printWidth,
      });
      return {
        success: true,
        method: 'system_spooler',
        paperWidth,
        timestamp: new Date().toISOString(),
      };
    }
  } catch (e) {
    return {
      success: false,
      error: 'SPOOLER_ERROR',
      message: e.message || 'Could not open print spooler',
    };
  }
  return { success: false, error: 'NO_PRINT_SERVICE' };
}

/**
 * Main print function for Bluetooth thermal printers.
 * Strictly guarantees that real print data is sent to the physical printer.
 * If driver is missing, returns DRIVER_REQUIRED so UI can guide the user honestly.
 */
export async function printToBluetoothPrinter(order, businessName = 'Bakery', targetPaperWidth = null) {
  if (!order) {
    return {
      success: false,
      error: 'NO_ORDER',
      message: 'No receipt order data to print.',
    };
  }

  const paperWidth = targetPaperWidth || (await getPrinterPaperWidth());

  // 1. Try sending real binary ESC/POS to Bluetooth printer via RawBT driver
  const rawbtResult = await sendEscPosToPrinter(order, businessName, paperWidth);
  if (rawbtResult.success) {
    return {
      ...rawbtResult,
      printerName: 'Bluetooth Thermal Printer',
    };
  }

  // 2. If RawBT driver is not installed, return DRIVER_REQUIRED
  // We NEVER report fake success!
  return {
    success: false,
    error: 'DRIVER_REQUIRED',
    message: 'RawBT ESC/POS driver is required to stream receipts to your Bluetooth printer.',
    paperWidth,
  };
}

/**
 * Print a test slip to verify hardware connection
 */
export async function testPrintReceipt(printer = null, businessName = 'Bakery') {
  const targetPrinter = printer || (await getConnectedPrinter());
  const paperWidth = targetPrinter?.paperWidth || (await getPrinterPaperWidth());

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

  return printToBluetoothPrinter(dummyOrder, businessName, paperWidth);
}
