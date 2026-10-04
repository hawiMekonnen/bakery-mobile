import AsyncStorage from '@react-native-async-storage/async-storage';

const BLUETOOTH_PRINTER_KEY = '@bakery_bluetooth_printer';
const BLUETOOTH_CUSTOM_PRINTERS_KEY = '@bakery_bt_custom_printers';

export const PRESET_BLUETOOTH_PRINTERS = [
  {
    id: 'bt-pos-58',
    name: 'POS-58 Bluetooth Thermal (58mm)',
    address: '66:32:B1:84:90:A1',
    paperWidth: '58mm',
    type: 'ESC/POS',
    signal: 'Strong',
    paired: true,
  },
  {
    id: 'bt-mpt-2',
    name: 'MPT-II Mini Portable Thermal',
    address: '8C:DE:52:12:34:56',
    paperWidth: '58mm',
    type: 'ESC/POS',
    signal: 'Good',
    paired: true,
  },
  {
    id: 'bt-zj-80',
    name: 'ZJiang-80 Thermal POS (80mm)',
    address: '40:4E:36:78:9A:BC',
    paperWidth: '80mm',
    type: 'ESC/POS',
    signal: 'Excellent',
    paired: false,
  },
  {
    id: 'bt-sunmi',
    name: 'Sunmi BT Inner Printer (58mm)',
    address: 'B4:10:7B:65:43:21',
    paperWidth: '58mm',
    type: 'ESC/POS',
    signal: 'Strong',
    paired: false,
  },
];

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

export async function getDiscoveredPrinters() {
  try {
    const rawCustom = await AsyncStorage.getItem(BLUETOOTH_CUSTOM_PRINTERS_KEY);
    const custom = rawCustom ? JSON.parse(rawCustom) : [];
    return [...PRESET_BLUETOOTH_PRINTERS, ...custom];
  } catch (e) {
    return PRESET_BLUETOOTH_PRINTERS;
  }
}

export async function addCustomPrinter(name, address = '00:11:22:33:44:55', paperWidth = '58mm') {
  try {
    const raw = await AsyncStorage.getItem(BLUETOOTH_CUSTOM_PRINTERS_KEY);
    const custom = raw ? JSON.parse(raw) : [];
    const newPrinter = {
      id: 'custom-' + Date.now(),
      name: name.trim(),
      address: address.trim(),
      paperWidth,
      type: 'ESC/POS',
      signal: 'Strong',
      paired: true,
    };
    const updated = [newPrinter, ...custom];
    await AsyncStorage.setItem(BLUETOOTH_CUSTOM_PRINTERS_KEY, JSON.stringify(updated));
    return newPrinter;
  } catch (e) {
    return null;
  }
}

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

  const lines = [
    doubleDivider,
    center(businessName.toUpperCase()),
    center('ARTISAN BAKERY & CAFE'),
    center('BLUETOOTH POS RECEIPT'),
    doubleDivider,
    padBetween('Receipt #:', String(order.id)),
    padBetween('Date:', dateStr),
    padBetween('Cashier:', order.createdBy || order.account || 'Staff'),
    padBetween('Payment:', order.paymentMethod || 'Cash'),
    divider,
    padBetween('ITEM', 'TOTAL'),
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
  lines.push(center('THANK YOU FOR YOUR VISIT!'));
  lines.push(center('PLEASE COME AGAIN'));
  lines.push('\n\n\n[CUT PAPER FEED]');

  return lines.join('\n');
}

export async function printToBluetoothPrinter(order, businessName = 'Bakery') {
  const printer = await getConnectedPrinter();
  if (!printer) {
    return {
      success: false,
      error: 'NO_PRINTER_CONNECTED',
      message: 'No Bluetooth printer connected.',
    };
  }

  // Generate formatted ESC/POS slip
  const receiptText = formatEscPosReceipt(order, businessName, printer.paperWidth || '58mm');

  // Simulate Bluetooth RFCOMM/SPP packet transmission delay
  await new Promise(resolve => setTimeout(resolve, 800));

  return {
    success: true,
    printerName: printer.name,
    paperWidth: printer.paperWidth || '58mm',
    receiptText,
    timestamp: new Date().toISOString(),
  };
}

export async function testPrintReceipt(printer = null, businessName = 'Bakery') {
  const targetPrinter = printer || (await getConnectedPrinter());
  if (!targetPrinter) {
    return {
      success: false,
      error: 'NO_PRINTER_CONNECTED',
      message: 'No Bluetooth printer selected.',
    };
  }

  const dummyOrder = {
    id: 'TEST-' + Math.floor(1000 + Math.random() * 9000),
    createdAt: new Date().toISOString(),
    customerName: 'Test Print Slip',
    paymentMethod: 'Test Mode',
    items: [
      { name: 'Artisan Sourdough', quantity: 1, price: 85 },
      { name: 'Honey Fetira', quantity: 2, price: 75 },
    ],
    subtotal: 235,
    tax: 11.75,
    total: 246.75,
  };

  return printToBluetoothPrinter(dummyOrder, businessName);
}
