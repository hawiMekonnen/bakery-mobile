# 🥐 Artisan Bakery Management Suite

A complete, enterprise-grade bakery management ecosystem comprising a **React Native Mobile POS App**, a **Web POS & Store System**, and a **Central Admin Web Portal & Sync Backend**.

---

## 📁 Repository Structure

```
.
├── bakery-mobile/      # React Native (Expo) Mobile POS application
│   ├── src/screens/    # POS, Inventory, Items Sold, Orders, Dashboard, Profile
│   ├── src/services/   # Bluetooth thermal printing, silent Wi-Fi auto-sync
│   ├── src/components/ # Modals (Manager PIN guard, thermal printer pairing)
│   └── app.json        # Expo config & Android Bluetooth permissions
│
├── bakery-system/      # Vite + React Web POS & Inventory Management System
│   ├── src/            # Full web dashboard, orders, inventory, staff, analytics
│   └── package.json    # Web dependencies & build scripts
│
└── bakery-admin/       # Central Admin Web Portal & Sync Backend
    ├── server.js       # Node/Express sync backend receiving data at :5000/api/sync
    ├── src/            # Admin dashboard, real-time live sales tracking, ledger
    └── data/           # Persistent JSON database (orders, menu, sync stats)
```

---

## 🚀 Quick Start Guide

### 1. Mobile App (`bakery-mobile`)
```bash
cd bakery-mobile
npm install
npm start
```
- Scan QR code using **Expo Go** on Android/iOS.
- **Key Features**:
  - **Silent Background Wi-Fi Auto-Sync**: Background sync pushed automatically to the Admin Portal every 15 seconds.
  - **Daily Items Sold Reset**: Product sales counts start strictly from 0 every day at midnight based on today's orders.
  - **2x2 Summary Metric Cards**: Spacious layout with zero text clipping.
  - **Bluetooth 58mm Thermal Printing**: Native Android Bluetooth permissions, 1-tap phone pairing, and automatic receipt printing formatted specifically for 58mm roll paper.
  - **Security & Access Control**: 4-digit Manager PIN guard (`1234`), Anti-Fraud Receipt Security Hash (`SEC-XXXX-XX`), and Security Audit Logs.

### 2. Web POS System (`bakery-system`)
```bash
cd bakery-system
npm install
npm run dev
```
- Opens at `http://localhost:5173`.
- Interactive web register, product management, stock alerts, and cashier ledger.

### 3. Admin Portal & Server (`bakery-admin`)
```bash
cd bakery-admin
npm install
npm run dev
```
- Server runs on `http://0.0.0.0:5000` with the Admin Portal frontend on `http://localhost:5174`.
- Central aggregation of live orders, daily totals, category breakdowns, and inventory sync.

---

## 🔒 Security Measures
- **Manager PIN Authorization**: Sensitive actions (shift reset, sales wipe) require manager authorization.
- **Cryptographic Receipt Hash**: Anti-tamper verification code printed on every slip to prevent fraudulent receipt returns.
- **Audit Trail**: All critical events recorded with timestamp, event type, and user account.

---

## 📄 License
MIT License. Built with ❤️ for Artisan Bakery & Cafe.
