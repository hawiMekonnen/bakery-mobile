import os

admin_root = r"c:\Users\user\Desktop\bakery admin"

server_js_path = os.path.join(admin_root, "server.js")

with open(server_js_path, "w", encoding="utf-8") as f:
    f.write("""import express from 'express';
import cors from 'cors';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  authenticateAdmin,
  verifyToken,
  loadDatabase,
  registerDevice,
  recordHeartbeat,
  getDevicesWithStatus,
  updateDeviceStatus,
  authorizeDeviceSwap,
  getLicenses,
  createLicense,
  processCloudSyncPush,
  restoreShopData,
  getAdminStats
} from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to get network IP addresses
function getNetworkIps() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

// Authentication Middleware for Protected Admin Routes
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Admin authentication required' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload || payload.role !== 'admin') {
    return res.status(401).json({ success: false, error: 'INVALID_TOKEN', message: 'Invalid or expired session token' });
  }

  req.admin = payload;
  next();
}

// ==========================================
// 1. PUBLIC SERVER STATUS
// ==========================================
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

// ==========================================
// 2. ADMIN AUTHENTICATION
// ==========================================
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'MISSING_FIELDS', message: 'Username and password required' });
  }

  const result = authenticateAdmin(username, password);
  if (result.success) {
    return res.json(result);
  }
  res.status(401).json(result);
});

app.get('/api/auth/me', requireAdminAuth, (req, res) => {
  res.json({ success: true, user: req.admin });
});

// ==========================================
// 3. MOBILE DEVICE REGISTRATION & ANTI-TRANSFER
// ==========================================
app.post('/api/device/register', (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const { licenseKey, deviceId, model, osVersion, appVersion, shopName } = req.body;

  if (!licenseKey || !deviceId) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_FIELDS',
      message: 'License Key and Hardware Device ID are required.'
    });
  }

  const result = registerDevice({
    licenseKey,
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

  res.json(result);
});

// ==========================================
// 4. OFFLINE-FIRST CLOUD SYNC & DISASTER RESTORE
// ==========================================
app.post('/api/sync/push', (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const { licenseKey, deviceId, orders, products, inventory } = req.body;

  if (!licenseKey || !deviceId) {
    return res.status(400).json({ success: false, error: 'MISSING_CREDENTIALS' });
  }

  const result = processCloudSyncPush({
    licenseKey,
    deviceId,
    orders: orders || [],
    products: products || [],
    inventory: inventory || []
  }, clientIp);

  if (!result.success) {
    return res.status(403).json(result);
  }

  res.json(result);
});

// Legacy backward-compatibility alias for /api/sync
app.post('/api/sync', (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const result = processCloudSyncPush(req.body, clientIp);
  res.json(result);
});

app.get('/api/sync/restore-shop-data', (req, res) => {
  const { licenseKey, deviceId } = req.query;

  if (!licenseKey || !deviceId) {
    return res.status(400).json({ success: false, error: 'MISSING_CREDENTIALS', message: 'License Key and Device ID required' });
  }

  const result = restoreShopData(licenseKey, deviceId);
  if (!result.success) {
    return res.status(403).json(result);
  }

  res.json(result);
});

// ==========================================
// 5. PROTECTED ADMIN PORTAL ENDPOINTS
// ==========================================
app.get('/api/admin/stats', requireAdminAuth, (req, res) => {
  res.json(getAdminStats());
});

app.get('/api/admin/devices', requireAdminAuth, (req, res) => {
  const devices = getDevicesWithStatus();
  res.json({
    total: devices.length,
    devices
  });
});

app.post('/api/admin/devices/:deviceId/status', requireAdminAuth, (req, res) => {
  const { deviceId } = req.params;
  const { status } = req.body;
  const result = updateDeviceStatus(deviceId, status);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post('/api/admin/devices/:deviceId/swap', requireAdminAuth, (req, res) => {
  const { deviceId } = req.params;
  const result = authorizeDeviceSwap(deviceId);
  if (!result.success) {
    return res.status(404).json(result);
  }
  res.json(result);
});

app.get('/api/admin/licenses', requireAdminAuth, (req, res) => {
  const licenses = getLicenses();
  const devices = getDevicesWithStatus();

  // Attach registered device info to each license
  const enriched = licenses.map(lic => {
    const bound = devices.filter(d => d.licenseKey === lic.licenseKey);
    return {
      ...lic,
      activeDeviceCount: bound.length,
      boundDevices: bound
    };
  });

  res.json({ total: enriched.length, licenses: enriched });
});

app.post('/api/admin/licenses', requireAdminAuth, (req, res) => {
  const { licenseKey, shopName, maxDevices } = req.body;
  const result = createLicense({ licenseKey, shopName, maxDevices });
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.get('/api/admin/orders', requireAdminAuth, (req, res) => {
  const db = loadDatabase();
  const { date, payment, search, license, limit = 500 } = req.query;
  let orders = db.orders || [];

  if (license && license !== 'All') {
    orders = orders.filter(o => o.licenseKey === license);
  }
  if (date && date !== 'All') {
    orders = orders.filter(o => (o.createdAt || '').startsWith(date));
  }
  if (payment && payment !== 'All') {
    orders = orders.filter(o => (o.paymentMethod || '').toLowerCase() === payment.toLowerCase());
  }
  if (search) {
    const q = search.toLowerCase();
    orders = orders.filter(o =>
      (o.id || '').toLowerCase().includes(q) ||
      (o.customerName || '').toLowerCase().includes(q) ||
      (o.licenseKey || '').toLowerCase().includes(q)
    );
  }

  res.json({
    total: orders.length,
    orders: orders.slice(0, Number(limit))
  });
});

app.get('/api/admin/export', requireAdminAuth, (req, res) => {
  const db = loadDatabase();
  const format = req.query.format || 'json';

  if (format === 'csv') {
    const header = 'Order ID,License Key,Device ID,Date,Customer,Payment,Subtotal,Tax,Total,Items Count\\n';
    const rows = (db.orders || []).map(o =>
      `"${o.id}","${o.licenseKey || ''}","${o.deviceId || ''}","${o.createdAt || ''}","${(o.customerName || '').replace(/"/g, '""')}","${o.paymentMethod || ''}",${o.subtotal || 0},${o.tax || 0},${o.total || 0},${(o.items || []).length}`
    ).join('\\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="bakery-orders-${new Date().toISOString().split('T')[0]}.csv"`);
    return res.send(header + rows);
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="bakery-full-cloud-backup-${new Date().toISOString().split('T')[0]}.json"`);
  res.json(db);
});

// ==========================================
// 6. PRODUCTION FRONTEND SERVING
// ==========================================
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
  console.log(`\\n======================================================`);
  console.log(`  BAKERY ADMIN PORTAL & CLOUD SERVER ACTIVE`);
  console.log(`======================================================`);
  console.log(`  Local URL:          http://localhost:${PORT}`);
  if (ips.length > 0) {
    console.log(`  Company Server IP:  http://${ips[0]}:${PORT}`);
    console.log(`  Device Register:    http://${ips[0]}:${PORT}/api/device/register`);
    console.log(`  Cloud Sync Push:    http://${ips[0]}:${PORT}/api/sync/push`);
  }
  console.log(`======================================================\\n`);
});
""")

print("Successfully written server.js directly!")
