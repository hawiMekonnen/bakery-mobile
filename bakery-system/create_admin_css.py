import os

ADMIN_DIR = r'c:\Users\user\Desktop\bakery admin'

INDEX_CSS = '''/* ─── Modern Bakery Admin Design System ─── */
:root {
  --primary: #D97706;
  --primary-light: #FEF3C7;
  --primary-hover: #B45309;
  --primary-dark: #92400E;
  
  --bg-app: #F8FAFC;
  --bg-surface: #FFFFFF;
  --bg-subtle: #F1F5F9;
  --bg-card: #FFFFFF;
  
  --sidebar-bg: #1C1917;
  --sidebar-hover: #292524;
  --sidebar-active: #D97706;
  --sidebar-text: #E7E5E4;
  --sidebar-muted: #A8A29E;
  
  --text-main: #0F172A;
  --text-secondary: #334155;
  --text-muted: #64748B;
  --text-light: #94A3B8;
  
  --border: #E2E8F0;
  --border-light: #F1F5F9;
  --border-focus: #D97706;
  
  --success: #10B981;
  --success-bg: #ECFDF5;
  --success-border: #A7F3D0;
  
  --danger: #EF4444;
  --danger-bg: #FEF2F2;
  --danger-border: #FECACA;
  
  --info: #3B82F6;
  --info-bg: #EFF6FF;
  --info-border: #BFDBFE;
  
  --purple: #8B5CF6;
  --purple-bg: #F5F3FF;
  
  --cash-color: #10B981;
  --card-color: #3B82F6;
  --mobile-color: #8B5CF6;
  
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  --radius-full: 9999px;
  
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--bg-app);
  color: var(--text-main);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Outfit', sans-serif;
  color: var(--text-main);
}

/* ─── App Container ─── */
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* ─── Sidebar ─── */
.sidebar {
  width: 260px;
  background-color: var(--sidebar-bg);
  color: var(--sidebar-text);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.2s ease;
}

.sidebar-brand {
  padding: 24px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.brand-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #F59E0B, #B45309);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.35);
}

.brand-text h1 {
  font-size: 19px;
  font-weight: 800;
  color: #FFFFFF;
  letter-spacing: -0.3px;
  line-height: 1.2;
}

.brand-text span {
  font-size: 11px;
  color: var(--sidebar-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-weight: 600;
}

.sidebar-nav {
  flex: 1;
  padding: 18px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  color: var(--sidebar-muted);
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  transition: all 0.15s ease;
}

.nav-item:hover {
  background-color: var(--sidebar-hover);
  color: #FFFFFF;
}

.nav-item.active {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.2), rgba(217, 119, 6, 0.1));
  color: #F59E0B;
  border-left: 3px solid #F59E0B;
}

.nav-item-icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.terminal-pill-status {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  padding: 8px 12px;
  border-radius: var(--radius-md);
  font-size: 12px;
}

.pulse-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background-color: var(--success);
  position: relative;
}

.pulse-dot.offline {
  background-color: var(--text-light);
}

.pulse-dot::after {
  content: '';
  position: absolute;
  top: -3px;
  left: -3px;
  right: -3px;
  bottom: -3px;
  border-radius: 50%;
  background-color: var(--success);
  opacity: 0.4;
  animation: pulse 2s infinite ease-out;
}

.pulse-dot.offline::after {
  display: none;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(2.4); opacity: 0; }
}

/* ─── Main Content Area ─── */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--bg-app);
}

/* Top Header */
.topbar {
  height: 68px;
  background-color: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.4px;
}

.sync-badge-live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: var(--success-bg);
  color: var(--success);
  border: 1px solid var(--success-border);
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 11.5px;
  font-weight: 700;
}

.sync-badge-live.offline {
  background-color: var(--bg-subtle);
  color: var(--text-muted);
  border-color: var(--border);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.live-clock {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  background-color: var(--bg-subtle);
  padding: 6px 12px;
  border-radius: var(--radius-full);
}

.btn-refresh {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: var(--primary);
  color: #FFFFFF;
  border: none;
  padding: 8px 14px;
  border-radius: var(--radius-md);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: var(--shadow-sm);
}

.btn-refresh:hover {
  background-color: var(--primary-hover);
  transform: translateY(-1px);
}

/* Page Scroll Container */
.page-container {
  flex: 1;
  overflow-y: auto;
  padding: 28px;
}

/* ─── Hero Terminal Sync Card ─── */
.terminal-banner {
  background: linear-gradient(135deg, #1C1917, #292524);
  color: #FFFFFF;
  border-radius: var(--radius-lg);
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  box-shadow: var(--shadow-md);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.banner-device-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.banner-title {
  font-size: 16px;
  font-weight: 800;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  gap: 8px;
}

.banner-sub {
  font-size: 12.5px;
  color: #A8A29E;
  margin-top: 3px;
}

.banner-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.banner-stat-box {
  background: rgba(255, 255, 255, 0.08);
  padding: 8px 16px;
  border-radius: var(--radius-md);
  text-align: right;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.banner-stat-val {
  font-size: 18px;
  font-weight: 800;
  color: #F59E0B;
}

.banner-stat-lbl {
  font-size: 11px;
  color: #D6D3D1;
  font-weight: 600;
}

/* ─── KPI Metric Cards ─── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
  margin-bottom: 24px;
}

.kpi-card {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 20px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.kpi-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.kpi-label {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.kpi-icon-box {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.kpi-value {
  font-size: 26px;
  font-weight: 900;
  color: var(--text-main);
  letter-spacing: -0.8px;
  line-height: 1.1;
}

.kpi-footer {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ─── Breakdown Row ─── */
.section-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

@media (max-width: 1024px) {
  .section-grid {
    grid-template-columns: 1fr;
  }
}

.panel-card {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #FAFAFA;
}

.panel-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-body {
  padding: 20px;
}

/* Payment Breakdown Bars */
.pay-breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pay-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pay-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 700;
}

.pay-progress-bg {
  height: 8px;
  border-radius: var(--radius-full);
  background-color: var(--bg-subtle);
  overflow: hidden;
}

.pay-progress-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

/* Top Products List */
.product-rank-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.product-rank-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  background-color: var(--bg-subtle);
  transition: all 0.15s ease;
}

.product-rank-row:hover {
  background-color: #E2E8F0;
}

.product-rank-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.product-emoji {
  font-size: 22px;
}

.product-name {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-main);
}

.product-sold-tag {
  font-size: 11.5px;
  color: var(--text-muted);
}

.product-revenue {
  font-size: 14px;
  font-weight: 800;
  color: var(--primary-dark);
}

/* ─── Table Component ─── */
.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.data-table th {
  background-color: var(--bg-subtle);
  color: var(--text-muted);
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.data-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-light);
  font-size: 13.5px;
  color: var(--text-main);
}

.data-table tr:hover {
  background-color: #F8FAFC;
}

/* Filter Controls */
.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  padding: 9px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 13px;
  width: 260px;
  background-color: var(--bg-surface);
  color: var(--text-main);
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.15);
}

.select-control {
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 13px;
  background-color: var(--bg-surface);
  color: var(--text-main);
  cursor: pointer;
}

.btn-export {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border-radius: var(--radius-md);
  background-color: var(--bg-subtle);
  border: 1px solid var(--border);
  color: var(--text-main);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-export:hover {
  background-color: #E2E8F0;
}

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 700;
}

.badge-cash {
  background-color: var(--success-bg);
  color: var(--success);
}

.badge-card {
  background-color: var(--info-bg);
  color: var(--info);
}

.badge-mobile {
  background-color: var(--purple-bg);
  color: var(--purple);
}

.badge-danger {
  background-color: var(--danger-bg);
  color: var(--danger);
}

/* ─── Thermal Receipt Modal ─── */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(15, 23, 42, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.receipt-modal-card {
  width: 100%;
  max-width: 420px;
  background-color: #FFFFFF;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.receipt-modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.receipt-paper {
  padding: 24px;
  background-color: #FFFDF9;
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
  line-height: 1.4;
  color: #1C1917;
  border: 1px dashed #CBD5E1;
  margin: 16px 20px;
  border-radius: var(--radius-md);
}

.receipt-center {
  text-align: center;
}

.receipt-title {
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 1px;
}

.receipt-divider {
  border-bottom: 1px dashed #94A3B8;
  margin: 12px 0;
}

.receipt-row {
  display: flex;
  justify-content: space-between;
  margin: 4px 0;
}

.receipt-total {
  font-size: 16px;
  font-weight: bold;
}

.receipt-actions {
  padding: 16px 20px;
  background-color: var(--bg-subtle);
  display: flex;
  gap: 10px;
}

.btn-receipt-action {
  flex: 1;
  padding: 10px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  text-align: center;
}

/* ─── Deployment Guide Tab ─── */
.deploy-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  padding: 24px;
  margin-bottom: 20px;
}

.code-snippet {
  background-color: #1E1E1E;
  color: #D4D4D4;
  padding: 14px 18px;
  border-radius: var(--radius-md);
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  overflow-x: auto;
  margin: 10px 0 16px 0;
  border: 1px solid #333;
}
'''

def write_css():
    path = os.path.join(ADMIN_DIR, 'src', 'index.css')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(INDEX_CSS)
    print(f'Written index.css: {path}')

if __name__ == '__main__':
    write_css()
