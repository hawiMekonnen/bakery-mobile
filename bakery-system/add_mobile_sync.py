import os

MOBILE_DIR = r'c:\Users\user\Desktop\bakery-mobile'

SYNC_SERVICE_JS = '''import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL_KEY = '@bakery_server_url';
const LAST_SYNC_KEY = '@bakery_last_sync_info';
export const DEFAULT_SERVER_URL = 'http://localhost:5000';

export async function getServerUrl() {
  try {
    const saved = await AsyncStorage.getItem(SERVER_URL_KEY);
    return saved || DEFAULT_SERVER_URL;
  } catch (e) {
    return DEFAULT_SERVER_URL;
  }
}

export async function setServerUrl(url) {
  try {
    const cleanUrl = url.trim().replace(/\\/+$/, '');
    await AsyncStorage.setItem(SERVER_URL_KEY, cleanUrl);
    return cleanUrl;
  } catch (e) {
    return url;
  }
}

export async function getLastSyncInfo() {
  try {
    const raw = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export async function pushSyncData(state) {
  try {
    const serverUrl = await getServerUrl();
    const payload = {
      terminalId: 'mobile-terminal-01',
      terminalName: `${state.auth?.businessName || 'Bakery'} Terminal (Android)`,
      appVersion: '2.0',
      orders: state.orders || [],
      products: state.products || [],
      inventory: state.inventory || [],
      timestamp: new Date().toISOString(),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

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
      message: result.message || 'Synced successfully',
      serverUrl,
    };

    await AsyncStorage.setItem(LAST_SYNC_KEY, JSON.stringify(syncInfo));
    return { success: true, ...syncInfo };
  } catch (error) {
    const isTimeout = error.message && error.message.includes('aborted');
    const syncInfo = {
      timestamp: new Date().toISOString(),
      status: 'offline',
      message: isTimeout ? 'Server connection timed out' : 'Server currently unreachable',
    };
    await AsyncStorage.setItem(LAST_SYNC_KEY, JSON.stringify(syncInfo));
    return { success: false, ...syncInfo };
  }
}
'''

def write_sync_service():
    target_path = os.path.join(MOBILE_DIR, 'src', 'services', 'syncService.js')
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    with open(target_path, 'w', encoding='utf-8') as f:
        f.write(SYNC_SERVICE_JS)
    print(f'Written syncService.js: {target_path}')

if __name__ == '__main__':
    write_sync_service()
