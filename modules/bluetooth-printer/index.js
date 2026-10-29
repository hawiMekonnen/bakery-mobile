import { requireNativeModule } from 'expo-modules-core';

let NativePrinter = null;
try {
  NativePrinter = requireNativeModule('BluetoothPrinter');
} catch (e) {
  console.log('[BluetoothPrinter] Native module not loaded:', e.message);
}

export const isNativeAvailable = () => Boolean(NativePrinter);

export async function isBluetoothEnabled() {
  if (NativePrinter?.isBluetoothEnabled) {
    try {
      return await NativePrinter.isBluetoothEnabled();
    } catch (e) {
      console.warn('isBluetoothEnabled error:', e);
    }
  }
  return false;
}

export async function isConnected() {
  if (NativePrinter?.isConnected) {
    try {
      return await NativePrinter.isConnected();
    } catch (e) {
      return false;
    }
  }
  return false;
}

export async function getPairedDevices() {
  if (NativePrinter?.getPairedDevices) {
    try {
      return await NativePrinter.getPairedDevices();
    } catch (e) {
      console.warn('getPairedDevices error:', e);
    }
  }
  return [];
}

export async function connect(address) {
  if (NativePrinter?.connect) {
    try {
      return await NativePrinter.connect(address);
    } catch (e) {
      console.warn('connect error:', e);
    }
  }
  return false;
}

export async function printRawData(base64Data) {
  if (NativePrinter?.printRawData) {
    try {
      return await NativePrinter.printRawData(base64Data);
    } catch (e) {
      console.warn('printRawData error:', e);
    }
  }
  return false;
}

export async function printToDevice(address, base64Data) {
  if (NativePrinter?.printToDevice) {
    return await NativePrinter.printToDevice(address, base64Data);
  }
  throw new Error('Native Bluetooth printer module not available in this environment');
}

export async function disconnect() {
  if (NativePrinter?.disconnect) {
    try {
      return await NativePrinter.disconnect();
    } catch (e) {
      console.warn('disconnect error:', e);
    }
  }
  return true;
}

export default {
  isNativeAvailable,
  isBluetoothEnabled,
  isConnected,
  getPairedDevices,
  connect,
  printRawData,
  printToDevice,
  disconnect,
};
