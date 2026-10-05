import React, { useState, useEffect } from "react";

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [orderSearch, setOrderSearch] = useState("");
  const [orderDateFilter, setOrderDateFilter] = useState("All");
  const [orderPaymentFilter, setOrderPaymentFilter] = useState("All");
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchData = async () => {
    try {
      const [resStats, resOrders] = await Promise.all([
        fetch("/api/stats").then(r => r.json()).catch(() => null),
        fetch("/api/orders?limit=500").then(r => r.json()).catch(() => ({ orders: [] })),
        fetch("/api/products").then(r => r.json()).catch(() => []),
      ]);
      if (resStats) setStats(resStats);
      if (resOrders && resOrders.orders) setOrders(resOrders.orders);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

  const filteredOrders = orders.filter(o => {
    const d = (o.createdAt || "").split("T")[0];
    let mDate = true;
    if (orderDateFilter === "Today") mDate = d === todayStr;
    else if (orderDateFilter === "Yesterday") mDate = d === yesterdayStr;
    let mPay = true;
    if (orderPaymentFilter !== "All") mPay = (o.paymentMethod || "").toLowerCase() === orderPaymentFilter.toLowerCase();
    let mSearch = true;
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      mSearch = (o.id || "").toLowerCase().includes(q) || (o.customerName || "").toLowerCase().includes(q);
    }
    return mDate && mPay && mSearch;
  });

  const exportData = fmt => window.open(`/api/export?format=${fmt}`, "_blank");
  const primaryTerminal = stats?.terminals?.[0] || null;
  const isOnline = primaryTerminal?.status === "online";

  const topProducts = (() => {
    const map = {};
    orders.forEach(o => (o.items || []).forEach(item => {
      if (!map[item.name]) map[item.name] = { name: item.name, qty: 0, rev: 0 };
      map[item.name].qty += Number(item.quantity) || 1;
      map[item.name].rev += (Number(item.price) || 0) * (Number(item.quantity) || 1);
    }));
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5);
  })();

  const todayOrders = orders.filter(o => (o.createdAt || "").startsWith(todayStr));
  const todayRev = todayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const totalRev = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const avgOrder = orders.length ? totalRev / orders.length : 0;
  const cashOrders = orders.filter(o => (o.paymentMethod || "").toLowerCase() === "cash");
  const cardOrders = orders.filter(o => (o.paymentMethod || "").toLowerCase() === "card");
  const mobileOrders = orders.filter(o => (o.paymentMethod || "").toLowerCase() === "mobile");
  const pt = orders.length || 1;
  const cashPct = Math.round(cashOrders.length / pt * 100);
  const cardPct = Math.round(cardOrders.length / pt * 100);
  const mobPct  = Math.round(mobileOrders.length / pt * 100);

  const payBadge = pm => {
    const p = (pm || "").toLowerCase();
    if (p === "cash")   return "badge-green";
    if (p === "card")   return "badge-blue";
    return "badge-purple";
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p style={{ fontWeight: 600, color: "var(--text-muted)" }}>Loading Bakery Admin...</p>
    </div>
  );

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const PAGE_TITLE = {
    overview:  "Operations Dashboard",
    orders:    "Synced Orders & Receipts",
    terminals: "Mobile POS Terminals",
    inventory: "Ingredient & Stock Monitor",
    menu:      "Bakery Menu Performance",
  };

  const NAV = [
    { section: "Monitor", items: [
      { id: "overview",  label: "Dashboard" },
      { id: "orders",    label: "Synced Orders" },
    ]},
    { section: "Devices", items: [
      { id: "terminals", label: "Mobile Terminals" },
    ]},
    { section: "Inventory", items: [
      { id: "inventory", label: "Stock & Ingredients" },
      { id: "menu",      label: "Bakery Menu" },
    ]},
  ];

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-inner">
            <div className="logo-icon">B</div>
            <div className="logo-text">
              <h2>BakerAdmin</h2>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(section => (
            <div className="nav-section" key={section.section}>
              <div className="nav-section-title">{section.section}</div>
              {section.items.map(item => (
                <button key={item.id} className={`nav-item ${activeTab === item.id ? "active" : ""}`} onClick={() => setActiveTab(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="status-card">
            <div className={`status-dot ${isOnline ? "" : "offline"}`}></div>
            <div className="status-info">
              <p>{isOnline ? "Terminal Live" : "Terminal Offline"}</p>
              <span>{primaryTerminal ? `${primaryTerminal.ordersCount || 0} orders synced` : "Awaiting sync"}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-title">{PAGE_TITLE[activeTab]}</span>
            <span className={`topbar-badge ${isOnline ? "" : "offline"}`}>
              <span className={`pulse-dot ${isOnline ? "live" : ""}`}></span>
              {isOnline ? "Live Sync" : "Standby"}
            </span>
          </div>
          <div className="topbar-right">
            <span className="topbar-clock">{currentTime}</span>
            <button className="btn btn-primary btn-sm" onClick={fetchData}>Refresh</button>
          </div>
        </header>

        <div className="page-wrapper">
          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div>
              <div className="stat-grid">
                <div className="stat-card amber">
                  <div className="stat-label">Today's Revenue</div>
                  <div className="stat-value amber">${todayRev.toFixed(2)}</div>
                  <div className="stat-sub">{todayOrders.length} orders today</div>
                </div>
                <div className="stat-card green">
                  <div className="stat-label">Total All-Time Revenue</div>
                  <div className="stat-value">${totalRev.toFixed(2)}</div>
                  <div className="stat-sub">{orders.length} total orders synced</div>
                </div>
                <div className="stat-card blue">
                  <div className="stat-label">Average Order Value</div>
                  <div className="stat-value">${avgOrder.toFixed(2)}</div>
                  <div className="stat-sub">Per transaction</div>
                </div>
                <div className="stat-card purple">
                  <div className="stat-label">Active Terminals</div>
                  <div className="stat-value">{stats?.terminals?.length || 0}</div>
                  <div className="stat-sub">Mobile POS devices</div>
                </div>
              </div>

              <div className="two-col">
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Recent Synced Orders</span>
                    <span style={{fontSize:"12px",color:"var(--text-muted)"}}>Updated {lastUpdated.toLocaleTimeString()}</span>
                  </div>
                  <div className="table-wrap">
                    <table className="table">
                      <thead><tr><th>Order #</th><th>Time</th><th>Customer</th><th>Payment</th><th>Total</th></tr></thead>
                      <tbody>
                        {orders.slice(0,8).length === 0 ? (
                          <tr><td colSpan="5"><div className="empty-state"><h3>No orders yet</h3><p>Sync the mobile app to see orders here</p></div></td></tr>
                        ) : orders.slice(0,8).map(o => (
                          <tr key={o.id} style={{cursor:"pointer"}} onClick={() => setSelectedReceipt(o)}>
                            <td><strong>{o.id}</strong></td>
                            <td>{o.createdAt ? new Date(o.createdAt).toLocaleTimeString() : "-"}</td>
                            <td>{o.customerName || "Walk-in"}</td>
                            <td><span className={`badge ${payBadge(o.paymentMethod)}`}>{o.paymentMethod || "Cash"}</span></td>
                            <td><strong style={{color:"var(--amber-600)"}}>${Number(o.total||0).toFixed(2)}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <div className="card" style={{marginBottom:"16px"}}>
                    <div className="card-header"><span className="card-title">Payment Breakdown</span></div>
                    <div className="card-body">
                      <div className="pay-list">
                        <div className="pay-item">
                          <div className="pay-item-top"><span>Cash</span><span>{cashPct}% ({cashOrders.length})</span></div>
                          <div className="pay-bar-bg"><div className="pay-bar-fill" style={{width:`${cashPct}%`,background:"var(--success)"}}></div></div>
                        </div>
                        <div className="pay-item">
                          <div className="pay-item-top"><span>Card</span><span>{cardPct}% ({cardOrders.length})</span></div>
                          <div className="pay-bar-bg"><div className="pay-bar-fill" style={{width:`${cardPct}%`,background:"var(--info)"}}></div></div>
                        </div>
                        <div className="pay-item">
                          <div className="pay-item-top"><span>Mobile Pay</span><span>{mobPct}% ({mobileOrders.length})</span></div>
                          <div className="pay-bar-bg"><div className="pay-bar-fill" style={{width:`${mobPct}%`,background:"var(--purple)"}}></div></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header"><span className="card-title">Top Selling Items</span></div>
                    <div className="card-body">
                      <div className="rank-list">
                        {topProducts.length === 0
                          ? <p style={{fontSize:"13px",color:"var(--text-muted)"}}>Sync orders to see top products</p>
                          : topProducts.map((p,i) => (
                            <div key={i} className="rank-row">
                              <span className="rank-num">#{i+1}</span>
                              <span className="rank-name">{p.name}</span>
                              <span className="rank-sold">{p.qty} sold</span>
                              <span className="rank-rev">${p.rev.toFixed(2)}</span>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ORDERS */}
          {activeTab === "orders" && (
            <div>
              <div className="filter-bar">
                <div className="filter-group">
                  <input type="text" className="form-input" placeholder="Search by Order # or Customer..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />
                  <select className="form-select" value={orderDateFilter} onChange={e => setOrderDateFilter(e.target.value)}>
                    <option value="All">All Dates</option>
                    <option value="Today">Today</option>
                    <option value="Yesterday">Yesterday</option>
                  </select>
                  <select className="form-select" value={orderPaymentFilter} onChange={e => setOrderPaymentFilter(e.target.value)}>
                    <option value="All">All Payments</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Mobile">Mobile</option>
                  </select>
                </div>
                <div className="filter-group">
                  <button className="btn btn-secondary btn-sm" onClick={() => exportData("csv")}>Export CSV</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => exportData("json")}>Export JSON</button>
                </div>
              </div>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Orders — {filteredOrders.length} records</span>
                  <strong style={{color:"var(--amber-600)"}}>Total: ${filteredOrders.reduce((s,o)=>s+(Number(o.total)||0),0).toFixed(2)}</strong>
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Order #</th><th>Date & Time</th><th>Customer</th><th>Payment</th><th>Items</th><th>Subtotal</th><th>Tax</th><th>Total</th><th></th></tr></thead>
                    <tbody>
                      {filteredOrders.length === 0
                        ? <tr><td colSpan="9"><div className="empty-state"><h3>No orders found</h3><p>Try adjusting the filters</p></div></td></tr>
                        : filteredOrders.map(o => (
                          <tr key={o.id}>
                            <td><strong>{o.id}</strong></td>
                            <td style={{fontSize:"12px"}}>{o.createdAt ? new Date(o.createdAt).toLocaleString() : "-"}</td>
                            <td>{o.customerName || "Walk-in Customer"}</td>
                            <td><span className={`badge ${payBadge(o.paymentMethod)}`}>{o.paymentMethod || "Cash"}</span></td>
                            <td style={{maxWidth:"240px",fontSize:"12.5px"}}>{(o.items||[]).map(i=>`${i.quantity}x ${i.name}`).join(", ")||"—"}</td>
                            <td>${Number(o.subtotal||0).toFixed(2)}</td>
                            <td>${Number(o.tax||0).toFixed(2)}</td>
                            <td><strong style={{color:"var(--amber-600)"}}>${Number(o.total||0).toFixed(2)}</strong></td>
                            <td><button className="btn btn-secondary btn-sm" onClick={() => setSelectedReceipt(o)}>View</button></td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TERMINALS */}
          {activeTab === "terminals" && (
            <div>
              <div className="card" style={{marginBottom:"20px"}}>
                <div className="card-header">
                  <span className="card-title">Connected Mobile POS Terminals</span>
                  <span style={{fontSize:"12px",color:"var(--text-muted)"}}>Auto-refresh every 5s</span>
                </div>
                {!stats?.terminals || stats.terminals.length === 0
                  ? <div className="empty-state"><h3>No terminals connected</h3><p>Open the mobile app and sync to register</p></div>
                  : <div className="terminal-grid">
                      {stats.terminals.map((t,i) => (
                        <div key={i} className="terminal-card">
                          <div className="terminal-card-top">
                            <div>
                              <div className="terminal-name">{t.name || `Terminal ${i+1}`}</div>
                              <div className="terminal-id">ID: {t.id || "—"}</div>
                            </div>
                            <span className={`badge ${t.status==="online"?"badge-green":"badge-gray"}`}>{t.status==="online"?"Online":"Offline"}</span>
                          </div>
                          <div style={{fontSize:"11.5px",color:"var(--text-muted)",marginBottom:"4px"}}>Last sync: {t.lastSync ? new Date(t.lastSync).toLocaleString() : "Never"}</div>
                          <div className="terminal-stats">
                            <div className="terminal-stat-item"><div className="terminal-stat-val">{t.ordersCount||0}</div><div className="terminal-stat-lbl">Orders</div></div>
                            <div className="terminal-stat-item"><div className="terminal-stat-val">${(t.totalRevenue||0).toFixed(2)}</div><div className="terminal-stat-lbl">Revenue</div></div>
                            <div className="terminal-stat-item"><div className="terminal-stat-val">{t.appVersion||"—"}</div><div className="terminal-stat-lbl">Version</div></div>
                          </div>
                        </div>
                      ))}
                    </div>
                }
              </div>
              <div className="card">
                <div className="card-header"><span className="card-title">Terminal Activity Log</span></div>
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Name</th><th>ID</th><th>Status</th><th>Last Sync</th><th>Orders</th><th>App Version</th></tr></thead>
                    <tbody>
                      {!stats?.terminals || stats.terminals.length === 0
                        ? <tr><td colSpan="6"><div className="empty-state"><p>No terminal data</p></div></td></tr>
                        : stats.terminals.map((t,i) => (
                          <tr key={i}>
                            <td><strong>{t.name || `Terminal ${i+1}`}</strong></td>
                            <td style={{fontSize:"12px"}}>{t.id||"—"}</td>
                            <td><span className={`badge ${t.status==="online"?"badge-green":"badge-gray"}`}>{t.status==="online"?"Online":"Offline"}</span></td>
                            <td style={{fontSize:"12px"}}>{t.lastSync ? new Date(t.lastSync).toLocaleString() : "Never"}</td>
                            <td><strong>{t.ordersCount||0}</strong></td>
                            <td>{t.appVersion||"—"}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* INVENTORY */}
          {activeTab === "inventory" && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Ingredient & Stock Levels</span>
                <span style={{fontSize:"12px",color:"var(--text-muted)"}}>Synced from mobile app</span>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Ingredient</th><th>Category</th><th>Stock</th><th>Unit</th><th>Min. Level</th><th>Status</th></tr></thead>
                  <tbody>
                    {!stats?.inventory || stats.inventory.length === 0
                      ? <tr><td colSpan="6"><div className="empty-state"><h3>No inventory data</h3><p>Sync the mobile app to push stock levels</p></div></td></tr>
                      : stats.inventory.map((item,i) => {
                          const low = Number(item.quantity) <= Number(item.minLevel||0);
                          return (
                            <tr key={i}>
                              <td><strong>{item.name}</strong></td>
                              <td>{item.category||"—"}</td>
                              <td><strong style={{color:low?"var(--danger)":"var(--text-primary)"}}>{item.quantity}</strong></td>
                              <td>{item.unit||"units"}</td>
                              <td>{item.minLevel||"—"}</td>
                              <td><span className={`badge ${low?"badge-red":"badge-green"}`}>{low?"Low Stock":"OK"}</span></td>
                            </tr>
                          );
                        })
                    }
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MENU */}
          {activeTab === "menu" && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Bakery Menu & Product Performance</span>
                <span style={{fontSize:"12px",color:"var(--text-muted)"}}>Synced from mobile app</span>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Product Name</th><th>Category</th><th>Price</th><th>Prepared Today</th><th>Total Sold</th><th>Remaining</th><th>Revenue</th><th>Status</th></tr></thead>
                  <tbody>
                    {!stats?.products || stats.products.length === 0
                      ? <tr><td colSpan="8"><div className="empty-state"><h3>No menu data yet</h3><p>Sync the mobile app to populate the menu</p></div></td></tr>
                      : stats.products.map((p,i) => {
                          const prep = typeof p.preparedCount === "number" ? p.preparedCount : 30;
                          const sold = Number(p.soldCount) || 0;
                          const remaining = Math.max(0, prep - sold);
                          return (
                            <tr key={i}>
                              <td><strong>{p.name}</strong></td>
                              <td>{p.category||"—"}</td>
                              <td><strong>${Number(p.price||0).toFixed(2)}</strong></td>
                              <td><span className="badge badge-amber">{prep}</span></td>
                              <td><strong>{sold}</strong></td>
                              <td>
                                <span className={`badge ${remaining === 0 ? "badge-red" : remaining <= 5 ? "badge-orange" : "badge-green"}`}>
                                  {remaining} left
                                </span>
                              </td>
                              <td><strong style={{color:"var(--amber-600)"}}>${((Number(p.price)||0)*sold).toFixed(2)}</strong></td>
                              <td><span className={`badge ${remaining > 0 ? "badge-green" : "badge-red"}`}>{remaining > 0 ? "In Stock" : "Sold Out"}</span></td>
                            </tr>
                          );
                        })
                    }
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* RECEIPT MODAL */}
      {selectedReceipt && (
        <div className="modal-overlay" onClick={() => setSelectedReceipt(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Receipt — Order #{selectedReceipt.id}</h3>
              <button className="modal-close" onClick={() => setSelectedReceipt(null)}>&#215;</button>
            </div>
            <div className="modal-body">
              <div className="receipt-paper">
                <div className="receipt-center">
                  <div className="receipt-shop">BAKERY</div>
                  <div className="receipt-meta">Artisan Bakery &amp; Cafe</div>
                  <div className="receipt-meta">Order #{selectedReceipt.id}</div>
                  <div className="receipt-meta">{selectedReceipt.createdAt ? new Date(selectedReceipt.createdAt).toLocaleString() : ""}</div>
                </div>
                <div className="receipt-divider"></div>
                <div className="receipt-row"><span>Customer:</span><span>{selectedReceipt.customerName||"Walk-in"}</span></div>
                <div className="receipt-row"><span>Payment:</span><span style={{fontWeight:"bold"}}>{selectedReceipt.paymentMethod||"Cash"}</span></div>
                <div className="receipt-row"><span>Terminal:</span><span>{selectedReceipt.terminalId||"Mobile POS"}</span></div>
                <div className="receipt-divider"></div>
                {(selectedReceipt.items||[]).map((item,i) => (
                  <div key={i} className="receipt-row">
                    <span>{item.quantity}x {item.name}</span>
                    <span>${((Number(item.price)||0)*(Number(item.quantity)||1)).toFixed(2)}</span>
                  </div>
                ))}
                <div className="receipt-divider"></div>
                <div className="receipt-row"><span>Subtotal:</span><span>${Number(selectedReceipt.subtotal||0).toFixed(2)}</span></div>
                <div className="receipt-row"><span>Tax:</span><span>${Number(selectedReceipt.tax||0).toFixed(2)}</span></div>
                <div className="receipt-row receipt-total"><span>TOTAL:</span><span>${Number(selectedReceipt.total||0).toFixed(2)}</span></div>
                <div className="receipt-divider"></div>
                <div className="receipt-center receipt-meta">Thank you for your business!</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedReceipt(null)}>Close</button>
              <button className="btn btn-primary btn-sm" onClick={() => window.print()}>Print Receipt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
