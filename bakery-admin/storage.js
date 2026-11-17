import 'dotenv/config';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'database.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const SECRET = process.env.JWT_SECRET || 'skykin_bakery_secure_cloud_secret_2026';
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days session
const DEFAULT_OFFLINE_HOURS = 72; // 72 hours offline tolerance

export function hashPassword(password) {
  return crypto.createHmac('sha256', SECRET).update(password).digest('hex');
}

export function generateToken(payload) {
  const data = JSON.stringify({ ...payload, exp: Date.now() + TOKEN_EXPIRY_MS });
  const b64Data = Buffer.from(data).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(b64Data).digest('base64url');
  return `${b64Data}.${signature}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [b64Data, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', SECRET).update(b64Data).digest('base64url');

  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(b64Data, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// Signed Offline License Token generator
export function generateOfflineToken({ deviceId, shopId, licenseKey, maxOfflineHours = DEFAULT_OFFLINE_HOURS }) {
  const expiresAt = new Date(Date.now() + maxOfflineHours * 3600 * 1000).toISOString();
  const payload = {
    deviceId,
    shopId,
    licenseKey,
    status: 'active',
    issuedAt: new Date().toISOString(),
    expiresAt,
    maxOfflineHours
  };
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url');
  return {
    token: `${b64}.${sig}`,
    expiresAt,
    maxOfflineHours
  };
}

export function verifyOfflineToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [b64, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    return payload;
  } catch {
    return null;
  }
}

const INITIAL_DB = {
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    passwordHash: '$2b$12$0T1sI9q0W9h7oJgE9M5Zeu1l/nJd1p2e3k4m5n6o7p8q9r0s1t2u3',
    updatedAt: new Date().toISOString()
  },
  shops: [],
  licenses: [],
  devices: [],
  orders: [],
  products: [],
  inventory: [],
  auditLogs: [],
  syncLogs: []
};

// Database migration and loader
export function loadDatabase() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      const parsed = JSON.parse(raw);

      const db = {
        ...INITIAL_DB,
        ...parsed,
        admin: parsed.admin || INITIAL_DB.admin,
        shops: Array.isArray(parsed.shops) ? parsed.shops : [],
        licenses: Array.isArray(parsed.licenses) ? parsed.licenses : [],
        devices: Array.isArray(parsed.devices) ? parsed.devices : [],
        orders: Array.isArray(parsed.orders) ? parsed.orders : [],
        products: Array.isArray(parsed.products) ? parsed.products : [],
        inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
        syncLogs: Array.isArray(parsed.syncLogs) ? parsed.syncLogs : []
      };

      // Main shop reference if any exist
      let mainShop = db.shops[0] || null;

      // Check and migrate existing devices to have proper shopId and registered license
      let modified = false;
      for (const dev of db.devices) {
        if (!dev.shopId) {
          dev.shopId = mainShop.id;
          dev.shopName = dev.shopName || mainShop.name;
          modified = true;
        }

        // Link or create license for device
        const licKey = dev.licenseKey || `LIC-${dev.deviceId.slice(-6)}`;
        dev.licenseKey = licKey;

        let lic = db.licenses.find(l => l.licenseKey === licKey);
        if (!lic) {
          lic = {
            id: 'LIC-REC-' + Date.now().toString(36).toUpperCase(),
            licenseKey: licKey,
            shopId: dev.shopId,
            shopName: dev.shopName,
            maxDevices: 5,
            status: 'active',
            expiresAt: mainShop.paidUntil || '2027-12-31T23:59:59.000Z',
            createdAt: dev.registeredAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          db.licenses.push(lic);
          modified = true;
        }

        // Fix device OS / model detection if corrupted
        if (dev.deviceId && dev.deviceId.includes('ANDR') && dev.model && dev.model.includes('Apple')) {
          dev.model = 'Android POS Terminal';
          dev.platform = 'android';
          dev.osVersion = 'Android 14';
          modified = true;
        }

        if (!dev.platform) {
          if (dev.deviceId?.includes('ANDR')) dev.platform = 'android';
          else if (dev.deviceId?.includes('IOS')) dev.platform = 'ios';
          else dev.platform = 'web';
          modified = true;
        }

        if (!dev.orderCount) {
          dev.orderCount = db.orders.filter(o => o.deviceId === dev.deviceId).length;
          modified = true;
        }

        if (dev.pendingCommand === undefined) {
          dev.pendingCommand = null;
          modified = true;
        }

        if (!dev.offlineToken) {
          dev.offlineToken = generateOfflineToken({
            deviceId: dev.deviceId,
            shopId: dev.shopId,
            licenseKey: dev.licenseKey
          });
          modified = true;
        }
      }

      // Check shop auto-suspend billing rules
      const now = new Date();
      for (const shop of db.shops) {
        if (shop.autoSuspend && shop.paidUntil) {
          const paidDate = new Date(shop.paidUntil);
          const graceMs = (shop.gracePeriodDays || 7) * 86400000;
          if (now.getTime() > paidDate.getTime() + graceMs && shop.status === 'active') {
            shop.status = 'suspended';
            shop.updatedAt = now.toISOString();
            modified = true;

            // Suspend all terminals under this shop
            db.devices.filter(d => d.shopId === shop.id && d.status === 'active').forEach(d => {
              d.status = 'suspended';
              d.statusReason = 'Auto-suspended: Subscription expired past grace period';
              d.statusUpdatedAt = now.toISOString();
              d.pendingCommand = {
                command: 'suspend',
                reason: d.statusReason,
                issuedAt: now.toISOString(),
                ackedAt: null
              };
            });

            db.auditLogs.push({
              id: 'AUDIT-' + Date.now().toString(36).toUpperCase(),
              adminUser: 'system_cron',
              shopId: shop.id,
              terminalId: 'ALL',
              action: 'shop_auto_suspend',
              reason: 'Subscription expired past grace period',
              timestamp: now.toISOString(),
              metadata: { paidUntil: shop.paidUntil, gracePeriodDays: shop.gracePeriodDays }
            });
          }
        }
      }

      if (modified) {
        saveDatabase(db);
      }

      return db;
    }
  } catch (err) {
    console.error('[Storage] Error loading database:', err.message);
  }

  saveDatabase(INITIAL_DB);
  return INITIAL_DB;
}

export function saveDatabase(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[Storage] Error saving database:', err.message);
    return false;
  }
}

export function authenticateAdmin(username, password) {
  const db = loadDatabase();
  const envUser = process.env.ADMIN_USERNAME || 'admin';
  const envPass = process.env.ADMIN_PASSWORD || '123Newadissadmin';

  const validUser = (db.admin && db.admin.username) || envUser;
  if (username !== validUser) {
    return { success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid username or password' };
  }

  // 1. Direct env password check
  if (envPass && password === envPass) {
    const token = generateToken({ username, role: 'admin' });
    return { success: true, token, username };
  }

  // 2. Cryptographic bcrypt hash check
  const storedHash = db.admin?.passwordHash;
  if (storedHash) {
    let matched = false;
    try {
      if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
        matched = bcrypt.compareSync(password, storedHash);
      }
    } catch (e) {}

    if (!matched && hashPassword(password) === storedHash) {
      matched = true;
    }

    if (matched) {
      const token = generateToken({ username, role: 'admin' });
      return { success: true, token, username };
    }
  }

  return { success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid username or password' };
}

// ─── AUDIT LOGGING ────────────────────────────────────────────────────────
export function logAuditAction({ adminUser = 'admin', shopId = 'SHOP-001', terminalId = 'SYSTEM', action, reason = '', metadata = {} }, existingDb = null) {
  const db = existingDb || loadDatabase();
  if (!db.auditLogs) db.auditLogs = [];
  const entry = {
    id: 'AUDIT-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 5).toUpperCase(),
    adminUser,
    shopId,
    terminalId,
    action,
    reason: reason || 'Administrative action',
    timestamp: new Date().toISOString(),
    metadata
  };
  db.auditLogs.unshift(entry);
  if (db.auditLogs.length > 5000) {
    db.auditLogs = db.auditLogs.slice(0, 5000);
  }
  if (!existingDb) {
    saveDatabase(db);
  }
  return entry;
}

export function getAuditLogs({ terminalId, shopId, limit = 100 }) {
  const db = loadDatabase();
  let logs = db.auditLogs || [];
  if (terminalId && terminalId !== 'ALL') {
    logs = logs.filter(l => l.terminalId === terminalId);
  }
  if (shopId && shopId !== 'ALL') {
    logs = logs.filter(l => l.shopId === shopId);
  }
  return logs.slice(0, Number(limit));
}

// ─── SHOPS MANAGEMENT ─────────────────────────────────────────────────────
export function getShops() {
  const db = loadDatabase();
  const now = new Date().getTime();

  return db.shops.map(shop => {
    const shopDevices = db.devices.filter(d => d.shopId === shop.id);
    const shopLicenses = db.licenses.filter(l => l.shopId === shop.id);
    const shopOrders = db.orders.filter(o => o.shopId === shop.id || shopDevices.some(d => d.deviceId === o.deviceId));

    const paidUntilMs = shop.paidUntil ? new Date(shop.paidUntil).getTime() : 0;
    const daysUntilDue = Math.round((paidUntilMs - now) / 86400000);
    const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 7;
    const isPastDue = paidUntilMs > 0 && daysUntilDue < 0;

    return {
      ...shop,
      terminalsCount: shopDevices.length,
      activeTerminalsCount: shopDevices.filter(d => d.status === 'active').length,
      suspendedTerminalsCount: shopDevices.filter(d => d.status === 'suspended').length,
      licensesCount: shopLicenses.length,
      ordersCount: shopOrders.length,
      daysUntilDue,
      isDueSoon,
      isPastDue
    };
  });
}

export function createShop({ name, contactPhone, email, address, plan = 'standard', paidUntil, gracePeriodDays = 7, autoSuspend = true, adminUser = 'admin' }) {
  const db = loadDatabase();
  const id = 'SHOP-' + Date.now().toString(36).toUpperCase();
  const newShop = {
    id,
    name: name.trim(),
    contactPhone: contactPhone || '',
    email: email || '',
    address: address || '',
    plan,
    paidUntil: paidUntil || new Date(Date.now() + 365 * 86400000).toISOString(),
    gracePeriodDays: Number(gracePeriodDays) || 7,
    autoSuspend: Boolean(autoSuspend),
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.shops.push(newShop);

  // Automatically create 1 default license key for the new shop
  const licKey = 'LIC-' + name.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  const newLic = {
    id: 'LIC-' + Date.now().toString(36).toUpperCase(),
    licenseKey: licKey,
    shopId: id,
    shopName: newShop.name,
    maxDevices: 5,
    status: 'active',
    expiresAt: newShop.paidUntil,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.licenses.push(newLic);

  logAuditAction({
    adminUser,
    shopId: id,
    action: 'shop_created',
    reason: `Created shop ${newShop.name} with default license ${licKey}`,
    metadata: { plan, paidUntil: newShop.paidUntil }
  }, db);

  saveDatabase(db);
  return { success: true, shop: newShop, license: newLic };
}

export function updateShop({ id, name, contactPhone, email, address, plan, paidUntil, gracePeriodDays, autoSuspend, adminUser = 'admin' }) {
  const db = loadDatabase();
  const shop = db.shops.find(s => s.id === id);
  if (!shop) return { success: false, error: 'NOT_FOUND', message: 'Shop not found' };

  if (name) shop.name = name.trim();
  if (contactPhone !== undefined) shop.contactPhone = contactPhone;
  if (email !== undefined) shop.email = email;
  if (address !== undefined) shop.address = address;
  if (plan) shop.plan = plan;
  if (paidUntil) shop.paidUntil = paidUntil;
  if (gracePeriodDays !== undefined) shop.gracePeriodDays = Number(gracePeriodDays);
  if (autoSuspend !== undefined) shop.autoSuspend = Boolean(autoSuspend);
  shop.updatedAt = new Date().toISOString();

  // If paid until date extended into the future and shop was suspended, reactivate
  if (paidUntil && new Date(paidUntil).getTime() > Date.now() && shop.status === 'suspended') {
    shop.status = 'active';
  }

  logAuditAction({
    adminUser,
    shopId: id,
    action: 'shop_updated',
    reason: 'Updated shop billing and profile details',
    metadata: { plan: shop.plan, paidUntil: shop.paidUntil }
  }, db);

  saveDatabase(db);
  return { success: true, shop };
}

export function suspendAllShopTerminals({ shopId, reason = 'Non-payment', adminUser = 'admin' }) {
  const db = loadDatabase();
  const shop = db.shops.find(s => s.id === shopId);
  if (!shop) return { success: false, error: 'NOT_FOUND', message: 'Shop not found' };

  shop.status = 'suspended';
  shop.updatedAt = new Date().toISOString();

  let affectedCount = 0;
  const now = new Date().toISOString();

  db.devices.filter(d => d.shopId === shopId && d.status !== 'blocked').forEach(d => {
    d.status = 'suspended';
    d.statusReason = reason;
    d.statusUpdatedAt = now;
    d.pendingCommand = {
      command: 'suspend',
      reason,
      issuedAt: now,
      ackedAt: null
    };
    affectedCount++;
  });

  logAuditAction({
    adminUser,
    shopId,
    terminalId: 'ALL',
    action: 'shop_suspend_all_terminals',
    reason,
    metadata: { affectedCount }
  }, db);

  saveDatabase(db);
  return { success: true, affectedCount, message: `Suspended ${affectedCount} terminal(s) for ${shop.name}.` };
}

// ─── LICENSES MANAGEMENT ──────────────────────────────────────────────────
export function getLicenses() {
  const db = loadDatabase();
  const devices = getDevicesWithStatus();

  return (db.licenses || []).map(lic => {
    const bound = devices.filter(d => d.licenseKey === lic.licenseKey);
    const shop = db.shops.find(s => s.id === lic.shopId);
    return {
      ...lic,
      shopName: (shop && shop.name) || lic.shopName || 'Bakery Shop',
      activeDeviceCount: bound.filter(d => d.status === 'active').length,
      totalDeviceCount: bound.length,
      boundDevices: bound
    };
  });
}

export function createLicense({ licenseKey, shopId, shopName, maxDevices = 5, adminUser = 'admin' }) {
  const db = loadDatabase();
  const key = (licenseKey || `LIC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`).trim();

  if (db.licenses.find(l => l.licenseKey === key)) {
    return { success: false, error: 'LICENSE_EXISTS', message: 'License key already exists' };
  }

  let matchedShop = db.shops.find(s => s.id === shopId);
  if (!matchedShop && shopName) {
    matchedShop = db.shops.find(s => s.name.toLowerCase() === shopName.toLowerCase());
  }
  if (!matchedShop) {
    matchedShop = db.shops[0];
  }

  const newLic = {
    id: 'LIC-' + Date.now().toString(36).toUpperCase(),
    licenseKey: key,
    shopId: matchedShop ? matchedShop.id : 'SHOP-001',
    shopName: matchedShop ? matchedShop.name : (shopName || 'Bakery Shop'),
    maxDevices: Number(maxDevices) || 5,
    status: 'active',
    expiresAt: matchedShop ? matchedShop.paidUntil : new Date(Date.now() + 365 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.licenses.push(newLic);

  logAuditAction({
    adminUser,
    shopId: newLic.shopId,
    action: 'license_created',
    reason: `Issued license ${key} (max ${newLic.maxDevices} terminals)`,
    metadata: { licenseKey: key }
  }, db);

  saveDatabase(db);
  return { success: true, license: newLic };
}

// ─── TERMINALS / DEVICES SCALE MANAGEMENT ─────────────────────────────────
export function getDevicesWithStatus() {
  const db = loadDatabase();
  const now = Date.now();
  const ONLINE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

  const orders = db.orders || [];

  return db.devices.map(d => {
    const lastPingMs = d.lastPing ? new Date(d.lastPing).getTime() : 0;
    const isOnline = (now - lastPingMs) < ONLINE_THRESHOLD_MS && d.status === 'active';
    const shop = db.shops.find(s => s.id === d.shopId);
    const orderCount = orders.filter(o => o.deviceId === d.deviceId).length;

    return {
      ...d,
      shopName: (shop && shop.name) || d.shopName || 'Bakery Shop',
      orderCount,
      isOnline,
      onlineStatus: isOnline ? 'online' : (d.status !== 'active' ? d.status : 'offline'),
      hasPendingCommand: d.pendingCommand && !d.pendingCommand.ackedAt
    };
  });
}

// Full paginated & filtered terminal list for hundreds of terminals
export function getTerminalsPaginated({
  page = 1,
  limit = 20,
  search = '',
  status = 'all',
  shopId = 'all',
  online = 'all',
  appVersion = 'all',
  sortBy = 'lastPing',
  sortOrder = 'desc'
}) {
  const devices = getDevicesWithStatus();
  let filtered = devices;

  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(d =>
      (d.deviceId || '').toLowerCase().includes(q) ||
      (d.model || '').toLowerCase().includes(q) ||
      (d.shopName || '').toLowerCase().includes(q) ||
      (d.licenseKey || '').toLowerCase().includes(q) ||
      (d.lastIp || '').toLowerCase().includes(q)
    );
  }

  if (status && status !== 'all') {
    filtered = filtered.filter(d => d.status === status);
  }

  if (shopId && shopId !== 'all') {
    filtered = filtered.filter(d => d.shopId === shopId);
  }

  if (online && online !== 'all') {
    if (online === 'online') filtered = filtered.filter(d => d.isOnline);
    else if (online === 'offline') filtered = filtered.filter(d => !d.isOnline && d.status === 'active');
  }

  if (appVersion && appVersion !== 'all') {
    filtered = filtered.filter(d => d.appVersion === appVersion);
  }

  filtered.sort((a, b) => {
    let valA = a[sortBy] ?? '';
    let valB = b[sortBy] ?? '';
    if (sortBy === 'orderCount') {
      valA = Number(valA || 0);
      valB = Number(valB || 0);
    } else {
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
    }
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const total = filtered.length;
  const pageNum = Math.max(1, Number(page) || 1);
  const pageSize = Math.max(1, Math.min(100, Number(limit) || 20));
  const totalPages = Math.ceil(total / pageSize) || 1;
  const offset = (pageNum - 1) * pageSize;
  const items = filtered.slice(offset, offset + pageSize);

  // Status breakdown summary
  const counts = {
    total: devices.length,
    active: devices.filter(d => d.status === 'active').length,
    pending: devices.filter(d => d.status === 'pending').length,
    suspended: devices.filter(d => d.status === 'suspended').length,
    blocked: devices.filter(d => d.status === 'blocked').length,
    unlinked: devices.filter(d => d.status === 'unlinked').length,
    online: devices.filter(d => d.isOnline).length
  };

  return {
    total,
    page: pageNum,
    pageSize,
    totalPages,
    counts,
    terminals: items
  };
}

// Detailed terminal panel inspector (device info, shop, license, status history, last 20 sync events, orders, audit trail)
export function getTerminalDetails(deviceId) {
  const db = loadDatabase();
  const device = db.devices.find(d => d.deviceId === deviceId);
  if (!device) return null;

  const shop = db.shops.find(s => s.id === device.shopId);
  const license = db.licenses.find(l => l.licenseKey === device.licenseKey);
  const orders = db.orders.filter(o => o.deviceId === deviceId);
  const auditTrail = db.auditLogs.filter(a => a.terminalId === deviceId);
  const syncEvents = (db.syncLogs || []).filter(s => s.terminalId === deviceId).slice(0, 20);

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const now = Date.now();
  const lastPingMs = device.lastPing ? new Date(device.lastPing).getTime() : 0;
  const isOnline = (now - lastPingMs) < (3 * 60 * 1000) && device.status === 'active';

  return {
    ...device,
    isOnline,
    shop: shop || { id: device.shopId || 'UNKNOWN', name: device.shopName || 'Bakery Shop' },
    license: license || { licenseKey: device.licenseKey, status: 'active', maxDevices: 5 },
    totalRevenue,
    orderCount: orders.length,
    recentOrders: orders.slice(-5).reverse(),
    auditTrail: auditTrail.slice(0, 20),
    syncEvents
  };
}

// ─── TERMINAL ENFORCEMENT ACTIONS ─────────────────────────────────────────
export function setTerminalStatus({ deviceId, action, reason = '', adminUser = 'admin' }) {
  const db = loadDatabase();
  const device = db.devices.find(d => d.deviceId === deviceId);
  if (!device) return { success: false, error: 'NOT_FOUND', message: 'Terminal not found' };

  const validActions = ['suspend', 'activate', 'block', 'unlink'];
  if (!validActions.includes(action)) {
    return { success: false, error: 'INVALID_ACTION', message: `Action must be one of: ${validActions.join(', ')}` };
  }

  const statusMap = {
    suspend: 'suspended',
    activate: 'active',
    block: 'blocked',
    unlink: 'unlinked'
  };

  const newStatus = statusMap[action];
  const prevStatus = device.status;
  device.status = newStatus;
  device.statusReason = reason || `Terminal ${newStatus} by ${adminUser}`;
  device.statusUpdatedAt = new Date().toISOString();

  // Set pending command for mobile delivery
  device.pendingCommand = {
    command: action,
    reason: device.statusReason,
    issuedAt: new Date().toISOString(),
    ackedAt: null
  };

  // If activating, refresh signed offline token
  if (action === 'activate') {
    device.offlineToken = generateOfflineToken({
      deviceId: device.deviceId,
      shopId: device.shopId,
      licenseKey: device.licenseKey
    });
  }

  const audit = logAuditAction({
    adminUser,
    shopId: device.shopId || 'SHOP-001',
    terminalId: deviceId,
    action: `terminal_${action}`,
    reason: device.statusReason,
    metadata: { prevStatus, newStatus, model: device.model }
  }, db);

  saveDatabase(db);

  return {
    success: true,
    device,
    command: device.pendingCommand,
    audit,
    message: `Terminal ${device.model || deviceId} successfully ${action}d.`
  };
}

export function bulkUpdateTerminals({ deviceIds = [], action, reason = '', adminUser = 'admin' }) {
  const results = [];
  for (const id of deviceIds) {
    const res = setTerminalStatus({ deviceId: id, action, reason, adminUser });
    results.push({ deviceId: id, ...res });
  }
  return {
    success: true,
    processedCount: results.length,
    successCount: results.filter(r => r.success).length,
    results
  };
}

export function acknowledgeTerminalCommand(deviceId, command) {
  const db = loadDatabase();
  const device = db.devices.find(d => d.deviceId === deviceId);
  if (!device) return { success: false, error: 'NOT_FOUND' };

  if (device.pendingCommand && (!command || device.pendingCommand.command === command)) {
    device.pendingCommand.ackedAt = new Date().toISOString();
    saveDatabase(db);
    return { success: true, message: 'Command acknowledged by device.' };
  }
  return { success: true, message: 'No matching pending command.' };
}

// ─── TERMINAL REGISTRATION & ACCESS REQUEST ───────────────────────────────
export function requestDeviceAccess({ deviceId, model, osVersion, appVersion, shopName, ip }) {
  const db = loadDatabase();
  let device = db.devices.find(d => d.deviceId === deviceId);

  // Detect platform accurately
  let platform = 'android';
  if (model?.toLowerCase().includes('iphone') || model?.toLowerCase().includes('ipad') || osVersion?.toLowerCase().includes('ios')) {
    platform = 'ios';
  } else if (osVersion?.toLowerCase().includes('web') || model?.toLowerCase().includes('web')) {
    platform = 'web';
  }

  if (device) {
    device.lastPing = new Date().toISOString();
    if (ip) device.lastIp = ip;
    if (model) device.model = model;
    if (osVersion) device.osVersion = osVersion;
    if (appVersion) device.appVersion = appVersion;
    device.platform = platform;
    saveDatabase(db);

    if (device.status === 'active') {
      const token = generateToken({ deviceId, licenseKey: device.licenseKey, shopName: device.shopName });
      return {
        success: true,
        status: 'active',
        token,
        shopName: device.shopName,
        offlineToken: device.offlineToken || generateOfflineToken({ deviceId, shopId: device.shopId, licenseKey: device.licenseKey }),
        message: 'Device authorized.'
      };
    }

    if (device.status === 'pending') {
      return { success: true, status: 'pending', message: 'Waiting for administrator approval in BakerAdmin.' };
    }

    return {
      success: false,
      status: device.status,
      code: `TERMINAL_${device.status.toUpperCase()}`,
      reason: device.statusReason || `Device registration is ${device.status}.`,
      message: device.statusReason || `Device registration is ${device.status}. Contact administrator.`
    };
  }

  // Require at least one registered shop before pairing terminals
  if (!db.shops || db.shops.length === 0) {
    return {
      success: false,
      status: 'rejected',
      code: 'NO_SHOPS_CONFIGURED',
      message: 'No shops configured in BakerAdmin yet. Create a shop first.'
    };
  }
  const defaultShop = (shopName && db.shops.find(s => s.name.toLowerCase() === shopName.toLowerCase())) || db.shops[0];
  const licKey = 'LIC-' + (shopName || defaultShop.name).replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

  const newDevice = {
    id: 'DEV-' + Date.now().toString(36).toUpperCase(),
    deviceId,
    shopId: defaultShop.id,
    shopName: shopName || defaultShop.name,
    licenseKey: licKey,
    model: model || 'Android Phone',
    platform,
    osVersion: osVersion || 'Android',
    appVersion: appVersion || '1.0.7',
    status: 'pending',
    lastIp: ip || 'unknown',
    lastPing: new Date().toISOString(),
    lastSync: null,
    orderCount: 0,
    pendingOrdersCount: 0,
    requestedAt: new Date().toISOString(),
    registeredAt: null,
    statusReason: 'New terminal awaiting administrator approval',
    statusUpdatedAt: new Date().toISOString(),
    pendingCommand: null,
    offlineToken: null
  };

  db.devices.push(newDevice);

  // Create license record for this terminal
  let lic = db.licenses.find(l => l.licenseKey === licKey);
  if (!lic) {
    lic = {
      id: 'LIC-' + Date.now().toString(36).toUpperCase(),
      licenseKey: licKey,
      shopId: defaultShop.id,
      shopName: defaultShop.name,
      maxDevices: 5,
      status: 'active',
      expiresAt: defaultShop.paidUntil || '2027-12-31T23:59:59.000Z',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.licenses.push(lic);
  }

  logAuditAction({
    adminUser: 'mobile_client',
    shopId: defaultShop.id,
    terminalId: deviceId,
    action: 'device_request_access',
    reason: `Access request from ${newDevice.model} (${deviceId})`,
    metadata: { ip, model, osVersion, appVersion }
  }, db);

  saveDatabase(db);

  return {
    success: true,
    status: 'pending',
    message: 'Access request submitted. Please ask your administrator to approve this phone in BakerAdmin.'
  };
}

export function checkDeviceStatus(deviceId) {
  const db = loadDatabase();
  const device = db.devices.find(d => d.deviceId === deviceId);
  if (!device) return { exists: false, status: 'none', code: 'TERMINAL_NOT_FOUND' };

  return {
    exists: true,
    status: device.status,
    shopId: device.shopId,
    shopName: device.shopName,
    licenseKey: device.licenseKey,
    lastPing: device.lastPing,
    pendingCommand: device.pendingCommand,
    offlineToken: device.offlineToken,
    reason: device.statusReason || ''
  };
}

export function approveDevice(deviceId, customShopName, adminUser = 'admin') {
  const db = loadDatabase();
  const device = db.devices.find(d => d.deviceId === deviceId);
  if (!device) return { success: false, error: 'NOT_FOUND', message: 'Device not found' };

  device.status = 'active';
  if (customShopName) device.shopName = customShopName;
  device.registeredAt = new Date().toISOString();
  device.statusUpdatedAt = new Date().toISOString();
  device.statusReason = 'Approved by administrator';
  device.pendingCommand = {
    command: 'activate',
    reason: 'Approved by administrator',
    issuedAt: new Date().toISOString(),
    ackedAt: null
  };
  device.offlineToken = generateOfflineToken({
    deviceId: device.deviceId,
    shopId: device.shopId,
    licenseKey: device.licenseKey
  });

  // Ensure license exists and is active
  let lic = db.licenses.find(l => l.licenseKey === device.licenseKey);
  if (!lic) {
    lic = {
      id: 'LIC-' + Date.now().toString(36).toUpperCase(),
      licenseKey: device.licenseKey,
      shopId: device.shopId || 'SHOP-001',
      shopName: device.shopName,
      maxDevices: 5,
      status: 'active',
      expiresAt: '2027-12-31T23:59:59.000Z',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.licenses.push(lic);
  }

  logAuditAction({
    adminUser,
    shopId: device.shopId || 'SHOP-001',
    terminalId: deviceId,
    action: 'terminal_approve',
    reason: `Approved terminal ${device.model}`,
    metadata: { licenseKey: device.licenseKey }
  }, db);

  saveDatabase(db);

  return {
    success: true,
    device,
    token: generateToken({ deviceId, licenseKey: device.licenseKey, shopName: device.shopName }),
    offlineToken: device.offlineToken,
    message: `Terminal ${device.model} (${device.deviceId}) approved successfully.`
  };
}

export function rejectDevice(deviceId, adminUser = 'admin') {
  const db = loadDatabase();
  const device = db.devices.find(d => d.deviceId === deviceId);
  if (!device) return { success: false, error: 'NOT_FOUND', message: 'Device not found' };

  device.status = 'blocked';
  device.statusUpdatedAt = new Date().toISOString();
  device.statusReason = 'Registration rejected by administrator';
  device.pendingCommand = {
    command: 'block',
    reason: 'Registration rejected by administrator',
    issuedAt: new Date().toISOString(),
    ackedAt: null
  };

  logAuditAction({
    adminUser,
    shopId: device.shopId || 'SHOP-001',
    terminalId: deviceId,
    action: 'terminal_reject',
    reason: 'Registration rejected by administrator'
  }, db);

  saveDatabase(db);
  return { success: true, message: `Device ${device.model} rejected.` };
}

export function authorizeDeviceSwap(deviceId, adminUser = 'admin') {
  return setTerminalStatus({
    deviceId,
    action: 'unlink',
    reason: 'Unlinked for device replacement / hardware swap',
    adminUser
  });
}

export function recordHeartbeat({ deviceId, licenseKey, batteryLevel, appVersion, ip }) {
  const db = loadDatabase();
  const device = db.devices.find(d => d.deviceId === deviceId);

  if (!device) {
    return { success: false, error: 'NOT_REGISTERED', code: 'TERMINAL_NOT_REGISTERED', message: 'Device not registered' };
  }

  device.lastPing = new Date().toISOString();
  if (ip) device.lastIp = ip;
  if (appVersion) device.appVersion = appVersion;
  if (batteryLevel !== undefined) device.batteryLevel = batteryLevel;

  saveDatabase(db);

  // If terminal is suspended or blocked, return enforcement code
  if (device.status !== 'active') {
    return {
      success: false,
      status: device.status,
      code: `TERMINAL_${device.status.toUpperCase()}`,
      reason: device.statusReason || `Terminal is ${device.status}`,
      supportContact: '+251 911 234 567',
      pendingCommand: device.pendingCommand
    };
  }

  return {
    success: true,
    status: 'active',
    serverTime: new Date().toISOString(),
    pendingCommand: device.pendingCommand,
    offlineToken: device.offlineToken
  };
}

// ─── BATCH ORDER SYNC (IDEMPOTENT & SCALABLE) ─────────────────────────────
export function processBatchOrderSync({
  deviceId,
  licenseKey,
  orders = [],
  pendingCount = 0,
  inventoryUpdates = [],
  menuUpdates = []
}, clientIp) {
  const db = loadDatabase();
  const device = db.devices.find(d => d.deviceId === deviceId);

  // Enforcement check
  if (!device) {
    return {
      success: false,
      status: 'unlinked',
      code: 'TERMINAL_UNLINKED',
      message: 'Terminal is not registered with this server.'
    };
  }

  if (device.status === 'suspended') {
    return {
      success: false,
      status: 'suspended',
      code: 'TERMINAL_SUSPENDED',
      reason: device.statusReason || 'Terminal is suspended by administrator.',
      supportContact: '+251 911 234 567'
    };
  }

  if (device.status === 'blocked') {
    return {
      success: false,
      status: 'blocked',
      code: 'TERMINAL_BLOCKED',
      reason: device.statusReason || 'Terminal is blocked from accessing the system.',
      supportContact: '+251 911 234 567'
    };
  }

  if (device.status === 'unlinked') {
    return {
      success: false,
      status: 'unlinked',
      code: 'TERMINAL_UNLINKED',
      reason: device.statusReason || 'Terminal license binding has been unlinked.',
      supportContact: '+251 911 234 567'
    };
  }

  device.lastSync = new Date().toISOString();
  device.lastPing = new Date().toISOString();
  if (clientIp) device.lastIp = clientIp;
  device.pendingOrdersCount = Number(pendingCount) || 0;

  const existingMap = new Map();
  db.orders.forEach((o, idx) => {
    existingMap.set(String(o.id), idx);
  });

  const results = [];
  let addedCount = 0;
  let dupCount = 0;

  for (const ord of orders) {
    const ordId = String(ord.id);
    if (!ordId) {
      results.push({ orderId: 'UNKNOWN', status: 'error', error: 'Missing order ID' });
      continue;
    }

    const enriched = {
      ...ord,
      id: ordId,
      shopId: device.shopId,
      shopName: device.shopName,
      licenseKey: licenseKey || device.licenseKey,
      deviceId,
      phoneModel: device.model || 'Mobile Terminal',
      terminalName: device.shopName || 'Bakery POS',
      syncedAt: new Date().toISOString()
    };

    if (existingMap.has(ordId)) {
      // Idempotent: Update existing record without duplicating
      const existingIdx = existingMap.get(ordId);
      db.orders[existingIdx] = { ...db.orders[existingIdx], ...enriched };
      dupCount++;
      results.push({ orderId: ordId, status: 'duplicate' });
    } else {
      db.orders.push(enriched);
      existingMap.set(ordId, db.orders.length - 1);
      addedCount++;
      results.push({ orderId: ordId, status: 'synced' });
    }
  }

  // Process inventory changes if any
  if (inventoryUpdates && inventoryUpdates.length > 0) {
    for (const inv of inventoryUpdates) {
      const ex = db.inventory.find(i => i.id === inv.id);
      if (ex) {
        ex.stock = inv.stock;
        ex.updatedAt = new Date().toISOString();
      } else {
        db.inventory.push({ ...inv, updatedAt: new Date().toISOString() });
      }
    }
  }

  // Update terminal order counter
  device.orderCount = db.orders.filter(o => o.deviceId === deviceId).length;

  // Record sync log event
  const syncEvent = {
    id: 'SYNC-' + Date.now().toString(36).toUpperCase(),
    terminalId: deviceId,
    shopId: device.shopId,
    ordersCount: orders.length,
    addedCount,
    dupCount,
    pendingRemaining: Math.max(0, device.pendingOrdersCount - addedCount),
    timestamp: new Date().toISOString(),
    status: 'success'
  };
  db.syncLogs.unshift(syncEvent);
  if (db.syncLogs.length > 1000) db.syncLogs = db.syncLogs.slice(0, 1000);

  saveDatabase(db);

  return {
    success: true,
    processed: orders.length,
    synced: addedCount,
    duplicates: dupCount,
    totalOrdersInDb: db.orders.length,
    results,
    serverTime: new Date().toISOString()
  };
}

// Backward compatibility alias for processCloudSyncPush
export function processCloudSyncPush(payload, clientIp) {
  return processBatchOrderSync(payload, clientIp);
}

// Restore shop data in batches
export function restoreShopData(licenseKey, deviceId, { offset = 0, batchSize = 100 } = {}) {
  const db = loadDatabase();
  const device = db.devices.find(d => d.deviceId === deviceId);

  if (!device || device.status !== 'active') {
    return {
      success: false,
      error: 'UNAUTHORIZED',
      code: 'TERMINAL_NOT_AUTHORIZED',
      message: 'Terminal not authorized for data restoration.'
    };
  }

  const shopOrders = db.orders.filter(o => o.deviceId === deviceId || o.licenseKey === licenseKey || o.shopId === device.shopId);
  const totalOrders = shopOrders.length;
  const start = Number(offset) || 0;
  const limit = Math.max(1, Number(batchSize) || 100);
  const chunk = shopOrders.slice(start, start + limit);

  return {
    success: true,
    shopName: device.shopName,
    totalOrders,
    offset: start,
    limit,
    hasMore: (start + chunk.length) < totalOrders,
    orders: chunk,
    products: db.products || [],
    inventory: db.inventory || [],
    restoredAt: new Date().toISOString()
  };
}

// ─── ORDERS FILTERING & FAST INDEXED QUERIES (AFRICA/ADDIS_ABABA TIME) ─────
export function queryOrdersWithFilter({
  page = 1,
  limit = 25,
  startDate,
  endDate,
  startTime,
  endTime,
  terminalId,
  shopId,
  paymentMethod,
  search,
  sortBy = 'createdAt',
  sortOrder = 'desc'
}) {
  const db = loadDatabase();
  const devices = getDevicesWithStatus();
  const devMap = new Map();
  devices.forEach(d => devMap.set(d.deviceId, d));

  let orders = (db.orders || []).map(o => {
    const dev = devMap.get(o.deviceId);
    return {
      ...o,
      phoneModel: o.phoneModel || (dev ? dev.model : 'Mobile Terminal'),
      terminalName: o.terminalName || (dev ? dev.shopName : 'Bakery POS'),
      deviceId: o.deviceId || 'DEV-UNKNOWN'
    };
  });

  // Filter: Terminal
  if (terminalId && terminalId !== 'ALL' && terminalId !== 'All') {
    orders = orders.filter(o => o.deviceId === terminalId);
  }

  // Filter: Shop
  if (shopId && shopId !== 'ALL' && shopId !== 'All') {
    orders = orders.filter(o => o.shopId === shopId);
  }

  // Filter: Payment Method
  if (paymentMethod && paymentMethod !== 'ALL' && paymentMethod !== 'All') {
    orders = orders.filter(o => (o.paymentMethod || '').toLowerCase() === paymentMethod.toLowerCase());
  }

  // Filter: Date & Time in Addis Ababa (UTC+3)
  // Addis Ababa has a fixed UTC+3 offset year-round (no DST)
  const ADDIS_OFFSET_MS = 3 * 3600 * 1000;

  if (startDate || endDate) {
    orders = orders.filter(o => {
      if (!o.createdAt) return false;
      const orderDateObj = new Date(new Date(o.createdAt).getTime() + ADDIS_OFFSET_MS);
      const orderDateStr = orderDateObj.toISOString().split('T')[0];
      const orderTimeStr = orderDateObj.toISOString().split('T')[1].substring(0, 5); // HH:mm

      if (startDate && orderDateStr < startDate) return false;
      if (endDate && orderDateStr > endDate) return false;

      if (startTime && startDate && orderDateStr === startDate && orderTimeStr < startTime) return false;
      if (endTime && endDate && orderDateStr === endDate && orderTimeStr > endTime) return false;

      return true;
    });
  }

  // Filter: Search
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    orders = orders.filter(o => {
      const matchId = String(o.id || '').toLowerCase().includes(q);
      const matchCust = String(o.customerName || '').toLowerCase().includes(q);
      const matchModel = String(o.phoneModel || '').toLowerCase().includes(q);
      let matchItem = false;
      if (Array.isArray(o.items)) {
        matchItem = o.items.some(it => String(it.name || '').toLowerCase().includes(q));
      } else if (typeof o.items === 'string') {
        matchItem = o.items.toLowerCase().includes(q);
      }
      return matchId || matchCust || matchModel || matchItem;
    });
  }

  // Exact Totals across the complete filtered match
  let totalSales = 0;
  let cashTotal = 0;
  let cardTotal = 0;
  let mobileTotal = 0;

  for (const o of orders) {
    const amt = Number(o.total || 0);
    totalSales += amt;
    const pm = (o.paymentMethod || '').toLowerCase();
    if (pm === 'cash') cashTotal += amt;
    else if (pm === 'card') cardTotal += amt;
    else if (pm === 'mobile') mobileTotal += amt;
    else cashTotal += amt;
  }

  const orderCount = orders.length;
  const averageOrderValue = orderCount > 0 ? (totalSales / orderCount) : 0;

  // Sorting
  orders.sort((a, b) => {
    let valA = a[sortBy] ?? '';
    let valB = b[sortBy] ?? '';
    if (sortBy === 'total') {
      valA = Number(valA || 0);
      valB = Number(valB || 0);
    } else {
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
    }
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const pageNum = Math.max(1, Number(page) || 1);
  const pageSize = Math.max(1, Math.min(500, Number(limit) || 25));
  const totalPages = Math.ceil(orderCount / pageSize) || 1;
  const offset = (pageNum - 1) * pageSize;
  const paginated = orders.slice(offset, offset + pageSize);

  return {
    total: orderCount,
    page: pageNum,
    pageSize,
    totalPages,
    totals: {
      orderCount,
      totalSales,
      averageOrderValue,
      paymentTotals: {
        cash: cashTotal,
        card: cardTotal,
        mobile: mobileTotal
      }
    },
    orders: paginated
  };
}

// Global stats for admin dashboard
export function getAdminStats({ terminalId, shopId } = {}) {
  const db = loadDatabase();
  const devices = getDevicesWithStatus();
  let orders = db.orders || [];

  if (terminalId && terminalId !== 'ALL' && terminalId !== 'All') {
    orders = orders.filter(o => o.deviceId === terminalId);
  }
  if (shopId && shopId !== 'ALL' && shopId !== 'All') {
    orders = orders.filter(o => o.shopId === shopId);
  }

  const ADDIS_OFFSET_MS = 3 * 3600 * 1000;
  const todayStr = new Date(Date.now() + ADDIS_OFFSET_MS).toISOString().split('T')[0];

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const todayOrders = orders.filter(o => {
    if (!o.createdAt) return false;
    const dStr = new Date(new Date(o.createdAt).getTime() + ADDIS_OFFSET_MS).toISOString().split('T')[0];
    return dStr === todayStr;
  });
  const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

  const todayCash = todayOrders.filter(o => (o.paymentMethod || '').toLowerCase() === 'cash').reduce((sum, o) => sum + Number(o.total || 0), 0);
  const todayCard = todayOrders.filter(o => (o.paymentMethod || '').toLowerCase() === 'card').reduce((sum, o) => sum + Number(o.total || 0), 0);
  const todayMobile = todayOrders.filter(o => (o.paymentMethod || '').toLowerCase() === 'mobile').reduce((sum, o) => sum + Number(o.total || 0), 0);
  const avgOrder = todayOrders.length > 0 ? (todayRevenue / todayOrders.length) : (orders.length > 0 ? totalRevenue / orders.length : 0);

  return {
    allTime: {
      ordersCount: orders.length,
      revenue: totalRevenue,
    },
    today: {
      ordersCount: todayOrders.length,
      revenue: todayRevenue,
      averageOrderValue: avgOrder,
      cashTotal: todayCash,
      cardTotal: todayCard,
      mobileTotal: todayMobile,
    },
    devices: {
      total: devices.length,
      online: devices.filter(d => d.isOnline).length,
      active: devices.filter(d => d.status === 'active').length,
      pending: devices.filter(d => d.status === 'pending').length,
      suspended: devices.filter(d => d.status === 'suspended').length,
      blocked: devices.filter(d => d.status === 'blocked').length,
      unlinked: devices.filter(d => d.status === 'unlinked').length,
    },
    shopsCount: (db.shops || []).length,
    licensesCount: (db.licenses || []).length,
    lastSync: devices.map(d => d.lastSync).filter(Boolean).sort().reverse()[0] || null,
    inventory: db.inventory || [],
    products: db.products || []
  };
}

export const registerDevice = requestDeviceAccess;
