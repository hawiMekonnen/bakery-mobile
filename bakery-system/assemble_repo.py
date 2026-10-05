import os
import shutil

repo_dir = 'c:/Users/user/Desktop/test_clone'

# Folders to copy into repo
sources = [
    ('c:/Users/user/Desktop/bakery-mobile', 'bakery-mobile', ['node_modules', '.git', '.expo', 'dist', 'temp_export']),
    ('c:/Users/user/Desktop/bakery system', 'bakery-system', ['node_modules', '.git', 'dist']),
    ('c:/Users/user/Desktop/bakery admin', 'bakery-admin', ['node_modules', '.git', 'dist']),
]

for src_path, dest_name, ignores in sources:
    dest_path = os.path.join(repo_dir, dest_name)
    if os.path.exists(dest_path):
        shutil.rmtree(dest_path)
    os.makedirs(dest_path, exist_ok=True)
    print(f'Copying {src_path} -> {dest_path}...')

    for item in os.listdir(src_path):
        if item in ignores:
            continue
        s = os.path.join(src_path, item)
        d = os.path.join(dest_path, item)
        if os.path.isdir(s):
            shutil.copytree(s, d, ignore=shutil.ignore_patterns(*ignores))
        else:
            shutil.copy2(s, d)

# Top-level .gitignore
gitignore_content = """# Dependencies
node_modules/
*/node_modules/

# Production Builds
dist/
*/dist/
build/
*/build/

# Expo / React Native
.expo/
*/.expo/
*.jks
*.p8
*.p12
*.key
*.mobileprovision

# Temporary & Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.DS_Store
Thumbs.db
*.pyc
__pycache__/
"""

with open(os.path.join(repo_dir, '.gitignore'), 'w', encoding='utf-8') as f:
    f.write(gitignore_content)

# Top-level package.json
root_pkg = """{
  "name": "artisan-bakery-suite",
  "version": "1.0.2",
  "description": "Comprehensive Bakery System Suite: React Native Mobile POS, Web POS, and Admin Portal",
  "scripts": {
    "start:mobile": "cd bakery-mobile && npm start",
    "start:web": "cd bakery-system && npm run dev",
    "start:admin": "cd bakery-admin && npm run dev"
  },
  "author": "Hawi Mekonnen",
  "license": "MIT"
}
"""

with open(os.path.join(repo_dir, 'package.json'), 'w', encoding='utf-8') as f:
    f.write(root_pkg)

# Top-level README.md
root_readme = """# 🥐 Artisan Bakery Management Suite

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
"""

with open(os.path.join(repo_dir, 'README.md'), 'w', encoding='utf-8') as f:
    f.write(root_readme)

print('Assembled all 3 projects into repo successfully!')
