import { useState, useMemo } from 'react';
import { Search, TrendingUp, Award, DollarSign, Package, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import Topbar from '../components/Topbar';
import { useBakery } from '../store/bakeryStore';

const CATEGORIES = ['All', 'Breads', 'Pastries', 'Cakes', 'Drinks'];

export default function ItemsSold() {
  const { state } = useBakery();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [sortBy, setSortBy] = useState('sold-desc');
  const [view, setView] = useState('table'); // 'table' | 'feed'

  // Filter and sort items
  const processedItems = useMemo(() => {
    return state.products
      .filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.category.toLowerCase().includes(search.toLowerCase());
        const matchCat = filterCat === 'All' || p.category === filterCat;
        return matchSearch && matchCat;
      })
      .map(p => {
        const revenue = p.sold * p.price;
        const totalCost = p.sold * p.cost;
        const profit = revenue - totalCost;
        const margin = p.price > 0 ? ((p.price - p.cost) / p.price) * 100 : 0;
        return {
          ...p,
          revenue,
          totalCost,
          profit,
          margin: parseFloat(margin.toFixed(1)),
        };
      })
      .sort((a, b) => {
        if (sortBy === 'sold-desc') return b.sold - a.sold;
        if (sortBy === 'sold-asc') return a.sold - b.sold;
        if (sortBy === 'rev-desc') return b.revenue - a.revenue;
        if (sortBy === 'profit-desc') return b.profit - a.profit;
        if (sortBy === 'margin-desc') return b.margin - a.margin;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [state.products, search, filterCat, sortBy]);

  // Overall statistics
  const totalUnitsSold = state.products.reduce((s, p) => s + p.sold, 0);
  const totalRevenue = state.products.reduce((s, p) => s + (p.sold * p.price), 0);
  const totalProfit = state.products.reduce((s, p) => s + (p.sold * (p.price - p.cost)), 0);
  const bestSeller = [...state.products].sort((a, b) => b.sold - a.sold)[0];

  // Chronological sale feed from orders
  const salesFeed = useMemo(() => {
    const list = [];
    state.orders.forEach(o => {
      o.items.forEach((item, itemIdx) => {
        const prod = state.products.find(p => p.id === item.productId || p.name === item.name);
        list.push({
          key: `${o.id}-idx-${itemIdx}-${item.name}`,
          orderId: o.id,
          date: o.date,
          time: o.time,
          cashier: o.cashier,
          name: item.name,
          emoji: prod?.image || '🥐',
          category: prod?.category || 'Bakery',
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        });
      });
    });
    return list;
  }, [state.orders, state.products]);

  return (
    <div className="animate-in">
      <Topbar
        title="Items Sold"
        subtitle={`Every individual product tracked separately · ${totalUnitsSold.toLocaleString()} total units sold`}
      />

      <div className="page-wrapper">
        {/* Top Summary Metrics */}
        <div className="stat-grid mb-5">
          <div className="stat-card amber">
            <div className="stat-icon amber"><Package size={20} /></div>
            <div className="stat-label">Total Units Sold</div>
            <div className="stat-value">{totalUnitsSold.toLocaleString()}</div>
            <div className="stat-change up">
              <TrendingUp size={14} /> Across {state.products.length} products
            </div>
          </div>

          <div className="stat-card green">
            <div className="stat-icon green"><DollarSign size={20} /></div>
            <div className="stat-label">Product Sales Revenue</div>
            <div className="stat-value">ETB {totalRevenue.toFixed(0)}</div>
            <div className="stat-change up">
              <ArrowUpRight size={14} /> Total generated
            </div>
          </div>

          <div className="stat-card blue">
            <div className="stat-icon blue"><TrendingUp size={20} /></div>
            <div className="stat-label">Gross Margin Profit</div>
            <div className="stat-value">ETB {totalProfit.toFixed(0)}</div>
            <div className="stat-change up">
              {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}% avg margin
            </div>
          </div>

          <div className="stat-card purple">
            <div className="stat-icon purple"><Award size={20} /></div>
            <div className="stat-label">#1 Best Selling Item</div>
            <div className="stat-value" style={{ fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {bestSeller?.image} {bestSeller?.name}
            </div>
            <div className="stat-change up">
              {bestSeller?.sold.toLocaleString()} units sold
            </div>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="card mb-5" style={{ padding: '14px 18px' }}>
          <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div className="flex gap-3 items-center" style={{ flexWrap: 'wrap' }}>
              <div className="search-bar">
                <Search size={14} />
                <input
                  placeholder="Search item name or category..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              <select
                className="form-select"
                style={{ width: 'auto' }}
                value={filterCat}
                onChange={e => setFilterCat(e.target.value)}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
                ))}
              </select>

              <select
                className="form-select"
                style={{ width: 'auto' }}
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="sold-desc">Sort by: Units Sold (High → Low)</option>
                <option value="sold-asc">Sort by: Units Sold (Low → High)</option>
                <option value="rev-desc">Sort by: Revenue (ETB High → Low)</option>
                <option value="profit-desc">Sort by: Total Profit (ETB High → Low)</option>
                <option value="margin-desc">Sort by: Profit Margin (%)</option>
                <option value="name">Sort by: Name (A → Z)</option>
              </select>

              {(search || filterCat !== 'All' || sortBy !== 'sold-desc') && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setSearch(''); setFilterCat('All'); setSortBy('sold-desc'); }}
                >
                  Reset
                </button>
              )}
            </div>

            {/* View Mode Switcher */}
            <div className="flex gap-2">
              <button
                className={`btn btn-sm ${view === 'table' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setView('table')}
              >
                Table View
              </button>
              <button
                className={`btn btn-sm ${view === 'feed' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setView('feed')}
              >
                Live Sales Feed
              </button>
            </div>
          </div>
        </div>

        {/* View: Table View */}
        {view === 'table' && (
          <div className="card">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Units Sold</th>
                    <th>Unit Price</th>
                    <th>Unit Cost</th>
                    <th>Margin</th>
                    <th>Total Revenue</th>
                    <th>Total Profit</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {processedItems.map((p, idx) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>#{idx + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 20 }}>{p.image}</span>
                          <strong>{p.name}</strong>
                        </div>
                      </td>
                      <td><span className="badge badge-gray">{p.category}</span></td>
                      <td>
                        <strong style={{ fontSize: 14, color: 'var(--amber-600)' }}>
                          {p.sold.toLocaleString()} units
                        </strong>
                      </td>
                      <td>ETB {p.price.toFixed(2)}</td>
                      <td>ETB {p.cost.toFixed(2)}</td>
                      <td><span className="badge badge-green">+{p.margin}%</span></td>
                      <td><strong className="text-amber">ETB {p.revenue.toFixed(2)}</strong></td>
                      <td><strong style={{ color: 'var(--success)' }}>+ETB {p.profit.toFixed(2)}</strong></td>
                      <td>
                        <span className={`badge ${p.available ? 'badge-green' : 'badge-red'}`}>
                          {p.available ? 'Available' : 'Out'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* View 3: Live Sales Feed */}
        {view === 'feed' && (
          <div className="card">
            <div className="card-title mb-1">Live Sales History by Item</div>
            <div className="card-subtitle mb-4">
              Chronological log of every item purchase transaction
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                    <th>Order #</th>
                    <th>Date & Time</th>
                    <th>Cashier</th>
                  </tr>
                </thead>
                <tbody>
                  {salesFeed.slice(0, 30).map(s => (
                    <tr key={s.key}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 18 }}>{s.emoji}</span>
                          <strong>{s.name}</strong>
                        </div>
                      </td>
                      <td><span className="badge badge-gray">{s.category}</span></td>
                      <td>
                        <span className="badge badge-green">{s.quantity} {s.quantity === 1 ? 'unit' : 'units'}</span>
                      </td>
                      <td>ETB {s.price.toFixed(2)}</td>
                      <td><strong className="text-amber">ETB {s.total.toFixed(2)}</strong></td>
                      <td><span className="badge badge-gray">#{s.orderId}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.date} {s.time}</td>
                      <td>{s.cashier}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
