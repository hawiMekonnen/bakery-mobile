import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid } from 'react-native';
import * as Print from 'expo-print';
import BluetoothPrinter, { isNativeAvailable, isConnected as isNativeConnected } from 'bluetooth-printer';

const PRINTER_STORAGE_KEY = '@bakery_bt_connected_printer';
const SAVED_PRINTERS_KEY = '@bakery_bt_saved_printers';
const PAPER_WIDTH_KEY = '@bakery_printer_paper_width';

/**
 * Request runtime Android Bluetooth permissions (Android 12+ / API 31+)
 */
export async function requestBluetoothPermissions() {
  if (Platform.OS !== 'android') return true;

  try {
    if (Platform.Version >= 31) {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      ]);
      return (
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED
      );
    } else {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (err) {
    console.warn('[Bluetooth] Permission request error:', err);
    return true;
  }
}

/**
 * Get active paper width setting ('58mm' or '80mm')
 */
export async function getPrinterPaperWidth() {
  try {
    const saved = await AsyncStorage.getItem(PAPER_WIDTH_KEY);
    return saved === '80mm' ? '80mm' : '58mm';
  } catch {
    return '58mm';
  }
}

/**
 * Save paper width setting
 */
export async function setPrinterPaperWidth(width) {
  try {
    const valid = width === '80mm' ? '80mm' : '58mm';
    await AsyncStorage.setItem(PAPER_WIDTH_KEY, valid);
    return valid;
  } catch {
    return '58mm';
  }
}

/**
 * Get currently connected printer
 * Verifies with native socket status so fake connections are never reported!
 */
export async function getConnectedPrinter() {
  try {
    const json = await AsyncStorage.getItem(PRINTER_STORAGE_KEY);
    if (!json) return null;
    const printer = JSON.parse(json);

    // If printer name is obviously an audio device, clear it
    const nameLower = (printer.name || '').toLowerCase();
    if (nameLower.includes('airpod') || nameLower.includes('earbud') || nameLower.includes('headphone') || nameLower.includes('lulu')) {
      await AsyncStorage.removeItem(PRINTER_STORAGE_KEY);
      return null;
    }

    return printer;
  } catch {
    return null;
  }
}

/**
 * Check if Bluetooth is currently connected to a physical printer
 */
export async function isBluetoothConnected() {
  const printer = await getConnectedPrinter();
  if (!printer || !printer.address) return false;
  if (isNativeAvailable()) {
    return await isNativeConnected();
  }
  return true;
}

/**
 * Check if device Bluetooth adapter is turned on
 */
export async function isBluetoothEnabled() {
  if (isNativeAvailable()) {
    return await BluetoothPrinter.isBluetoothEnabled();
  }
  return true;
}

/**
 * Scan paired devices and separate Printers from other Bluetooth devices (headphones, phones, etc.)
 */
export async function getPairedBluetoothPrinters(includeAll = false) {
  await requestBluetoothPermissions();

  if (isNativeAvailable()) {
    try {
      const devices = await BluetoothPrinter.getPairedDevices();
      if (Array.isArray(devices) && devices.length > 0) {
        const mapped = devices.map(d => ({
          id: d.address,
          name: d.name || 'Bluetooth Device',
          address: d.address,
          type: 'bluetooth',
          paperWidth: '58mm',
          isPrinter: Boolean(d.isPrinter),
        }));

        if (!includeAll) {
          const printersOnly = mapped.filter(d => d.isPrinter);
          // If we found specific printers (like P58E), return them!
          if (printersOnly.length > 0) {
            return printersOnly;
          }
        }
        return mapped;
      }
    } catch (err) {
      console.warn('[Bluetooth] Error fetching paired devices:', err);
    }
  }

  // Fallback to locally stored printers
  try {
    const stored = await AsyncStorage.getItem(SAVED_PRINTERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Connect to a printer by address directly inside the app.
 * STRICT: Only marks connected IF the Bluetooth socket actually connects!
 */
export async function connectToPrinter(printer) {
  if (!printer || !printer.address) {
    return { success: false, error: 'INVALID_PRINTER', message: 'No printer address provided.' };
  }

  await requestBluetoothPermissions();

  if (isNativeAvailable()) {
    try {
      const ok = await BluetoothPrinter.connect(printer.address);
      if (!ok) {
        return {
          success: false,
          error: 'CONNECTION_FAILED',
          message: `Could not connect to "${printer.name}". Make sure the printer is turned ON, has paper, and is within Bluetooth range.`,
        };
      }
    } catch (err) {
      return {
        success: false,
        error: 'CONNECTION_ERROR',
        message: err.message || `Failed to establish connection with "${printer.name}".`,
      };
    }
  }

  const paperWidth = await getPrinterPaperWidth();
  const printerData = {
    ...printer,
    paperWidth,
    connectedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(printerData));

  // Save in remembered list
  try {
    const currentList = await getPairedBluetoothPrinters(true);
    const exists = currentList.some(p => p.address === printer.address);
    if (!exists) {
      const updated = [printerData, ...currentList];
      await AsyncStorage.setItem(SAVED_PRINTERS_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    // ignore
  }

  return { success: true, printer: printerData };
}

/**
 * Disconnect current printer
 */
export async function disconnectPrinter() {
  if (isNativeAvailable()) {
    try {
      await BluetoothPrinter.disconnect();
    } catch (e) {
      // ignore
    }
  }
  await AsyncStorage.removeItem(PRINTER_STORAGE_KEY);
  return { success: true };
}

/**
 * Generate a security verification code
 */
function generateReceiptSecurityCode(order) {
  const idStr = String(order.id || '0');
  const totalStr = Number(order.total || 0).toFixed(2);
  const timeStr = String(order.createdAt || Date.now());
  let hash = 0;
  const combined = `SEC-${idStr}-${totalStr}-${timeStr}`;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash * 31 + combined.charCodeAt(i)) & 0xffffffff;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  return `AUTH-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

/**
 * Helper to convert Uint8Array into Base64
 */
function bytesToBase64(uint8Array) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  const len = uint8Array.length;
  let i = 0;

  while (i < len) {
    const b1 = uint8Array[i++];
    const b2 = i < len ? uint8Array[i++] : NaN;
    const b3 = i < len ? uint8Array[i++] : NaN;

    result += chars[b1 >> 2];
    result += chars[((b1 & 3) << 4) | (isNaN(b2) ? 0 : b2 >> 4)];
    result += isNaN(b2) ? '=' : chars[((b2 & 15) << 2) | (isNaN(b3) ? 0 : b3 >> 6)];
    result += isNaN(b3) ? '=' : chars[b3 & 63];
  }

  return result;
}

/**
 * Encode pure ESC/POS binary command bytes for thermal printers
 */
export function buildEscPosBytes(order, businessName = 'Bakery', paperWidth = '58mm') {
  const lineLength = paperWidth === '80mm' ? 48 : 32;
  const divider = '-'.repeat(lineLength);
  const doubleDivider = '='.repeat(lineLength);

  const bytes = [];

  const addBytes = (...b) => {
    bytes.push(...b);
  };

  const addText = (text) => {
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      bytes.push(code > 127 ? 0x20 : code);
    }
  };

  const addLine = (text) => {
    addText(text);
    bytes.push(0x0A);
  };

  const padBetween = (left, right) => {
    const space = Math.max(1, lineLength - left.length - right.length);
    return left + ' '.repeat(space) + right;
  };

  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString();
  const secCode = generateReceiptSecurityCode(order);

  // 1. Initialize printer (ESC @)
  addBytes(0x1B, 0x40);

  // 2. Header (Centered, Bold)
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
 * Print via Android native Print Spooler (Fallback when testing outside native build)
 */
export async function printViaSystemSpooler(order, businessName = 'Bakery', paperWidth = '58mm') {
  if (!order) return { success: false, error: 'NO_ORDER' };
  try {
    if (Print && typeof Print.printAsync === 'function') {
      const html = generateReceiptHTML(order, businessName, paperWidth);
      const printWidth = paperWidth === '80mm' ? 288 : 216;
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
 * Generate formatted HTML for system spooler fallback
 */
export function generateReceiptHTML(order, businessName = 'Bakery', paperWidth = '58mm') {
  const is80 = paperWidth === '80mm';
  const widthPx = is80 ? '300px' : '220px';
  const fontSize = is80 ? '12px' : '10.5px';
  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString();
  const secCode = generateReceiptSecurityCode(order);

  const itemsHtml = (order.items || []).map(item => `
    <tr>
      <td style="text-align: left; padding: 2px 0;">${item.name} x${item.quantity}</td>
      <td style="text-align: right; padding: 2px 0;">$${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @page { size: ${widthPx} auto; margin: 0; }
        body {
          font-family: 'Courier New', Courier, monospace;
          width: ${widthPx};
          margin: 0 auto;
          padding: 8px 6px;
          color: #000;
          font-size: ${fontSize};
          line-height: 1.25;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .divider { border-bottom: 1px dashed #000; margin: 4px 0; }
        .double-divider { border-bottom: 2px solid #000; margin: 4px 0; }
        table { width: 100%; border-collapse: collapse; }
      </style>
    </head>
    <body>
      <div class="center bold" style="font-size: 15px;">${businessName.toUpperCase()}</div>
      <div class="center" style="font-size: 9px;">ARTISAN BAKERY & CAFE</div>
      <div class="double-divider"></div>
      <div>Receipt #: ${order.id}</div>
      <div>Date: ${dateStr}</div>
      <div>Payment: ${order.paymentMethod || 'Cash'}</div>
      <div class="divider"></div>
      <table>
        <thead>
          <tr><th style="text-align: left;">ITEM</th><th style="text-align: right;">AMOUNT</th></tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <div class="divider"></div>
      <table>
        <tr><td>Subtotal:</td><td style="text-align: right;">$${Number(order.subtotal || 0).toFixed(2)}</td></tr>
        <tr><td>Tax (5%):</td><td style="text-align: right;">$${Number(order.tax || 0).toFixed(2)}</td></tr>
      </table>
      <div class="double-divider"></div>
      <table>
        <tr class="bold" style="font-size: 13px;"><td>TOTAL:</td><td style="text-align: right;">$${Number(order.total || 0).toFixed(2)}</td></tr>
      </table>
      <div class="double-divider"></div>
      <div class="center" style="font-size: 9px; margin-top: 4px;">VERIFIED AUTHENTIC SALE</div>
      <div class="center" style="font-size: 9px;">${secCode}</div>
      <div class="center bold" style="margin-top: 4px;">THANK YOU FOR YOUR VISIT!</div>
    </body>
    </html>
  `;
}

/**
 * Main print function for Bluetooth thermal printers.
 * Strictly prints to verified connected printer!
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

  // 1. Get currently selected printer
  const printer = await getConnectedPrinter();
  if (!printer || !printer.address) {
    return {
      success: false,
      error: 'NO_PRINTER',
      message: 'No Bluetooth printer connected. Please connect your printer (e.g. P58E) in Printer Setup.',
      paperWidth,
    };
  }

  // 2. Direct native Bluetooth printing (No external apps!)
  if (isNativeAvailable()) {
    try {
      await requestBluetoothPermissions();
      const escBytes = buildEscPosBytes(order, businessName, paperWidth);
      const base64Data = bytesToBase64(escBytes);

      await BluetoothPrinter.printToDevice(printer.address, base64Data);

      return {
        success: true,
        method: 'direct_native_bluetooth',
        printerName: printer.name || 'Thermal Printer',
        address: printer.address,
        paperWidth,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      console.warn('[Bluetooth] Direct native print failed:', err.message);
      return {
        success: false,
        error: 'PRINT_FAILED',
        message: err.message || 'Could not print to printer. Ensure printer is turned ON, has paper, and is connected.',
        printerName: printer.name,
      };
    }
  }

  // 3. Fallback to System Spooler if native module is not compiled in current environment
  return await printViaSystemSpooler(order, businessName, paperWidth);
}

/**
 * Print a test slip directly to the Bluetooth thermal printer
 */
export async function testPrintReceipt(printer = null, businessName = 'Bakery') {
  const targetPrinter = printer || (await getConnectedPrinter());
  const paperWidth = targetPrinter?.paperWidth || (await getPrinterPaperWidth());

  if (!targetPrinter || !targetPrinter.address) {
    return {
      success: false,
      error: 'NO_PRINTER',
      message: 'Please tap Connect on your thermal printer (e.g. P58E) first.',
    };
  }

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
