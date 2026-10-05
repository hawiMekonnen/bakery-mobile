import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { BakeryProvider } from './store/bakeryStore';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import ItemsSold from './pages/ItemsSold';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Analytics from './pages/Analytics';
import Expenses from './pages/Expenses';
import Staff from './pages/Staff';
import Settings from './pages/Settings';
import './index.css';

export default function App() {
  return (
    <BakeryProvider>
      <BrowserRouter>
        <div className="app-layout">
          <Sidebar />
          <div className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/pos" element={<POS />} />
              <Route path="/products" element={<Products />} />
              <Route path="/items-sold" element={<ItemsSold />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/staff" element={<Staff />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              fontFamily: 'Outfit, sans-serif',
              fontSize: '13px',
            },
          }}
        />
      </BrowserRouter>
    </BakeryProvider>
  );
}
