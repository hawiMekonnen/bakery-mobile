import { useState } from 'react';
import { Plus, Edit2, Trash2, Clock, Phone, Mail, DollarSign } from 'lucide-react';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import { useBakery } from '../store/bakeryStore';
import toast from 'react-hot-toast';

const ROLES = ['Head Baker', 'Pastry Chef', 'Cashier', 'Barista', 'Delivery', 'Manager', 'Assistant'];
const empty = { name: '', role: 'Cashier', email: '', phone: '', salary: '', status: 'active' };

export default function Staff() {
  const { state, dispatch } = useBakery();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);

  const active = state.staff.filter(s => s.status === 'active');
  const clockedIn = state.staff.filter(s => s.clockedIn);
  const totalWages = state.staff.filter(s => s.status === 'active').reduce((s, m) => s + m.salary, 0);

  const openAdd = () => { setForm(empty); setModal('add'); };
  const openEdit = (m) => { setForm(m); setModal('edit'); };

  const handleSave = () => {
    if (!form.name || !form.salary) { toast.error('Fill all required fields'); return; }
    const data = { ...form, salary: parseFloat(form.salary) };
    if (modal === 'add') {
      dispatch({ type: 'ADD_STAFF', member: data });
      toast.success('Staff member added!');
    } else {
      dispatch({ type: 'UPDATE_STAFF', member: data });
      toast.success('Updated!');
    }
    setModal(null);
  };

  const handleDelete = (m) => {
    if (confirm(`Remove "${m.name}" from staff?`)) {
      dispatch({ type: 'DELETE_STAFF', id: m.id });
      toast.success('Removed');
    }
  };

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const GRADIENT_COLORS = ['#f59e0b,#d97706', '#22c55e,#16a34a', '#3b82f6,#2563eb', '#a855f7,#9333ea', '#ef4444,#dc2626'];

  return (
    <div className="animate-in">
      <Topbar
        title="Staff Management"
        subtitle={`${active.length} active · ${clockedIn.length} currently working`}
        actions={
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={14} /> Add Staff
          </button>
        }
      />
      <div className="page-wrapper">

        <div className="stat-grid mb-5">
          <div className="stat-card amber">
            <div className="stat-label">Total Staff</div>
            <div className="stat-value">{state.staff.length}</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Clocked In Now</div>
            <div className="stat-value">{clockedIn.length}</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-label">Active Staff</div>
            <div className="stat-value">{active.length}</div>
          </div>
          <div className="stat-card red">
            <div className="stat-label">Monthly Wages</div>
            <div className="stat-value">ETB {totalWages.toFixed(0)}</div>
          </div>
        </div>

        {/* Clocked In Banner */}
        {clockedIn.length > 0 && (
          <div className="card mb-5" style={{ borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div className="pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>Currently Working</span>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {clockedIn.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>
                    {getInitials(m.name)}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Since {m.clockIn}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="staff-grid">
          {state.staff.map((m, idx) => (
            <div className="staff-card" key={m.id} style={{ opacity: m.status === 'inactive' ? 0.7 : 1 }}>
              <div className="staff-card-header">
                <div className="staff-avatar" style={{ background: `linear-gradient(135deg,${GRADIENT_COLORS[idx % GRADIENT_COLORS.length]})` }}>
                  {getInitials(m.name)}
                </div>
                <div>
                  <div className="staff-name">{m.name}</div>
                  <div className="staff-role">{m.role}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span className={`badge ${m.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                    {m.status}
                  </span>
                  {m.clockedIn && (
                    <span className="badge badge-green" style={{ fontSize: 10 }}>
                      <div className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
                      Working
                    </span>
                  )}
                </div>
              </div>

              {m.email && (
                <div className="staff-info-row">
                  <Mail size={12} color="var(--text-muted)" />
                  {m.email}
                </div>
              )}
              {m.phone && (
                <div className="staff-info-row">
                  <Phone size={12} color="var(--text-muted)" />
                  {m.phone}
                </div>
              )}
              <div className="staff-info-row">
                <DollarSign size={12} color="var(--text-muted)" />
                <span>Salary: <strong style={{ color: 'var(--amber-400)' }}>ETB {m.salary.toFixed(0)}/mo</strong></span>
              </div>
              {m.clockedIn && (
                <div className="staff-info-row">
                  <Clock size={12} color="var(--success)" />
                  <span style={{ color: 'var(--success)' }}>Clocked in at {m.clockIn}</span>
                </div>
              )}

              <div className="staff-card-footer">
                <button
                  className={`btn btn-sm ${m.clockedIn ? 'btn-danger' : 'btn-success'}`}
                  onClick={() => { dispatch({ type: 'TOGGLE_CLOCK', id: m.id }); toast.success(m.clockedIn ? `${m.name} clocked out` : `${m.name} clocked in`); }}
                  style={{ flex: 1 }}
                >
                  <Clock size={12} />
                  {m.clockedIn ? 'Clock Out' : 'Clock In'}
                </button>
                <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openEdit(m)}><Edit2 size={12} /></button>
                <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(m)}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <Modal
          title={modal === 'add' ? 'Add Staff Member' : 'Edit Staff Member'}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="form-input" placeholder="John Smith" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Monthly Salary (ETB) *</label>
              <input className="form-input" type="number" step="50" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="name@bakery.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" placeholder="+1-555-0000" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}
