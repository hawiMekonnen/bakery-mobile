import { useState } from 'react';
import { Store, Percent, Globe, Printer } from 'lucide-react';
import Topbar from '../components/Topbar';
import toast from 'react-hot-toast';

export default function Settings() {
  const [form, setForm] = useState({
    businessName: 'BakerPro Bakery',
    address: '123 Main Street, Bakery Town',
    phone: '+1-555-BAKERY',
    email: 'hello@bakerpro.com',
    taxRate: '15',
    currency: 'ETB',
    timezone: 'Africa/Addis_Ababa',
    receiptFooter: 'Thank you for your visit! 🎉',
    lowStockAlert: true,
    autoBackup: false,
  });

  const handleSave = () => {
    toast.success('Settings saved successfully!');
  };

  return (
    <div className="animate-in">
      <Topbar title="Settings" subtitle="Configure your bakery system" />
      <div className="page-wrapper">
        <div style={{ maxWidth: 700 }}>

          {/* Business Info */}
          <div className="card mb-5">
            <div className="flex items-center gap-2 mb-4">
              <Store size={16} color="var(--amber-400)" />
              <div className="card-title" style={{ marginBottom: 0 }}>Business Information</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{ width: 80, height: 80, background: 'linear-gradient(135deg,var(--amber-500),var(--amber-700))', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
                🥐
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Business Name</label>
                <input className="form-input" value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="form-group mt-4">
              <label className="form-label">Address</label>
              <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="form-group mt-4">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>

          {/* Financial Settings */}
          <div className="card mb-5">
            <div className="flex items-center gap-2 mb-4">
              <Percent size={16} color="var(--amber-400)" />
              <div className="card-title" style={{ marginBottom: 0 }}>Financial Settings</div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Tax Rate (%)</label>
                <input className="form-input" type="number" step="0.1" value={form.taxRate} onChange={e => setForm({ ...form, taxRate: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select className="form-select" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                  <option value="ETB">ETB — Ethiopian Birr (ETB)</option>
                  <option value="USD">USD — US Dollar ($)</option>
                  <option value="EUR">EUR — Euro (€)</option>
                  <option value="GBP">GBP — British Pound (£)</option>
                  <option value="KES">KES — Kenyan Shilling (KSh)</option>
                  <option value="NGN">NGN — Nigerian Naira (₦)</option>
                  <option value="GHS">GHS — Ghanaian Cedi (₵)</option>
                  <option value="ZAR">ZAR — South African Rand (R)</option>
                  <option value="TZS">TZS — Tanzanian Shilling (TSh)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Receipt Settings */}
          <div className="card mb-5">
            <div className="flex items-center gap-2 mb-4">
              <Printer size={16} color="var(--amber-400)" />
              <div className="card-title" style={{ marginBottom: 0 }}>Receipt Settings</div>
            </div>
            <div className="form-group">
              <label className="form-label">Receipt Footer Message</label>
              <input className="form-input" value={form.receiptFooter} onChange={e => setForm({ ...form, receiptFooter: e.target.value })} />
            </div>
          </div>

          {/* Notifications */}
          <div className="card mb-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={16} color="var(--amber-400)" />
              <div className="card-title" style={{ marginBottom: 0 }}>Preferences</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'lowStockAlert', label: 'Low stock alerts', desc: 'Show notification badge when ingredients are below reorder level' },
                { key: 'autoBackup', label: 'Auto backup data', desc: 'Automatically backup data daily (Coming soon)' },
              ].map(pref => (
                <div key={pref.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{pref.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{pref.desc}</div>
                  </div>
                  <div
                    style={{
                      width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                      background: form[pref.key] ? 'var(--amber-500)' : 'var(--bg-card3)',
                      border: `1px solid ${form[pref.key] ? 'var(--amber-600)' : 'var(--border)'}`,
                      position: 'relative', transition: 'all 0.2s'
                    }}
                    onClick={() => setForm({ ...form, [pref.key]: !form[pref.key] })}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', background: 'white',
                      position: 'absolute', top: 2, transition: 'left 0.2s',
                      left: form[pref.key] ? 22 : 3
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary btn-lg" onClick={handleSave}>Save Settings</button>
            <button className="btn btn-secondary btn-lg" onClick={() => toast('No changes to discard')}>Discard Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}
