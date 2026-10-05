import { Bell, Calendar } from 'lucide-react';
import { useBakery } from '../store/bakeryStore';

export default function Topbar({ title, subtitle, actions }) {
  const { state } = useBakery();
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const lowStockCount = state.ingredients.filter(i => i.quantity <= i.reorderLevel).length;

  return (
    <header className="topbar">
      <div style={{ flex: 1 }}>
        <div className="topbar-title">{title}</div>
        {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
      </div>
      <div className="topbar-actions">
        <span className="topbar-date flex items-center gap-2">
          <Calendar size={14} />
          {today}
        </span>
        {lowStockCount > 0 && (
          <div style={{ position: 'relative' }}>
            <button className="btn btn-secondary btn-icon">
              <Bell size={16} />
            </button>
            <span style={{
              position: 'absolute', top: -4, right: -4,
              background: 'var(--danger)', color: 'white',
              fontSize: '10px', fontWeight: 700,
              width: 16, height: 16, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>{lowStockCount}</span>
          </div>
        )}
        {actions}
      </div>
    </header>
  );
}
