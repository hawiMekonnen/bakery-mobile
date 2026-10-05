import os
import sys

ADMIN_DIR = r'c:\Users\user\Desktop\bakery admin'

STORAGE_JS = '''import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial DB schema
const INITIAL_DB = {
  business: {
    name: 'Bakery',
    currency: '$',
    taxRate: 0.05,
    updatedAt: new Date().toISOString()
  },
  terminals: {},
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
        terminals: parsed.terminals || {},
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

export function processMobileSync(payload, clientIp = '127.0.0.1') {
  const db = loadDatabase();
  const {
    terminalId = 'mobile-pos-01',
    terminalName = 'Mobile POS (Android)',
    appVersion = '2.0',
    orders = [],
    products = [],
    inventory = [],
    timestamp = new Date().toISOString()
  } = payload;

  const now = new Date().toISOString();

  // 1. Update or register terminal
  db.terminals[terminalId] = {
    id: terminalId,
    name: terminalName,
    lastSeen: now,
    clientIp,
    appVersion,
    ordersCount: orders.length,
    status: 'online'
  };

  // 2. Merge Orders (deduplicate by id)
  const existingOrderMap = new Map();
  db.orders.forEach(o => existingOrderMap.set(o.id, o));

  let newOrdersCount = 0;
  orders.forEach(incoming => {
    if (!existingOrderMap.has(incoming.id)) {
      existingOrderMap.set(incoming.id, {
        ...incoming,
        syncedAt: now,
        terminalId
      });
      newOrdersCount++;
    } else {
      const existing = existingOrderMap.get(incoming.id);
      existingOrderMap.set(incoming.id, {
        ...existing,
        ...incoming,
        updatedAt: now
      });
    }
  });

  db.orders = Array.from(existingOrderMap.values()).sort((a, b) => {
    const da = new Date(a.createdAt || 0).getTime();
    const db = new Date(b.createdAt || 0).getTime();
    return db - da;
  });

  // 3. Update Products
  if (Array.isArray(products) && products.length > 0) {
    const prodMap = new Map();
    db.products.forEach(p => prodMap.set(p.id, p));
    products.forEach(p => prodMap.set(p.id, p));
    db.products = Array.from(prodMap.values());
  }

  // 4. Update Inventory
  if (Array.isArray(inventory) && inventory.length > 0) {
    const invMap = new Map();
    db.inventory.forEach(i => invMap.set(i.id, i));
    inventory.forEach(i => invMap.set(i.id, i));
    db.inventory = Array.from(invMap.values());
  }

  // 5. Add Sync Log entry
  db.syncLogs = [
    {
      id: `log-${Date.now()}`,
      terminalId,
      terminalName,
      timestamp: now,
      incomingOrdersCount: orders.length,
      newOrdersCount,
      clientIp
    },
    ...(db.syncLogs || [])
  ].slice(0, 50);

  saveDatabase(db);

  return {
    success: true,
    message: `Sync successful. ${newOrdersCount} new orders recorded. Total orders: ${db.orders.length}`,
    totalOrders: db.orders.length,
    newOrdersCount,
    serverTimestamp: now
  };
}

export function getAggregatedStats() {
  const db = loadDatabase();
  const todayStr = new Date().toISOString().split('T')[0];

  const allOrders = db.orders || [];
  const todayOrders = allOrders.filter(o => (o.createdAt || '').startsWith(todayStr));

  const allTimeRevenue = allOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const cashTotal = todayOrders
    .filter(o => (o.paymentMethod || '').toLowerCase() === 'cash')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const cardTotal = todayOrders
    .filter(o => (o.paymentMethod || '').toLowerCase() === 'card')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const mobileTotal = todayOrders
    .filter(o => (o.paymentMethod || '').toLowerCase() === 'mobile')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const productSales = {};
  allOrders.forEach(o => {
    (o.items || []).forEach(item => {
      const name = item.name || 'Bakery Item';
      if (!productSales[name]) {
        productSales[name] = {
          name,
          emoji: item.emoji || '🥐',
          quantity: 0,
          revenue: 0
        };
      }
      productSales[name].quantity += Number(item.quantity) || 1;
      productSales[name].revenue += (Number(item.price) || 0) * (Number(item.quantity) || 1);
    });
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 6);

  const nowMs = Date.now();
  const terminals = Object.values(db.terminals || {}).map(t => {
    const lastSeenMs = new Date(t.lastSeen || 0).getTime();
    const isOnline = nowMs - lastSeenMs < 5 * 60 * 1000;
    return {
      ...t,
      status: isOnline ? 'online' : 'offline'
    };
  });

  const lowStockCount = (db.inventory || []).filter(
    i => (Number(i.stock) || 0) <= (Number(i.minStock) || 0)
  ).length;

  return {
    today: {
      date: todayStr,
      revenue: parseFloat(todayRevenue.toFixed(2)),
      ordersCount: todayOrders.length,
      cashTotal: parseFloat(cashTotal.toFixed(2)),
      cardTotal: parseFloat(cardTotal.toFixed(2)),
      mobileTotal: parseFloat(mobileTotal.toFixed(2)),
      averageOrderValue: todayOrders.length > 0 ? parseFloat((todayRevenue / todayOrders.length).toFixed(2)) : 0
    },
    allTime: {
      revenue: parseFloat(allTimeRevenue.toFixed(2)),
      ordersCount: allOrders.length,
      productsCount: (db.products || []).length,
      inventoryCount: (db.inventory || []).length,
      lowStockCount
    },
    topProducts,
    terminals,
    recentOrders: allOrders.slice(0, 10),
    lastSync: db.syncLogs && db.syncLogs[0] ? db.syncLogs[0] : null
  };
}
'''

SERVER_JS = '''import express from 'express';
import cors from 'cors';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  loadDatabase,
  saveDatabase,
  processMobileSync,
  getAggregatedStats
} from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

app.get('/api/status', (req, res) => {
  const stats = getAggregatedStats();
  const ips = getNetworkIps();
  res.json({
    status: 'online',
    serverTime: new Date().toISOString(),
    primaryIp: ips[0] || 'localhost',
    allIps: ips,
    port: PORT,
    activeTerminals: stats.terminals.filter(t => t.status === 'online').length,
    totalOrders: stats.allTime.ordersCount,
    lastSync: stats.lastSync
  });
});

app.post('/api/sync', (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const result = processMobileSync(req.body, clientIp);
  res.json(result);
});

app.get('/api/stats', (req, res) => {
  res.json(getAggregatedStats());
});

app.get('/api/orders', (req, res) => {
  const db = loadDatabase();
  const { date, payment, search, limit = 100 } = req.query;
  let orders = db.orders || [];

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
      (o.customerName || '').toLowerCase().includes(q)
    );
  }

  res.json({
    total: orders.length,
    orders: orders.slice(0, Number(limit))
  });
});

app.get('/api/inventory', (req, res) => {
  const db = loadDatabase();
  res.json(db.inventory || []);
});

app.get('/api/products', (req, res) => {
  const db = loadDatabase();
  res.json(db.products || []);
});

app.get('/api/terminals', (req, res) => {
  const stats = getAggregatedStats();
  res.json(stats.terminals);
});

app.get('/api/export', (req, res) => {
  const db = loadDatabase();
  const format = req.query.format || 'json';

  if (format === 'csv') {
    const header = 'Order ID,Date,Customer,Payment,Subtotal,Tax,Total,Items Count\\n';
    const rows = (db.orders || []).map(o =>
      `"${o.id}","${o.createdAt || ''}","${(o.customerName || '').replace(/"/g, '""')}","${o.paymentMethod || ''}",${o.subtotal || 0},${o.tax || 0},${o.total || 0},${(o.items || []).length}`
    ).join('\\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="bakery-orders-${new Date().toISOString().split('T')[0]}.csv"`);
    return res.send(header + rows);
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="bakery-backup-${new Date().toISOString().split('T')[0]}.json"`);
  res.json(db);
});

const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  const ips = getNetworkIps();
  console.log(`\\n======================================================`);
  console.log(`  🥐 BAKERY ADMIN PORTAL & SYNC SERVER ACTIVE`);
  console.log(`======================================================`);
  console.log(`  Local URL:        http://localhost:${PORT}`);
  if (ips.length > 0) {
    console.log(`  Network URL:      http://${ips[0]}:${PORT}`);
    console.log(`  Mobile Sync URL:  http://${ips[0]}:${PORT}/api/sync`);
  }
  console.log(`======================================================\\n`);
});
'''

def write_file(filename, content):
    full_path = os.path.join(ADMIN_DIR, filename)
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Written: {full_path}')

if __name__ == '__main__':
    write_file('storage.js', STORAGE_JS)
    write_file('server.js', SERVER_JS)
    print('Backend files written successfully!')
