import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  authenticateAdmin,
  verifyToken,
  loadDatabase,
  saveDatabase,
  registerDevice,
  recordHeartbeat,
  getDevicesWithStatus,
  getTerminalsPaginated,
  getTerminalDetails,
  setTerminalStatus,
  bulkUpdateTerminals,
  acknowledgeTerminalCommand,
  getShops,
  createShop,
  updateShop,
  suspendAllShopTerminals,
  getLicenses,
  createLicense,
  processBatchOrderSync,
  restoreShopData,
  queryOrdersWithFilter,
  getAdminStats,
  getAuditLogs,
  requestDeviceAccess,
  checkDeviceStatus,
  approveDevice,
  rejectDevice,
  authorizeDeviceSwap
} from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security Hardening: Disable information disclosure headers
app.disable('x-powered-by');

// Security Hardening: Enterprise HTTP Response Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Helper to get network IP addresses (prioritizes active Wi-Fi / LAN over virtual adapters)
function getNetworkIps() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ name, ip: iface.address });
      }
    }
  }
  addresses.sort((a, b) => {
    const isVirtual = (item) => {
      const n = item.name.toLowerCase();
      const ip = item.ip;
      return n.includes('virtual') || n.includes('vethernet') || n.includes('wsl') ||
             ip.startsWith('192.168.56.') || ip.startsWith('172.19.') || ip.startsWith('169.254.');
    };
    const isWiFi = (item) => {
      const n = item.name.toLowerCase();
      return n.includes('wi-fi') || n.includes('wifi') || n.includes('wireless') || n.includes('wlan');
    };
    if (isWiFi(a) && !isWiFi(b)) return -1;
    if (!isWiFi(a) && isWiFi(b)) return 1;
    if (isVirtual(a) && !isVirtual(b)) return 1;
    if (!isVirtual(a) && isVirtual(b)) return -1;
    return 0;
  });
  return addresses.map(a => a.ip);
}

// ─── SIMPLE RATE LIMITER ──────────────────────────────────────────────────
const rateLimitMap = new Map();
function rateLimiter(limit = 60, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };

    if (now > record.resetAt) {
      record.count = 1;
      record.resetAt = now + windowMs;
    } else {
      record.count++;
      if (record.count > limit) {
        return res.status(429).json({
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please wait before retrying.'
        });
      }
    }
    rateLimitMap.set(ip, record);
    next();
  };
}

// ─── REAL-TIME PUSH CHANNEL (SERVER-SENT EVENTS) ──────────────────────────
// Maps deviceId -> Active SSE HTTP Response
const activeTerminalStreams = new Map();

export function pushCommandToTerminal(deviceId, payload) {
  const stream = activeTerminalStreams.get(deviceId);
  if (stream && !stream.writableEnded) {
    try {
      stream.write(`event: terminal_command\ndata: ${JSON.stringify(payload)}\n\n`);
      return true; // Delivered immediately to live phone
    } catch {
      activeTerminalStreams.delete(deviceId);
      return false;
    }
  }
  return false; // Offline or awaiting polling
}

// Terminal SSE Connection Stream
app.get('/api/device/stream/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  if (!deviceId) return res.status(400).end();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  activeTerminalStreams.set(deviceId, res);

  // Send initial handshake
  const db = loadDatabase();
  const dev = db.devices.find(d => d.deviceId === deviceId);
  const status = dev ? dev.status : 'unknown';

  res.write(`event: connected\ndata: ${JSON.stringify({ deviceId, status, serverTime: new Date().toISOString() })}\n\n`);

  // Deliver any pending command immediately
  if (dev && dev.pendingCommand && !dev.pendingCommand.ackedAt) {
    res.write(`event: terminal_command\ndata: ${JSON.stringify(dev.pendingCommand)}\n\n`);
  }

  // Keep-alive heartbeat every 20s
  const pinger = setInterval(() => {
    if (!res.writableEnded) {
      res.write(`: ping\n\n`);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(pinger);
    activeTerminalStreams.delete(deviceId);
  });
});

// Acknowledge command from phone
app.post('/api/device/ack-command', (req, res) => {
  const { deviceId, command } = req.body || {};
  if (!deviceId) return res.status(400).json({ success: false, error: 'MISSING_DEVICE_ID' });
  const result = acknowledgeTerminalCommand(deviceId, command);
  res.json(result);
});

// ─── ADMIN AUTHENTICATION MIDDLEWARE ──────────────────────────────────────
function requireAdminAuth(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Admin authentication required' });
  }

  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    return res.status(401).json({ success: false, error: 'INVALID_TOKEN', message: 'Invalid or expired session token' });
  }

  req.admin = payload;
  next();
}

// ─── 1. PUBLIC SERVER STATUS ──────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  const stats = getAdminStats();
  const ips = getNetworkIps();
  res.json({
    status: 'online',
    serverTime: new Date().toISOString(),
    primaryIp: ips[0] || 'localhost',
    allIps: ips,
    port: PORT,
    activeDevices: stats.devices.online,
    totalOrders: stats.allTime.ordersCount,
    lastSync: stats.lastSync
  });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, status: 'online', time: new Date().toISOString() });
});

// ─── 2. ADMIN AUTHENTICATION & BRUTE-FORCE PROTECTION ──────────────────────
const failedLoginTracker = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minute lockout

function loginBruteForceLimiter(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = failedLoginTracker.get(ip) || { failures: 0, lockedUntil: 0 };

  if (record.lockedUntil > now) {
    const minsLeft = Math.ceil((record.lockedUntil - now) / 60000);
    return res.status(429).json({
      success: false,
      error: 'TOO_MANY_FAILED_ATTEMPTS',
      message: `Account authentication is temporarily locked due to repeated failures. Retry in ${minsLeft} minute(s).`
    });
  }

  if (now > record.lockedUntil && record.lockedUntil !== 0) {
    record.failures = 0;
    record.lockedUntil = 0;
  }

  req.authTracker = { ip, record };
  next();
}

app.post('/api/auth/login', loginBruteForceLimiter, (req, res) => {
  const { username, password } = req.body || {};
  const { ip, record } = req.authTracker;
  const now = Date.now();

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'MISSING_FIELDS', message: 'Username and password required' });
  }

  const result = authenticateAdmin(username, password);
  if (result.success) {
    // Reset failed counter on success
    failedLoginTracker.delete(ip);
    return res.json(result);
  }

  // Increment failed attempts
  record.failures += 1;
  const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - record.failures);
  if (record.failures >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    failedLoginTracker.set(ip, record);
    return res.status(429).json({
      success: false,
      error: 'ACCOUNT_LOCKED',
      message: 'Maximum failed authentication attempts exceeded. Terminal locked for 15 minutes.'
    });
  }

  failedLoginTracker.set(ip, record);
  res.status(401).json({
    ...result,
    remainingAttempts: remaining
  });
});

app.get('/api/auth/me', requireAdminAuth, (req, res) => {
  res.json({ success: true, user: req.admin });
});

// ─── 3. MOBILE DEVICE REGISTRATION & ACCESS REQUEST ───────────────────────
app.post('/api/device/request-access', rateLimiter(60, 60000), (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const { deviceId, model, osVersion, appVersion, shopName } = req.body;

  if (!deviceId) {
    return res.status(400).json({ success: false, error: 'MISSING_DEVICE_ID', message: 'Hardware Device ID is required.' });
  }

  const result = requestDeviceAccess({ deviceId, model, osVersion, appVersion, shopName, ip: clientIp });
  res.json(result);
});

app.get('/api/device/check-status', rateLimiter(120, 60000), (req, res) => {
  const { deviceId } = req.query;
  if (!deviceId) {
    return res.status(400).json({ success: false, error: 'MISSING_DEVICE_ID' });
  }
  const result = checkDeviceStatus(deviceId);

  // If blocked or suspended, return 403 status with explicit code
  if (result.exists && ['suspended', 'blocked', 'unlinked'].includes(result.status)) {
    return res.status(403).json({
      success: false,
      code: `TERMINAL_${result.status.toUpperCase()}`,
      status: result.status,
      reason: result.reason || `Terminal access is ${result.status}.`,
      supportContact: '+251 911 234 567',
      pendingCommand: result.pendingCommand
    });
  }

  res.json(result);
});

app.post('/api/device/register', rateLimiter(30, 60000), (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const { licenseKey, deviceId, model, osVersion, appVersion, shopName } = req.body;

  if (!deviceId) {
    return res.status(400).json({ success: false, error: 'MISSING_FIELDS', message: 'Hardware Device ID required.' });
  }

  const result = requestDeviceAccess({
    deviceId,
    model,
    osVersion,
    appVersion,
    shopName,
    ip: clientIp
  });

  if (!result.success) {
    return res.status(403).json(result);
  }
  res.json(result);
});

app.post('/api/device/heartbeat', (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const { deviceId, licenseKey, batteryLevel, appVersion } = req.body;

  if (!deviceId) {
    return res.status(400).json({ success: false, error: 'MISSING_DEVICE_ID' });
  }

  const result = recordHeartbeat({
    deviceId,
    licenseKey,
    batteryLevel,
    appVersion,
    ip: clientIp
  });

  if (!result.success) {
    return res.status(403).json(result);
  }
  res.json(result);
});

// ─── 4. OFFLINE-FIRST BATCH ORDER SYNC & RESTORATION ──────────────────────
app.post('/api/sync/batch', (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const { deviceId, licenseKey, orders, pendingCount, inventoryUpdates, menuUpdates } = req.body;

  if (!deviceId) {
    return res.status(400).json({ success: false, error: 'MISSING_DEVICE_ID', message: 'Device ID required' });
  }

  const result = processBatchOrderSync({
    deviceId,
    licenseKey,
    orders: orders || [],
    pendingCount: pendingCount || 0,
    inventoryUpdates: inventoryUpdates || [],
    menuUpdates: menuUpdates || []
  }, clientIp);

  if (!result.success) {
    return res.status(403).json(result);
  }
  res.json(result);
});

// Backward-compatible alias
app.post('/api/sync/push', (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const result = processBatchOrderSync(req.body, clientIp);
  if (!result.success) {
    return res.status(403).json(result);
  }
  res.json(result);
});

// Legacy backward-compatibility alias for /api/sync
app.post('/api/sync', (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const result = processBatchOrderSync(req.body, clientIp);
  if (!result.success) return res.status(403).json(result);
  res.json(result);
});

app.get('/api/sync/restore-shop-data', (req, res) => {
  const { licenseKey, deviceId, offset = 0, batchSize = 100 } = req.query;

  if (!deviceId) {
    return res.status(400).json({ success: false, error: 'MISSING_CREDENTIALS', message: 'Device ID required' });
  }

  const result = restoreShopData(licenseKey, deviceId, { offset, batchSize });
  if (!result.success) {
    return res.status(403).json(result);
  }
  res.json(result);
});

// ─── 5. PROTECTED ADMIN PORTAL ENDPOINTS ──────────────────────────────────
app.get('/api/admin/stats', requireAdminAuth, (req, res) => {
  const { terminalId, shopId } = req.query;
  res.json(getAdminStats({ terminalId, shopId }));
});

// Terminals list with server-side pagination, search, and filters
app.get('/api/admin/terminals', requireAdminAuth, (req, res) => {
  const { page, limit, search, status, shopId, online, appVersion, sortBy, sortOrder } = req.query;
  const data = getTerminalsPaginated({
    page,
    limit,
    search,
    status,
    shopId,
    online,
    appVersion,
    sortBy,
    sortOrder
  });
  res.json(data);
});

// Backward compatibility alias for /api/admin/devices
app.get('/api/admin/devices', requireAdminAuth, (req, res) => {
  const devices = getDevicesWithStatus();
  res.json({ total: devices.length, devices });
});

// Terminal Details Inspector
app.get('/api/admin/terminals/:deviceId', requireAdminAuth, (req, res) => {
  const { deviceId } = req.params;
  const details = getTerminalDetails(deviceId);
  if (!details) return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Terminal not found' });
  res.json({ success: true, terminal: details });
});

// Terminal Row Actions (Suspend, Activate, Block, Unlink)
app.post('/api/admin/terminals/:deviceId/action', requireAdminAuth, (req, res) => {
  const { deviceId } = req.params;
  const { action, reason } = req.body || {};
  const adminUser = req.admin?.username || 'admin';

  const result = setTerminalStatus({
    deviceId,
    action,
    reason,
    adminUser
  });

  if (!result.success) {
    return res.status(400).json(result);
  }

  // Push immediate real-time event to mobile phone if connected
  const delivered = pushCommandToTerminal(deviceId, result.command);
  result.deliveredImmediately = delivered;

  res.json(result);
});

// Bulk Terminal Actions
app.post('/api/admin/terminals/bulk-action', requireAdminAuth, (req, res) => {
  const { deviceIds, action, reason } = req.body || {};
  const adminUser = req.admin?.username || 'admin';

  if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
    return res.status(400).json({ success: false, error: 'MISSING_DEVICE_IDS', message: 'Select at least one terminal' });
  }

  const result = bulkUpdateTerminals({ deviceIds, action, reason, adminUser });

  // Push to all connected target phones
  let deliveredCount = 0;
  for (const r of result.results) {
    if (r.command && pushCommandToTerminal(r.deviceId, r.command)) {
      deliveredCount++;
    }
  }
  result.deliveredCount = deliveredCount;

  res.json(result);
});

// Approve & Reject Pending Terminals
app.post(['/api/admin/devices/:deviceId/approve', '/api/admin/terminals/:deviceId/approve'], requireAdminAuth, (req, res) => {
  const { deviceId } = req.params;
  const { shopName } = req.body || {};
  const adminUser = req.admin?.username || 'admin';
  const result = approveDevice(deviceId, shopName, adminUser);
  if (!result.success) return res.status(404).json(result);

  pushCommandToTerminal(deviceId, { command: 'activate', reason: 'Approved by administrator' });
  res.json(result);
});

app.post(['/api/admin/devices/:deviceId/reject', '/api/admin/terminals/:deviceId/reject'], requireAdminAuth, (req, res) => {
  const { deviceId } = req.params;
  const adminUser = req.admin?.username || 'admin';
  const result = rejectDevice(deviceId, adminUser);
  if (!result.success) return res.status(404).json(result);

  pushCommandToTerminal(deviceId, { command: 'block', reason: 'Registration rejected by administrator' });
  res.json(result);
});

app.post('/api/admin/devices/:deviceId/swap', requireAdminAuth, (req, res) => {
  const { deviceId } = req.params;
  const adminUser = req.admin?.username || 'admin';
  const result = authorizeDeviceSwap(deviceId, adminUser);
  if (!result.success) return res.status(404).json(result);

  pushCommandToTerminal(deviceId, { command: 'unlink', reason: 'Unlinked by administrator' });
  res.json(result);
});

// ─── SHOPS & CLIENTS MANAGEMENT ───────────────────────────────────────────
app.get('/api/admin/shops', requireAdminAuth, (req, res) => {
  const shops = getShops();
  res.json({ total: shops.length, shops });
});

app.post('/api/admin/shops', requireAdminAuth, (req, res) => {
  const { name, contactPhone, email, address, plan, paidUntil, gracePeriodDays, autoSuspend } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'MISSING_NAME', message: 'Shop name is required' });
  }

  const adminUser = req.admin?.username || 'admin';
  const result = createShop({ name, contactPhone, email, address, plan, paidUntil, gracePeriodDays, autoSuspend, adminUser });
  res.json(result);
});

app.put('/api/admin/shops/:shopId', requireAdminAuth, (req, res) => {
  const { shopId } = req.params;
  const adminUser = req.admin?.username || 'admin';
  const result = updateShop({ id: shopId, ...req.body, adminUser });
  if (!result.success) return res.status(404).json(result);
  res.json(result);
});

app.post('/api/admin/shops/:shopId/suspend-all', requireAdminAuth, (req, res) => {
  const { shopId } = req.params;
  const { reason } = req.body || {};
  const adminUser = req.admin?.username || 'admin';

  const result = suspendAllShopTerminals({ shopId, reason, adminUser });
  if (!result.success) return res.status(404).json(result);

  // Notify all connected terminals of this shop
  const db = loadDatabase();
  const shopDevs = db.devices.filter(d => d.shopId === shopId);
  for (const d of shopDevs) {
    if (d.pendingCommand) {
      pushCommandToTerminal(d.deviceId, d.pendingCommand);
    }
  }

  res.json(result);
});

// ─── LICENSES ─────────────────────────────────────────────────────────────
app.get('/api/admin/licenses', requireAdminAuth, (req, res) => {
  const licenses = getLicenses();
  res.json({ total: licenses.length, licenses });
});

app.post('/api/admin/licenses', requireAdminAuth, (req, res) => {
  const { licenseKey, shopId, shopName, maxDevices } = req.body;
  const adminUser = req.admin?.username || 'admin';
  const result = createLicense({ licenseKey, shopId, shopName, maxDevices, adminUser });
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// ─── ORDERS WITH FULL DATE FILTERING & TOTALS ──────────────────────────────
app.get('/api/admin/orders', requireAdminAuth, (req, res) => {
  const {
    page,
    limit,
    startDate,
    endDate,
    startTime,
    endTime,
    terminalId,
    shopId,
    paymentMethod,
    search,
    sortBy,
    sortOrder
  } = req.query;

  const result = queryOrdersWithFilter({
    page,
    limit,
    startDate,
    endDate,
    startTime,
    endTime,
    terminalId,
    shopId,
    paymentMethod,
    search,
    sortBy,
    sortOrder
  });

  res.json(result);
});

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────
app.get('/api/admin/audit-logs', requireAdminAuth, (req, res) => {
  const { terminalId, shopId, limit } = req.query;
  const logs = getAuditLogs({ terminalId, shopId, limit });
  res.json({ total: logs.length, logs });
});

// ─── EXPORT CSV & JSON ────────────────────────────────────────────────────
app.get('/api/admin/export', requireAdminAuth, (req, res) => {
  const {
    format = 'json',
    startDate,
    endDate,
    terminalId,
    shopId,
    paymentMethod,
    search
  } = req.query;

  if (format === 'csv') {
    const result = queryOrdersWithFilter({
      page: 1,
      limit: 100000,
      startDate,
      endDate,
      terminalId,
      shopId,
      paymentMethod,
      search,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });

    const header = 'Order ID,Date (UTC),Terminal,Model,Shop,Payment Method,Customer,Subtotal (ETB),Tax (ETB),Total (ETB),Items Count\n';
    const rows = result.orders.map(o =>
      `"${o.id}","${o.createdAt || ''}","${o.deviceId || ''}","${o.phoneModel || ''}","${o.shopName || o.terminalName || ''}","${o.paymentMethod || 'Cash'}","${(o.customerName || 'Walk-in').replace(/"/g, '""')}",${Number(o.subtotal || 0).toFixed(2)},${Number(o.tax || 0).toFixed(2)},${Number(o.total || 0).toFixed(2)},${(o.items || []).length}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="orders-${startDate || 'all'}-to-${endDate || 'now'}.csv"`);
    return res.send(header + rows);
  }

  const db = loadDatabase();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="bakery-full-cloud-backup-${new Date().toISOString().split('T')[0]}.json"`);
  res.json(db);
});

// ─── IMPORT / RESTORE DATABASE BACKUP ────────────────────────────────────
app.post('/api/admin/import', requireAdminAuth, (req, res) => {
  try {
    const backupData = req.body;
    if (!backupData || typeof backupData !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid backup file. Must be a valid JSON object.' });
    }

    if (!Array.isArray(backupData.orders) && !Array.isArray(backupData.products) && !Array.isArray(backupData.devices)) {
      return res.status(400).json({ success: false, message: 'Invalid backup format. File must contain orders, products, or devices.' });
    }

    const currentDb = loadDatabase();
    const backupDir = path.join(__dirname, 'data', 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(path.join(backupDir, `pre_restore_backup_${Date.now()}.json`), JSON.stringify(currentDb, null, 2), 'utf8');

    const restoredDb = {
      admin: backupData.admin || currentDb.admin,
      shops: Array.isArray(backupData.shops) ? backupData.shops : (currentDb.shops || []),
      licenses: Array.isArray(backupData.licenses) ? backupData.licenses : (currentDb.licenses || []),
      devices: Array.isArray(backupData.devices) ? backupData.devices : (currentDb.devices || []),
      inventory: Array.isArray(backupData.inventory) ? backupData.inventory : (currentDb.inventory || []),
      products: Array.isArray(backupData.products) ? backupData.products : (currentDb.products || []),
      orders: Array.isArray(backupData.orders) ? backupData.orders : (currentDb.orders || []),
      syncLogs: Array.isArray(backupData.syncLogs) ? backupData.syncLogs : (currentDb.syncLogs || []),
      auditLogs: Array.isArray(backupData.auditLogs) ? backupData.auditLogs : (currentDb.auditLogs || [])
    };

    saveDatabase(restoredDb);

    res.json({
      success: true,
      message: 'Database snapshot restored successfully.',
      stats: {
        ordersCount: restoredDb.orders.length,
        productsCount: restoredDb.products.length,
        devicesCount: restoredDb.devices.length,
        shopsCount: restoredDb.shops.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Restore failed: ' + err.message });
  }
});

// ─── 6. PRODUCTION FRONTEND SERVING ───────────────────────────────────────
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  const ips = getNetworkIps();
  console.log(`\n======================================================`);
  console.log(`  BAKERY ADMIN ENTERPRISE CONTROL SERVER ACTIVE`);
  console.log(`======================================================`);
  console.log(`  Local URL:          http://localhost:${PORT}`);
  if (ips.length > 0) {
    console.log(`  Company Server IP:  http://${ips[0]}:${PORT}`);
    console.log(`  Device Register:    http://${ips[0]}:${PORT}/api/device/register`);
    console.log(`  Batch Order Sync:   http://${ips[0]}:${PORT}/api/sync/batch`);
    console.log(`  Realtime Stream:    http://${ips[0]}:${PORT}/api/device/stream/:id`);
  }
  console.log(`======================================================\n`);
});
