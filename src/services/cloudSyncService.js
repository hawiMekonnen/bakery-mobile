import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage Keys
export const STORAGE_KEYS = {
  DEVICE_ID: '@bakery_hardware_device_id',
  SERVER_URL: '@bakery_cloud_server_url',
  LICENSE_KEY: '@bakery_license_key',
  DEVICE_TOKEN: '@bakery_device_token',
  DEVICE_STATUS: '@bakery_device_status',
  LOCKOUT_MESSAGE: '@bakery_lockout_message',
  LAST_SYNC: '@bakery_last_cloud_sync',
  AUTO_SYNC_ENABLED: '@bakery_auto_sync_enabled',
};

// Default Configuration (Can be changed in app settings)
export const DEFAULT_SERVER_URL = 'http://192.168.0.116:5000';
export const DEFAULT_LICENSE_KEY = 'SKY-BAKERY-001';
export const APP_VERSION = '1.0.7';

// ─── 1. UNIQUE HARDWARE DEVICE ID & SPEC ─────────────────────────
export async function getHardwareDeviceId() {
  try {
    let devId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!devId || !devId.trim()) {
      const brand = (Platform.constants?.Brand || 'ANDR')
        .toString()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 6);
      const model = (Platform.constants?.Model || 'PHONE')
        .toString()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 10);
      const timePart = Date.now().toString(36).toUpperCase();
      const randPart = Math.random().toString(36).substring(2, 7).toUpperCase();

      devId = `DEV-${brand}-${model}-${timePart}-${randPart}`;
      await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, devId);
    }
    return devId;
  } catch (e) {
    return 'DEV-GENERIC-' + Date.now().toString(36).toUpperCase();
  }
}

export async function getDeviceInfo() {
  const deviceId = await getHardwareDeviceId();
  const brand = Platform.constants?.Brand || (Platform.OS === 'android' ? 'Android' : 'Apple');
  const model = Platform.constants?.Model || (Platform.OS === 'android' ? 'Mobile Terminal' : 'iOS Device');
  const release = Platform.constants?.Release ? `Android ${Platform.constants.Release}` : Platform.OS;

  return {
    deviceId,
    brand,
    model: `${brand} ${model}`.trim(),
    osVersion: release,
    appVersion: APP_VERSION,
  };
}

// ─── 2. CLOUD CONFIGURATION ───────────────────────────────────────
export async function getCloudConfig() {
  try {
    const [
      deviceId,
      savedUrl,
      savedLicense,
      token,
      status,
      lockoutMsg,
      lastSyncRaw,
      autoSyncVal,
    ] = await Promise.all([
      getHardwareDeviceId(),
      AsyncStorage.getItem(STORAGE_KEYS.SERVER_URL),
      AsyncStorage.getItem(STORAGE_KEYS.LICENSE_KEY),
      AsyncStorage.getItem(STORAGE_KEYS.DEVICE_TOKEN),
      AsyncStorage.getItem(STORAGE_KEYS.DEVICE_STATUS),
      AsyncStorage.getItem(STORAGE_KEYS.LOCKOUT_MESSAGE),
      AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC),
      AsyncStorage.getItem(STORAGE_KEYS.AUTO_SYNC_ENABLED),
    ]);

    const serverUrl = savedUrl && savedUrl.trim() ? savedUrl.trim() : DEFAULT_SERVER_URL;
    const licenseKey = savedLicense && savedLicense.trim() ? savedLicense.trim().toUpperCase() : DEFAULT_LICENSE_KEY;
    const deviceStatus = status || 'active'; // Default active until server says otherwise
    const autoSync = autoSyncVal !== 'false';
    const lastSync = lastSyncRaw ? JSON.parse(lastSyncRaw) : null;

    return {
      deviceId,
      serverUrl,
      licenseKey,
      token,
      deviceStatus,
      lockoutMessage: lockoutMsg || '',
      lastSync,
      autoSync,
    };
  } catch (err) {
    return {
      deviceId: 'UNKNOWN',
      serverUrl: DEFAULT_SERVER_URL,
      licenseKey: DEFAULT_LICENSE_KEY,
      token: null,
      deviceStatus: 'active',
      lockoutMessage: '',
      lastSync: null,
      autoSync: true,
    };
  }
}

export async function saveCloudSettings({ serverUrl, licenseKey }) {
  try {
    if (serverUrl !== undefined) {
      const clean = serverUrl.trim().replace(/\/+$/, '');
      await AsyncStorage.setItem(STORAGE_KEYS.SERVER_URL, clean);
    }
    if (licenseKey !== undefined) {
      const cleanKey = licenseKey.trim().toUpperCase();
      await AsyncStorage.setItem(STORAGE_KEYS.LICENSE_KEY, cleanKey);
    }
    return true;
  } catch {
    return false;
  }
}

export async function setDeviceStatus(status, message = '') {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_STATUS, status);
    if (message) {
      await AsyncStorage.setItem(STORAGE_KEYS.LOCKOUT_MESSAGE, message);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.LOCKOUT_MESSAGE);
    }
  } catch {}
}

// ─── 3. CLOUD SERVER TEST / PROBE ────────────────────────────────
export async function testCloudConnection(targetUrl = null) {
  try {
    const config = await getCloudConfig();
    const url = (targetUrl || config.serverUrl).trim().replace(/\/+$/, '');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${url}/api/status`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      return { online: true, url, data };
    }
    return { online: false, url, error: `HTTP ${res.status}` };
  } catch (err) {
    return { online: false, url: targetUrl, error: err.message || 'Timed out' };
  }
}

// ─── ZERO-KEY ADMIN APPROVAL WORKFLOW ────────────────────────────
export async function requestApprovalFromCloud(customUrl = null, shopName = null) {
  try {
    const config = await getCloudConfig();
    const info = await getDeviceInfo();
    const url = (customUrl || config.serverUrl).trim().replace(/\/+$/, '');

    const payload = {
      deviceId: info.deviceId,
      model: info.model,
      osVersion: info.osVersion,
      appVersion: info.appVersion,
      shopName: shopName || 'Bakery Mobile Terminal',
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`${url}/api/device/request-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.status) {
      await setDeviceStatus(data.status, data.message || '');
      return {
        success: true,
        status: data.status,
        message: data.message,
      };
    }

    return {
      success: false,
      status: 'pending',
      message: data.message || 'Unable to register terminal with server',
    };
  } catch (err) {
    return {
      success: false,
      networkOffline: true,
      message: 'Server unreachable. Please check your Wi-Fi connection.',
    };
  }
}

export async function checkApprovalStatus(customUrl = null) {
  try {
    const config = await getCloudConfig();
    const info = await getDeviceInfo();
    const url = (customUrl || config.serverUrl).trim().replace(/\/+$/, '');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${url}/api/device/check-status?deviceId=${encodeURIComponent(info.deviceId)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data.exists && data.status) {
        if (data.status === 'active') {
          await setDeviceStatus('active', '');
        } else if (data.status !== config.deviceStatus) {
          await setDeviceStatus(data.status);
        }
        return { success: true, status: data.status, shopName: data.shopName };
      }
    }
    return { success: false, status: config.deviceStatus };
  } catch {
    return { success: false, networkOffline: true };
  }
}

// ─── 4. DEVICE REGISTRATION & ANTI-TRANSFER HANDSHAKE ───────────
export async function registerWithCloud(customUrl = null, customLicense = null, shopName = null) {
  try {
    const config = await getCloudConfig();
    const info = await getDeviceInfo();
    const url = (customUrl || config.serverUrl).trim().replace(/\/+$/, '');
    const licenseKey = (customLicense || config.licenseKey).trim().toUpperCase();

    const payload = {
      licenseKey,
      deviceId: info.deviceId,
      model: info.model,
      osVersion: info.osVersion,
      appVersion: info.appVersion,
      shopName: shopName || 'Bakery Mobile Terminal',
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(`${url}/api/device/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.success) {
      // Authorization Success
      await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_TOKEN, data.token || '');
      await setDeviceStatus('active', '');
      return {
        success: true,
        status: 'active',
        token: data.token,
        shopName: data.shopName,
        message: data.message || 'Device authorized successfully.',
      };
    }

    // License Lockout / Anti-Transfer rejection (HTTP 403)
    const errorMsg = data.message || 'Unauthorized Device. License bound to another phone.';
    const status = data.error === 'DEVICE_LIMIT_REACHED' ? 'unauthorized' : (data.error === 'LICENSE_SUSPENDED' ? 'suspended' : 'revoked');
    await setDeviceStatus(status, errorMsg);

    return {
      success: false,
      status,
      error: data.error || 'UNAUTHORIZED',
      message: errorMsg,
    };
  } catch (err) {
    // If phone is offline / no internet, do not lock out if already authorized
    return {
      success: false,
      networkOffline: true,
      message: 'Cloud server unreachable. Continuing in offline mode.',
    };
  }
}

// ─── 5. PERIODIC HEARTBEAT & REMOTE KILLSWITCH ───────────────────
export async function sendCloudHeartbeat() {
  try {
    const config = await getCloudConfig();
    const info = await getDeviceInfo();
    const url = config.serverUrl.trim().replace(/\/+$/, '');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`${url}/api/device/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: info.deviceId,
        licenseKey: config.licenseKey,
        appVersion: info.appVersion,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (response.ok) {
      const data = await response.json();
      if (data.status && data.status !== 'active') {
        // Remote Killswitch activated by admin!
        const msg = data.status === 'suspended'
          ? 'This terminal has been temporarily suspended by the administrator.'
          : 'License has been revoked for this terminal.';
        await setDeviceStatus(data.status, msg);
        return { success: true, status: data.status, killed: true, message: msg };
      }
      return { success: true, status: 'active', serverTime: data.serverTime };
    }

    if (response.status === 403 || response.status === 401) {
      const data = await response.json().catch(() => ({}));
      const msg = data.message || 'Terminal authorization lost.';
      await setDeviceStatus('unauthorized', msg);
      return { success: false, status: 'unauthorized', killed: true, message: msg };
    }

    return { success: false, networkOffline: true };
  } catch {
    return { success: false, networkOffline: true };
  }
}

// ─── 6. OFFLINE-FIRST CLOUD SYNC PUSH ────────────────────────────
export async function pushCloudSync(state, customUrl = null) {
  try {
    const config = await getCloudConfig();
    const info = await getDeviceInfo();
    const url = (customUrl || config.serverUrl).trim().replace(/\/+$/, '');

    const payload = {
      licenseKey: config.licenseKey,
      deviceId: info.deviceId,
      shopName: state.auth?.businessName || 'Bakery',
      orders: state.orders || [],
      products: state.products || [],
      inventory: state.inventory || [],
      timestamp: new Date().toISOString(),
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${url}/api/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const result = await response.json().catch(() => ({}));

    if (response.ok && result.success) {
      const syncInfo = {
        timestamp: new Date().toISOString(),
        status: 'synced',
        ordersCount: (state.orders || []).length,
        productsCount: (state.products || []).length,
        message: result.message || 'Synced successfully to Cloud Admin Server',
        serverUrl: url,
      };
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, JSON.stringify(syncInfo));
      return { success: true, ...syncInfo };
    }

    if (response.status === 403) {
      const msg = result.message || 'Device is not authorized to sync.';
      await setDeviceStatus('unauthorized', msg);
      return { success: false, unauthorized: true, message: msg };
    }

    throw new Error(result.message || `Server status ${response.status}`);
  } catch (error) {
    const isTimeout = error.message && error.message.includes('aborted');
    return {
      success: false,
      networkOffline: true,
      message: isTimeout ? 'Cloud connection timed out' : 'Cloud Server currently unreachable (offline-first mode active)',
      error: error.message,
    };
  }
}

// ─── 7. DISASTER RECOVERY: RESTORE SHOP RECORDS FROM CLOUD ──────
export async function restoreCloudData(customUrl = null, customLicense = null) {
  try {
    const config = await getCloudConfig();
    const info = await getDeviceInfo();
    const url = (customUrl || config.serverUrl).trim().replace(/\/+$/, '');
    const licenseKey = (customLicense || config.licenseKey).trim().toUpperCase();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(
      `${url}/api/sync/restore-shop-data?licenseKey=${encodeURIComponent(licenseKey)}&deviceId=${encodeURIComponent(info.deviceId)}`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      }
    );
    clearTimeout(timer);

    const result = await response.json().catch(() => ({}));

    if (response.ok && result.success) {
      return {
        success: true,
        orders: result.orders || [],
        products: result.products || [],
        inventory: result.inventory || [],
        shopName: result.shopName || 'Bakery',
        message: `Restored ${result.ordersCount || 0} orders from cloud backup.`,
      };
    }

    return {
      success: false,
      message: result.message || 'Failed to restore shop records from cloud.',
      error: result.error,
    };
  } catch (err) {
    return {
      success: false,
      message: 'Cloud server unreachable. Could not restore backup.',
      error: err.message,
    };
  }
}

