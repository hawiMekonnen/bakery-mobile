import fs from 'fs';
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
    products: db.products || [],
    recentOrders: allOrders.slice(0, 10),
    lastSync: db.syncLogs && db.syncLogs[0] ? db.syncLogs[0] : null
  };
}
