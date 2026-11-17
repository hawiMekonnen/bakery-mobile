import os

admin_root = r"c:\Users\user\Desktop\bakery admin"
app_jsx_path = os.path.join(admin_root, "src", "App.jsx")

app_jsx_code = """import React, { useState, useEffect } from "react";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("bakery_admin_token") || "");
  const [adminUser, setAdminUser] = useState(localStorage.getItem("bakery_admin_user") || "");

  // Login form state
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // App tabs & data
  const [activeTab, setActiveTab] = useState("devices");
  const [stats, setStats] = useState(null);
  const [devices, setDevices] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Filters
  const [orderSearch, setOrderSearch] = useState("");
  const [orderDateFilter, setOrderDateFilter] = useState("All");
  const [orderLicenseFilter, setOrderLicenseFilter] = useState("All");
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // License Modal
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [newLicShop, setNewLicShop] = useState("");
  const [newLicKey, setNewLicKey] = useState("");
  const [newLicMax, setNewLicMax] = useState("1");
  const [licError, setLicError] = useState("");

  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch all admin data
  const fetchData = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [resStats, resDevices, resLicenses, resOrders] = await Promise.all([
        fetch("/api/admin/stats", { headers }).then(r => r.ok ? r.json() : null),
        fetch("/api/admin/devices", { headers }).then(r => r.ok ? r.json() : { devices: [] }),
        fetch("/api/admin/licenses", { headers }).then(r => r.ok ? r.json() : { licenses: [] }),
        fetch("/api/admin/orders?limit=500", { headers }).then(r => r.ok ? r.json() : { orders: [] }),
      ]);

      if (resStats) setStats(resStats);
      if (resDevices && resDevices.devices) setDevices(resDevices.devices);
      if (resLicenses && resLicenses.licenses) setLicenses(resLicenses.licenses);
      if (resOrders && resOrders.orders) setOrders(resOrders.orders);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
      const interval = setInterval(fetchData, 4000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [token]);

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUser, password: loginPass })
      });
      const data = await res.json();
      if (data.success && data.token) {
        setToken(data.token);
        setAdminUser(data.username);
        localStorage.setItem("bakery_admin_token", data.token);
        localStorage.setItem("bakery_admin_user", data.username);
      } else {
        setLoginError(data.message || "Invalid username or password");
      }
    } catch (err) {
      setLoginError("Could not reach backend server.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setToken("");
    setAdminUser("");
    localStorage.removeItem("bakery_admin_token");
    localStorage.removeItem("bakery_admin_user");
  };

  // Remote Device Killswitch / Status Toggle
  const handleDeviceStatusChange = async (deviceId, status) => {
    setActionLoading(deviceId);
    try {
      const res = await fetch(`/api/admin/devices/${deviceId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      } else {
        alert(data.message || "Failed to update device status");
      }
    } catch (e) {
      alert("Error updating device status");
    } finally {
      setActionLoading(null);
    }
  };

  // 1-Click Authorize Device Swap
  const handleAuthorizeSwap = async (device) => {
    const confirmSwap = window.confirm(
      `Are you sure you want to authorize a device swap for "${device.shopName}"?\\n\\nThis will UNLINK phone "${device.model}" (${device.deviceId}) so a new replacement phone can register with license "${device.licenseKey}".`
    );
    if (!confirmSwap) return;

    setActionLoading(device.deviceId);
    try {
      const res = await fetch(`/api/admin/devices/${device.deviceId}/swap`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "Device unlinked. The client can now register on their new phone!");
        await fetchData();
      } else {
        alert(data.message || "Failed to unlink device.");
      }
    } catch (e) {
      alert("Error processing device swap.");
    } finally {
      setActionLoading(null);
    }
  };

  // Create New License
  const handleCreateLicense = async (e) => {
    e.preventDefault();
    setLicError("");
    try {
      const res = await fetch("/api/admin/licenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          shopName: newLicShop,
          licenseKey: newLicKey,
          maxDevices: Number(newLicMax) || 1
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowLicenseModal(false);
        setNewLicShop("");
        setNewLicKey("");
        await fetchData();
      } else {
        setLicError(data.message || "Failed to create license");
      }
    } catch (err) {
      setLicError("Error communicating with server");
    }
  };

  // ==========================================
  // VIEW: LOGIN SCREEN
  // ==========================================
  if (!token) {
    return (
      <div style={styles.loginOverlay}>
        <div style={styles.loginCard}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={styles.loginLogo}>🥖</div>
            <h1 style={{ fontSize: 24, fontWeight: "800", color: "#1E293B", margin: "8px 0 4px" }}>
              Bakery Cloud Admin
            </h1>
            <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>
              Device Licensing, Anti-Piracy & Sync Terminal
            </p>
          </div>

          {loginError && (
            <div style={styles.errorBox}>
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={styles.inputLabel}>Admin Username</label>
              <input
                type="text"
                style={styles.inputField}
                placeholder="admin"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={styles.inputLabel}>Password</label>
              <input
                type="password"
                style={styles.inputField}
                placeholder="••••••••"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              style={styles.loginBtn}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? "Authenticating..." : "Sign In to Admin Portal"}
            </button>
          </form>

          <div style={styles.loginFooter}>
            SkyKin Technologies PLC • Internal POS Operations
          </div>
        </div>
      </div>
    );
  }

  // Filter orders
  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

  const filteredOrders = orders.filter(o => {
    const d = (o.createdAt || "").split("T")[0];
    let mDate = true;
    if (orderDateFilter === "Today") mDate = d === todayStr;
    else if (orderDateFilter === "Yesterday") mDate = d === yesterdayStr;

    let mLic = true;
    if (orderLicenseFilter !== "All") mLic = o.licenseKey === orderLicenseFilter;

    let mSearch = true;
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      mSearch = (o.id || "").toLowerCase().includes(q) ||
                (o.customerName || "").toLowerCase().includes(q) ||
                (o.licenseKey || "").toLowerCase().includes(q);
    }
    return mDate && mLic && mSearch;
  });

  return (
    <div style={styles.appContainer}>
      {/* Top Header */}
      <header style={styles.topHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={styles.headerLogo}>🥖</div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={styles.headerTitle}>SkyKin Bakery Cloud Portal</h1>
              <span style={styles.serverOnlineBadge}>● SERVER ONLINE</span>
            </div>
            <p style={styles.headerSub}>Central Admin Dashboard, Hardware Device Tracking & Cloud Backup</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={styles.timeBox}>
            <span style={{ fontSize: 13, fontWeight: "700", color: "#1E293B" }}>{currentTime}</span>
            <span style={{ fontSize: 11, color: "#64748B" }}>Auto-Sync Active (4s)</span>
          </div>

          <div style={styles.userBadge}>
            <span style={{ fontSize: 12, fontWeight: "700", color: "#1E293B" }}>👤 {adminUser}</span>
            <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <nav style={styles.navBar}>
        <button
          style={activeTab === "devices" ? styles.tabBtnActive : styles.tabBtn}
          onClick={() => setActiveTab("devices")}
        >
          📱 Devices & Anti-Transfer Tracking
          <span style={styles.badge}>{devices.length}</span>
        </button>

        <button
          style={activeTab === "overview" ? styles.tabBtnActive : styles.tabBtn}
          onClick={() => setActiveTab("overview")}
        >
          📊 Live Sales Overview
        </button>

        <button
          style={activeTab === "orders" ? styles.tabBtnActive : styles.tabBtn}
          onClick={() => setActiveTab("orders")}
        >
          🧾 Synced Orders Feed
          <span style={styles.badge}>{orders.length}</span>
        </button>

        <button
          style={activeTab === "backup" ? styles.tabBtnActive : styles.tabBtn}
          onClick={() => setActiveTab("backup")}
        >
          💾 Cloud Disaster Recovery
        </button>
      </nav>

      {/* Main Body */}
      <main style={styles.mainContent}>
        {/* ======================================================== */}
        {/* TAB 1: DEVICES & HARDWARE TRACKING (THE CORE FEATURE)     */}
        {/* ======================================================== */}
        {activeTab === "devices" && (
          <div>
            {/* KPI Cards */}
            <div style={styles.kpiGrid}>
              <div style={styles.kpiCard}>
                <span style={styles.kpiLabel}>AUTHORIZED PHONES</span>
                <span style={styles.kpiValue}>{devices.length}</span>
                <span style={styles.kpiSub}>Bound to Company Licenses</span>
              </div>

              <div style={{ ...styles.kpiCard, borderLeft: "4px solid #16A34A" }}>
                <span style={styles.kpiLabel}>🟢 ONLINE RIGHT NOW</span>
                <span style={{ ...styles.kpiValue, color: "#16A34A" }}>
                  {devices.filter(d => d.isOnline).length}
                </span>
                <span style={styles.kpiSub}>Active Heartbeat Received</span>
              </div>

              <div style={{ ...styles.kpiCard, borderLeft: "4px solid #64748B" }}>
                <span style={styles.kpiLabel}>⚪ OFFLINE / STANDBY</span>
                <span style={{ ...styles.kpiValue, color: "#64748B" }}>
                  {devices.filter(d => !d.isOnline && d.status === "active").length}
                </span>
                <span style={styles.kpiSub}>Ready to Sync on Data Turn-On</span>
              </div>

              <div style={{ ...styles.kpiCard, borderLeft: "4px solid #DC2626" }}>
                <span style={styles.kpiLabel}>🔴 SUSPENDED / LOCKED</span>
                <span style={{ ...styles.kpiValue, color: "#DC2626" }}>
                  {devices.filter(d => d.status !== "active").length}
                </span>
                <span style={styles.kpiSub}>Remotely Blocked Installations</span>
              </div>
            </div>

            {/* Devices Table Card */}
            <div style={styles.contentCard}>
              <div style={styles.cardHeader}>
                <div>
                  <h2 style={styles.cardTitle}>Authorized Mobile Installations</h2>
                  <p style={styles.cardSub}>
                    Hardware Device Binding prevents copying the APK. Only registered phones can access and sync data.
                  </p>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button style={styles.primaryActionBtn} onClick={() => setShowLicenseModal(true)}>
                    + Generate New License Key
                  </button>
                  <button style={styles.secondaryActionBtn} onClick={fetchData}>
                    🔄 Refresh Status
                  </button>
                </div>
              </div>

              {devices.length === 0 ? (
                <div style={styles.emptyBox}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📱</div>
                  <h3 style={{ margin: 0, color: "#1E293B" }}>No Devices Registered Yet</h3>
                  <p style={{ color: "#64748B", fontSize: 13, maxWidth: 450, margin: "6px auto 16px" }}>
                    When a client opens the Bakery Mobile app on their phone and enters their License Key, their phone's unique hardware fingerprint will bind here automatically.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeadRow}>
                        <th style={styles.th}>STATUS</th>
                        <th style={styles.th}>SHOP NAME</th>
                        <th style={styles.th}>PHONE MODEL & OS</th>
                        <th style={styles.th}>HARDWARE DEVICE ID</th>
                        <th style={styles.th}>LICENSE KEY</th>
                        <th style={styles.th}>LAST SYNC</th>
                        <th style={styles.th}>LAST HEARTBEAT</th>
                        <th style={styles.th}>REMOTE KILLSWITCH</th>
                        <th style={styles.th}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devices.map(dev => (
                        <tr key={dev.deviceId} style={styles.tableRow}>
                          <td style={styles.td}>
                            {dev.isOnline ? (
                              <span style={styles.statusBadgeOnline}>● Online</span>
                            ) : dev.status === "suspended" ? (
                              <span style={styles.statusBadgeSuspended}>🔴 Suspended</span>
                            ) : dev.status === "revoked" ? (
                              <span style={styles.statusBadgeRevoked}>🚫 Revoked</span>
                            ) : (
                              <span style={styles.statusBadgeOffline}>⚪ Offline</span>
                            )}
                          </td>
                          <td style={styles.td}>
                            <strong style={{ color: "#1E293B" }}>{dev.shopName}</strong>
                            <div style={{ fontSize: 11, color: "#64748B" }}>IP: {dev.lastIp}</div>
                          </td>
                          <td style={styles.td}>
                            <div style={{ fontWeight: "600", color: "#334155" }}>{dev.model}</div>
                            <div style={{ fontSize: 11, color: "#64748B" }}>{dev.osVersion} • v{dev.appVersion}</div>
                          </td>
                          <td style={styles.td}>
                            <code style={styles.codeBadge}>{dev.deviceId}</code>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.licensePill}>{dev.licenseKey}</span>
                          </td>
                          <td style={styles.td}>
                            {dev.lastSync ? (
                              <span style={{ fontSize: 12, color: "#0F172A" }}>
                                {new Date(dev.lastSync).toLocaleTimeString()} ({new Date(dev.lastSync).toLocaleDateString()})
                              </span>
                            ) : (
                              <span style={{ fontSize: 12, color: "#94A3B8" }}>No sync yet</span>
                            )}
                          </td>
                          <td style={styles.td}>
                            {dev.lastPing ? (
                              <span style={{ fontSize: 12, color: "#0F172A" }}>
                                {new Date(dev.lastPing).toLocaleTimeString()}
                              </span>
                            ) : (
                              <span style={{ fontSize: 12, color: "#94A3B8" }}>--</span>
                            )}
                          </td>
                          <td style={styles.td}>
                            <select
                              value={dev.status}
                              disabled={actionLoading === dev.deviceId}
                              onChange={(e) => handleDeviceStatusChange(dev.deviceId, e.target.value)}
                              style={{
                                ...styles.statusSelect,
                                borderColor: dev.status === "active" ? "#16A34A" : "#DC2626",
                                color: dev.status === "active" ? "#16A34A" : "#DC2626",
                              }}
                            >
                              <option value="active">Active (Allowed)</option>
                              <option value="suspended">Suspended (Lock App)</option>
                              <option value="revoked">Revoked (Ban Device)</option>
                            </select>
                          </td>
                          <td style={styles.td}>
                            <button
                              style={styles.swapBtn}
                              disabled={actionLoading === dev.deviceId}
                              onClick={() => handleAuthorizeSwap(dev)}
                              title="Unlink this phone so the client can register a new replacement phone"
                            >
                              🔄 Authorize Swap
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Licenses Section */}
            <div style={styles.contentCard}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.cardTitle}>Issued Client Licenses</h3>
                  <p style={styles.cardSub}>Each license key can only be activated by the specified number of authorized devices.</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {licenses.map(lic => (
                  <div key={lic.licenseKey} style={styles.licenseCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: "800", color: "#1E293B" }}>{lic.shopName}</div>
                        <div style={{ fontSize: 12, color: "#64748B" }}>License Key:</div>
                      </div>
                      <span style={styles.licensePill}>{lic.licenseKey}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569", marginTop: 12, paddingTop: 10, borderTop: "1px dashed #E2E8F0" }}>
                      <span>Bound Phones: <strong>{lic.activeDeviceCount || 0} / {lic.maxDevices || 1}</strong></span>
                      <span style={{ color: lic.status === "active" ? "#16A34A" : "#DC2626", fontWeight: "700" }}>
                        {lic.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: OVERVIEW / DASHBOARD                               */}
        {/* ======================================================== */}
        {activeTab === "overview" && (
          <div>
            <div style={styles.kpiGrid}>
              <div style={styles.kpiCard}>
                <span style={styles.kpiLabel}>TOTAL REVENUE (ALL SHOPS)</span>
                <span style={styles.kpiValue}>${(stats?.allTime?.revenue || 0).toFixed(2)}</span>
                <span style={styles.kpiSub}>{stats?.allTime?.ordersCount || 0} total receipts synced</span>
              </div>

              <div style={{ ...styles.kpiCard, borderLeft: "4px solid #C25E00" }}>
                <span style={styles.kpiLabel}>TODAY'S REVENUE</span>
                <span style={{ ...styles.kpiValue, color: "#C25E00" }}>${(stats?.today?.revenue || 0).toFixed(2)}</span>
                <span style={styles.kpiSub}>{stats?.today?.ordersCount || 0} orders today</span>
              </div>

              <div style={{ ...styles.kpiCard, borderLeft: "4px solid #16A34A" }}>
                <span style={styles.kpiLabel}>ONLINE TERMINALS</span>
                <span style={{ ...styles.kpiValue, color: "#16A34A" }}>{stats?.devices?.online || 0}</span>
                <span style={styles.kpiSub}>Transmitting sales live</span>
              </div>

              <div style={{ ...styles.kpiCard, borderLeft: "4px solid #2563EB" }}>
                <span style={styles.kpiLabel}>LAST CLOUD SYNC</span>
                <span style={{ ...styles.kpiValue, fontSize: 16, marginTop: 8 }}>
                  {stats?.lastSync ? new Date(stats.lastSync).toLocaleTimeString() : "Pending"}
                </span>
                <span style={styles.kpiSub}>Automated Background Sync</span>
              </div>
            </div>

            <div style={styles.contentCard}>
              <h3 style={styles.cardTitle}>Recent Synced Orders Feed</h3>
              <p style={styles.cardSub}>Orders appear here in real-time as soon as mobile devices enable data or Wi-Fi.</p>

              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeadRow}>
                    <th style={styles.th}>RECEIPT #</th>
                    <th style={styles.th}>DATE & TIME</th>
                    <th style={styles.th}>SHOP / LICENSE</th>
                    <th style={styles.th}>PAYMENT</th>
                    <th style={styles.th}>ITEMS</th>
                    <th style={styles.th}>TOTAL</th>
                    <th style={styles.th}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 8).map(ord => (
                    <tr key={ord.id} style={styles.tableRow}>
                      <td style={styles.td}><strong>#{ord.id}</strong></td>
                      <td style={styles.td}>{ord.createdAt ? new Date(ord.createdAt).toLocaleString() : "--"}</td>
                      <td style={styles.td}><span style={styles.licensePill}>{ord.licenseKey || "Direct"}</span></td>
                      <td style={styles.td}>{ord.paymentMethod || "Cash"}</td>
                      <td style={styles.td}>{(ord.items || []).length} items</td>
                      <td style={styles.td}><strong style={{ color: "#16A34A" }}>${Number(ord.total || 0).toFixed(2)}</strong></td>
                      <td style={styles.td}>
                        <button style={styles.viewSlipBtn} onClick={() => setSelectedReceipt(ord)}>
                          View Slip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: ORDERS FEED                                        */}
        {/* ======================================================== */}
        {activeTab === "orders" && (
          <div style={styles.contentCard}>
            <div style={styles.cardHeader}>
              <div>
                <h2 style={styles.cardTitle}>Central Orders Audit Ledger</h2>
                <p style={styles.cardSub}>Search, filter, and inspect every sale made across all mobile devices.</p>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="Search receipt #, customer..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  style={styles.filterInput}
                />
                <select
                  value={orderDateFilter}
                  onChange={(e) => setOrderDateFilter(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="All">All Dates</option>
                  <option value="Today">Today</option>
                  <option value="Yesterday">Yesterday</option>
                </select>
                <select
                  value={orderLicenseFilter}
                  onChange={(e) => setOrderLicenseFilter(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="All">All Shops</option>
                  {licenses.map(l => (
                    <option key={l.licenseKey} value={l.licenseKey}>{l.shopName}</option>
                  ))}
                </select>
              </div>
            </div>

            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeadRow}>
                  <th style={styles.th}>RECEIPT #</th>
                  <th style={styles.th}>TIMESTAMP</th>
                  <th style={styles.th}>SHOP / LICENSE</th>
                  <th style={styles.th}>CASHIER</th>
                  <th style={styles.th}>PAYMENT</th>
                  <th style={styles.th}>ITEMS COUNT</th>
                  <th style={styles.th}>TOTAL</th>
                  <th style={styles.th}>INSPECT</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(ord => (
                  <tr key={ord.id} style={styles.tableRow}>
                    <td style={styles.td}><strong>#{ord.id}</strong></td>
                    <td style={styles.td}>{ord.createdAt ? new Date(ord.createdAt).toLocaleString() : "--"}</td>
                    <td style={styles.td}><span style={styles.licensePill}>{ord.licenseKey || "Standard"}</span></td>
                    <td style={styles.td}>{ord.createdBy || ord.cashier || "Staff"}</td>
                    <td style={styles.td}>{ord.paymentMethod || "Cash"}</td>
                    <td style={styles.td}>{(ord.items || []).length} items</td>
                    <td style={styles.td}><strong style={{ color: "#16A34A" }}>${Number(ord.total || 0).toFixed(2)}</strong></td>
                    <td style={styles.td}>
                      <button style={styles.viewSlipBtn} onClick={() => setSelectedReceipt(ord)}>
                        View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: BACKUP & DISASTER RECOVERY                         */}
        {/* ======================================================== */}
        {activeTab === "backup" && (
          <div>
            <div style={styles.contentCard}>
              <h2 style={styles.cardTitle}>Cloud Disaster Recovery & Terminal Backup</h2>
              <p style={styles.cardSub}>
                Your cloud database retains full redundancy. If a shop loses or damages a phone, their entire sales and catalog are safe.
              </p>

              <div style={styles.disasterBox}>
                <div style={{ fontSize: 28 }}>🛡️</div>
                <div>
                  <h4 style={{ margin: "0 0 4px", color: "#1E293B" }}>How 1-Click Phone Replacement Works:</h4>
                  <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                    <li>The shop contacts you stating their phone is broken, stolen, or replaced.</li>
                    <li>In the <strong>Devices</strong> tab, click <strong>"Authorize Swap 🔄"</strong> next to their old phone.</li>
                    <li>The client installs Bakery POS on their new phone and enters their License Key.</li>
                    <li>The new phone immediately binds itself and pulls down their entire sales history and inventory!</li>
                  </ol>
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                <h4 style={{ fontSize: 14, color: "#1E293B", marginBottom: 12 }}>Download Server Database Backups:</h4>
                <div style={{ display: "flex", gap: 12 }}>
                  <a
                    href={`/api/admin/export?format=json`}
                    download
                    style={{ ...styles.primaryActionBtn, textDecoration: "none", display: "inline-block" }}
                    onClick={(e) => {
                      if (!token) return;
                      // Download with bearer header via fetch
                      e.preventDefault();
                      fetch("/api/admin/export?format=json", { headers: { Authorization: `Bearer ${token}` } })
                        .then(r => r.blob())
                        .then(blob => {
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `bakery-full-backup-${todayStr}.json`;
                          a.click();
                        });
                    }}
                  >
                    📥 Export Full Database (JSON)
                  </a>

                  <a
                    href={`/api/admin/export?format=csv`}
                    download
                    style={{ ...styles.secondaryActionBtn, textDecoration: "none", display: "inline-block" }}
                    onClick={(e) => {
                      if (!token) return;
                      e.preventDefault();
                      fetch("/api/admin/export?format=csv", { headers: { Authorization: `Bearer ${token}` } })
                        .then(r => r.blob())
                        .then(blob => {
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `bakery-orders-${todayStr}.csv`;
                          a.click();
                        });
                    }}
                  >
                    📊 Export Orders Spreadsheet (CSV)
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: CREATE LICENSE */}
      {showLicenseModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#1E293B" }}>Create New Client License</h3>
              <button style={styles.closeBtn} onClick={() => setShowLicenseModal(false)}>✕</button>
            </div>

            {licError && <div style={styles.errorBox}>⚠️ {licError}</div>}

            <form onSubmit={handleCreateLicense}>
              <div style={{ marginBottom: 14 }}>
                <label style={styles.inputLabel}>Shop / Bakery Business Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sunrise Bakery Branch 2"
                  value={newLicShop}
                  onChange={(e) => setNewLicShop(e.target.value)}
                  style={styles.inputField}
                  required
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={styles.inputLabel}>Custom License Key (Leave blank to auto-generate)</label>
                <input
                  type="text"
                  placeholder="e.g. SKY-BAKERY-003"
                  value={newLicKey}
                  onChange={(e) => setNewLicKey(e.target.value)}
                  style={styles.inputField}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={styles.inputLabel}>Allowed Simultaneous Phones</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newLicMax}
                  onChange={(e) => setNewLicMax(e.target.value)}
                  style={styles.inputField}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" style={styles.secondaryActionBtn} onClick={() => setShowLicenseModal(false)}>
                  Cancel
                </button>
                <button type="submit" style={styles.primaryActionBtn}>
                  Generate License Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECEIPT SLIP INSPECTION */}
      {selectedReceipt && (
        <div style={styles.modalOverlay} onClick={() => setSelectedReceipt(null)}>
          <div style={styles.receiptModalCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: "800", color: "#64748B" }}>RECEIPT SLIP INSPECTION</span>
              <button style={styles.closeBtn} onClick={() => setSelectedReceipt(null)}>✕</button>
            </div>

            <div style={styles.thermalSlip}>
              <div style={{ textAlign: "center", fontWeight: "800", fontSize: 16 }}>BAKERY POS</div>
              <div style={{ textAlign: "center", fontSize: 10, color: "#475569" }}>ARTISAN BAKERY & CAFE</div>
              <div style={{ borderBottom: "1px dashed #000", margin: "8px 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span>Receipt #:</span>
                <strong>#{selectedReceipt.id}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span>Date:</span>
                <span>{selectedReceipt.createdAt ? new Date(selectedReceipt.createdAt).toLocaleString() : "--"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span>Payment:</span>
                <span>{selectedReceipt.paymentMethod || "Cash"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span>Shop License:</span>
                <span>{selectedReceipt.licenseKey || "Standard"}</span>
              </div>

              <div style={{ borderBottom: "1px dashed #000", margin: "8px 0" }} />

              {(selectedReceipt.items || []).map((it, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                  <span>{it.name} x{it.quantity}</span>
                  <span>${(Number(it.price) * Number(it.quantity)).toFixed(2)}</span>
                </div>
              ))}

              <div style={{ borderBottom: "1px dashed #000", margin: "8px 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span>Subtotal:</span>
                <span>${Number(selectedReceipt.subtotal || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span>Tax:</span>
                <span>${Number(selectedReceipt.tax || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: "800", marginTop: 4 }}>
                <span>TOTAL:</span>
                <span>${Number(selectedReceipt.total || 0).toFixed(2)}</span>
              </div>

              <div style={{ borderBottom: "1px dashed #000", margin: "8px 0" }} />
              <div style={{ textAlign: "center", fontSize: 10, color: "#475569" }}>VERIFIED AUTHENTIC CLOUD SALE</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  appContainer: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    backgroundColor: "#F8FAFC",
    minHeight: "100vh",
    color: "#0F172A",
  },
  topHeader: {
    backgroundColor: "#FFFFFF",
    borderBottom: "1px solid #E2E8F0",
    padding: "16px 28px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLogo: {
    fontSize: 28,
    width: 44,
    height: 44,
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    margin: 0,
  },
  serverOnlineBadge: {
    fontSize: 10,
    fontWeight: "800",
    backgroundColor: "#DCFCE7",
    color: "#16A34A",
    padding: "2px 8px",
    borderRadius: 12,
  },
  headerSub: {
    fontSize: 12,
    color: "#64748B",
    margin: "2px 0 0",
  },
  timeBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },
  userBadge: {
    backgroundColor: "#F1F5F9",
    padding: "6px 12px",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoutBtn: {
    backgroundColor: "#FEE2E2",
    color: "#DC2626",
    border: "none",
    padding: "3px 8px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: "700",
    cursor: "pointer",
  },
  navBar: {
    backgroundColor: "#FFFFFF",
    borderBottom: "1px solid #E2E8F0",
    padding: "0 28px",
    display: "flex",
    gap: 8,
  },
  tabBtn: {
    padding: "14px 18px",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: "3px solid transparent",
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  tabBtnActive: {
    padding: "14px 18px",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: "3px solid #C25E00",
    fontSize: 13,
    fontWeight: "800",
    color: "#C25E00",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    backgroundColor: "#F1F5F9",
    color: "#475569",
    fontSize: 11,
    padding: "2px 6px",
    borderRadius: 10,
    fontWeight: "700",
  },
  mainContent: {
    padding: "24px 28px",
    maxWidth: 1400,
    margin: "0 auto",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    marginBottom: 20,
  },
  kpiCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: "18px 20px",
    border: "1px solid #E2E8F0",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    margin: "6px 0 2px",
  },
  kpiSub: {
    fontSize: 11,
    color: "#94A3B8",
  },
  contentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    border: "1px solid #E2E8F0",
    padding: 22,
    marginBottom: 20,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    flexWrap: "wrap",
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    margin: 0,
  },
  cardSub: {
    fontSize: 12,
    color: "#64748B",
    margin: "3px 0 0",
  },
  primaryActionBtn: {
    backgroundColor: "#C25E00",
    color: "#FFF",
    border: "none",
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "700",
    cursor: "pointer",
  },
  secondaryActionBtn: {
    backgroundColor: "#F1F5F9",
    color: "#334155",
    border: "1px solid #CBD5E1",
    padding: "8px 14px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "700",
    cursor: "pointer",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  tableHeadRow: {
    backgroundColor: "#F8FAFC",
    borderBottom: "1px solid #E2E8F0",
  },
  th: {
    padding: "10px 14px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  tableRow: {
    borderBottom: "1px solid #F1F5F9",
  },
  td: {
    padding: "12px 14px",
    verticalAlign: "middle",
  },
  statusBadgeOnline: {
    backgroundColor: "#DCFCE7",
    color: "#16A34A",
    fontSize: 11,
    fontWeight: "800",
    padding: "3px 8px",
    borderRadius: 12,
  },
  statusBadgeOffline: {
    backgroundColor: "#F1F5F9",
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    padding: "3px 8px",
    borderRadius: 12,
  },
  statusBadgeSuspended: {
    backgroundColor: "#FEF3C7",
    color: "#B45309",
    fontSize: 11,
    fontWeight: "700",
    padding: "3px 8px",
    borderRadius: 12,
  },
  statusBadgeRevoked: {
    backgroundColor: "#FEE2E2",
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "800",
    padding: "3px 8px",
    borderRadius: 12,
  },
  codeBadge: {
    fontFamily: "monospace",
    backgroundColor: "#F1F5F9",
    padding: "2px 6px",
    borderRadius: 4,
    fontSize: 11,
    color: "#334155",
  },
  licensePill: {
    fontFamily: "monospace",
    backgroundColor: "#EDE9FE",
    color: "#6D28D9",
    padding: "2px 8px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: "700",
  },
  statusSelect: {
    padding: "4px 8px",
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
    fontSize: 11,
    fontWeight: "700",
    backgroundColor: "#FFF",
    cursor: "pointer",
  },
  swapBtn: {
    backgroundColor: "#EFF6FF",
    color: "#2563EB",
    border: "1px solid #BFDBFE",
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: "700",
    cursor: "pointer",
  },
  viewSlipBtn: {
    backgroundColor: "#F1F5F9",
    color: "#0F172A",
    border: "1px solid #CBD5E1",
    padding: "4px 8px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: "600",
    cursor: "pointer",
  },
  licenseCard: {
    backgroundColor: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: 10,
    padding: 14,
  },
  filterInput: {
    padding: "6px 12px",
    border: "1px solid #CBD5E1",
    borderRadius: 6,
    fontSize: 12,
  },
  filterSelect: {
    padding: "6px 10px",
    border: "1px solid #CBD5E1",
    borderRadius: 6,
    fontSize: 12,
    backgroundColor: "#FFF",
  },
  disasterBox: {
    backgroundColor: "#F8FAFC",
    border: "1px solid #E2E8F0",
    borderRadius: 10,
    padding: 16,
    display: "flex",
    gap: 14,
    alignItems: "flex-start",
  },
  emptyBox: {
    textAlign: "center",
    padding: "40px 20px",
  },
  loginOverlay: {
    minHeight: "100vh",
    backgroundColor: "#0F172A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  loginCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: "32px 28px",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
  },
  loginLogo: {
    fontSize: 40,
    width: 64,
    height: 64,
    backgroundColor: "#FEF3C7",
    borderRadius: 16,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  inputLabel: {
    display: "block",
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  inputField: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: "1px solid #CBD5E1",
    borderRadius: 8,
    fontSize: 13,
  },
  loginBtn: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#C25E00",
    color: "#FFF",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: "800",
    cursor: "pointer",
  },
  loginFooter: {
    textAlign: "center",
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 20,
  },
  errorBox: {
    backgroundColor: "#FEE2E2",
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "600",
    padding: "8px 12px",
    borderRadius: 6,
    marginBottom: 16,
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15,23,42,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
  },
  receiptModalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 18,
    color: "#94A3B8",
    cursor: "pointer",
  },
  thermalSlip: {
    fontFamily: "'Courier New', Courier, monospace",
    backgroundColor: "#FAFAFA",
    border: "1px solid #E2E8F0",
    padding: 14,
    borderRadius: 8,
  },
};
"""

with open(app_jsx_path, "w", encoding="utf-8") as f:
    f.write(app_jsx_code)

print("Updated App.jsx with full Auth, Device Tracking, and Killswitch controls successfully!")

