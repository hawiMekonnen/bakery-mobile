import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL_KEY = '@bakery_server_url';
const LAST_SYNC_KEY = '@bakery_last_sync_info';
const AUTO_SYNC_ENABLED_KEY = '@bakery_auto_sync_enabled';

// The PC's Wi-Fi host IP address
export const DEFAULT_SERVER_URL = 'http://192.168.0.116:5000';

// Fallback endpoints for local dev / emulator / phone Wi-Fi
export const SERVER_CANDIDATES = [
  'http://192.168.0.116:5000',
  'http://10.0.2.2:5000',
  'http://localhost:5000',
];

export async function getServerUrl() {
  try {
    const saved = await AsyncStorage.getItem(SERVER_URL_KEY);
    return saved && saved.trim() ? saved.trim() : DEFAULT_SERVER_URL;
  } catch (e) {
    return DEFAULT_SERVER_URL;
  }
}

export async function setServerUrl(url) {
  try {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    await AsyncStorage.setItem(SERVER_URL_KEY, cleanUrl);
    return cleanUrl;
  } catch (e) {
    return url;
  }
}

export async function isAutoSyncEnabled() {
  try {
    const val = await AsyncStorage.getItem(AUTO_SYNC_ENABLED_KEY);
    return val !== 'false'; // default true
  } catch (e) {
    return true;
  }
}

export async function setAutoSyncEnabled(enabled) {
  try {
    await AsyncStorage.setItem(AUTO_SYNC_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch (e) {}
}

export async function getLastSyncInfo() {
  try {
    const raw = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export async function testServerConnection(targetUrl = null) {
  try {
    const url = targetUrl || (await getServerUrl());
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(`${url}/api/status`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        online: true,
        url,
        data,
      };
    }
    return { online: false, url, error: `HTTP ${response.status}` };
  } catch (err) {
    return { online: false, url: targetUrl, error: err.message || 'Connection timed out' };
  }
}

export async function autoDiscoverServer() {
  const currentUrl = await getServerUrl();
  const testCurrent = await testServerConnection(currentUrl);
  if (testCurrent.online) return currentUrl;

  for (const candidate of SERVER_CANDIDATES) {
    if (candidate === currentUrl) continue;
    const test = await testServerConnection(candidate);
    if (test.online) {
      await setServerUrl(candidate);
      return candidate;
    }
  }
  return currentUrl;
}

export async function pushSyncData(state, targetUrl = null) {
  try {
    const serverUrl = targetUrl || (await getServerUrl());
    const payload = {
      terminalId: 'mobile-terminal-01',
      terminalName: `${state.auth?.businessName || 'Bakery'} Terminal (Android / Wi-Fi)`,
      appVersion: '2.0',
      orders: state.orders || [],
      products: state.products || [],
      inventory: state.inventory || [],
      timestamp: new Date().toISOString(),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(`${serverUrl}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Server status ${response.status}`);
    }

    const result = await response.json();

    const syncInfo = {
      timestamp: new Date().toISOString(),
      status: 'success',
      ordersCount: (state.orders || []).length,
      productsCount: (state.products || []).length,
      message: result.message || 'Synced successfully to Admin Portal',
      serverUrl,
    };

    await AsyncStorage.setItem(LAST_SYNC_KEY, JSON.stringify(syncInfo));
    return { success: true, ...syncInfo };
  } catch (error) {
    const isTimeout = error.message && error.message.includes('aborted');
    const syncInfo = {
      timestamp: new Date().toISOString(),
      status: 'offline',
      message: isTimeout ? 'Wi-Fi connection timed out' : 'Admin Server currently unreachable on Wi-Fi',
      error: error.message,
    };
    await AsyncStorage.setItem(LAST_SYNC_KEY, JSON.stringify(syncInfo));
    return { success: false, ...syncInfo };
  }
}
