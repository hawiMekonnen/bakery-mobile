import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Boxes,
  BarChart3, DollarSign, Users, ClipboardList,
  Settings, TrendingUp
} from 'lucide-react';
import { useBakery } from '../store/bakeryStore';

const navItems = [
  {
    section: 'Main',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/pos', label: 'Point of Sale', icon: ShoppingCart },
    ]
  },
  {
    section: 'Management',
    items: [
      { to: '/products', label: 'Products', icon: Package },
      { to: '/items-sold', label: 'Items Sold', icon: TrendingUp },
      { to: '/inventory', label: 'Inventory', icon: Boxes },
      { to: '/orders', label: 'Order History', icon: ClipboardList },
    ]
  },
  {
    section: 'Finance',
    items: [
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/expenses', label: 'Expenses', icon: DollarSign },
    ]
  },
  {
    section: 'HR',
    items: [
      { to: '/staff', label: 'Staff', icon: Users },
    ]
  },
  {
    section: 'System',
    items: [
      { to: '/settings', label: 'Settings', icon: Settings },
    ]
  },
];

export default function Sidebar() {
  const { state } = useBakery();
  const location = useLocation();

  const lowStockCount = state.ingredients.filter(i => i.quantity <= i.reorderLevel).length;
  const cartCount = state.cart.reduce((s, i) => s + i.qty, 0);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-inner">
          <div className="logo-icon">🥐</div>
          <div className="logo-text">
            <h2>BakerPro</h2>
            <span>MANAGEMENT SYSTEM</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(section => (
          <div className="nav-section" key={section.section}>
            <div className="nav-section-title">{section.section}</div>
            {section.items.map(item => {
              const Icon = item.icon;
              const isActive = item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  {item.label}
                  {item.label === 'Inventory' && lowStockCount > 0 && (
                    <span className="nav-badge">{lowStockCount}</span>
                  )}
                  {item.label === 'Point of Sale' && cartCount > 0 && (
                    <span className="nav-badge">{cartCount}</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{state.currentUser.avatar}</div>
          <div className="user-info">
            <p>{state.currentUser.name}</p>
            <span style={{ textTransform: 'capitalize' }}>{state.currentUser.role}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
