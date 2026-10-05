import { useState } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, Search, Package, RefreshCw } from 'lucide-react';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import { useBakery } from '../store/bakeryStore';
import toast from 'react-hot-toast';

const CATEGORIES = ['Dry Goods', 'Dairy', 'Flavoring', 'Drinks', 'Fresh'];
const UNITS = ['kg', 'g', 'liter', 'ml', 'dozen', 'piece', 'pack'];
const empty = { name: '', unit: 'kg', quantity: '', costPerUnit: '', reorderLevel: '', category: 'Dry Goods' };

export default function Inventory() {
  const { state, dispatch } = useBakery();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [restockId, setRestockId] = useState(null);
  const [restockAmt, setRestockAmt] = useState('');

  const lowStock = state.ingredients.filter(i => i.quantity <= i.reorderLevel);

  const filtered = state.ingredients.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'All' || i.category === filterCat;
    return matchSearch && matchCat;
  });

  const openAdd = () => { setForm(empty); setModal('add'); };
  const openEdit = (i) => { setForm(i); setModal('edit'); };

  const handleSave = () => {
    if (!form.name || !form.quantity || !form.costPerUnit) { toast.error('Fill all required fields'); return; }
    const data = { ...form, quantity: parseFloat(form.quantity), costPerUnit: parseFloat(form.costPerUnit), reorderLevel: parseFloat(form.reorderLevel || 0) };
    if (modal === 'add') {
      dispatch({ type: 'ADD_INGREDIENT', ingredient: data });
      toast.success('Ingredient added!');
    } else {
      dispatch({ type: 'UPDATE_INGREDIENT', ingredient: data });
      toast.success('Updated!');
    }
    setModal(null);
  };

  const handleRestock = () => {
    if (!restockAmt || parseFloat(restockAmt) <= 0) { toast.error('Enter valid amount'); return; }
    dispatch({ type: 'RESTOCK_INGREDIENT', id: restockId, amount: parseFloat(restockAmt) });
    toast.success('Stock updated!');
    setRestockId(null);
    setRestockAmt('');
  };

  const handleDelete = (i) => {
    if (confirm(`Delete "${i.name}"?`)) {
      dispatch({ type: 'DELETE_INGREDIENT', id: i.id });
      toast.success('Deleted');
    }
  };

  const stockPercent = (i) => Math.min(100, (i.quantity / Math.max(i.reorderLevel * 3, 1)) * 100);
  const stockColor = (i) => {
    if (i.quantity <= i.reorderLevel) return '#ef4444';
    if (i.quantity <= i.reorderLevel * 1.5) return '#f59e0b';
    return '#22c55e';
  };

  const totalValue = state.ingredients.reduce((s, i) => s + i.quantity * i.costPerUnit, 0);

  return (
    <div className="animate-in">
      <Topbar
        title="Inventory"
        subtitle={`${state.ingredients.length} ingredients · ${lowStock.length} low stock`}
        actions={
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={14} /> Add Ingredient
          </button>
        }
      />
      <div className="page-wrapper">
        {/* Low Stock Alerts */}
        {lowStock.length > 0 && (
          <div className="card mb-5" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} color="var(--danger)" />
              <div className="card-title" style={{ marginBottom: 0 }}>Low Stock Alerts ({lowStock.length})</div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {lowStock.map(i => (
                <div key={i.id} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                  <span style={{ fontWeight: 700 }}>{i.name}</span>
                  <span style={{ color: 'var(--danger)', marginLeft: 6 }}>{i.quantity.toFixed(1)} {i.unit}</span>
                  <button style={{ marginLeft: 8, color: 'var(--amber-400)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                    onClick={() => { setRestockId(i.id); setRestockAmt(''); }}>
                    Restock →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="stat-grid mb-5">
          <div className="stat-card amber">
            <div className="stat-label">Total Inventory Value</div>
            <div className="stat-value">ETB {totalValue.toFixed(0)}</div>
          </div>
          <div className="stat-card red">
            <div className="stat-label">Low Stock Items</div>
            <div className="stat-value">{lowStock.length}</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Total Ingredients</div>
            <div className="stat-value">{state.ingredients.length}</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-label">Categories</div>
            <div className="stat-value">{[...new Set(state.ingredients.map(i => i.category))].length}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-3 items-center">
            <div className="search-bar">
              <Search size={14} />
              <input placeholder="Search ingredients..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-select" style={{ width: 'auto' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option>All</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Category</th>
                  <th>In Stock</th>
                  <th>Unit</th>
                  <th>Cost/Unit</th>
                  <th>Total Value</th>
                  <th>Reorder Level</th>
                  <th>Stock Level</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(i => {
                  const isLow = i.quantity <= i.reorderLevel;
                  const isWarning = i.quantity <= i.reorderLevel * 1.5 && !isLow;
                  return (
                    <tr key={i.id}>
                      <td><strong>{i.name}</strong></td>
                      <td>{i.category}</td>
                      <td><strong style={{ color: isLow ? 'var(--danger)' : 'var(--text-primary)' }}>{i.quantity.toFixed(1)}</strong></td>
                      <td>{i.unit}</td>
                      <td>ETB {i.costPerUnit.toFixed(2)}</td>
                      <td className="text-amber">ETB {(i.quantity * i.costPerUnit).toFixed(2)}</td>
                      <td>{i.reorderLevel}</td>
                      <td style={{ width: 120 }}>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${stockPercent(i)}%`, background: stockColor(i) }} />
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${isLow ? 'badge-red' : isWarning ? 'badge-amber' : 'badge-green'}`}>
                          {isLow ? 'Low' : isWarning ? 'Warning' : 'Good'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-success btn-icon btn-sm" title="Restock" onClick={() => { setRestockId(i.id); setRestockAmt(''); }}>
                            <RefreshCw size={12} />
                          </button>
                          <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openEdit(i)}><Edit2 size={12} /></button>
                          <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(i)}><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <Modal
          title={modal === 'add' ? 'Add Ingredient' : 'Edit Ingredient'}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Ingredient Name *</label>
            <input className="form-input" placeholder="e.g. All-Purpose Flour" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <select className="form-select" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Current Quantity *</label>
              <input className="form-input" type="number" step="0.1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Cost per Unit (ETB) *</label>
              <input className="form-input" type="number" step="0.01" value={form.costPerUnit} onChange={e => setForm({ ...form, costPerUnit: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Reorder Level (minimum quantity to alert)</label>
            <input className="form-input" type="number" step="0.1" value={form.reorderLevel} onChange={e => setForm({ ...form, reorderLevel: e.target.value })} />
          </div>
        </Modal>
      )}

      {/* Restock Modal */}
      {restockId !== null && (
        <Modal
          title="Restock Ingredient"
          onClose={() => setRestockId(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setRestockId(null)}>Cancel</button>
              <button className="btn btn-success" onClick={handleRestock}>Confirm Restock</button>
            </>
          }
        >
          {(() => {
            const item = state.ingredients.find(i => i.id === restockId);
            return item ? (
              <>
                <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '12px 16px', fontSize: 13 }}>
                  <strong>{item.name}</strong>
                  <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>
                    Current: {item.quantity.toFixed(1)} {item.unit}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount to add ({item.unit})</label>
                  <input className="form-input" type="number" step="0.1" placeholder="0.0" value={restockAmt} onChange={e => setRestockAmt(e.target.value)} autoFocus />
                </div>
                {restockAmt && (
                  <div style={{ fontSize: 12, color: 'var(--success)' }}>
                    New total: {(item.quantity + parseFloat(restockAmt || 0)).toFixed(1)} {item.unit}
                  </div>
                )}
              </>
            ) : null;
          })()}
        </Modal>
      )}
    </div>
  );
}
