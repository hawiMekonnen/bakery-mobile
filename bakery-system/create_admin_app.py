import os

ADMIN_DIR = r'c:\Users\user\Desktop\bakery admin'

APP_JSX = '''import React, { useState, useEffect } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [serverStatus, setServerStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  // Order filters
  const [orderSearch, setOrderSearch] = useState('');
  const [orderDateFilter, setOrderDateFilter] = useState('All');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('All');
  
  // Selected Order for Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  
  // Live Clock
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch data from API
  const fetchData = async () => {
    try {
      const [resStatus, resStats, resOrders] = await Promise.all([
        fetch('/api/status').then(r => r.json()).catch(() => null),
        fetch('/api/stats').then(r => r.json()).catch(() => null),
        fetch('/api/orders?limit=200').then(r => r.json()).catch(() => ({ orders: [] }))
      ]);

      if (resStatus) setServerStatus(resStatus);
      if (resStats) setStats(resStats);
      if (resOrders && resOrders.orders) setOrders(resOrders.orders);
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll every 5 seconds for real-time live sync from mobile phones
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filtered orders
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  const filteredOrders = orders.filter(o => {
    const orderDate = (o.createdAt || '').split('T')[0];
    
    let matchesDate = true;
    if (orderDateFilter === 'Today') matchesDate = orderDate === todayStr;
    else if (orderDateFilter === 'Yesterday') matchesDate = orderDate === yesterdayStr;
    else if (orderDateFilter !== 'All') matchesDate = orderDate === orderDateFilter;

    let matchesPayment = true;
    if (orderPaymentFilter !== 'All') {
      matchesPayment = (o.paymentMethod || '').toLowerCase() === orderPaymentFilter.toLowerCase();
    }

    let matchesSearch = true;
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      matchesSearch = (o.id || '').toLowerCase().includes(q) ||
                      (o.customerName || '').toLowerCase().includes(q);
    }

    return matchesDate && matchesPayment && matchesSearch;
  });

  const exportData = (format) => {
    window.open(`/api/export?format=${format}`, '_blank');
  };

  const primaryTerminal = stats?.terminals && stats.terminals[0] ? stats.terminals[0] : null;
  const isTerminalOnline = primaryTerminal && primaryTerminal.status === 'online';

  return (
    <div className="app-layout">
      {/* ─── Sidebar ─── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">🥐</div>
          <div className="brand-text">
            <h1>Bakery Admin</h1>
            <span>Operations & Sync</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="nav-item-icon">📊</span>
            <span>Live Overview</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <span className="nav-item-icon">🧾</span>
            <span>Synced Orders</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'terminals' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminals')}
          >
            <span className="nav-item-icon">📱</span>
            <span>Mobile Terminals</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <span className="nav-item-icon">📦</span>
            <span>Stock & Ingredients</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'menu' ? 'active' : ''}`}
            onClick={() => setActiveTab('menu')}
          >
            <span className="nav-item-icon">🥐</span>
            <span>Bakery Menu</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'deployment' ? 'active' : ''}`}
            onClick={() => setActiveTab('deployment')}
          >
            <span className="nav-item-icon">🚀</span>
            <span>Server Deployment</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="terminal-pill-status">
            <span className={`pulse-dot ${isTerminalOnline ? '' : 'offline'}`}></span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '12px', color: '#FFF' }}>
                {isTerminalOnline ? 'Mobile Terminal Live' : 'Mobile Offline'}
              </div>
              <div style={{ fontSize: '11px', color: '#A8A29E' }}>
                {primaryTerminal ? `${primaryTerminal.ordersCount || 0} orders synced` : 'Waiting for connection'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Main Area ─── */}
      <main className="main-area">
        {/* Top Header */}
        <header className="topbar">
          <div className="topbar-left">
            <h2 className="page-title">
              {activeTab === 'overview' && 'Operations Dashboard'}
              {activeTab === 'orders' && 'Synced Orders & Digital Receipts'}
              {activeTab === 'terminals' && 'Mobile POS Terminal Monitor'}
              {activeTab === 'inventory' && 'Ingredient Inventory & Stock'}
              {activeTab === 'menu' && 'Bakery Pastry & Menu Performance'}
              {activeTab === 'deployment' && 'Server Setup & Deployment Guide'}
            </h2>
            <div className={`sync-badge-live ${isTerminalOnline ? '' : 'offline'}`}>
              <span className={`pulse-dot ${isTerminalOnline ? '' : 'offline'}`} style={{ width: 7, height: 7 }}></span>
              <span>{isTerminalOnline ? 'Live Real-Time Sync' : 'Standby Mode'}</span>
            </div>
          </div>

          <div className="topbar-right">
            <div className="live-clock">{currentTime}</div>
            <button className="btn-refresh" onClick={fetchData} title="Refresh Data">
              <span>🔄</span> Refresh
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-container">
          {/* ─── Tab: OVERVIEW ─── */}
          {activeTab === 'overview' && (
            <div>
              {/* Terminal Banner */}
              <div className="terminal-banner">
                <div className="banner-left">
                  <div className="banner-device-icon">📱</div>
                  <div>
                    <div className="banner-title">
                      <span>{primaryTerminal ? primaryTerminal.name : 'Counter Terminal 1 (Android)'}</span>
                      <span className={`badge ${isTerminalOnline ? 'badge-cash' : 'badge-danger'}`}>
                        {isTerminalOnline ? '🟢 Connected' : '⚪ Offline / Standby'}
                      </span>
                    </div>
                    <div className="banner-sub">
                      Server IP: <strong>{serverStatus?.primaryIp || 'localhost'}:{serverStatus?.port || 5000}</strong> • Last Sync: {stats?.lastSync ? new Date(stats.lastSync.timestamp).toLocaleTimeString() : 'Awaiting mobile sync'}
                    </div>
                  </div>
                </div>

                <div className="banner-right">
                  <div className="banner-stat-box">
                    <div className="banner-stat-val">{stats?.allTime?.ordersCount || orders.length}</div>
                    <div className="banner-stat-lbl">TOTAL SYNCED ORDERS</div>
                  </div>
                  <div className="banner-stat-box">
                    <div className="banner-stat-val">${(stats?.allTime?.revenue || 0).toFixed(2)}</div>
                    <div className="banner-stat-lbl">ALL-TIME REVENUE</div>
                  </div>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="kpi-grid">
                <div className="kpi-card" style={{ borderLeft: '4px solid var(--primary)' }}>
                  <div className="kpi-card-header">
                    <span className="kpi-label">Today's Revenue</span>
                    <div className="kpi-icon-box" style={{ backgroundColor: 'var(--primary-light)' }}>💵</div>
                  </div>
                  <div className="kpi-value" style={{ color: 'var(--primary-dark)' }}>
                    ${(stats?.today?.revenue || 0).toFixed(2)}
                  </div>
                  <div className="kpi-footer">
                    <span>{stats?.today?.ordersCount || 0} sales recorded today</span>
                  </div>
                </div>

                <div className="kpi-card" style={{ borderLeft: '4px solid var(--info)' }}>
                  <div className="kpi-card-header">
                    <span className="kpi-label">Average Order</span>
                    <div className="kpi-icon-box" style={{ backgroundColor: 'var(--info-bg)' }}>📊</div>
                  </div>
                  <div className="kpi-value" style={{ color: 'var(--info)' }}>
                    ${(stats?.today?.averageOrderValue || 0).toFixed(2)}
                  </div>
                  <div className="kpi-footer">
                    <span>Average per customer receipt</span>
                  </div>
                </div>

                <div className="kpi-card" style={{ borderLeft: '4px solid var(--success)' }}>
                  <div className="kpi-card-header">
                    <span className="kpi-label">Cash Drawer</span>
                    <div className="kpi-icon-box" style={{ backgroundColor: 'var(--success-bg)' }}>🪙</div>
                  </div>
                  <div className="kpi-value" style={{ color: 'var(--success)' }}>
                    ${(stats?.today?.cashTotal || 0).toFixed(2)}
                  </div>
                  <div className="kpi-footer">
                    <span>Physical cash collected</span>
                  </div>
                </div>

                <div className="kpi-card" style={{ borderLeft: '4px solid var(--purple)' }}>
                  <div className="kpi-card-header">
                    <span className="kpi-label">Digital & Mobile</span>
                    <div className="kpi-icon-box" style={{ backgroundColor: 'var(--purple-bg)' }}>📱</div>
                  </div>
                  <div className="kpi-value" style={{ color: 'var(--purple)' }}>
                    ${((stats?.today?.cardTotal || 0) + (stats?.today?.mobileTotal || 0)).toFixed(2)}
                  </div>
                  <div className="kpi-footer">
                    <span>Card: ${(stats?.today?.cardTotal || 0).toFixed(2)} | Mobile: ${(stats?.today?.mobileTotal || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* 2-Column Section */}
              <div className="section-grid">
                {/* Payment Breakdown Panel */}
                <div className="panel-card">
                  <div className="panel-header">
                    <div className="panel-title">
                      <span>💳</span> Payment Method Breakdown (Today)
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-dark)' }}>
                      ${(stats?.today?.revenue || 0).toFixed(2)} Total
                    </span>
                  </div>
                  <div className="panel-body">
                    {(() => {
                      const total = stats?.today?.revenue || 1;
                      const cash = stats?.today?.cashTotal || 0;
                      const card = stats?.today?.cardTotal || 0;
                      const mobile = stats?.today?.mobileTotal || 0;

                      const cashPct = total > 0 ? (cash / total) * 100 : 0;
                      const cardPct = total > 0 ? (card / total) * 100 : 0;
                      const mobilePct = total > 0 ? (mobile / total) * 100 : 0;

                      return (
                        <div className="pay-breakdown-list">
                          <div className="pay-item">
                            <div className="pay-item-top">
                              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>💵</span> Cash Drawer
                              </span>
                              <span style={{ color: 'var(--cash-color)' }}>
                                ${cash.toFixed(2)} ({cashPct.toFixed(0)}%)
                              </span>
                            </div>
                            <div className="pay-progress-bg">
                              <div className="pay-progress-fill" style={{ width: `${cashPct}%`, backgroundColor: 'var(--cash-color)' }}></div>
                            </div>
                          </div>

                          <div className="pay-item">
                            <div className="pay-item-top">
                              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>💳</span> Credit & Debit Cards
                              </span>
                              <span style={{ color: 'var(--card-color)' }}>
                                ${card.toFixed(2)} ({cardPct.toFixed(0)}%)
                              </span>
                            </div>
                            <div className="pay-progress-bg">
                              <div className="pay-progress-fill" style={{ width: `${cardPct}%`, backgroundColor: 'var(--card-color)' }}></div>
                            </div>
                          </div>

                          <div className="pay-item">
                            <div className="pay-item-top">
                              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>📱</span> Mobile Money / Telebirr
                              </span>
                              <span style={{ color: 'var(--mobile-color)' }}>
                                ${mobile.toFixed(2)} ({mobilePct.toFixed(0)}%)
                              </span>
                            </div>
                            <div className="pay-progress-bg">
                              <div className="pay-progress-fill" style={{ width: `${mobilePct}%`, backgroundColor: 'var(--mobile-color)' }}></div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Top Selling Pastries */}
                <div className="panel-card">
                  <div className="panel-header">
                    <div className="panel-title">
                      <span>⭐</span> Top Selling Pastries
                    </div>
                  </div>
                  <div className="panel-body">
                    {stats?.topProducts && stats.topProducts.length > 0 ? (
                      <div className="product-rank-list">
                        {stats.topProducts.map((p, idx) => (
                          <div key={idx} className="product-rank-row">
                            <div className="product-rank-left">
                              <span className="product-emoji">{p.emoji || '🥐'}</span>
                              <div>
                                <div className="product-name">{p.name}</div>
                                <div className="product-sold-tag">{p.quantity} units sold</div>
                              </div>
                            </div>
                            <div className="product-revenue">${p.revenue.toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No product sales recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Synced Orders Table */}
              <div className="panel-card">
                <div className="panel-header">
                  <div className="panel-title">
                    <span>🧾</span> Recent Synced Transactions (Live Feed)
                  </div>
                  <button className="btn-export" onClick={() => setActiveTab('orders')}>
                    View All Orders →
                  </button>
                </div>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Time & Date</th>
                        <th>Customer</th>
                        <th>Payment</th>
                        <th>Items Sold</th>
                        <th>Total</th>
                        <th>Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 8).map(o => (
                        <tr key={o.id}>
                          <td style={{ fontWeight: 800 }}>{o.id}</td>
                          <td style={{ color: 'var(--text-muted)' }}>
                            {o.createdAt ? new Date(o.createdAt).toLocaleString() : '-'}
                          </td>
                          <td>{o.customerName || 'Walk-in Customer'}</td>
                          <td>
                            <span className={`badge ${
                              (o.paymentMethod || '').toLowerCase() === 'cash' ? 'badge-cash' :
                              (o.paymentMethod || '').toLowerCase() === 'card' ? 'badge-card' : 'badge-mobile'
                            }`}>
                              {o.paymentMethod || 'Cash'}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                              {(o.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ') || 'Bakery Items'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 800, color: 'var(--primary-dark)', fontSize: '15px' }}>
                            ${Number(o.total || 0).toFixed(2)}
                          </td>
                          <td>
                            <button
                              className="btn-export"
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                              onClick={() => setSelectedReceipt(o)}
                            >
                              View 📄
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── Tab: ORDERS ─── */}
          {activeTab === 'orders' && (
            <div>
              <div className="filter-bar">
                <div className="filter-group">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search by Order # or Customer..."
                    value={orderSearch}
                    onChange={e => setOrderSearch(e.target.value)}
                  />

                  <select
                    className="select-control"
                    value={orderDateFilter}
                    onChange={e => setOrderDateFilter(e.target.value)}
                  >
                    <option value="All">All Dates</option>
                    <option value="Today">Today ({todayStr})</option>
                    <option value="Yesterday">Yesterday ({yesterdayStr})</option>
                  </select>

                  <select
                    className="select-control"
                    value={orderPaymentFilter}
                    onChange={e => setOrderPaymentFilter(e.target.value)}
                  >
                    <option value="All">All Payments</option>
                    <option value="Cash">Cash Only</option>
                    <option value="Card">Card Only</option>
                    <option value="Mobile">Mobile Only</option>
                  </select>
                </div>

                <div className="filter-group">
                  <button className="btn-export" onClick={() => exportData('csv')}>
                    📥 Export CSV
                  </button>
                  <button className="btn-export" onClick={() => exportData('json')}>
                    ☁️ Export JSON
                  </button>
                </div>
              </div>

              <div className="panel-card">
                <div className="panel-header">
                  <div className="panel-title">
                    <span>🧾</span> Orders Database ({filteredOrders.length} records)
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-dark)' }}>
                    Total Filtered: ${filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0).toFixed(2)}
                  </span>
                </div>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Timestamp</th>
                        <th>Customer</th>
                        <th>Payment</th>
                        <th>Items Sold</th>
                        <th>Subtotal</th>
                        <th>Tax</th>
                        <th>Total</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                            No orders found matching your filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map(o => (
                          <tr key={o.id}>
                            <td style={{ fontWeight: 800 }}>{o.id}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>
                              {o.createdAt ? new Date(o.createdAt).toLocaleString() : '-'}
                            </td>
                            <td>{o.customerName || 'Walk-in Customer'}</td>
                            <td>
                              <span className={`badge ${
                                (o.paymentMethod || '').toLowerCase() === 'cash' ? 'badge-cash' :
                                (o.paymentMethod || '').toLowerCase() === 'card' ? 'badge-card' : 'badge-mobile'
                              }`}>
                                {o.paymentMethod || 'Cash'}
                              </span>
                            </td>
                            <td style={{ maxWidth: '280px', color: 'var(--text-secondary)' }}>
                              {(o.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ') || 'Bakery Items'}
                            </td>
                            <td>${Number(o.subtotal || 0).toFixed(2)}</td>
                            <td>${Number(o.tax || 0).toFixed(2)}</td>
                            <td style={{ fontWeight: 800, color: 'var(--primary-dark)', fontSize: '15px' }}>
                              ${Number(o.total || 0).toFixed(2)}
                            </td>
                            <td>
                              <button
                                className="btn-export"
                                style={{ padding: '4px 10px', fontSize: '12px' }}
                                onClick={() => setSelectedReceipt(o)}
                              >
                                View 📄
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── Tab: TERMINALS ─── */}
          {activeTab === 'terminals' && (
            <div>
              <div className="panel-card" style={{ marginBottom: '24px' }}>
                <div className="panel-header">
                  <div className="panel-title">
                    <span>📱</span> Connected Mobile POS Terminals
                  </div>
                </div>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Terminal Name</th>
                        <th>Terminal ID</th>
                        <th>Device IP</th>
                        <th>Status</th>
                        <th>Last Synced</th>
                        <th>Orders Recorded</th>
                        <th>App Version</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats?.terminals && stats.terminals.length > 0 ? (
                        stats.terminals.map((t, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span>📱</span> {t.name}
                            </td>
                            <td style={{ fontFamily: 'monospace' }}>{t.id}</td>
                            <td>{t.clientIp || '127.0.0.1'}</td>
                            <td>
                              <span className={`badge ${t.status === 'online' ? 'badge-cash' : 'badge-danger'}`}>
                                {t.status === 'online' ? '🟢 Online' : '⚪ Offline'}
                              </span>
                            </td>
                            <td>{t.lastSeen ? new Date(t.lastSeen).toLocaleTimeString() : 'Never'}</td>
                            <td style={{ fontWeight: 800 }}>{t.ordersCount || 0}</td>
                            <td>v{t.appVersion || '2.0'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                            No mobile terminals registered yet. Follow the pairing guide below.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pairing Guide Card */}
              <div className="deploy-card">
                <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>
                  🔗 How to Connect Your Mobile Phone to This Server
                </h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '14px', fontSize: '13.5px' }}>
                  Make sure your mobile phone is connected to the same Wi-Fi network (or enter your server's public domain/IP if deployed online).
                </p>

                <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Server Connection URL for Mobile App
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--primary-dark)', fontFamily: 'monospace', margin: '6px 0' }}>
                    http://{serverStatus?.primaryIp || 'localhost'}:{serverStatus?.port || 5000}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Open the Bakery app on your phone → Profile → <strong>Cloud Server Sync</strong> → enter this URL and tap <strong>Sync Now</strong>!
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Tab: INVENTORY ─── */}
          {activeTab === 'inventory' && (
            <div>
              <div className="panel-card">
                <div className="panel-header">
                  <div className="panel-title">
                    <span>📦</span> Ingredient Stock & Raw Materials
                  </div>
                  <span className="badge badge-cash">Synced with Phone</span>
                </div>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Ingredient</th>
                        <th>Current Stock</th>
                        <th>Minimum Level</th>
                        <th>Unit Cost</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats?.inventory && stats.inventory.length > 0 ? (
                        stats.inventory.map(item => {
                          const isLow = Number(item.stock) <= Number(item.minStock);
                          return (
                            <tr key={item.id}>
                              <td style={{ fontWeight: 700 }}>{item.name}</td>
                              <td style={{ fontWeight: 800, fontSize: '15px' }}>
                                {item.stock} {item.unit}
                              </td>
                              <td style={{ color: 'var(--text-muted)' }}>
                                {item.minStock} {item.unit}
                              </td>
                              <td>${Number(item.costPerUnit || 0).toFixed(2)}</td>
                              <td>
                                <span className={`badge ${isLow ? 'badge-danger' : 'badge-cash'}`}>
                                  {isLow ? '⚠️ Low Stock' : '✅ Sufficient'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                            No inventory loaded. Sync with mobile phone to populate raw materials.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── Tab: MENU ─── */}
          {activeTab === 'menu' && (
            <div>
              <div className="panel-card">
                <div className="panel-header">
                  <div className="panel-title">
                    <span>🥐</span> Active Bakery Products & Performance
                  </div>
                  <span className="badge badge-cash">Synced with Phone</span>
                </div>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Selling Price</th>
                        <th>Cost</th>
                        <th>Margin</th>
                        <th>Units Sold</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats?.products && stats.products.length > 0 ? (
                        stats.products.map(p => {
                          const margin = p.price > 0 ? (((p.price - (p.cost || 0)) / p.price) * 100).toFixed(0) : 0;
                          return (
                            <tr key={p.id}>
                              <td style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: '20px' }}>{p.emoji || '🥐'}</span>
                                {p.name}
                              </td>
                              <td>{p.category}</td>
                              <td style={{ fontWeight: 800, color: 'var(--primary-dark)' }}>
                                ${Number(p.price).toFixed(2)}
                              </td>
                              <td style={{ color: 'var(--text-muted)' }}>${Number(p.cost || 0).toFixed(2)}</td>
                              <td style={{ fontWeight: 700, color: 'var(--success)' }}>{margin}%</td>
                              <td style={{ fontWeight: 800 }}>{p.soldCount || 0}</td>
                              <td>
                                <span className={`badge ${p.available !== false ? 'badge-cash' : 'badge-danger'}`}>
                                  {p.available !== false ? 'Available' : 'Sold Out'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                            No products loaded. Sync with mobile phone to populate menu.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── Tab: DEPLOYMENT ─── */}
          {activeTab === 'deployment' && (
            <div>
              <div className="deploy-card">
                <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>
                  🚀 Server Deployment Instructions
                </h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
                  This Admin Website and Sync Server is fully self-contained. Follow these steps to deploy it permanently on your Linux (Ubuntu/Debian) or Windows Server:
                </p>

                <h4 style={{ fontSize: '15px', fontWeight: 700, marginTop: '16px' }}>Method 1: Production Run via Node & PM2 (Recommended)</h4>
                <div className="code-snippet">
                  # 1. Inside bakery admin directory, build the frontend UI<br />
                  npm run build<br /><br />
                  # 2. Install PM2 process manager (keeps server running 24/7 forever)<br />
                  npm install -g pm2<br /><br />
                  # 3. Start the server with PM2<br />
                  pm2 start server.js --name "bakery-admin"<br /><br />
                  # 4. Save PM2 startup list so it restarts automatically if server reboots<br />
                  pm2 save<br />
                  pm2 startup
                </div>

                <h4 style={{ fontSize: '15px', fontWeight: 700, marginTop: '16px' }}>Method 2: Docker Container Deployment</h4>
                <div className="code-snippet">
                  # Build docker image<br />
                  docker build -t bakery-admin .<br /><br />
                  # Run on port 5000 with persistent data volume<br />
                  docker run -d -p 5000:5000 -v $(pwd)/data:/app/data --name bakery-server bakery-admin
                </div>

                <h4 style={{ fontSize: '15px', fontWeight: 700, marginTop: '16px' }}>Method 3: Nginx Reverse Proxy (For custom domain & SSL HTTPS)</h4>
                <div className="code-snippet">
                  server &#123;<br />
                  &nbsp;&nbsp;listen 80;<br />
                  &nbsp;&nbsp;server_name bakery.yourdomain.com;<br /><br />
                  &nbsp;&nbsp;location / &#123;<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;proxy_pass http://127.0.0.1:5000;<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;proxy_http_version 1.1;<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;proxy_set_header Upgrade $http_upgrade;<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;proxy_set_header Connection 'upgrade';<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;proxy_set_header Host $host;<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;proxy_cache_bypass $http_upgrade;<br />
                  &nbsp;&nbsp;&#125;<br />
                  &#125;
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ─── Thermal Receipt Modal ─── */}
      {selectedReceipt && (
        <div className="modal-overlay" onClick={() => setSelectedReceipt(null)}>
          <div className="receipt-modal-card" onClick={e => e.stopPropagation()}>
            <div className="receipt-modal-header">
              <span style={{ fontWeight: 800, fontSize: '16px' }}>Receipt #{selectedReceipt.id}</span>
              <button
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
                onClick={() => setSelectedReceipt(null)}
              >
                ✕
              </button>
            </div>

            <div className="receipt-paper">
              <div className="receipt-center">
                <div className="receipt-title">BAKERY</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>ARTISAN BAKERY & CAFE</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Order #{selectedReceipt.id}</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>
                  {selectedReceipt.createdAt ? new Date(selectedReceipt.createdAt).toLocaleString() : ''}
                </div>
              </div>

              <div className="receipt-divider"></div>

              <div className="receipt-row" style={{ fontSize: '11.5px', color: '#64748B' }}>
                <span>Customer:</span>
                <span>{selectedReceipt.customerName || 'Walk-in Customer'}</span>
              </div>
              <div className="receipt-row" style={{ fontSize: '11.5px', color: '#64748B' }}>
                <span>Payment:</span>
                <span style={{ fontWeight: 'bold' }}>{selectedReceipt.paymentMethod || 'Cash'}</span>
              </div>
              <div className="receipt-row" style={{ fontSize: '11.5px', color: '#64748B' }}>
                <span>Terminal:</span>
                <span>{selectedReceipt.terminalId || 'Mobile POS'}</span>
              </div>

              <div className="receipt-divider"></div>

              {/* Items */}
              {(selectedReceipt.items || []).map((item, idx) => (
                <div key={idx} className="receipt-row">
                  <span>{item.quantity}x {item.name}</span>
                  <span>${((Number(item.price) || 0) * (Number(item.quantity) || 1)).toFixed(2)}</span>
                </div>
              ))}

              <div className="receipt-divider"></div>

              <div className="receipt-row">
                <span>Subtotal:</span>
                <span>${Number(selectedReceipt.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="receipt-row">
                <span>Tax:</span>
                <span>${Number(selectedReceipt.tax || 0).toFixed(2)}</span>
              </div>
              <div className="receipt-row receipt-total" style={{ marginTop: '6px' }}>
                <span>TOTAL:</span>
                <span>${Number(selectedReceipt.total || 0).toFixed(2)}</span>
              </div>

              <div className="receipt-divider"></div>
              <div className="receipt-center" style={{ fontSize: '11px', color: '#64748B' }}>
                Thank you for your business!<br />
                Artisan Handcrafted Quality
              </div>
            </div>

            <div className="receipt-actions">
              <button
                className="btn-receipt-action"
                style={{ backgroundColor: 'var(--primary)', color: '#FFF' }}
                onClick={() => window.print()}
              >
                🖨️ Print Receipt
              </button>
              <button
                className="btn-receipt-action"
                style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)' }}
                onClick={() => setSelectedReceipt(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
'''

def write_app():
    path = os.path.join(ADMIN_DIR, 'src', 'App.jsx')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(APP_JSX)
    print(f'Written App.jsx: {path}')

if __name__ == '__main__':
    write_app()
