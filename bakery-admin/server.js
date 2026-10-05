import express from 'express';
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
    const header = 'Order ID,Date,Customer,Payment,Subtotal,Tax,Total,Items Count\n';
    const rows = (db.orders || []).map(o =>
      `"${o.id}","${o.createdAt || ''}","${(o.customerName || '').replace(/"/g, '""')}","${o.paymentMethod || ''}",${o.subtotal || 0},${o.tax || 0},${o.total || 0},${(o.items || []).length}`
    ).join('\n');

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
  console.log(`\n======================================================`);
  console.log(`  🥐 BAKERY ADMIN PORTAL & SYNC SERVER ACTIVE`);
  console.log(`======================================================`);
  console.log(`  Local URL:        http://localhost:${PORT}`);
  if (ips.length > 0) {
    console.log(`  Network URL:      http://${ips[0]}:${PORT}`);
    console.log(`  Mobile Sync URL:  http://${ips[0]}:${PORT}/api/sync`);
  }
  console.log(`======================================================\n`);
});
