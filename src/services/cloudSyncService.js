import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const APP_VERSION = '1.0.8';
export const DEFAULT_SERVER_URL = 'http://192.168.0.116:5000';
export const DEFAULT_LICENSE_KEY = 'SKY-BAKERY-001';

export const STORAGE_KEYS = {
  DEVICE_ID: '@skykin_hw_device_id_v2',
  SERVER_URL: '@skykin_cloud_server_url',
  LICENSE_KEY: '@skykin_cloud_license_key',
  AUTH_TOKEN: '@skykin_cloud_auth_token',
  OFFLINE_TOKEN: '@skykin_cloud_offline_token',
  DEVICE_STATUS: '@skykin_device_status', // 'pending' | 'active' | 'suspended' | 'blocked' | 'unlinked' | 'offline_expired'
  LOCKOUT_MESSAGE: '@skykin_device_lockout_msg',
  LAST_SYNC: '@skykin_cloud_last_sync',
  AUTO_SYNC: '@skykin_cloud_auto_sync',
};

// ─── 1. ACCURATE HARDWARE IDENTIFICATION ───────────────────────────
export async function getHardwareDeviceId() {
  try {
    let devId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!devId || !devId.trim()) {
      let platformTag = 'ANDR';
      let modelTag = 'PHONE';

      if (Platform.OS === 'android') {
        platformTag = 'ANDR';
        modelTag = (Platform.constants?.Model || 'PHONE').toString().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8);
      } else if (Platform.OS === 'ios') {
        platformTag = 'IOS';
        modelTag = 'IPHONE';
      } else if (Platform.OS === 'web') {
        platformTag = 'WEB';
        modelTag = 'POS';
      }

      const timePart = Date.now().toString(36).toUpperCase();
      const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();

      devId = `DEV-${platformTag}-${modelTag}-${timePart}-${randPart}`;
      await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, devId);
    }
    return devId;
  } catch {
    return 'DEV-GENERIC-' + Date.now().toString(36).toUpperCase();
  }
}

export async function getDeviceInfo() {
  const deviceId = await getHardwareDeviceId();
  let brand = 'Android';
  let model = 'Phone';
  let osVersion = Platform.OS;

  if (Platform.OS === 'android') {
    brand = Platform.constants?.Brand || 'Android';
    model = Platform.constants?.Model || 'Mobile POS';
    osVersion = Platform.constants?.Release ? `Android ${Platform.constants.Release}` : 'Android';
  } else if (Platform.OS === 'ios') {
    brand = 'Apple';
    model = Platform.constants?.Model || 'iPhone';
    osVersion = `iOS ${Platform.Version || ''}`.trim();
  } else if (Platform.OS === 'web') {
    brand = 'Web';
    model = 'POS Client';
    osVersion = typeof navigator !== 'undefined' ? (navigator.userAgent.includes('Windows') ? 'Windows' : 'Web') : 'Web';
  }

  return {
    deviceId,
    brand,
    model: `${brand} ${model}`.trim(),
    platform: Platform.OS,
    osVersion,
    appVersion: APP_VERSION,
  };
}

// ─── 2. CLOUD CONFIGURATION & OFFLINE TOKEN ───────────────────────
export async function getCloudConfig() {
  try {
    const [
      deviceId,
      savedUrl,
      savedLicense,
      token,
      offlineTokenRaw,
      status,
      lockoutMsg,
      lastSyncRaw,
      autoSyncVal,
    ] = await Promise.all([
      getHardwareDeviceId(),
      AsyncStorage.getItem(STORAGE_KEYS.SERVER_URL),
      AsyncStorage.getItem(STORAGE_KEYS.LICENSE_KEY),
      AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
      AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_TOKEN),
      AsyncStorage.getItem(STORAGE_KEYS.DEVICE_STATUS),
      AsyncStorage.getItem(STORAGE_KEYS.LOCKOUT_MESSAGE),
      AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC),
      AsyncStorage.getItem(STORAGE_KEYS.AUTO_SYNC),
    ]);

    let offlineToken = null;
    if (offlineTokenRaw) {
      try { offlineToken = JSON.parse(offlineTokenRaw); } catch {}
    }

    let lastSync = null;
    if (lastSyncRaw) {
      try { lastSync = JSON.parse(lastSyncRaw); } catch {}
    }

    const autoSync = autoSyncVal === null ? true : autoSyncVal === 'true';

    return {
      deviceId,
      serverUrl: savedUrl || DEFAULT_SERVER_URL,
      licenseKey: savedLicense || DEFAULT_LICENSE_KEY,
      token: token || null,
      offlineToken,
      deviceStatus: status || 'pending',
      lockoutMessage: lockoutMsg || '',
      lastSync,
      autoSync,
    };
  } catch {
    return {
      deviceId: 'UNKNOWN',
      serverUrl: DEFAULT_SERVER_URL,
      licenseKey: DEFAULT_LICENSE_KEY,
      token: null,
      offlineToken: null,
      deviceStatus: 'pending',
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

export async function setDeviceStatus(status, message = '', offlineToken = null) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_STATUS, status);
    if (message) {
      await AsyncStorage.setItem(STORAGE_KEYS.LOCKOUT_MESSAGE, message);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.LOCKOUT_MESSAGE);
    }
    if (offlineToken) {
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_TOKEN, JSON.stringify(offlineToken));
    }
  } catch {}
}

// Check remaining offline time
export function getRemainingOfflineHours(offlineToken) {
  if (!offlineToken || !offlineToken.expiresAt) return 0;
  const expMs = new Date(offlineToken.expiresAt).getTime();
  const diff = expMs - Date.now();
  if (diff <= 0) return 0;
  return Math.max(0, Math.round(diff / (3600 * 1000)));
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
      return { success: true, serverStatus: data.status, primaryIp: data.primaryIp };
    }
    return { success: false, status: res.status };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── 4. REGISTRATION & APPROVAL CHECK ─────────────────────────────
export async function requestApprovalFromCloud(customUrl = null) {
  try {
    const config = await getCloudConfig();
    const info = await getDeviceInfo();
    const url = (customUrl || config.serverUrl).trim().replace(/\/+$/, '');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`${url}/api/device/request-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: info.deviceId,
        model: info.model,
        osVersion: info.osVersion,
        appVersion: info.appVersion,
        shopName: 'Bakery POS Terminal',
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const result = await response.json().catch(() => ({}));

    if (response.ok && result.success) {
      if (result.status === 'active') {
        if (result.token) await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, result.token);
        await setDeviceStatus('active', '', result.offlineToken);
        return { success: true, status: 'active', shopName: result.shopName };
      }
      await setDeviceStatus('pending', result.message || 'Waiting for admin approval');
      return { success: true, status: 'pending', message: result.message };
    }

    if (response.status === 403 || result.status) {
      const status = result.status || 'blocked';
      await setDeviceStatus(status, result.message || result.reason || 'Terminal access restricted');
      return { success: false, status, message: result.message || result.reason };
    }

    return { success: false, message: result.message || 'Cannot contact BakerAdmin server' };
  } catch (error) {
    return { success: false, networkOffline: true, message: 'Server unreachable. Connect phone to the same Wi-Fi.' };
  }
}

export async function checkApprovalStatus(customUrl = null) {
  try {
    const config = await getCloudConfig();
    const info = await getDeviceInfo();
    const url = (customUrl || config.serverUrl).trim().replace(/\/+$/, '');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${url}/api/device/check-status?deviceId=${encodeURIComponent(info.deviceId)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.exists) {
      if (data.status === 'active') {
        await setDeviceStatus('active', '', data.offlineToken);
        return { success: true, status: 'active', shopName: data.shopName };
      }
      await setDeviceStatus(data.status, data.reason || '');
      return { success: true, status: data.status, reason: data.reason };
    }

    if (res.status === 403) {
      const status = data.status || 'suspended';
      await setDeviceStatus(status, data.reason || 'Terminal access restricted');
      return { success: false, status, code: data.code, reason: data.reason, supportContact: data.supportContact };
    }

    // Offline handling: check signed offline token
    if (config.offlineToken) {
      const remainingHours = getRemainingOfflineHours(config.offlineToken);
      if (remainingHours <= 0) {
        await setDeviceStatus('offline_expired', 'Offline license expired. Connect to Wi-Fi to validate.');
        return { success: false, status: 'offline_expired', offlineExpired: true };
      }
      return { success: true, status: 'active', offlineMode: true, remainingHours };
    }

    return { success: false, networkOffline: true };
  } catch (err) {
    // Offline fallback
    const config = await getCloudConfig();
    if (config.offlineToken) {
      const remainingHours = getRemainingOfflineHours(config.offlineToken);
      if (remainingHours <= 0) {
        await setDeviceStatus('offline_expired', 'Offline license expired. Connect to Wi-Fi to validate.');
        return { success: false, status: 'offline_expired', offlineExpired: true };
      }
      return { success: true, status: 'active', offlineMode: true, remainingHours };
    }
    return { success: false, networkOffline: true };
  }
}

// ─── 5. REAL-TIME EVENT STREAM (SSE) ──────────────────────────────
export function connectToTerminalEventStream(onCommand) {
  let active = true;
  let abortController = new AbortController();

  const startStream = async () => {
    if (!active) return;
    try {
      const config = await getCloudConfig();
      const info = await getDeviceInfo();
      const url = `${config.serverUrl}/api/device/stream/${encodeURIComponent(info.deviceId)}`;

      abortController = new AbortController();
      const res = await fetch(url, {
        headers: { 'Accept': 'text/event-stream' },
        signal: abortController.signal
      });

      if (!res.ok) {
        // Fall back and retry
        setTimeout(startStream, 15000);
        return;
      }

      const reader = res.body?.getReader?.();
      if (!reader) {
        // Streaming not supported on this platform reader, fall back to polling
        return;
      }

      const decoder = new TextDecoder();
      while (active) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const payload = JSON.parse(line.replace('data:', '').trim());
              if (payload.command) {
                // Acknowledge command
                fetch(`${config.serverUrl}/api/device/ack-command`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ deviceId: info.deviceId, command: payload.command })
                }).catch(() => {});

                if (onCommand) onCommand(payload);
              }
            } catch {}
          }
        }
      }
    } catch {
      if (active) setTimeout(startStream, 15000);
    }
  };

  startStream();

  return () => {
    active = false;
    abortController.abort();
  };
}

// ─── 6. BATCH ORDER SYNC (IDEMPOTENT & SCALABLE) ───────────────────
export async function pushBatchOrders(orders = [], { pendingCount = 0, inventory = [], products = [] } = {}) {
  try {
    const config = await getCloudConfig();
    const info = await getDeviceInfo();
    const url = config.serverUrl.trim().replace(/\/+$/, '');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(`${url}/api/sync/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: info.deviceId,
        licenseKey: config.licenseKey,
        orders,
        pendingCount,
        inventoryUpdates: inventory,
        menuUpdates: products
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const result = await response.json().catch(() => ({}));

    if (response.ok && result.success) {
      const syncInfo = {
        timestamp: new Date().toISOString(),
        status: 'synced',
        ordersCount: orders.length,
        syncedCount: result.synced || 0,
        duplicatesCount: result.duplicates || 0,
        serverUrl: url,
      };
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, JSON.stringify(syncInfo));
      return { success: true, ...syncInfo, results: result.results || [] };
    }

    if (response.status === 403) {
      const status = result.status || 'suspended';
      const reason = result.reason || 'Terminal authorization suspended.';
      await setDeviceStatus(status, reason);
      return {
        success: false,
        blocked: true,
        status,
        code: result.code,
        reason,
        supportContact: result.supportContact
      };
    }

    return { success: false, message: result.message || `Server status ${response.status}` };
  } catch (err) {
    return {
      success: false,
      networkOffline: true,
      message: 'Cloud server unreachable (orders kept safely on device)'
    };
  }
}

// Backward compatibility alias
export async function pushCloudSync(state, customUrl = null) {
  const pendingOrders = (state.orders || []).filter(o => o.syncStatus !== 'synced');
  return pushBatchOrders(pendingOrders.length > 0 ? pendingOrders : state.orders, {
    pendingCount: pendingOrders.length,
    inventory: state.inventory,
    products: state.products
  });
}

// ─── 7. RESTORE SHOP DATA IN BATCHES ──────────────────────────────
export async function restoreCloudDataInBatches(onProgress = null) {
  try {
    const config = await getCloudConfig();
    const info = await getDeviceInfo();
    const url = config.serverUrl.trim().replace(/\/+$/, '');

    let allOrders = [];
    let offset = 0;
    const batchSize = 100;
    let hasMore = true;
    let shopName = 'Bakery';
    let products = [];
    let inventory = [];

    while (hasMore) {
      const res = await fetch(
        `${url}/api/sync/restore-shop-data?licenseKey=${encodeURIComponent(config.licenseKey)}&deviceId=${encodeURIComponent(info.deviceId)}&offset=${offset}&batchSize=${batchSize}`
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Restoration failed');
      }

      shopName = data.shopName || shopName;
      if (data.products && data.products.length > 0) products = data.products;
      if (data.inventory && data.inventory.length > 0) inventory = data.inventory;

      const chunk = data.orders || [];
      allOrders = allOrders.concat(chunk);
      hasMore = Boolean(data.hasMore);
      offset += chunk.length;

      if (onProgress && data.totalOrders > 0) {
        onProgress({ current: allOrders.length, total: data.totalOrders });
      }

      if (chunk.length === 0) break;
    }

    return {
      success: true,
      shopName,
      orders: allOrders,
      products,
      inventory
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function restoreCloudData() {
  return restoreCloudDataInBatches();
}
