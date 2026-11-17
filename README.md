# 🥐 Artisan Bakery Management Suite

A complete, enterprise-grade bakery management ecosystem comprising a **React Native Mobile POS App**, a **Central Admin Web Portal & Sync Backend**, and a **Web POS & Inventory Management System**.

---

## 📁 Repository Structure

```
.
├── bakery-mobile/      # React Native (Expo) Mobile POS application
│   ├── src/screens/    # POS, Inventory, Ingredient Hourly Tracking, Orders, Dashboard, Profile
│   ├── src/services/   # Bluetooth thermal printing, silent Wi-Fi auto-sync
│   ├── src/components/ # Modals (Manager PIN guard, thermal printer pairing, license status)
│   └── app.json        # Expo config & Android Bluetooth permissions
│
├── bakery-admin/       # Central Admin Web Portal & Sync Backend (Dockerized)
│   ├── server.js       # Node/Express sync backend (:5000)
│   ├── storage.js      # Terminal license management, approval gates, backups
│   ├── src/            # Admin dashboard, real-time live sales tracking, ledger
│   ├── Dockerfile      # Production multi-stage Docker container
│   ├── docker-compose.yml # Container orchestration
│   └── data/           # Database and JSON/CSV backups
│
└── bakery-system/      # Vite + React Web POS & Inventory Management System
    ├── src/            # Full web dashboard, orders, inventory, staff, analytics
    └── package.json    # Web dependencies & build scripts
```

---

## 🚀 Quick Start Guide

### 1. Mobile App (`bakery-mobile`)
```bash
cd bakery-mobile
npm install
npm start
```
- **Key Features**:
  - **Ingredient Tracking & Hourly Log**: Real-time audit history of ingredient additions, restocking, and quantity adjustments grouped by hour (Addis Ababa UTC+3).
  - **Silent Background Wi-Fi Auto-Sync**: Background sync pushed automatically to the Admin Portal.
  - **Daily Items Sold Tracking**: Prepared vs. sold counts updated in real-time.
  - **Bluetooth 58mm Thermal Printing**: Native Android Bluetooth permissions, 1-tap phone pairing, and automatic receipt printing formatted specifically for 58mm roll paper.
  - **Security & Access Control**: 4-digit Manager PIN guard (`1234`), Anti-Fraud Receipt Security Hash, and terminal licensing verification.

### 2. Admin Portal & Sync Server (`bakery-admin`)
```bash
cd bakery-admin
npm install
npm start
```
- **Docker Deployment**:
```bash
cd bakery-admin
docker compose up -d --build
```
- Server runs on `http://0.0.0.0:5000` with the Admin Portal frontend.
- Central management of mobile terminals, approval verification, JSON/CSV backups, and sales ledgers.

### 3. Web POS System (`bakery-system`)
```bash
cd bakery-system
npm install
npm run dev
```
- Opens at `http://localhost:5173`.
- Interactive web register, product management, stock alerts, and cashier ledger.

---

## 📄 License
MIT License. Built for Artisan Bakery & Cafe.
