import { useState, useMemo } from 'react';
import { Search, Eye, ShoppingBag, Package, Printer } from 'lucide-react';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import PrintReceiptModal from '../components/PrintReceiptModal';
import { useBakery } from '../store/bakeryStore';

export default function Orders() {
  const { state } = useBakery();
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterPayment, setFilterPayment] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [viewMode, setViewMode] = useState('orders'); // 'orders' | 'items'
  const [viewOrder, setViewOrder] = useState(null);
  const [printReceiptOrder, setPrintReceiptOrder] = useState(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  const filtered = useMemo(() => {
    return state.orders.filter(o => {
      const matchSearch = search
        ? String(o.id).includes(search) ||
        o.cashier.toLowerCase().includes(search.toLowerCase()) ||
        o.items.some(i => i.name.toLowerCase().includes(search.toLowerCase()))
        : true;
      const matchDate = filterDate ? o.date === filterDate : true;
      const matchPay = filterPayment === 'All' || o.payment === filterPayment;
      return matchSearch && matchDate && matchPay;
    });
  }, [state.orders, search, filterDate, filterPayment]);

  // Flattened every individual item sold
  const allItemsSold = useMemo(() => {
    const list = [];
    filtered.forEach(o => {
      o.items.forEach((item, itemIdx) => {
        const prod = state.products.find(p => p.id === item.productId || p.name === item.name);
        const category = prod?.category || 'Bakery';

        if (filterCategory !== 'All' && category !== filterCategory) return;

        list.push({
          key: `${o.id}-${item.productId || itemIdx}-${item.name}`,
          orderId: o.id,
          date: o.date,
          time: o.time,
          cashier: o.cashier,
          payment: o.payment,
          name: item.name,
          emoji: prod?.image || '🥐',
          category,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
          orderObj: o,
        });
      });
    });
    return list;
  }, [filtered, state.products, filterCategory]);

  const totalRevenue = filtered.reduce((s, o) => s + o.total, 0);
  const avgOrder = filtered.length ? totalRevenue / filtered.length : 0;
  const totalUnitsSold = filtered.reduce((s, o) => s + o.items.reduce((si, i) => si + i.quantity, 0), 0);

  const activeCount = viewMode === 'orders' ? filtered.length : allItemsSold.length;
  const totalPages = Math.ceil(activeCount / PER_PAGE);
  const paginatedOrders = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const paginatedItems = allItemsSold.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="animate-in">
      <Topbar title="Order History" subtitle={`${state.orders.length} total orders · ${totalUnitsSold} total units sold`} />
      <div className="page-wrapper">

        <div className="stat-grid mb-5">
          <div className="stat-card amber">
            <div className="stat-label">Filtered Orders</div>
            <div className="stat-value">{filtered.length}</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Units Sold (All Items)</div>
            <div className="stat-value">{totalUnitsSold}</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value">ETB {totalRevenue.toFixed(2)}</div>
          </div>
          <div className="stat-card purple">
            <div className="stat-label">Avg. Order Value</div>
            <div className="stat-value">ETB {avgOrder.toFixed(2)}</div>
          </div>
        </div>

        {/* View Toggle Tabs */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          <button
            className={`btn ${viewMode === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setViewMode('orders'); setPage(1); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ShoppingBag size={15} />
            Orders Receipt View ({filtered.length})
          </button>
          <button
            className={`btn ${viewMode === 'items' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setViewMode('items'); setPage(1); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Package size={15} />
            Every Item Sold ({allItemsSold.length} sales)
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-center mb-5" style={{ flexWrap: 'wrap' }}>
          <div className="search-bar">
            <Search size={14} />
            <input
              placeholder={viewMode === 'orders' ? "Search order #, item, cashier..." : "Search item name, order #..."}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <input
            className="form-input"
            type="date"
            value={filterDate}
            onChange={e => { setFilterDate(e.target.value); setPage(1); }}
            style={{ width: 'auto' }}
          />
          {viewMode === 'items' && (
            <select
              className="form-select"
              style={{ width: 'auto' }}
              value={filterCategory}
              onChange={e => { setFilterCategory(e.target.value); setPage(1); }}
            >
              <option value="All">All Categories</option>
              <option value="Breads">Breads</option>
              <option value="Pastries">Pastries</option>
              <option value="Cakes">Cakes</option>
              <option value="Drinks">Drinks</option>
            </select>
          )}
          <select className="form-select" style={{ width: 'auto' }} value={filterPayment} onChange={e => { setFilterPayment(e.target.value); setPage(1); }}>
            <option value="All">All Payments</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Mobile">Mobile</option>
          </select>
          {(search || filterDate || filterPayment !== 'All' || filterCategory !== 'All') && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setSearch(''); setFilterDate(''); setFilterPayment('All'); setFilterCategory('All'); setPage(1); }}
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="card">
          <div className="table-wrap">
            {viewMode === 'orders' ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Items Sold</th>
                    <th>Cashier</th>
                    <th>Payment</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map(o => (
                    <tr key={o.id}>
                      <td><strong>#{o.id}</strong></td>
                      <td>{o.date}</td>
                      <td>{o.time}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 300 }}>
                          {o.items.map((item, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: 11,
                                background: 'var(--bg-card3)',
                                border: '1px solid var(--border)',
                                borderRadius: 4,
                                padding: '2px 6px',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.quantity}× {item.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{o.cashier}</td>
                      <td>
                        <span className={`badge ${o.payment === 'Cash' ? 'badge-green' : o.payment === 'Card' ? 'badge-blue' : 'badge-amber'}`}>
                          {o.payment === 'Cash' ? '💵' : o.payment === 'Card' ? '💳' : '📱'} {o.payment}
                        </span>
                      </td>
                      <td><strong className="text-amber">ETB {o.total.toFixed(2)}</strong></td>
                      <td><span className="badge badge-green">✓ Completed</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setViewOrder(o)} title="View details">
                            <Eye size={13} />
                          </button>
                          <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setPrintReceiptOrder(o)} title="Print Receipt">
                            <Printer size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              /* Every Item Sold Table */
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total (ETB)</th>
                    <th>Order #</th>
                    <th>Date & Time</th>
                    <th>Cashier</th>
                    <th>Payment</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map(item => (
                    <tr key={item.key}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 20 }}>{item.emoji}</span>
                          <strong style={{ color: 'var(--text-primary)' }}>{item.name}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-gray">{item.category}</span>
                      </td>
                      <td>
                        <span className="badge badge-green" style={{ fontWeight: 800 }}>
                          {item.quantity} {item.quantity === 1 ? 'unit' : 'units'}
                        </span>
                      </td>
                      <td>ETB {item.price.toFixed(2)}</td>
                      <td>
                        <strong className="text-amber">ETB {item.total.toFixed(2)}</strong>
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-xs"
                          onClick={() => setViewOrder(item.orderObj)}
                          style={{ padding: '2px 8px', fontSize: 11 }}
                        >
                          #{item.orderId}
                        </button>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.date} {item.time}</span>
                      </td>
                      <td>{item.cashier}</td>
                      <td>
                        <span className={`badge ${item.payment === 'Cash' ? 'badge-green' : item.payment === 'Card' ? 'badge-blue' : 'badge-amber'}`}>
                          {item.payment}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setViewOrder(item.orderObj)} title="View details">
                            <Eye size={13} />
                          </button>
                          <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setPrintReceiptOrder(item.orderObj)} title="Print Receipt">
                            <Printer size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between" style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, activeCount)} of {activeCount}
              </span>
              <div className="flex gap-2">
                <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {viewOrder && (
        <Modal
          title={`Order #${viewOrder.id} Details`}
          onClose={() => setViewOrder(null)}
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setViewOrder(null)}>Close</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const target = viewOrder;
                  setViewOrder(null);
                  setPrintReceiptOrder(target);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Printer size={15} /> Print Receipt
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
            <span style={{ color: 'var(--text-muted)' }}>Date & Time</span>
            <span>{viewOrder.date} at {viewOrder.time}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
            <span style={{ color: 'var(--text-muted)' }}>Cashier</span>
            <span>{viewOrder.cashier}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 16 }}>
            <span style={{ color: 'var(--text-muted)' }}>Payment</span>
            <span>{viewOrder.payment}</span>
          </div>
          <div className="divider" />
          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>ORDER ITEMS</div>
          {viewOrder.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span>{item.name} × {item.quantity}</span>
              <span style={{ fontWeight: 600 }}>ETB {(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="divider" />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800 }}>
            <span>Total</span>
            <span style={{ color: 'var(--amber-400)' }}>ETB {viewOrder.total.toFixed(2)}</span>
          </div>
        </Modal>
      )}

      {/* Print Receipt Modal */}
      {printReceiptOrder && (
        <PrintReceiptModal
          order={printReceiptOrder}
          onClose={() => setPrintReceiptOrder(null)}
        />
      )}
    </div>
  );
}
