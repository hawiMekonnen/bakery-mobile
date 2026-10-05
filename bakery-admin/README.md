# 🥐 Bakery Admin Portal & Real-Time Sync Server

Central administration website and synchronization backend for the Bakery Mobile POS application.

---

## 🌟 Key Features

1. **Live Mobile Terminal Monitoring**:
   - Real-time connection status (🟢 Online / ⚪ Offline).
   - Instant telemetry: IP address, app version, last sync time, battery, order counters.
2. **Real-Time Order & Sales Analytics**:
   - Live revenue, sales count, average ticket value.
   - Payment method breakdown: Cash Drawer, Card, Telebirr / Mobile Money.
   - Top-selling pastries leaderboard.
3. **Synced Order Explorer & Digital Thermal Receipts**:
   - Search orders by Order # or Customer Name.
   - Date filtering (Today, Yesterday, Custom Day).
   - Authentic digital thermal receipt viewer (58mm/80mm format) with one-click print.
   - One-click CSV and JSON export.
4. **Raw Ingredient Stock & Menu Performance**:
   - Synced raw materials inventory (flour, honey, sugar, phyllo dough) with low-stock alerts.
   - Pastry menu catalog with prices, costs, and profit margins.

---

## 🚀 Quick Start (Local Run)

```bash
# 1. Install dependencies
npm install

# 2. Build the admin dashboard
npm run build

# 3. Start the server (runs both API and Admin Website on Port 5000)
npm start
```
Open **`http://localhost:5000`** in your browser.

---

## 🌐 Deploying on Your Server (Ubuntu / Linux VPS / Windows)

### Method 1: PM2 (Recommended for 24/7 Uptime)
```bash
# 1. Build the frontend
npm run build

# 2. Install PM2 process manager
npm install -g pm2

# 3. Start the server
pm2 start server.js --name "bakery-admin"

# 4. Enable auto-restart on system reboot
pm2 save
pm2 startup
```

### Method 2: Docker
```bash
docker build -t bakery-admin .
docker run -d -p 5000:5000 -v $(pwd)/data:/app/data --name bakery-server bakery-admin
```

---

## 📱 Connecting the Mobile App

1. Make sure your phone is connected to the same Wi-Fi (or use your server's public IP / domain).
2. Open the **Bakery** app on your phone.
3. Go to **Profile** → **Cloud Server Sync**.
4. Enter your server URL:
   `http://<SERVER_IP>:5000`
5. Tap **Sync Now 🔄**. All 37+ orders, sales, and products will instantly appear on your Admin Website!
