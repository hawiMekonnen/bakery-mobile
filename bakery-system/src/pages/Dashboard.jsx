import { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import {
  DollarSign, ShoppingBag, TrendingUp, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Package, Users
} from 'lucide-react';
import Topbar from '../components/Topbar';
import { useBakery } from '../store/bakeryStore';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', boxShadow: 'var(--shadow)' }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ fontSize: 13, fontWeight: 700, color: p.color }}>
            {p.name}: ETB {p.value?.toFixed(2)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { state } = useBakery();

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const todayOrders = state.orders.filter(o => o.date === today);
    const yesterdayOrders = state.orders.filter(o => o.date === yesterday);
    const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);
    const yesterdayRevenue = yesterdayOrders.reduce((s, o) => s + o.total, 0);
    const revChange = yesterdayRevenue ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1) : 0;

    const monthOrders = state.orders.filter(o => o.date.startsWith('2026-09'));
    const monthRevenue = monthOrders.reduce((s, o) => s + o.total, 0);
    const totalExpenses = state.expenses.reduce((s, e) => s + e.amount, 0);
    const profit = monthRevenue - totalExpenses;
    const profitMargin = monthRevenue ? (profit / monthRevenue * 100).toFixed(1) : 0;

    const lowStock = state.ingredients.filter(i => i.quantity <= i.reorderLevel);
    const activeStaff = state.staff.filter(s => s.clockedIn).length;

    return { todayRevenue, todayOrders: todayOrders.length, revChange, monthRevenue, profit, profitMargin, lowStock, activeStaff };
  }, [state]);

  // Last 14 days chart data
  const chartData = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayOrders = state.orders.filter(o => o.date === dateStr);
      const revenue = dayOrders.reduce((s, o) => s + o.total, 0);
      const cost = revenue * 0.38; // approx cost ratio
      days.push({ date: label, Revenue: parseFloat(revenue.toFixed(2)), Cost: parseFloat(cost.toFixed(2)), Profit: parseFloat((revenue - cost).toFixed(2)) });
    }
    return days;
  }, [state]);

  // Top 5 products
  const topProducts = useMemo(() => {
    return [...state.products]
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5)
      .map(p => ({ ...p, revenue: p.sold * p.price }));
  }, [state]);

  const [breakdownMode, setBreakdownMode] = useState('item');

  // Category revenue bar chart
  const categoryData = useMemo(() => {
    const cats = {};
    state.products.forEach(p => {
      cats[p.category] = (cats[p.category] || 0) + p.sold * p.price;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
  }, [state]);

  // Individual item sales data (sorted by revenue)
  const itemSalesData = useMemo(() => {
    return [...state.products]
      .sort((a, b) => (b.sold * b.price) - (a.sold * a.price))
      .slice(0, 6)
      .map(p => ({
        name: p.name.length > 12 ? p.name.slice(0, 11) + '…' : p.name,
        fullName: p.name,
        value: parseFloat((p.sold * p.price).toFixed(2)),
        sold: p.sold,
      }));
  }, [state.products]);

  const COLORS = ['#f59e0b', '#d97706', '#92400e', '#fbbf24', '#fde68a', '#b45309'];

  return (
    <div className="animate-in">
      <Topbar title="Dashboard" subtitle="Welcome back! Here's what's happening today." />
      <div className="page-wrapper">

        {/* Stat Cards */}
        <div className="stat-grid mb-5">
          <div className="stat-card amber">
            <div className="stat-icon amber"><DollarSign size={20} /></div>
            <div className="stat-label">Today's Revenue</div>
            <div className="stat-value">ETB {stats.todayRevenue.toFixed(2)}</div>
            <div className={`stat-change ${Number(stats.revChange) >= 0 ? 'up' : 'down'}`}>
              {Number(stats.revChange) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(stats.revChange)}% vs yesterday
            </div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon green"><ShoppingBag size={20} /></div>
            <div className="stat-label">Orders Today</div>
            <div className="stat-value">{stats.todayOrders}</div>
            <div className="stat-change up"><ArrowUpRight size={14} /> Active day</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-icon blue"><TrendingUp size={20} /></div>
            <div className="stat-label">Monthly Profit</div>
            <div className="stat-value">ETB {stats.profit.toFixed(0)}</div>
            <div className="stat-change up"><ArrowUpRight size={14} /> {stats.profitMargin}% margin</div>
          </div>
          <div className="stat-card red">
            <div className="stat-icon red"><AlertTriangle size={20} /></div>
            <div className="stat-label">Low Stock Items</div>
            <div className="stat-value">{stats.lowStock.length}</div>
            <div className="stat-change down">
              {stats.lowStock.length > 0 ? 'Needs restocking' : 'All good'}
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="dash-grid mb-5">
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="card-title">Revenue vs Cost (14 days)</div>
                <div className="card-subtitle">Daily financial performance</div>
              </div>
            </div>
            <div className="chart-container" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `ETB ${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="Revenue" stroke="#f59e0b" strokeWidth={2} fill="url(#revGrad)" />
                  <Area type="monotone" dataKey="Profit" stroke="#22c55e" strokeWidth={2} fill="url(#profGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div className="card-title" style={{ marginBottom: 2 }}>
                  {breakdownMode === 'item' ? 'Sales by Individual Item' : 'Revenue by Category'}
                </div>
                <div className="card-subtitle">
                  {breakdownMode === 'item' ? 'Every item tracked separately (ETB)' : 'Grouped category totals (ETB)'}
                </div>
              </div>
              <div className="flex gap-1" style={{ background: 'var(--bg-base)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
                <button
                  className={`btn btn-xs ${breakdownMode === 'item' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setBreakdownMode('item')}
                  style={{ padding: '3px 8px', fontSize: 11, border: 'none' }}
                >
                  By Item
                </button>
                <button
                  className={`btn btn-xs ${breakdownMode === 'category' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setBreakdownMode('category')}
                  style={{ padding: '3px 8px', fontSize: 11, border: 'none' }}
                >
                  By Category
                </button>
              </div>
            </div>
            <div className="chart-container" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdownMode === 'item' ? itemSalesData : categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `ETB ${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {(breakdownMode === 'item' ? itemSalesData : categoryData).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="dash-grid-3">
          {/* Top Products */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <div className="card-title mb-4">Top Selling Products</div>
            {topProducts.map((p, i) => (
              <div className="top-product-row" key={p.id}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', width: 20 }}>#{i + 1}</span>
                <div className="top-product-emoji">{p.image}</div>
                <div className="top-product-info">
                  <p>{p.name}</p>
                  <span>{p.sold} units · {p.category}</span>
                </div>
                <div>
                  <div className="top-product-rev">ETB {p.revenue.toFixed(0)}</div>
                  <div style={{ fontSize: 11, color: 'var(--success)', textAlign: 'right' }}>
                    {(((p.price - p.cost) / p.price) * 100).toFixed(0)}% margin
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Alerts */}
          <div className="card">
            <div className="card-title mb-4">⚠️ Alerts</div>
            {stats.lowStock.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--success)' }}>
                ✅ All stock levels are fine!
              </div>
            ) : (
              stats.lowStock.slice(0, 5).map(item => (
                <div className="alert-item warning" key={item.id}>
                  <AlertTriangle size={14} color="var(--warning)" />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600 }}>{item.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {item.quantity.toFixed(1)} {item.unit} left (min: {item.reorderLevel})
                    </p>
                  </div>
                </div>
              ))
            )}
            <div className="divider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)' }}>Active staff now</span>
              <span style={{ fontWeight: 700, color: 'var(--success)' }}>{stats.activeStaff} clocked in</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 8 }}>
              <span style={{ color: 'var(--text-muted)' }}>Monthly revenue</span>
              <span style={{ fontWeight: 700, color: 'var(--amber-400)' }}>ETB {stats.monthRevenue.toFixed(0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 8 }}>
              <span style={{ color: 'var(--text-muted)' }}>Total products</span>
              <span style={{ fontWeight: 700 }}>{state.products.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
