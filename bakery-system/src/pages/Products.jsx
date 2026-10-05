import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Search, TrendingUp } from 'lucide-react';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import { useBakery } from '../store/bakeryStore';
import toast from 'react-hot-toast';

const CATEGORIES = ['Breads', 'Pastries', 'Cakes', 'Muffins', 'Drinks', 'Other'];
const EMOJIS = ['🥐', '🍞', '🎂', '🧁', '🌀', '🥖', '🍓', '☕', '🥛', '🍰', '🍩', '🥧', '🧇', '🍪', '🥨', '🫓'];

const empty = { name: '', category: 'Breads', price: '', cost: '', image: '🍞', available: true };

export default function Products() {
  const { state, dispatch } = useBakery();
  const [modal, setModal] = useState(null); // null | 'add' | 'edit'
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [view, setView] = useState('grid'); // 'grid' | 'table'

  const filtered = state.products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'All' || p.category === filterCat;
    return matchSearch && matchCat;
  });

  const openAdd = () => { setForm(empty); setModal('add'); };
  const openEdit = (p) => { setForm(p); setModal('edit'); };

  const handleSave = () => {
    if (!form.name || !form.price || !form.cost) { toast.error('Fill all required fields'); return; }
    if (modal === 'add') {
      dispatch({ type: 'ADD_PRODUCT', product: { ...form, price: parseFloat(form.price), cost: parseFloat(form.cost) } });
      toast.success('Product added!');
    } else {
      dispatch({ type: 'UPDATE_PRODUCT', product: { ...form, price: parseFloat(form.price), cost: parseFloat(form.cost) } });
      toast.success('Product updated!');
    }
    setModal(null);
  };

  const handleDelete = (p) => {
    if (confirm(`Delete "${p.name}"?`)) {
      dispatch({ type: 'DELETE_PRODUCT', id: p.id });
      toast.success('Deleted');
    }
  };

  const margin = (p) => (((p.price - p.cost) / p.price) * 100).toFixed(1);

  return (
    <div className="animate-in">
      <Topbar
        title="Products"
        subtitle={`${state.products.length} products · ${state.products.filter(p => p.available).length} available`}
        actions={
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={14} /> Add Product
          </button>
        }
      />
      <div className="page-wrapper">
        {/* Filters */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex gap-3 items-center">
            <div className="search-bar">
              <Search size={14} />
              <input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-select" style={{ width: 'auto' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option>All</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Link to="/items-sold" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <TrendingUp size={14} /> View Items Sold
            </Link>
            <button className={`btn btn-secondary btn-sm ${view === 'grid' ? 'btn-primary' : ''}`} onClick={() => setView('grid')}>Grid</button>
            <button className={`btn btn-secondary btn-sm ${view === 'table' ? 'btn-primary' : ''}`} onClick={() => setView('table')}>Table</button>
          </div>
        </div>

        {view === 'grid' ? (
          <div className="products-grid">
            {filtered.map(p => (
              <div className="product-card-mgmt" key={p.id}>
                <div className="product-card-top">{p.image}</div>
                <div className="product-card-body">
                  <div className="product-card-name">{p.name}</div>
                  <div className="product-card-cat">{p.category} · {p.sold} sold</div>
                  <div className="product-card-pricing">
                    <div>
                      <div className="product-price">ETB {p.price.toFixed(2)}</div>
                      <div className="product-cost">Cost: ETB {p.cost.toFixed(2)}</div>
                    </div>
                    <div className="product-margin">+{margin(p)}% margin</div>
                  </div>
                  <div className="product-card-footer">
                    <span className={`badge ${p.available ? 'badge-green' : 'badge-red'}`}>
                      {p.available ? 'Available' : 'Unavailable'}
                    </span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary btn-icon btn-sm" onClick={() => dispatch({ type: 'TOGGLE_PRODUCT_AVAILABILITY', id: p.id })}>
                        {p.available ? <ToggleRight size={14} color="var(--success)" /> : <ToggleLeft size={14} />}
                      </button>
                      <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openEdit(p)}><Edit2 size={12} /></button>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(p)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Cost</th>
                    <th>Margin</th>
                    <th>Sold</th>
                    <th>Revenue</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id}>
                      <td><strong>{p.image} {p.name}</strong></td>
                      <td>{p.category}</td>
                      <td><strong>ETB {p.price.toFixed(2)}</strong></td>
                      <td>ETB {p.cost.toFixed(2)}</td>
                      <td><span className="badge badge-green">+{margin(p)}%</span></td>
                      <td>{p.sold}</td>
                      <td className="text-amber">ETB {(p.sold * p.price).toFixed(0)}</td>
                      <td><span className={`badge ${p.available ? 'badge-green' : 'badge-red'}`}>{p.available ? 'Available' : 'Out'}</span></td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-secondary btn-icon btn-sm" onClick={() => dispatch({ type: 'TOGGLE_PRODUCT_AVAILABILITY', id: p.id })}>
                            {p.available ? <ToggleRight size={12} color="var(--success)" /> : <ToggleLeft size={12} />}
                          </button>
                          <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openEdit(p)}><Edit2 size={12} /></button>
                          <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(p)}><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <Modal
          title={modal === 'add' ? 'Add New Product' : 'Edit Product'}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {modal === 'add' ? 'Add Product' : 'Save Changes'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Product Name *</label>
            <input className="form-input" placeholder="e.g. Chocolate Croissant" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Emoji Icon</label>
              <select className="form-select" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })}>
                {EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Selling Price (ETB) *</label>
              <input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Cost Price (ETB) *</label>
              <input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} />
            </div>
          </div>
          {form.price && form.cost && (
            <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>
                Profit Margin: {(((form.price - form.cost) / form.price) * 100).toFixed(1)}%
                · Profit per item: ETB {(form.price - form.cost).toFixed(2)}
              </div>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Availability</label>
            <div className="flex gap-3">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input type="radio" name="avail" checked={form.available} onChange={() => setForm({ ...form, available: true })} />
                Available
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input type="radio" name="avail" checked={!form.available} onChange={() => setForm({ ...form, available: false })} />
                Unavailable
              </label>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
