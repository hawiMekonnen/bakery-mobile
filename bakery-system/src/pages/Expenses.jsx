import { useState } from 'react';
import { Plus, Trash2, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import { useBakery } from '../store/bakeryStore';
import toast from 'react-hot-toast';

const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Staff Wages', 'Equipment', 'Marketing', 'Packaging', 'Ingredients', 'Maintenance', 'Other'];
const COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#06b6d4', '#d97706', '#ec4899'];

const empty = { category: 'Rent', amount: '', description: '', date: new Date().toISOString().split('T')[0], recurring: false };

export default function Expenses() {
  const { state, dispatch } = useBakery();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);

  const total = state.expenses.reduce((s, e) => s + e.amount, 0);
  const recurring = state.expenses.filter(e => e.recurring).reduce((s, e) => s + e.amount, 0);
  const oneOff = total - recurring;

  // Monthly revenue
  const monthRevenue = state.orders.filter(o => o.date.startsWith('2026-09')).reduce((s, o) => s + o.total, 0);
  const profit = monthRevenue - total;

  // Category breakdown for chart
  const catData = EXPENSE_CATEGORIES.map(cat => ({
    name: cat,
    value: state.expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.value > 0);

  const handleSave = () => {
    if (!form.amount || !form.description) { toast.error('Fill all required fields'); return; }
    dispatch({ type: 'ADD_EXPENSE', expense: { ...form, amount: parseFloat(form.amount) } });
    toast.success('Expense added!');
    setModal(false);
    setForm(empty);
  };

  const handleDelete = (e) => {
    if (confirm(`Delete expense "${e.description}"?`)) {
      dispatch({ type: 'DELETE_EXPENSE', id: e.id });
      toast.success('Deleted');
    }
  };

  return (
    <div className="animate-in">
      <Topbar
        title="Expenses & Cost Control"
        subtitle="Track overheads and calculate profit"
        actions={
          <button className="btn btn-primary" onClick={() => { setForm(empty); setModal(true); }}>
            <Plus size={14} /> Add Expense
          </button>
        }
      />
      <div className="page-wrapper">

        {/* Stats */}
        <div className="stat-grid mb-5">
          <div className="stat-card red">
            <div className="stat-label">Total Expenses</div>
            <div className="stat-value">ETB {total.toFixed(0)}</div>
            <div className="stat-change" style={{ color: 'var(--text-muted)' }}>{state.expenses.length} records</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-label">Recurring Costs</div>
            <div className="stat-value">ETB {recurring.toFixed(0)}</div>
            <div className="stat-change" style={{ color: 'var(--text-muted)' }}>Monthly fixed</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-label">Monthly Revenue</div>
            <div className="stat-value">ETB {monthRevenue.toFixed(0)}</div>
          </div>
          <div className={`stat-card ${profit >= 0 ? 'green' : 'red'}`}>
            <div className="stat-label">Net Profit</div>
            <div className="stat-value">ETB {profit.toFixed(0)}</div>
            <div className="stat-change" style={{ color: profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {monthRevenue ? ((profit / monthRevenue) * 100).toFixed(1) : 0}% margin
            </div>
          </div>
        </div>

        <div className="dash-grid mb-5">
          {/* Bar chart */}
          <div className="card">
            <div className="card-title mb-4">Expenses by Category</div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={catData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `ETB ${v}`} />
                  <Tooltip formatter={(v) => [`ETB ${v}`, 'Amount']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* P&L Summary */}
          <div className="card">
            <div className="card-title mb-4">P&L Summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8 }}>
                <span style={{ fontSize: 13 }}>Total Revenue</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>+ETB {monthRevenue.toFixed(2)}</span>
              </div>
              {catData.map((c, i) => (
                <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', background: 'var(--bg-card2)', borderRadius: 8, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{c.name}</span>
                  <span style={{ fontWeight: 600, color: 'var(--danger)' }}>-ETB {c.value.toFixed(2)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: profit >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${profit >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 8 }}>
                <span style={{ fontWeight: 700 }}>NET PROFIT</span>
                <span style={{ fontWeight: 800, fontSize: 18, color: profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {profit >= 0 ? '+' : ''}{profit.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="card">
          <div className="card-title mb-4">All Expenses</div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...state.expenses].sort((a, b) => b.date.localeCompare(a.date)).map(e => (
                  <tr key={e.id}>
                    <td>{e.date}</td>
                    <td><strong>{e.category}</strong></td>
                    <td>{e.description}</td>
                    <td><strong className="text-danger">-ETB {e.amount.toFixed(2)}</strong></td>
                    <td>
                      <span className={`badge ${e.recurring ? 'badge-amber' : 'badge-gray'}`}>
                        {e.recurring ? '🔄 Recurring' : '⚡ One-off'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(e)}><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <Modal
          title="Add Expense"
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Add Expense</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount (ETB) *</label>
              <input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description *</label>
            <input className="form-input" placeholder="Brief description..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="recurring" checked={form.recurring} onChange={e => setForm({ ...form, recurring: e.target.checked })} style={{ cursor: 'pointer' }} />
            <label htmlFor="recurring" style={{ fontSize: 13, cursor: 'pointer' }}>This is a recurring monthly expense</label>
          </div>
        </Modal>
      )}
    </div>
  );
}
