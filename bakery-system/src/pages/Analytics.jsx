import { useState, useMemo } from 'react';
import {
  Calendar, DollarSign, CreditCard, Smartphone,
  Wallet, Eye, Filter, CheckCircle2, ChevronRight,
  TrendingUp, Download, ArrowUpRight, Printer
} from 'lucide-react';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import PrintReceiptModal from '../components/PrintReceiptModal';
import { useBakery } from '../store/bakeryStore';

export default function Analytics() {
  const { state } = useBakery();
  const [filterRange, setFilterRange] = useState('30'); // 'today' | '7' | '14' | '30' | 'all'
  const [filterCashier, setFilterCashier] = useState('All');
  const [filterSpecificDate, setFilterSpecificDate] = useState('');
  const [selectedDayOrders, setSelectedDayOrders] = useState(null); // { date: string, orders: [] }
  const [printReceiptOrder, setPrintReceiptOrder] = useState(null);

  // Unique cashiers list
  const cashiers = useMemo(() => {
    const list = new Set();
    state.orders.forEach(o => { if (o.cashier) list.add(o.cashier); });
    return ['All', ...Array.from(list)];
  }, [state.orders]);

  // Aggregate orders by day
  const dailyBreakdown = useMemo(() => {
    const dayMap = {};

    // Filter orders by cashier if selected
    const filteredOrders = state.orders.filter(o => {
      const matchCashier = filterCashier === 'All' || o.cashier === filterCashier;
      const matchDate = filterSpecificDate ? o.date === filterSpecificDate : true;
      return matchCashier && matchDate;
    });

    filteredOrders.forEach(o => {
      if (!dayMap[o.date]) {
        dayMap[o.date] = {
          date: o.date,
          ordersCount: 0,
          cash: 0,
          card: 0,
          mobile: 0,
          total: 0,
          orders: [],
        };
      }
      dayMap[o.date].ordersCount += 1;
      dayMap[o.date].total += o.total;
      dayMap[o.date].orders.push(o);

      if (o.payment === 'Cash') {
        dayMap[o.date].cash += o.total;
      } else if (o.payment === 'Card') {
        dayMap[o.date].card += o.total;
      } else if (o.payment === 'Mobile') {
        dayMap[o.date].mobile += o.total;
      }
    });

    // Convert map to sorted array (latest date first)
    let daysArray = Object.values(dayMap).sort((a, b) => b.date.localeCompare(a.date));

    // Apply quick date range filters if specific date not chosen
    if (!filterSpecificDate && filterRange !== 'all') {
      const today = new Date().toISOString().split('T')[0];
      if (filterRange === 'today') {
        daysArray = daysArray.filter(d => d.date === today);
      } else {
        const numDays = parseInt(filterRange, 10);
        daysArray = daysArray.slice(0, numDays);
      }
    }

    return daysArray;
  }, [state.orders, filterCashier, filterSpecificDate, filterRange]);

  // Overall totals across the filtered days
  const totals = useMemo(() => {
    let totalCash = 0;
    let totalCard = 0;
    let totalMobile = 0;
    let grandTotal = 0;
    let totalOrders = 0;

    dailyBreakdown.forEach(day => {
      totalCash += day.cash;
      totalCard += day.card;
      totalMobile += day.mobile;
      grandTotal += day.total;
      totalOrders += day.ordersCount;
    });

    return {
      cash: totalCash,
      card: totalCard,
      mobile: totalMobile,
      grandTotal,
      totalOrders,
      cashPct: grandTotal > 0 ? ((totalCash / grandTotal) * 100).toFixed(1) : 0,
      cardPct: grandTotal > 0 ? ((totalCard / grandTotal) * 100).toFixed(1) : 0,
      mobilePct: grandTotal > 0 ? ((totalMobile / grandTotal) * 100).toFixed(1) : 0,
    };
  }, [dailyBreakdown]);

  // Today's stats specifically
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayData = useMemo(() => {
    const todayOrders = state.orders.filter(o => o.date === todayDateStr);
    let cash = 0, card = 0, mobile = 0, total = 0;
    todayOrders.forEach(o => {
      total += o.total;
      if (o.payment === 'Cash') cash += o.total;
      else if (o.payment === 'Card') card += o.total;
      else if (o.payment === 'Mobile') mobile += o.total;
    });
    return { cash, card, mobile, total, count: todayOrders.length };
  }, [state.orders, todayDateStr]);

  const formatDateLabel = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const formatted = dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    if (dateStr === today) return { label: formatted, badge: 'Today', badgeClass: 'badge-green' };
    if (dateStr === yesterday) return { label: formatted, badge: 'Yesterday', badgeClass: 'badge-blue' };
    return { label: formatted, badge: null, badgeClass: '' };
  };

  return (
    <div className="animate-in">
      <Topbar
        title="Daily Income & Payment Settlements"
        subtitle="Track money collected by Cash, Card, and Mobile payments day by day"
      />

      <div className="page-wrapper">
        {/* Top Financial Stat Cards: Exact Cash, Card, Mobile, and Whole Money */}
        <div className="stat-grid mb-5">
          {/* Card 1: Cash */}
          <div className="stat-card green">
            <div className="stat-icon green"><DollarSign size={20} /></div>
            <div className="stat-label">💵 Money Gathered (Cash)</div>
            <div className="stat-value">ETB {totals.cash.toFixed(2)}</div>
            <div className="stat-change up">
              <CheckCircle2 size={13} /> {totals.cashPct}% of total income in cash drawer
            </div>
          </div>

          {/* Card 2: Card */}
          <div className="stat-card blue">
            <div className="stat-icon blue"><CreditCard size={20} /></div>
            <div className="stat-label">💳 Money Gathered (Card)</div>
            <div className="stat-value">ETB {totals.card.toFixed(2)}</div>
            <div className="stat-change up">
              <CheckCircle2 size={13} /> {totals.cardPct}% POS machine / bank deposit
            </div>
          </div>

          {/* Card 3: Mobile */}
          <div className="stat-card amber">
            <div className="stat-icon amber"><Smartphone size={20} /></div>
            <div className="stat-label">📱 Money Gathered (Mobile)</div>
            <div className="stat-value">ETB {totals.mobile.toFixed(2)}</div>
            <div className="stat-change up">
              <CheckCircle2 size={13} /> {totals.mobilePct}% Telebirr / Mobile money
            </div>
          </div>

          {/* Card 4: Whole Money Calculated */}
          <div className="stat-card purple" style={{ border: '2px solid rgba(147, 51, 234, 0.3)' }}>
            <div className="stat-icon purple"><Wallet size={20} /></div>
            <div className="stat-label">💰 Whole Money Calculated</div>
            <div className="stat-value" style={{ color: '#9333ea', fontSize: 24 }}>
              ETB {totals.grandTotal.toFixed(2)}
            </div>
            <div className="stat-change up" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
              Across {totals.totalOrders} total sales transactions
            </div>
          </div>
        </div>

        {/* Today's Live Quick Balance Banner */}
        <div className="card mb-5" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(34, 197, 94, 0.08))', border: '1px solid var(--amber-300)' }}>
          <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge-green" style={{ fontSize: 11, fontWeight: 800 }}>LIVE TODAY</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Today's Closing Balance ({todayDateStr})
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {todayData.count} orders processed today so far
              </div>
            </div>

            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>💵 Cash in Hand</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--success)' }}>
                  ETB {todayData.cash.toFixed(2)}
                </div>
              </div>

              <div style={{ width: 1, height: 26, background: 'var(--border)' }} />

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>💳 Card Total</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>
                  ETB {todayData.card.toFixed(2)}
                </div>
              </div>

              <div style={{ width: 1, height: 26, background: 'var(--border)' }} />

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>📱 Mobile Money</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--amber-500)' }}>
                  ETB {todayData.mobile.toFixed(2)}
                </div>
              </div>

              <div style={{ width: 1, height: 26, background: 'var(--border)' }} />

              <div style={{ textAlign: 'center', background: 'var(--bg-card)', padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Total Money Today</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--amber-600)' }}>
                  ETB {todayData.total.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="card mb-5" style={{ padding: '14px 18px' }}>
          <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 12 }}>
            {/* Quick Range Selector */}
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              {[
                { key: 'today', label: 'Today' },
                { key: '7', label: 'Last 7 Days' },
                { key: '14', label: 'Last 14 Days' },
                { key: '30', label: 'Last 30 Days' },
                { key: 'all', label: 'All Recorded Days' },
              ].map(tab => (
                <button
                  key={tab.key}
                  className={`btn btn-sm ${filterRange === tab.key && !filterSpecificDate ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    setFilterRange(tab.key);
                    setFilterSpecificDate('');
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filters by Specific Date and Cashier */}
            <div className="flex gap-3 items-center" style={{ flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Date:</span>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }}
                  value={filterSpecificDate}
                  onChange={e => setFilterSpecificDate(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cashier:</span>
                <select
                  className="form-select"
                  style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }}
                  value={filterCashier}
                  onChange={e => setFilterCashier(e.target.value)}
                >
                  {cashiers.map(c => <option key={c} value={c}>{c === 'All' ? 'All Cashiers' : c}</option>)}
                </select>
              </div>

              {(filterSpecificDate || filterCashier !== 'All' || filterRange !== '30') && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setFilterRange('30');
                    setFilterSpecificDate('');
                    setFilterCashier('All');
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Daily Breakdown Table: Days, Cash, Card, Mobile, and Whole Money */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="card-title">Daily Income Calculation Log</div>
              <div className="card-subtitle">
                Showing {dailyBreakdown.length} days · money calculated across Cash, Card, and Mobile
              </div>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Total Calculated: <strong style={{ color: 'var(--amber-600)', fontSize: 15 }}>ETB {totals.grandTotal.toFixed(2)}</strong>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Orders</th>
                  <th style={{ color: 'var(--success)' }}>💵 Cash Collected</th>
                  <th style={{ color: 'var(--primary)' }}>💳 Card Collected</th>
                  <th style={{ color: 'var(--amber-500)' }}>📱 Mobile Money</th>
                  <th style={{ color: 'var(--amber-600)', fontSize: 14 }}>💰 Whole Money (Total)</th>
                  <th>Payment Split</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {dailyBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No sales data recorded for the selected filter.
                    </td>
                  </tr>
                ) : (
                  dailyBreakdown.map(day => {
                    const dateInfo = formatDateLabel(day.date);
                    const cashShare = day.total > 0 ? (day.cash / day.total) * 100 : 0;
                    const cardShare = day.total > 0 ? (day.card / day.total) * 100 : 0;
                    const mobileShare = day.total > 0 ? (day.mobile / day.total) * 100 : 0;

                    return (
                      <tr key={day.date}>
                        {/* Date Column */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Calendar size={15} color="var(--amber-500)" />
                            <div>
                              <strong style={{ color: 'var(--text-primary)' }}>{dateInfo.label}</strong>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{day.date}</div>
                            </div>
                            {dateInfo.badge && (
                              <span className={`badge ${dateInfo.badgeClass}`} style={{ fontSize: 10, padding: '2px 6px' }}>
                                {dateInfo.badge}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Orders count */}
                        <td>
                          <span className="badge badge-gray">{day.ordersCount} orders</span>
                        </td>

                        {/* Cash */}
                        <td>
                          <strong style={{ color: 'var(--success)', fontSize: 13 }}>
                            ETB {day.cash.toFixed(2)}
                          </strong>
                        </td>

                        {/* Card */}
                        <td>
                          <strong style={{ color: 'var(--primary)', fontSize: 13 }}>
                            ETB {day.card.toFixed(2)}
                          </strong>
                        </td>

                        {/* Mobile */}
                        <td>
                          <strong style={{ color: 'var(--amber-500)', fontSize: 13 }}>
                            ETB {day.mobile.toFixed(2)}
                          </strong>
                        </td>

                        {/* Whole Money (Total Day Income) */}
                        <td style={{ background: 'rgba(245, 158, 11, 0.05)' }}>
                          <strong style={{ color: 'var(--amber-600)', fontSize: 15 }}>
                            ETB {day.total.toFixed(2)}
                          </strong>
                        </td>

                        {/* Visual Split Bar */}
                        <td style={{ minWidth: 120 }}>
                          <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, display: 'flex', overflow: 'hidden', marginBottom: 4 }}>
                            <div style={{ width: `${cashShare}%`, background: '#22c55e' }} title={`Cash: ${cashShare.toFixed(0)}%`} />
                            <div style={{ width: `${cardShare}%`, background: '#3b82f6' }} title={`Card: ${cardShare.toFixed(0)}%`} />
                            <div style={{ width: `${mobileShare}%`, background: '#f59e0b' }} title={`Mobile: ${mobileShare.toFixed(0)}%`} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                            <span>💵 {cashShare.toFixed(0)}%</span>
                            <span>💳 {cardShare.toFixed(0)}%</span>
                            <span>📱 {mobileShare.toFixed(0)}%</span>
                          </div>
                        </td>

                        {/* Action: View Breakdown */}
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: 11 }}
                            onClick={() => setSelectedDayOrders(day)}
                            title="View all receipts for this day"
                          >
                            <Eye size={12} /> View Day
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Summary Footer Row */}
              {dailyBreakdown.length > 0 && (
                <tfoot>
                  <tr style={{ background: 'var(--bg-base)', borderTop: '2px solid var(--border)', fontWeight: 800 }}>
                    <td>
                      <strong>TOTAL ACROSS ALL DAYS ({dailyBreakdown.length} days)</strong>
                    </td>
                    <td>
                      <span className="badge badge-gray">{totals.totalOrders} total orders</span>
                    </td>
                    <td style={{ color: 'var(--success)', fontSize: 14 }}>
                      ETB {totals.cash.toFixed(2)}
                    </td>
                    <td style={{ color: 'var(--primary)', fontSize: 14 }}>
                      ETB {totals.card.toFixed(2)}
                    </td>
                    <td style={{ color: 'var(--amber-500)', fontSize: 14 }}>
                      ETB {totals.mobile.toFixed(2)}
                    </td>
                    <td style={{ color: 'var(--amber-600)', fontSize: 16, background: 'rgba(245, 158, 11, 0.1)' }}>
                      ETB {totals.grandTotal.toFixed(2)}
                    </td>
                    <td colSpan={2} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      100% money accounted for
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Day's Orders Drilldown */}
      {selectedDayOrders && (
        <Modal
          title={`Day Income Details — ${selectedDayOrders.date}`}
          onClose={() => setSelectedDayOrders(null)}
          footer={
            <button className="btn btn-secondary" onClick={() => setSelectedDayOrders(null)}>
              Close
            </button>
          }
        >
          {/* Day Totals Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '10px', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cash Received</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--success)' }}>
                ETB {selectedDayOrders.cash.toFixed(2)}
              </div>
            </div>

            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Card Received</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>
                ETB {selectedDayOrders.card.toFixed(2)}
              </div>
            </div>

            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '10px', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Mobile Received</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--amber-500)' }}>
                ETB {selectedDayOrders.mobile.toFixed(2)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-base)', borderRadius: 8, marginBottom: 14 }}>
            <span style={{ fontWeight: 700 }}>Total Money Gathered This Day:</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--amber-600)' }}>
              ETB {selectedDayOrders.total.toFixed(2)}
            </span>
          </div>

          {/* Orders List for this Day */}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
            ORDERS ON THIS DAY ({selectedDayOrders.orders.length})
          </div>

          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            <table className="table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Time</th>
                  <th>Payment</th>
                  <th>Cashier</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {selectedDayOrders.orders.map(o => (
                  <tr key={o.id}>
                    <td><strong>#{o.id}</strong></td>
                    <td style={{ color: 'var(--text-muted)' }}>{o.time}</td>
                    <td>
                      <span className={`badge ${o.payment === 'Cash' ? 'badge-green' : o.payment === 'Card' ? 'badge-blue' : 'badge-amber'}`}>
                        {o.payment === 'Cash' ? '💵' : o.payment === 'Card' ? '💳' : '📱'} {o.payment}
                      </span>
                    </td>
                    <td>{o.cashier}</td>
                    <td>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                      </span>
                    </td>
                    <td>
                      <strong className="text-amber">ETB {o.total.toFixed(2)}</strong>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-icon btn-sm"
                        onClick={() => setPrintReceiptOrder(o)}
                        title="Print receipt"
                      >
                        <Printer size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
