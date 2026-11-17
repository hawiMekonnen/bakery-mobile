import os

admin_root = r"c:\Users\user\Desktop\bakery admin"

# 1. Update storage.js
storage_code = '''import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Secret for signing tokens (override with process.env.JWT_SECRET)
const SECRET = process.env.JWT_SECRET || 'skykin_bakery_secure_cloud_secret_2026';

// Helper to hash password with SHA-256
export function hashPassword(password) {
  return crypto.createHmac('sha256', SECRET).update(password).digest('hex');
}

// Generate simple HMAC session token
export function generateToken(payload) {
  const data = JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const b64Data = Buffer.from(data).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(b64Data).digest('base64url');
  return `${b64Data}.${signature}`;
}

// Verify session token
export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [b64Data, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', SECRET).update(b64Data).digest('base64url');
  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(b64Data, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// Initial DB schema
const INITIAL_DB = {
  admin: {
    username: process.env.ADMIN_USER || 'admin',
    passwordHash: hashPassword(process.env.ADMIN_PASSWORD || 'admin1234'),
    updatedAt: new Date().toISOString()
  },
  licenses: [
    {
      licenseKey: 'SKY-BAKERY-001',
      shopName: 'Sunrise Bakery & Cafe',
      maxDevices: 1,
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      licenseKey: 'SKY-BAKERY-002',
      shopName: 'Downtown Pastry Shop',
      maxDevices: 1,
      status: 'active',
      createdAt: new Date().toISOString()
    }
  ],
  devices: [],
  orders: [],
  products: [],
  inventory: [],
  syncLogs: []
};

export function loadDatabase() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        ...INITIAL_DB,
        ...parsed,
        licenses: parsed.licenses || INITIAL_DB.licenses,
        devices: parsed.devices || [],
        orders: parsed.orders || [],
        products: parsed.products || [],
        inventory: parsed.inventory || [],
        syncLogs: parsed.syncLogs || []
      };
    }
  } catch (err) {
    console.error('[Storage] Error reading database, using fallback:', err.message);
  }
  saveDatabase(INITIAL_DB);
  return INITIAL_DB;
}

export function saveDatabase(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[Storage] Error writing database:', err.message);
    return false;
  }
}

// --- ADMIN AUTH ---
export function authenticateAdmin(username, password) {
  const db = loadDatabase();
  const inputHash = hashPassword(password);
  
  // Allow env override
  const envUser = process.env.ADMIN_USER || 'admin';
  const envPass = process.env.ADMIN_PASSWORD || 'admin1234';

  if ((username === db.admin.username && inputHash === db.admin.passwordHash) ||
      (username === envUser && password === envPass)) {
    const token = generateToken({ role: 'admin', username });
    return { success: true, token, username };
  }
  return { success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid username or password' };
}

// --- LICENSES ---
export function getLicenses() {
  const db = loadDatabase();
  return db.licenses || [];
}

export function createLicense({ licenseKey, shopName, maxDevices = 1 }) {
  const db = loadDatabase();
  const key = (licenseKey || `SKY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`).trim();
  
  if (db.licenses.some(l => l.licenseKey.toLowerCase() === key.toLowerCase())) {
    return { success: false, error: 'EXISTS', message: 'License key already exists' };
  }

  const newLic = {
    licenseKey: key,
    shopName: shopName || 'New Bakery Branch',
    maxDevices: Number(maxDevices) || 1,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  db.licenses.push(newLic);
  saveDatabase(db);
  return { success: true, license: newLic };
}

// --- DEVICE TRACKING & ANTI-TRANSFER ---
export function registerDevice({ licenseKey, deviceId, model, osVersion, appVersion, shopName, ip }) {
  const db = loadDatabase();
  const lic = db.licenses.find(l => l.licenseKey.toLowerCase() === (licenseKey || '').trim().toLowerCase());

  if (!lic) {
    return {
      success: false,
      error: 'INVALID_LICENSE',
      message: 'Invalid license key. Please contact SkyKin Technologies support.'
    };
  }

  if (lic.status !== 'active') {
    return {
      success: false,
      error: 'LICENSE_SUSPENDED',
      message: `License is ${lic.status.toUpperCase()}. Access restricted.`
    };
  }

  // Check if this physical device is already bound to this license
  let existingDevice = db.devices.find(d => d.deviceId === deviceId && d.licenseKey === lic.licenseKey);

  if (existingDevice) {
    if (existingDevice.status === 'revoked') {
      return {
        success: false,
        error: 'DEVICE_REVOKED',
        message: 'This device has been permanently revoked by the company.'
      };
    }
    if (existingDevice.status === 'suspended') {
      return {
        success: false,
        error: 'DEVICE_SUSPENDED',
        message: 'This device is temporarily suspended. Contact administrator.'
      };
    }

    // Refresh details
    existingDevice.model = model || existingDevice.model;
    existingDevice.osVersion = osVersion || existingDevice.osVersion;
    existingDevice.appVersion = appVersion || existingDevice.appVersion;
    existingDevice.lastIp = ip || existingDevice.lastIp;
    existingDevice.lastPing = new Date().toISOString();
    saveDatabase(db);

    const token = generateToken({ deviceId, licenseKey: lic.licenseKey, shopName: lic.shopName });
    return {
      success: true,
      token,
      shopName: lic.shopName,
      status: existingDevice.status,
      message: 'Device authorized.'
    };
  }

  // Check how many active devices are bound to this license
  const boundDevices = db.devices.filter(d => d.licenseKey === lic.licenseKey && d.status !== 'revoked');

  if (boundDevices.length >= lic.maxDevices) {
    const primaryDevice = boundDevices[0];
    return {
      success: false,
      error: 'DEVICE_LIMIT_REACHED',
      message: `Unauthorized Device! This license (${lic.licenseKey}) is already bound to: ${primaryDevice.model || 'another phone'}. APK copying is prohibited. Contact support to transfer license.`
    };
  }

  // Register new device
  const newDevice = {
    id: 'DEV-' + Date.now().toString(36).toUpperCase(),
    deviceId,
    licenseKey: lic.licenseKey,
    shopName: shopName || lic.shopName,
    model: model || 'Android Phone',
    osVersion: osVersion || 'Android',
    appVersion: appVersion || '1.0.6',
    status: 'active',
    lastIp: ip || 'unknown',
    lastPing: new Date().toISOString(),
    lastSync: null,
    registeredAt: new Date().toISOString()
  };

  db.devices.push(newDevice);
  saveDatabase(db);

  const token = generateToken({ deviceId, licenseKey: lic.licenseKey, shopName: lic.shopName });
  return {
    success: true,
    token,
    shopName: lic.shopName,
    status: 'active',
    message: 'Device registered and bound successfully.'
  };
}

export function recordHeartbeat({ deviceId, licenseKey, batteryLevel, appVersion, ip }) {
  const db = loadDatabase();
  const device = db.devices.find(d => d.deviceId === deviceId);

  if (!device) {
    return { success: false, error: 'NOT_REGISTERED', message: 'Device not registered' };
  }

  device.lastPing = new Date().toISOString();
  if (ip) device.lastIp = ip;
  if (appVersion) device.appVersion = appVersion;
  if (batteryLevel !== undefined) device.batteryLevel = batteryLevel;

  saveDatabase(db);

  return {
    success: true,
    status: device.status, // 'active', 'suspended', or 'revoked'
    serverTime: new Date().toISOString()
  };
}

export function getDevicesWithStatus() {
  const db = loadDatabase();
  const now = Date.now();
  const ONLINE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

  return db.devices.map(d => {
    const lastPingMs = d.lastPing ? new Date(d.lastPing).getTime() : 0;
    const isOnline = (now - lastPingMs) < ONLINE_THRESHOLD_MS && d.status === 'active';

    return {
      ...d,
      isOnline,
      onlineStatus: isOnline ? 'online' : (d.status !== 'active' ? d.status : 'offline')
    };
  });
}

export function updateDeviceStatus(deviceId, newStatus) {
  const db = loadDatabase();
  const device = db.devices.find(d => d.deviceId === deviceId);
  if (!device) return { success: false, error: 'NOT_FOUND' };

  if (!['active', 'suspended', 'revoked'].includes(newStatus)) {
    return { success: false, error: 'INVALID_STATUS' };
  }

  device.status = newStatus;
  device.statusUpdatedAt = new Date().toISOString();
  saveDatabase(db);
  return { success: true, device };
}

// 1-Click Authorize Device Swap (removes device binding so new phone can register)
export function authorizeDeviceSwap(deviceId) {
  const db = loadDatabase();
  const idx = db.devices.findIndex(d => d.deviceId === deviceId);
  if (idx === -1) return { success: false, error: 'NOT_FOUND' };

  const removed = db.devices.splice(idx, 1)[0];
  saveDatabase(db);
  return { success: true, message: `Device ${removed.model} (${removed.deviceId}) unlinked. New phone can now register.` };
}

// --- CLOUD SYNC & BACKUP ---
export function processCloudSyncPush({ licenseKey, deviceId, orders = [], products = [], inventory = [] }, clientIp) {
  const db = loadDatabase();
  const device = db.devices.find(d => d.deviceId === deviceId);

  if (!device || device.status !== 'active') {
    return {
      success: false,
      error: 'UNAUTHORIZED_DEVICE',
      message: 'Device is not authorized to sync data.'
    };
  }

  device.lastSync = new Date().toISOString();
  device.lastPing = new Date().toISOString();
  if (clientIp) device.lastIp = clientIp;

  // Deduplicate and append orders
  const existingOrderIds = new Set(db.orders.map(o => String(o.id)));
  let addedCount = 0;

  for (const ord of orders) {
    if (!existingOrderIds.has(String(ord.id))) {
      db.orders.push({
        ...ord,
        licenseKey,
        deviceId,
        syncedAt: new Date().toISOString()
      });
      existingOrderIds.add(String(ord.id));
      addedCount++;
    }
  }

  // Update products snapshot if provided
  if (products && products.length > 0) {
    db.products = products.map(p => ({ ...p, licenseKey, lastSync: new Date().toISOString() }));
  }

  // Update inventory snapshot if provided
  if (inventory && inventory.length > 0) {
    db.inventory = inventory.map(i => ({ ...i, licenseKey, lastSync: new Date().toISOString() }));
  }

  // Record sync log
  db.syncLogs.unshift({
    timestamp: new Date().toISOString(),
    deviceId,
    licenseKey,
    ordersReceived: orders.length,
    newOrdersSaved: addedCount,
    clientIp
  });
  if (db.syncLogs.length > 500) db.syncLogs.pop();

  saveDatabase(db);

  return {
    success: true,
    addedCount,
    totalOrdersNow: db.orders.length,
    timestamp: new Date().toISOString()
  };
}

// Restore all shop records for a new phone
export function restoreShopData(licenseKey, deviceId) {
  const db = loadDatabase();
  const device = db.devices.find(d => d.deviceId === deviceId && d.licenseKey === licenseKey);

  if (!device || device.status !== 'active') {
    return { success: false, error: 'UNAUTHORIZED', message: 'Device not authorized for data restore.' };
  }

  const shopOrders = db.orders.filter(o => o.licenseKey === licenseKey);
  const shopProducts = db.products.filter(p => !p.licenseKey || p.licenseKey === licenseKey);
  const shopInventory = db.inventory.filter(i => !i.licenseKey || i.licenseKey === licenseKey);

  return {
    success: true,
    shopName: device.shopName,
    orders: shopOrders,
    products: shopProducts,
    inventory: shopInventory,
    restoredAt: new Date().toISOString()
  };
}

// Global stats for admin dashboard
export function getAdminStats() {
  const db = loadDatabase();
  const devices = getDevicesWithStatus();
  const orders = db.orders || [];

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o => (o.createdAt || '').startsWith(todayStr));
  const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

  return {
    allTime: {
      ordersCount: orders.length,
      revenue: totalRevenue,
    },
    today: {
      ordersCount: todayOrders.length,
      revenue: todayRevenue,
    },
    devices: {
      total: devices.length,
      online: devices.filter(d => d.isOnline).length,
      active: devices.filter(d => d.status === 'active').length,
      suspended: devices.filter(d => d.status === 'suspended').length,
      revoked: devices.filter(d => d.status === 'revoked').length,
    },
    licensesCount: (db.licenses || []).length,
    lastSync: devices.map(d => d.lastSync).filter(Boolean).sort().reverse()[0] || null
  };
}
''';

with open(os.path.join(admin_root, "storage.js"), "w", encoding="utf-8") as f:
    f.write(storage_code)
print("Updated storage.js successfully")

