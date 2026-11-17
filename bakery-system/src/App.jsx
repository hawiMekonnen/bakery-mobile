import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LayoutDashboard,
  Receipt,
  Smartphone,
  Building2,
  Package,
  UtensilsCrossed,
  DatabaseBackup,
  Search,
  Filter,
  Check,
  X,
  AlertTriangle,
  Download,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Copy,
  ExternalLink,
  LogOut,
  RefreshCw,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  Info,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  Unlink,
  History,
  Store
} from 'lucide-react';

const CURRENCY = 'ETB ';

function formatDateTimeAddis(isoString) {
  if (!isoString) return 'Never';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Invalid date';
    // Addis Ababa UTC+3 offset
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Addis_Ababa',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(d);
  } catch {
    return isoString;
  }
}

function formatDateOnlyAddis(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Addis_Ababa',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch {
    return isoString;
  }
}

function formatTimeOnlyAddis(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Addis_Ababa',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(d);
  } catch {
    return '';
  }
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('bakery_admin_token') || '');
  const [adminUser, setAdminUser] = useState(localStorage.getItem('bakery_admin_user') || 'admin');

  // Navigation: overview | orders | terminals | shops | inventory | menu | backup
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);

  // Global Scopes
  const [selectedTerminalScope, setSelectedTerminalScope] = useState('ALL');

  // Core Data States
  const [serverStats, setServerStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Toasts
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // Login Form
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // ─── DATE FILTER PRESETS (DASHBOARD & ORDERS) ───
  const getPresetDates = useCallback((preset) => {
    // Addis Ababa date reference
    const now = new Date(Date.now() + 3 * 3600 * 1000);
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'today') {
      return { start: todayStr, end: todayStr };
    }
    if (preset === 'yesterday') {
      const y = new Date(now.getTime() - 86400000);
      const yStr = y.toISOString().split('T')[0];
      return { start: yStr, end: yStr };
    }
    if (preset === '7days') {
      const past = new Date(now.getTime() - 7 * 86400000);
      return { start: past.toISOString().split('T')[0], end: todayStr };
    }
    if (preset === '30days') {
      const past = new Date(now.getTime() - 30 * 86400000);
      return { start: past.toISOString().split('T')[0], end: todayStr };
    }
    if (preset === 'thisMonth') {
      const start = `${todayStr.slice(0, 7)}-01`;
      return { start, end: todayStr };
    }
    if (preset === 'lastMonth') {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const start = d.toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      const end = lastDay.toISOString().split('T')[0];
      return { start, end };
    }
    return { start: '', end: '' };
  }, []);

  // Global Date Filter State (Used by Dashboard & Orders)
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // ─── TAB: ORDERS (SERVER-SIDE PAGINATION) ───
  const [ordersData, setOrdersData] = useState({ total: 0, orders: [], totals: null });
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPageSize, setOrdersPageSize] = useState(20);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('ALL');
  const [orderTerminalFilter, setOrderTerminalFilter] = useState('ALL');
  const [orderShopFilter, setOrderShopFilter] = useState('ALL');
  const [orderSortCol, setOrderSortCol] = useState('createdAt');
  const [orderSortAsc, setOrderSortAsc] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // ─── TAB: TERMINALS (SCALE & BULK CONTROL) ───
  const [terminalsData, setTerminalsData] = useState({ total: 0, terminals: [], counts: {} });
  const [terminalsPage, setTerminalsPage] = useState(1);
  const [terminalsPageSize, setTerminalsPageSize] = useState(15);
  const [terminalSearch, setTerminalSearch] = useState('');
  const [terminalStatusFilter, setTerminalStatusFilter] = useState('all');
  const [terminalShopFilter, setTerminalShopFilter] = useState('all');
  const [terminalOnlineFilter, setTerminalOnlineFilter] = useState('all');
  const [terminalSortCol, setTerminalSortCol] = useState('lastPing');
  const [terminalSortAsc, setTerminalSortAsc] = useState(false);
  const [selectedTerminalIds, setSelectedTerminalIds] = useState([]);
  const [activeDetailTerminal, setActiveDetailTerminal] = useState(null); // Drawer inspect

  // Terminal Action Modal (Suspend, Activate, Block, Unlink)
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    terminal: null,
    action: 'suspend', // 'suspend' | 'activate' | 'block' | 'unlink'
    isBulk: false,
    reason: ''
  });

  // ─── TAB: SHOPS (MULTI-SHOP MANAGEMENT) ───
  const [shopsList, setShopsList] = useState([]);
  const [showAddShopModal, setShowAddShopModal] = useState(false);
  const [newShopForm, setNewShopForm] = useState({
    name: '',
    contactPhone: '',
    email: '',
    address: '',
    plan: 'standard',
    paidUntil: '',
    gracePeriodDays: 7,
    autoSuspend: true
  });
  const [editBillingShop, setEditBillingShop] = useState(null);

  // Pairing Guide & Licenses
  const [showPairingGuide, setShowPairingGuide] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [licensesList, setLicensesList] = useState([]);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [newLicShopId, setNewLicShopId] = useState('');
  const [newLicKey, setNewLicKey] = useState('');
  const [newLicMaxDevices, setNewLicMaxDevices] = useState(5);

  // Backup & Recovery States
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restorePreview, setRestorePreview] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Table Controls - Menu & Inventory
  const [menuSearch, setMenuSearch] = useState('');
  const [invSearch, setInvSearch] = useState('');

  // Sync title
  useEffect(() => {
    const titles = {
      overview: 'Dashboard',
      orders: 'Orders',
      terminals: 'Mobile Terminals',
      shops: 'Shops and Clients',
      inventory: 'Stock and Ingredients',
      menu: 'Menu and Items',
      backup: 'Backups and Recovery'
    };
    document.title = `${titles[activeTab] || 'Dashboard'} | BakerAdmin`;
  }, [activeTab]);

  const authHeaders = useMemo(() => ({
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  }), [token]);

  // Handle Date Preset Selection
  const handleSelectDatePreset = (preset) => {
    setDatePreset(preset);
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'custom') {
      // Keep existing manual inputs
    } else {
      const p = getPresetDates(preset);
      setStartDate(p.start);
      setEndDate(p.end);
    }
  };

  // ─── FETCH CORE DATA ───
  const fetchGlobalStats = useCallback(async () => {
    if (!token) return;
    try {
      const statsParams = new URLSearchParams();
      if (orderTerminalFilter !== 'ALL') statsParams.set('terminalId', orderTerminalFilter);
      const statsUrl = `/api/admin/stats${statsParams.toString() ? `?${statsParams.toString()}` : ''}`;

      const [resStats, resShops, resLicenses] = await Promise.all([
        fetch(statsUrl, { headers: authHeaders }).then(r => r.json()).catch(() => null),
        fetch('/api/admin/shops', { headers: authHeaders }).then(r => r.json()).catch(() => ({ shops: [] })),
        fetch('/api/admin/licenses', { headers: authHeaders }).then(r => r.json()).catch(() => ({ licenses: [] }))
      ]);

      if (resStats && !resStats.error) setServerStats(resStats);
      if (resShops && Array.isArray(resShops.shops)) setShopsList(resShops.shops);
      if (resLicenses && Array.isArray(resLicenses.licenses)) setLicensesList(resLicenses.licenses);
      setLastSyncTime(new Date());
    } catch {}
    finally {
      setLoading(false);
    }
  }, [token, authHeaders, orderTerminalFilter]);

  const handleTerminalScopeChange = (terminalId) => {
    setSelectedTerminalScope(terminalId);
    setOrderTerminalFilter(terminalId);
    setOrdersPage(1);
  };

  // ─── FETCH ORDERS WITH DATE FILTERS ───
  const fetchOrders = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams({
        page: ordersPage,
        limit: ordersPageSize,
        sortBy: orderSortCol,
        sortOrder: orderSortAsc ? 'asc' : 'desc'
      });

      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (startTime) params.set('startTime', startTime);
      if (endTime) params.set('endTime', endTime);
      if (orderTerminalFilter !== 'ALL') params.set('terminalId', orderTerminalFilter);
      if (orderShopFilter !== 'ALL') params.set('shopId', orderShopFilter);
      if (orderPaymentFilter !== 'ALL') params.set('paymentMethod', orderPaymentFilter);
      if (orderSearch.trim()) params.set('search', orderSearch.trim());

      const res = await fetch(`/api/admin/orders?${params.toString()}`, { headers: authHeaders });
      const data = await res.json();
      if (res.ok) {
        setOrdersData(data);
      }
    } catch {}
  }, [
    token, authHeaders, ordersPage, ordersPageSize, orderSortCol, orderSortAsc,
    startDate, endDate, startTime, endTime, orderTerminalFilter, orderShopFilter,
    orderPaymentFilter, orderSearch
  ]);

  // ─── FETCH TERMINALS WITH PAGINATION ───
  const fetchTerminals = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams({
        page: terminalsPage,
        limit: terminalsPageSize,
        sortBy: terminalSortCol,
        sortOrder: terminalSortAsc ? 'asc' : 'desc'
      });

      if (terminalSearch.trim()) params.set('search', terminalSearch.trim());
      if (terminalStatusFilter !== 'all') params.set('status', terminalStatusFilter);
      if (terminalShopFilter !== 'all') params.set('shopId', terminalShopFilter);
      if (terminalOnlineFilter !== 'all') params.set('online', terminalOnlineFilter);

      const res = await fetch(`/api/admin/terminals?${params.toString()}`, { headers: authHeaders });
      const data = await res.json();
      if (res.ok) {
        setTerminalsData(data);
      } else if (res.status === 401) {
        localStorage.removeItem('bakery_admin_token');
        setToken(null);
      }
    } catch {}
  }, [
    token, authHeaders, terminalsPage, terminalsPageSize, terminalSortCol, terminalSortAsc,
    terminalSearch, terminalStatusFilter, terminalShopFilter, terminalOnlineFilter
  ]);

  // Periodic Polling
  useEffect(() => {
    if (!token) return;
    fetchGlobalStats();
    fetchOrders();
    fetchTerminals();

    const timer = setInterval(() => {
      fetchGlobalStats();
      if (activeTab === 'orders') fetchOrders();
      if (activeTab === 'terminals') fetchTerminals();
    }, 5000);

    return () => clearInterval(timer);
  }, [token, activeTab, fetchGlobalStats, fetchOrders, fetchTerminals]);

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser.trim(), password: loginPass })
      });
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        localStorage.setItem('bakery_admin_token', data.token);
        localStorage.setItem('bakery_admin_user', data.username || 'admin');
        setToken(data.token);
        setAdminUser(data.username || 'admin');
        addToast('Signed in successfully', 'success');
      } else {
        setLoginError(data.message || 'Invalid username or password');
      }
    } catch {
      setLoginError('Cannot connect to admin server. Ensure process is running.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('bakery_admin_token');
    localStorage.removeItem('bakery_admin_user');
    setToken('');
    addToast('Signed out', 'info');
  };

  // ─── TERMINAL ENFORCEMENT ACTIONS ───
  const openActionModal = (terminal, action, isBulk = false) => {
    const defaultReasons = {
      suspend: 'Payment overdue or administrative hold',
      activate: 'Payment verified, re-activated by administrator',
      block: 'Security policy violation or unauthorized device',
      unlink: 'Device hardware replacement / unlinked from license'
    };
    setActionModal({
      isOpen: true,
      terminal,
      action,
      isBulk,
      reason: defaultReasons[action] || ''
    });
  };

  const handleExecuteAction = async () => {
    const { terminal, action, isBulk, reason } = actionModal;
    try {
      if (isBulk) {
        const res = await fetch('/api/admin/terminals/bulk-action', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            deviceIds: selectedTerminalIds,
            action,
            reason: reason.trim()
          })
        });
        const data = await res.json();
        if (data.success) {
          addToast(`Bulk ${action} executed for ${data.processedCount} terminal(s).`, 'success');
          setSelectedTerminalIds([]);
          fetchTerminals();
          fetchGlobalStats();
        } else {
          addToast(data.message || 'Bulk action failed', 'error');
        }
      } else if (terminal) {
        const res = await fetch(`/api/admin/terminals/${encodeURIComponent(terminal.deviceId)}/action`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ action, reason: reason.trim() })
        });
        const data = await res.json();
        if (data.success) {
          const deliverMsg = data.deliveredImmediately ? 'delivered immediately' : 'pending phone delivery';
          addToast(`Terminal ${action}d (${deliverMsg}).`, 'success');
          fetchTerminals();
          fetchGlobalStats();
          if (activeDetailTerminal?.deviceId === terminal.deviceId) {
            handleInspectTerminal(terminal.deviceId);
          }
        } else {
          addToast(data.message || 'Action failed', 'error');
        }
      }
    } catch {
      addToast('Error communicating with server', 'error');
    } finally {
      setActionModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  // Inspect Terminal details
  const handleInspectTerminal = async (deviceId) => {
    try {
      const res = await fetch(`/api/admin/terminals/${encodeURIComponent(deviceId)}`, { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setActiveDetailTerminal(data.terminal);
      }
    } catch {
      addToast('Could not load terminal details', 'error');
    }
  };

  // ─── SHOP ACTIONS ───
  const handleCreateShop = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/shops', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(newShopForm)
      });
      const data = await res.json();
      if (data.success) {
        addToast(`Shop ${newShopForm.name} created with license ${data.license.licenseKey}.`, 'success');
        setShowAddShopModal(false);
        setNewShopForm({
          name: '',
          contactPhone: '',
          email: '',
          address: '',
          plan: 'standard',
          paidUntil: '',
          gracePeriodDays: 7,
          autoSuspend: true
        });
        fetchGlobalStats();
      } else {
        addToast(data.message || 'Failed to create shop', 'error');
      }
    } catch {
      addToast('Error communicating with server', 'error');
    }
  };

  const handleUpdateBilling = async (e) => {
    e.preventDefault();
    if (!editBillingShop) return;
    try {
      const res = await fetch(`/api/admin/shops/${encodeURIComponent(editBillingShop.id)}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          plan: editBillingShop.plan,
          paidUntil: editBillingShop.paidUntil,
          gracePeriodDays: editBillingShop.gracePeriodDays,
          autoSuspend: editBillingShop.autoSuspend
        })
      });
      const data = await res.json();
      if (data.success) {
        addToast('Shop billing configuration updated', 'success');
        setEditBillingShop(null);
        fetchGlobalStats();
      } else {
        addToast(data.message || 'Update failed', 'error');
      }
    } catch {
      addToast('Error communicating with server', 'error');
    }
  };

  const handleCreateLicense = async (e) => {
    e.preventDefault();
    if (!newLicShopId) {
      addToast('Please select a client shop', 'error');
      return;
    }
    const selectedShop = shops.find(s => s.id === newLicShopId);
    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          licenseKey: newLicKey.trim(),
          shopId: newLicShopId,
          shopName: selectedShop?.name || '',
          maxDevices: Number(newLicMaxDevices) || 5
        })
      });
      const data = await res.json();
      if (data.success) {
        addToast(`License ${data.license.licenseKey} issued successfully`, 'success');
        setShowLicenseModal(false);
        setNewLicKey('');
        setNewLicShopId('');
        fetchGlobalStats();
      } else {
        addToast(data.message || 'Failed to issue license', 'error');
      }
    } catch {
      addToast('Error issuing license', 'error');
    }
  };

  const handleSuspendAllShopTerminals = async (shop) => {
    if (!window.confirm(`Suspend all mobile terminals for "${shop.name}"?

This will freeze all terminals associated with this shop immediately.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/shops/${encodeURIComponent(shop.id)}/suspend-all`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ reason: 'Shop billing suspension' })
      });
      const data = await res.json();
      if (data.success) {
        addToast(data.message || 'All shop terminals suspended', 'success');
        fetchGlobalStats();
        fetchTerminals();
      } else {
        addToast(data.message || 'Failed to suspend shop terminals', 'error');
      }
    } catch {
      addToast('Error communicating with server', 'error');
    }
  };

  // CSV Export for exact filtered results
  const handleExportFilteredCSV = async () => {
    setIsExportingBackup(true);
    try {
      addToast('Preparing CSV report for filtered orders...', 'info');
      const params = new URLSearchParams({ format: 'csv' });
      if (token) params.set('token', token);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (orderTerminalFilter !== 'ALL') params.set('terminalId', orderTerminalFilter);
      if (orderShopFilter !== 'ALL') params.set('shopId', orderShopFilter);
      if (orderPaymentFilter !== 'ALL') params.set('paymentMethod', orderPaymentFilter);
      if (orderSearch.trim()) params.set('search', orderSearch.trim());

      const res = await fetch(`/api/admin/export?${params.toString()}`, {
        headers: authHeaders
      });

      if (!res.ok) {
        throw new Error(`Export failed with HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-filtered-${startDate || 'all'}-to-${endDate || 'now'}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addToast('Filtered CSV downloaded successfully', 'success');
    } catch (err) {
      addToast('Export error: ' + err.message, 'error');
    } finally {
      setIsExportingBackup(false);
    }
  };

  // Full Database / Orders Backup Downloader
  const handleDownloadBackup = async (format = 'json') => {
    setIsExportingBackup(true);
    try {
      addToast(`Preparing ${format.toUpperCase()} export...`, 'info');
      const params = new URLSearchParams({ format });
      if (token) params.set('token', token);
      if (orderTerminalFilter !== 'ALL') params.set('terminalId', orderTerminalFilter);

      const res = await fetch(`/api/admin/export?${params.toString()}`, {
        headers: authHeaders
      });

      if (!res.ok) {
        throw new Error(`Export failed with HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'csv'
        ? `bakery-orders-backup-${new Date().toISOString().split('T')[0]}.csv`
        : `bakery-full-cloud-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addToast(`${format.toUpperCase()} backup downloaded successfully!`, 'success');
    } catch (err) {
      addToast(`Failed to download: ${err.message}`, 'error');
    } finally {
      setIsExportingBackup(false);
    }
  };

  // Backup File Picker & Structure Inspector
  const handleSelectRestoreFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Not a valid JSON object');
        }
        setRestoreFile(file);
        setRestorePreview({
          name: file.name,
          sizeKb: (file.size / 1024).toFixed(1),
          ordersCount: Array.isArray(parsed.orders) ? parsed.orders.length : 0,
          productsCount: Array.isArray(parsed.products) ? parsed.products.length : 0,
          devicesCount: Array.isArray(parsed.devices) ? parsed.devices.length : 0,
          shopsCount: Array.isArray(parsed.shops) ? parsed.shops.length : 0,
          data: parsed
        });
        addToast(`Backup file parsed: ${file.name}`, 'info');
      } catch (err) {
        addToast('Invalid JSON file: ' + err.message, 'error');
        setRestoreFile(null);
        setRestorePreview(null);
      }
    };
    reader.readAsText(file);
  };

  // Execute Restore from Uploaded Backup
  const handleExecuteRestore = async () => {
    if (!restorePreview || !restorePreview.data) return;
    if (!window.confirm(`Are you sure you want to restore this backup?

File: ${restorePreview.name}
Snapshot contents:
• ${restorePreview.ordersCount} Synced Orders
• ${restorePreview.productsCount} Menu Products
• ${restorePreview.devicesCount} Terminal Devices
• ${restorePreview.shopsCount} Client Shops

A safety snapshot of your current database will be saved before applying.`)) {
      return;
    }

    setIsRestoring(true);
    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(restorePreview.data)
      });
      const data = await res.json();
      if (data.success) {
        addToast(data.message || 'Database restored successfully!', 'success');
        setRestoreFile(null);
        setRestorePreview(null);
        fetchGlobalStats();
        fetchOrders();
        fetchTerminals();
      } else {
        addToast(data.message || 'Restore failed', 'error');
      }
    } catch (err) {
      addToast('Error restoring backup: ' + err.message, 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  const copyServerUrl = () => {
    const url = `http://192.168.0.116:5000`;
    navigator.clipboard?.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    addToast('Server URL copied to clipboard', 'success');
  };

  // Terminals helper map
  const terminalsList = terminalsData.terminals || [];
  const activeTerminalsCount = terminalsData.counts?.active || 0;
  const onlineTerminalsCount = terminalsData.counts?.online || 0;
  const pendingTerminalsCount = terminalsData.counts?.pending || 0;

  // ─── LOGIN SCREEN ───
  if (!token) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-logo-box">B</div>
            <h1 className="login-title">BakerAdmin</h1>
            <p className="login-subtitle">POS Operations & Central Control</p>
          </div>

          {loginError && <div className="login-error">{loginError}</div>}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '14px' }}>
              <label className="form-label" htmlFor="admin-user">Username</label>
              <input
                id="admin-user"
                type="text"
                className="form-input"
                style={{ width: '100%' }}
                placeholder="Enter username"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="form-label" htmlFor="admin-pass">Password</label>
              <input
                id="admin-pass"
                type="password"
                className="form-input"
                style={{ width: '100%' }}
                placeholder="Enter password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Mobile Backdrop */}
      {sidebarOpenMobile && (
        <div className="app-sidebar-backdrop" onClick={() => setSidebarOpenMobile(false)} />
      )}

      {/* ─── Sidebar ─── */}
      <aside className={`app-sidebar ${sidebarOpenMobile ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand-icon">B</div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-title">BakerAdmin</span>
            <span className="sidebar-brand-subtitle">POS Operations</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div>
            <div className="nav-group-title">Monitoring</div>
            <div className="nav-group-list">
              <button
                className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => { setActiveTab('overview'); setSidebarOpenMobile(false); }}
              >
                <span>Dashboard</span>
              </button>
              <button
                className={`nav-link ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => { setActiveTab('orders'); setSidebarOpenMobile(false); }}
              >
                <span>Orders</span>
              </button>
            </div>
          </div>

          <div>
            <div className="nav-group-title">Hardware & Clients</div>
            <div className="nav-group-list">
              <button
                className={`nav-link ${activeTab === 'terminals' ? 'active' : ''}`}
                onClick={() => { setActiveTab('terminals'); setSidebarOpenMobile(false); }}
              >
                <span>Mobile Terminals</span>
                {pendingTerminalsCount > 0 && (
                  <span className="nav-badge">{pendingTerminalsCount}</span>
                )}
              </button>
              <button
                className={`nav-link ${activeTab === 'shops' ? 'active' : ''}`}
                onClick={() => { setActiveTab('shops'); setSidebarOpenMobile(false); }}
              >
                <span>Shops & Clients</span>
              </button>
            </div>
          </div>

          <div>
            <div className="nav-group-title">Inventory</div>
            <div className="nav-group-list">
              <button
                className={`nav-link ${activeTab === 'inventory' ? 'active' : ''}`}
                onClick={() => { setActiveTab('inventory'); setSidebarOpenMobile(false); }}
              >
                <span>Stock and Ingredients</span>
              </button>
              <button
                className={`nav-link ${activeTab === 'menu' ? 'active' : ''}`}
                onClick={() => { setActiveTab('menu'); setSidebarOpenMobile(false); }}
              >
                <span>Menu and Items</span>
              </button>
            </div>
          </div>

          <div>
            <div className="nav-group-title">System</div>
            <div className="nav-group-list">
              <button
                className={`nav-link ${activeTab === 'backup' ? 'active' : ''}`}
                onClick={() => { setActiveTab('backup'); setSidebarOpenMobile(false); }}
              >
                <span>Backups and Recovery</span>
              </button>
            </div>
          </div>
        </nav>
      </aside>

      {/* ─── Main Workspace ─── */}
      <div className="app-main">
        {/* Topbar */}
        <header className="app-topbar">
          <div className="topbar-left">
            <button
              className="btn btn-secondary btn-sm"
              style={{ display: 'none' }}
              onClick={() => setSidebarOpenMobile(!sidebarOpenMobile)}
              aria-label="Toggle Navigation"
            >
              Menu
            </button>
            <nav className="topbar-breadcrumb">
              <span className="breadcrumb-item">BakerAdmin</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">
                {activeTab === 'overview' && 'Dashboard'}
                {activeTab === 'orders' && 'Orders'}
                {activeTab === 'terminals' && 'Mobile Terminals'}
                {activeTab === 'shops' && 'Shops & Clients'}
                {activeTab === 'inventory' && 'Stock and Ingredients'}
                {activeTab === 'menu' && 'Menu and Items'}
                {activeTab === 'backup' && 'Backups and Recovery'}
              </span>
            </nav>
          </div>

          <div className="topbar-right">
            {/* Terminal Scope Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label htmlFor="topbar-terminal-scope" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                Terminal:
              </label>
              <select
                id="topbar-terminal-scope"
                className="form-select form-select-sm"
                value={orderTerminalFilter}
                onChange={(e) => handleTerminalScopeChange(e.target.value)}
                style={{ maxWidth: '240px' }}
              >
                <option value="ALL">All Terminals ({terminalsData.total || terminalsList.length})</option>
                {terminalsList.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.model || 'Terminal'} ({d.shopName || d.deviceId.slice(-6)})
                  </option>
                ))}
              </select>
            </div>

            {/* User Session Menu */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid var(--border-color)', paddingLeft: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {adminUser}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleLogout}
                title="Sign out of administration portal"
                aria-label="Logout"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="app-content">
          <div className="content-container">

            {/* ══════════════════════════════════════════════════════════════
                TAB 1: DASHBOARD
               ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
              <>
                <div className="page-header">
                  <div className="page-header-text">
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-description">
                      Central sales metrics, live terminals, and business performance in Africa/Addis_Ababa timezone.
                    </p>
                  </div>

                  {/* Dashboard Date Preset Filter Bar */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginRight: '4px' }}>
                      Period:
                    </span>
                    {['all', 'today', 'yesterday', '7days', '30days', 'thisMonth'].map(p => (
                      <button
                        key={p}
                        className={`date-preset-btn ${datePreset === p ? 'active' : ''}`}
                        onClick={() => handleSelectDatePreset(p)}
                      >
                        {p === 'all' && 'All Time'}
                        {p === 'today' && 'Today'}
                        {p === 'yesterday' && 'Yesterday'}
                        {p === '7days' && 'Last 7 Days'}
                        {p === '30days' && 'Last 30 Days'}
                        {p === 'thisMonth' && 'This Month'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* KPI Stat Cards */}
                <div className="stat-grid">
                  <div className="stat-card">
                    <span className="stat-label">Total Sales ({datePreset.toUpperCase()})</span>
                    <span className="stat-value">{CURRENCY}{(serverStats?.allTime?.revenue || 0).toFixed(2)}</span>
                    <span className="stat-subtext">
                      {pluralize(serverStats?.allTime?.ordersCount || 0, 'order', 'orders')} recorded
                    </span>
                  </div>

                  <div className="stat-card">
                    <span className="stat-label">Today's Revenue</span>
                    <span className="stat-value">{CURRENCY}{(serverStats?.today?.revenue || 0).toFixed(2)}</span>
                    <span className="stat-subtext">
                      {pluralize(serverStats?.today?.ordersCount || 0, 'order', 'orders')} today
                    </span>
                  </div>

                  <div className="stat-card">
                    <span className="stat-label">Average Order Value</span>
                    <span className="stat-value">{CURRENCY}{(serverStats?.today?.averageOrderValue || 0).toFixed(2)}</span>
                    <span className="stat-subtext">Per transaction</span>
                  </div>

                  <div className="stat-card">
                    <span className="stat-label">Controlled Terminals</span>
                    <span className="stat-value">{activeTerminalsCount}</span>
                    <span className="stat-subtext">
                      {onlineTerminalsCount} online, {pendingTerminalsCount} pending approval
                    </span>
                  </div>
                </div>

                {/* 2-Column Section */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
                  {/* Recent Synced Orders */}
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">Recent Synced Orders</span>
                      <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('orders')}>
                        View Orders History
                      </button>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Order</th>
                              <th>Local Time</th>
                              <th>Terminal</th>
                              <th>Payment</th>
                              <th className="numeric">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(ordersData.orders || []).length === 0 ? (
                              <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '36px 16px' }}>
                                  <div className="empty-state">
                                    <Receipt className="empty-icon" />
                                    <span className="empty-title">No synced orders yet</span>
                                    <span className="empty-description">Transactions completed on mobile POS terminals will stream here automatically.</span>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              (ordersData.orders || []).slice(0, 6).map((o, idx) => (
                              <tr key={idx} style={{ cursor: 'pointer' }} onClick={() => setSelectedReceipt(o)}>
                                <td style={{ fontWeight: 600 }}>#{o.id}</td>
                                <td>{formatTimeOnlyAddis(o.createdAt)}</td>
                                <td>
                                  <span className="badge badge-neutral">{o.phoneModel || 'Terminal'}</span>
                                </td>
                                <td>
                                  <span className="badge badge-neutral">{o.paymentMethod || 'Cash'}</span>
                                </td>
                                <td className="numeric" style={{ fontWeight: 600 }}>
                                  {CURRENCY}{Number(o.total || 0).toFixed(2)}
                                </td>
                              </tr>
                            ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Payment Breakdown & Live Shops */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="card">
                      <div className="card-header">
                        <span className="card-title">Payment Breakdown (Today)</span>
                      </div>
                      <div className="card-body">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 500 }}>Cash</span>
                              <span style={{ fontWeight: 600 }}>{CURRENCY}{(serverStats?.today?.cashTotal || 0).toFixed(2)}</span>
                            </div>
                            <div style={{ height: '6px', backgroundColor: 'var(--bg-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${serverStats?.today?.revenue > 0 ? (serverStats.today.cashTotal / serverStats.today.revenue) * 100 : 0}%`, backgroundColor: 'var(--color-success)' }} />
                            </div>
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 500 }}>Card</span>
                              <span style={{ fontWeight: 600 }}>{CURRENCY}{(serverStats?.today?.cardTotal || 0).toFixed(2)}</span>
                            </div>
                            <div style={{ height: '6px', backgroundColor: 'var(--bg-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${serverStats?.today?.revenue > 0 ? (serverStats.today.cardTotal / serverStats.today.revenue) * 100 : 0}%`, backgroundColor: 'var(--color-info)' }} />
                            </div>
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 500 }}>Mobile Pay (Telebirr / CBE)</span>
                              <span style={{ fontWeight: 600 }}>{CURRENCY}{(serverStats?.today?.mobileTotal || 0).toFixed(2)}</span>
                            </div>
                            <div style={{ height: '6px', backgroundColor: 'var(--bg-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${serverStats?.today?.revenue > 0 ? (serverStats.today.mobileTotal / serverStats.today.revenue) * 100 : 0}%`, backgroundColor: 'var(--color-primary)' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="card">
                      <div className="card-header">
                        <span className="card-title">Registered Shops ({shopsList.length})</span>
                        <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('shops')}>
                          Manage Shops
                        </button>
                      </div>
                      <div className="card-body" style={{ padding: '12px 16px' }}>
                        {shopsList.length === 0 ? (
                          <div className="empty-state" style={{ padding: '24px 0' }}>
                            <Store className="empty-icon" />
                            <span className="empty-title">No client shops registered</span>
                            <span className="empty-description">Navigate to Shops and Clients to onboard your first bakery branch.</span>
                          </div>
                        ) : (
                          shopsList.slice(0, 3).map(s => (
                          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                            <div>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</span>
                              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                                {s.terminalsCount} terminals • Plan: {s.plan}
                              </p>
                            </div>
                            <span className={`badge ${s.status === 'active' ? 'badge-active' : 'badge-suspended'}`}>
                              {s.status.toUpperCase()}
                            </span>
                          </div>
                        ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB 2: ORDERS (FULL DATE RANGE FILTERING & TOTALS)
               ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'orders' && (
              <>
                <div className="page-header">
                  <div className="page-header-text">
                    <h1 className="page-title">Orders</h1>
                    <p className="page-description">
                      Filter transactions by custom calendar date, time window, mobile terminal, and payment method.
                    </p>
                  </div>
                  <button className="btn btn-secondary" onClick={handleExportFilteredCSV}>
                    <Download size={15} style={{ marginRight: '6px' }} />
                    Export Filtered CSV
                  </button>
                </div>

                {/* Date Presets and Date Range Picker */}
                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Presets Bar */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginRight: '6px' }}>
                        Date Range:
                      </span>
                      {['all', 'today', 'yesterday', '7days', '30days', 'thisMonth', 'lastMonth', 'custom'].map(p => (
                        <button
                          key={p}
                          className={`date-preset-btn ${datePreset === p ? 'active' : ''}`}
                          onClick={() => handleSelectDatePreset(p)}
                        >
                          {p === 'all' && 'All Dates'}
                          {p === 'today' && 'Today'}
                          {p === 'yesterday' && 'Yesterday'}
                          {p === '7days' && 'Last 7 Days'}
                          {p === '30days' && 'Last 30 Days'}
                          {p === 'thisMonth' && 'This Month'}
                          {p === 'lastMonth' && 'Last Month'}
                          {p === 'custom' && 'Custom Calendar'}
                        </button>
                      ))}
                    </div>

                    {/* Detailed Filter Inputs Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', alignItems: 'center' }}>
                      <div>
                        <label className="form-label">From Date</label>
                        <input
                          type="date"
                          className="form-input"
                          style={{ width: '100%' }}
                          value={startDate}
                          onChange={(e) => { setStartDate(e.target.value); setDatePreset('custom'); }}
                        />
                      </div>

                      <div>
                        <label className="form-label">To Date</label>
                        <input
                          type="date"
                          className="form-input"
                          style={{ width: '100%' }}
                          value={endDate}
                          onChange={(e) => { setEndDate(e.target.value); setDatePreset('custom'); }}
                        />
                      </div>

                      <div>
                        <label className="form-label">Terminal</label>
                        <select
                          className="form-select"
                          style={{ width: '100%' }}
                          value={orderTerminalFilter}
                          onChange={(e) => handleTerminalScopeChange(e.target.value)}
                        >
                          <option value="ALL">All Terminals</option>
                          {terminalsList.map(t => (
                            <option key={t.deviceId} value={t.deviceId}>
                              {t.model} ({t.shopName || t.deviceId.slice(-6)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="form-label">Payment Method</label>
                        <select
                          className="form-select"
                          style={{ width: '100%' }}
                          value={orderPaymentFilter}
                          onChange={(e) => setOrderPaymentFilter(e.target.value)}
                        >
                          <option value="ALL">All Payment Types</option>
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="mobile">Mobile Pay</option>
                        </select>
                      </div>

                      <div>
                        <label className="form-label">Search</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            className="form-input"
                            style={{ width: '100%', paddingLeft: '30px' }}
                            placeholder="Order #, customer, item..."
                            value={orderSearch}
                            onChange={(e) => setOrderSearch(e.target.value)}
                          />
                          <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Totals Summary Row for Selected Query */}
                {ordersData.totals && (
                  <div className="totals-bar">
                    <div className="totals-item">
                      <span className="totals-item-label">Matched Orders</span>
                      <span className="totals-item-val">{ordersData.totals.orderCount}</span>
                    </div>
                    <div className="totals-item">
                      <span className="totals-item-label">Total Filtered Sales</span>
                      <span className="totals-item-val" style={{ color: 'var(--color-primary)' }}>
                        {CURRENCY}{ordersData.totals.totalSales.toFixed(2)}
                      </span>
                    </div>
                    <div className="totals-item">
                      <span className="totals-item-label">Average Order Value</span>
                      <span className="totals-item-val">
                        {CURRENCY}{ordersData.totals.averageOrderValue.toFixed(2)}
                      </span>
                    </div>
                    <div className="totals-item">
                      <span className="totals-item-label">Cash Breakdown</span>
                      <span className="totals-item-val">
                        {CURRENCY}{(ordersData.totals.paymentTotals?.cash || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="totals-item">
                      <span className="totals-item-label">Card & Mobile</span>
                      <span className="totals-item-val">
                        {CURRENCY}{((ordersData.totals.paymentTotals?.card || 0) + (ordersData.totals.paymentTotals?.mobile || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Orders Data Table */}
                <div className="card">
                  <div className="card-body" style={{ padding: 0 }}>
                    {ordersData.orders.length === 0 ? (
                      <div className="empty-state">
                        <Receipt className="empty-icon" />
                        <span className="empty-title">
                          {orderTerminalFilter !== 'ALL'
                            ? `No orders for ${terminalsList.find(t => t.deviceId === orderTerminalFilter)?.model || 'selected terminal'}`
                            : 'No orders match filter'}
                        </span>
                        <span className="empty-description">
                          {orderTerminalFilter !== 'ALL'
                            ? 'This mobile terminal has not processed or synced any sales transactions yet.'
                            : 'Adjust your date range or clear search criteria to view past transactions.'}
                        </span>
                      </div>
                    ) : (
                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Order ID</th>
                              <th>Local Time (Addis)</th>
                              <th>Customer</th>
                              <th>Terminal</th>
                              <th>Payment</th>
                              <th className="numeric">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ordersData.orders.map((o) => (
                              <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedReceipt(o)}>
                                <td style={{ fontWeight: 600 }}>#{o.id}</td>
                                <td>{formatDateTimeAddis(o.createdAt)}</td>
                                <td>{o.customerName || 'Walk-in'}</td>
                                <td>
                                  <span className="badge badge-neutral">{o.phoneModel || 'Terminal'}</span>
                                </td>
                                <td>
                                  <span className="badge badge-neutral">{o.paymentMethod || 'Cash'}</span>
                                </td>
                                <td className="numeric" style={{ fontWeight: 600 }}>
                                  {CURRENCY}{Number(o.total || 0).toFixed(2)}
                                </td>
                              </tr>
                            ))
                          }
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Pagination Footer */}
                  {ordersData.totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Showing page {ordersData.page} of {ordersData.totalPages} ({ordersData.total} total orders)
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={ordersPage <= 1}
                          onClick={() => setOrdersPage(p => Math.max(1, p - 1))}
                        >
                          <ChevronLeft size={14} /> Previous
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={ordersPage >= ordersData.totalPages}
                          onClick={() => setOrdersPage(p => Math.min(ordersData.totalPages, p + 1))}
                        >
                          Next <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB 3: MOBILE TERMINALS (SCALE CONTROL & AUDIT LOGS)
               ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'terminals' && (
              <>
                <div className="page-header">
                  <div className="page-header-text">
                    <h1 className="page-title">Mobile Terminals</h1>
                    <p className="page-description">
                      Manage hundreds of POS devices, enforce remote blocking, unlink hardware IDs, and inspect audit logs.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-secondary" onClick={() => setShowPairingGuide(!showPairingGuide)}>
                      <Info size={15} style={{ marginRight: '6px' }} />
                      Connection Guide
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowLicenseModal(true)}>
                      <Plus size={15} style={{ marginRight: '6px' }} />
                      Generate License
                    </button>
                  </div>
                </div>

                {/* Collapsible Connection Guide */}
                {showPairingGuide && (
                  <div className="card" style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--border-color)', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                        Terminal Connection Guide
                      </span>
                      <button className="btn btn-secondary btn-sm" onClick={() => setShowPairingGuide(false)}>
                        <X size={14} />
                      </button>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                      Connect the Android POS or iOS phone to the same Wi-Fi network as this BakerAdmin server. Enter the Server URL below in the mobile app during first-time launch:
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '420px' }}>
                      <input
                        type="text"
                        className="form-input"
                        readOnly
                        value="http://192.168.0.116:5000"
                        style={{ flex: 1, fontFamily: 'monospace', fontWeight: 600 }}
                      />
                      <button className="btn btn-secondary" onClick={copyServerUrl}>
                        <Copy size={14} style={{ marginRight: '4px' }} />
                        {copiedUrl ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Status Counters */}
                <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                  <div className="stat-card">
                    <span className="stat-label">Active Terminals</span>
                    <span className="stat-value">{activeTerminalsCount}</span>
                    <span className="stat-subtext">Operating normally</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Online Now</span>
                    <span className="stat-value">{onlineTerminalsCount}</span>
                    <span className="stat-subtext">Heartbeat received</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Pending Approval</span>
                    <span className="stat-value" style={{ color: pendingTerminalsCount > 0 ? 'var(--color-warning)' : 'inherit' }}>
                      {pendingTerminalsCount}
                    </span>
                    <span className="stat-subtext">Awaiting admin verify</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Registered Licenses</span>
                    <span className="stat-value">{licensesList.length}</span>
                    <span className="stat-subtext">Active client keys</span>
                  </div>
                </div>

                {/* Bulk Actions Bar (Appears when terminals are selected) */}
                {selectedTerminalIds.length > 0 && (
                  <div className="bulk-toolbar">
                    <span>{selectedTerminalIds.length} terminal(s) selected</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openActionModal(null, 'activate', true)}
                      >
                        Activate Selected
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openActionModal(null, 'suspend', true)}
                      >
                        Suspend Selected
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
                        onClick={() => openActionModal(null, 'unlink', true)}
                      >
                        Unlink Selected
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedTerminalIds([])}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                {/* Search & Filter Controls */}
                <div className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', alignItems: 'center' }}>
                    <div>
                      <label className="form-label">Search Terminals</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ width: '100%' }}
                        placeholder="Hardware ID, model, shop..."
                        value={terminalSearch}
                        onChange={(e) => setTerminalSearch(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Status</label>
                      <select
                        className="form-select"
                        style={{ width: '100%' }}
                        value={terminalStatusFilter}
                        onChange={(e) => setTerminalStatusFilter(e.target.value)}
                      >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="pending">Pending Approval</option>
                        <option value="suspended">Suspended</option>
                        <option value="blocked">Blocked</option>
                        <option value="unlinked">Unlinked</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Connectivity</label>
                      <select
                        className="form-select"
                        style={{ width: '100%' }}
                        value={terminalOnlineFilter}
                        onChange={(e) => setTerminalOnlineFilter(e.target.value)}
                      >
                        <option value="all">All States</option>
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Terminals Table */}
                <div className="card">
                  <div className="card-body" style={{ padding: 0 }}>
                    {terminalsList.length === 0 ? (
                      <div className="empty-state">
                        <Smartphone className="empty-icon" />
                        <span className="empty-title">No terminals found</span>
                        <span className="empty-description">
                          Register a phone or expand filter criteria to view devices.
                        </span>
                      </div>
                    ) : (
                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th style={{ width: '36px' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedTerminalIds.length === terminalsList.length && terminalsList.length > 0}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedTerminalIds(terminalsList.map(t => t.deviceId));
                                    else setSelectedTerminalIds([]);
                                  }}
                                />
                              </th>
                              <th>Terminal Model</th>
                              <th>Hardware ID</th>
                              <th>Shop Client</th>
                              <th>Status</th>
                              <th>IP Address</th>
                              <th>Last Ping</th>
                              <th className="numeric">Orders</th>
                              <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {terminalsList.map((t) => {
                              const isSelected = selectedTerminalIds.includes(t.deviceId);
                              return (
                                <tr key={t.deviceId} style={{ backgroundColor: isSelected ? '#FEF3C720' : undefined }}>
                                  <td>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {
                                        setSelectedTerminalIds(prev =>
                                          prev.includes(t.deviceId)
                                            ? prev.filter(id => id !== t.deviceId)
                                            : [...prev, t.deviceId]
                                        );
                                      }}
                                    />
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.model}</span>
                                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        {t.platform || 'Android'} • v{t.appVersion || '1.0.8'}
                                      </span>
                                    </div>
                                  </td>
                                  <td>
                                    <span style={{ fontFamily: 'monospace', fontSize: '11px', padding: '2px 6px', backgroundColor: 'var(--bg-subtle)', borderRadius: '4px' }}>
                                      {t.deviceId}
                                    </span>
                                  </td>
                                  <td>{t.shopName}</td>
                                  <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                      <span className={`badge badge-${t.status}`}>
                                        {t.status.toUpperCase()}
                                      </span>
                                      {t.hasPendingCommand && (
                                        <span className="badge badge-pending-delivery">
                                          PENDING DELIVERY
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td>{t.lastIp || 'unknown'}</td>
                                  <td>{formatDateTimeAddis(t.lastPing)}</td>
                                  <td className="numeric" style={{ fontWeight: 600 }}>{t.orderCount || 0}</td>
                                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                      <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => handleInspectTerminal(t.deviceId)}
                                        title="View device audit trail and sync history"
                                      >
                                        Details
                                      </button>

                                      {t.status === 'active' && (
                                        <button
                                          className="btn btn-secondary btn-sm"
                                          onClick={() => openActionModal(t, 'suspend')}
                                        >
                                          Suspend
                                        </button>
                                      )}

                                      {(t.status === 'suspended' || t.status === 'pending' || t.status === 'blocked') && (
                                        <button
                                          className="btn btn-primary btn-sm"
                                          onClick={() => openActionModal(t, 'activate')}
                                        >
                                          Activate
                                        </button>
                                      )}

                                      {t.status !== 'blocked' && (
                                        <button
                                          className="btn btn-secondary btn-sm"
                                          style={{ color: '#DC2626' }}
                                          onClick={() => openActionModal(t, 'block')}
                                        >
                                          Block
                                        </button>
                                      )}

                                      <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => openActionModal(t, 'unlink')}
                                      >
                                        Unlink
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB 4: SHOPS & CLIENTS (MULTI-SHOP MANAGEMENT)
               ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'shops' && (
              <>
                <div className="page-header">
                  <div className="page-header-text">
                    <h1 className="page-title">Shops and Clients</h1>
                    <p className="page-description">
                      Manage client shops, configure billing expiry dates, and execute emergency shop-wide terminal suspension.
                    </p>
                  </div>
                  <button className="btn btn-primary" onClick={() => setShowAddShopModal(true)}>
                    <Plus size={15} style={{ marginRight: '6px' }} />
                    Add Client Shop
                  </button>
                </div>

                <div className="card">
                  <div className="card-body" style={{ padding: 0 }}>
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Shop Name</th>
                            <th>Contact / Location</th>
                            <th>Plan</th>
                            <th>Paid Until</th>
                            <th>Billing Status</th>
                            <th className="numeric">Terminals</th>
                            <th className="numeric">Licenses</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shopsList.length === 0 ? (
                            <tr>
                              <td colSpan={8} style={{ textAlign: 'center', padding: '48px 16px' }}>
                                <div className="empty-state">
                                  <Store className="empty-icon" />
                                  <span className="empty-title">No client shops registered</span>
                                  <span className="empty-description">Click "Add Client Shop" above to onboard your first bakery client.</span>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            shopsList.map(shop => {
                            const isPaidPast = shop.isPastDue;
                            const isDueNear = shop.isDueSoon;
                            return (
                              <tr key={shop.id}>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{shop.name}</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {shop.id}</span>
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', fontSize: '12px' }}>
                                    <span>{shop.contactPhone || 'No phone'}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>{shop.address || 'Addis Ababa'}</span>
                                  </div>
                                </td>
                                <td>
                                  <span className="badge badge-neutral">{shop.plan.toUpperCase()}</span>
                                </td>
                                <td>
                                  <span>{formatDateOnlyAddis(shop.paidUntil)}</span>
                                </td>
                                <td>
                                  {isPaidPast ? (
                                    <span className="badge badge-past-due">PAST DUE ({shop.daysUntilDue}d)</span>
                                  ) : isDueNear ? (
                                    <span className="badge badge-due-soon">DUE IN {shop.daysUntilDue}d</span>
                                  ) : (
                                    <span className="badge badge-active">CURRENT</span>
                                  )}
                                </td>
                                <td className="numeric" style={{ fontWeight: 600 }}>
                                  {shop.activeTerminalsCount} / {shop.terminalsCount}
                                </td>
                                <td className="numeric">{shop.licensesCount}</td>
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => setEditBillingShop(shop)}
                                    >
                                      Edit Billing
                                    </button>
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      style={{ color: '#DC2626' }}
                                      onClick={() => handleSuspendAllShopTerminals(shop)}
                                    >
                                      Suspend All
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB 5: STOCK & INGREDIENTS
               ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'inventory' && (
              <>
                <div className="page-header">
                  <div className="page-header-text">
                    <h1 className="page-title">Stock and Ingredients</h1>
                    <p className="page-description">Raw baking ingredients, current inventory levels, and unit costs.</p>
                  </div>
                  <div style={{ position: 'relative', width: '260px' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ width: '100%', paddingLeft: '30px' }}
                      placeholder="Search inventory..."
                      value={invSearch}
                      onChange={(e) => setInvSearch(e.target.value)}
                    />
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                  </div>
                </div>

                <div className="card">
                  <div className="card-body" style={{ padding: 0 }}>
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Ingredient</th>
                            <th>Category</th>
                            <th className="numeric">Stock Level</th>
                            <th className="numeric">Min Stock</th>
                            <th className="numeric">Unit Cost</th>
                            <th className="numeric">Valuation</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(serverStats?.inventory || []).filter(i => (i.name || '').toLowerCase().includes(invSearch.toLowerCase())).length === 0 ? (
                            <tr>
                              <td colSpan={7} style={{ textAlign: 'center', padding: '48px 16px' }}>
                                <div className="empty-state">
                                  <Package className="empty-icon" />
                                  <span className="empty-title">No inventory ingredients tracked</span>
                                  <span className="empty-description">Add raw ingredients to monitor stock levels and valuations.</span>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            (serverStats?.inventory || [])
                              .filter(i => (i.name || '').toLowerCase().includes(invSearch.toLowerCase()))
                              .map((item) => {
                              const isLow = Number(item.stock || 0) <= Number(item.minStock || 0);
                              return (
                                <tr key={item.id}>
                                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                                  <td><span className="badge badge-neutral">{item.category}</span></td>
                                  <td className="numeric" style={{ fontWeight: 600 }}>{item.stock} {item.unit}</td>
                                  <td className="numeric">{item.minStock} {item.unit}</td>
                                  <td className="numeric">{CURRENCY}{Number(item.costPerUnit || 0).toFixed(2)}</td>
                                  <td className="numeric" style={{ fontWeight: 600 }}>
                                    {CURRENCY}{(Number(item.stock || 0) * Number(item.costPerUnit || 0)).toFixed(2)}
                                  </td>
                                  <td>
                                    <span className={`badge ${isLow ? 'badge-danger' : 'badge-active'}`}>
                                      {isLow ? 'LOW STOCK' : 'IN STOCK'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB 6: MENU AND ITEMS
               ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'menu' && (
              <>
                <div className="page-header">
                  <div className="page-header-text">
                    <h1 className="page-title">Menu and Items</h1>
                    <p className="page-description">Product catalog, prepared items, and sales pricing in ETB.</p>
                  </div>
                  <div style={{ position: 'relative', width: '260px' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ width: '100%', paddingLeft: '30px' }}
                      placeholder="Search menu..."
                      value={menuSearch}
                      onChange={(e) => setMenuSearch(e.target.value)}
                    />
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                  </div>
                </div>

                <div className="card">
                  <div className="card-body" style={{ padding: 0 }}>
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th className="numeric">Selling Price</th>
                            <th className="numeric">Cost</th>
                            <th className="numeric">Units Sold</th>
                            <th>Availability</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(serverStats?.products || []).filter(p => (p.name || '').toLowerCase().includes(menuSearch.toLowerCase())).length === 0 ? (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', padding: '48px 16px' }}>
                                <div className="empty-state">
                                  <UtensilsCrossed className="empty-icon" />
                                  <span className="empty-title">No menu items registered</span>
                                  <span className="empty-description">Add catalog products to start selling on mobile POS terminals.</span>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            (serverStats?.products || [])
                              .filter(p => (p.name || '').toLowerCase().includes(menuSearch.toLowerCase()))
                              .map((p) => (
                              <tr key={p.id}>
                                <td style={{ fontWeight: 600 }}>{p.name}</td>
                                <td><span className="badge badge-neutral">{p.category}</span></td>
                                <td className="numeric" style={{ fontWeight: 600 }}>
                                  {CURRENCY}{Number(p.price || 0).toFixed(2)}
                                </td>
                                <td className="numeric">
                                  {CURRENCY}{Number(p.cost || 0).toFixed(2)}
                                </td>
                                <td className="numeric" style={{ fontWeight: 600 }}>{p.soldCount || 0}</td>
                                <td>
                                  <span className="badge badge-active">AVAILABLE</span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB 7: DISASTER RECOVERY & BACKUPS
               ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'backup' && (
              <>
                <div className="page-header">
                  <div className="page-header-text">
                    <h1 className="page-title">Backups and Disaster Recovery</h1>
                    <p className="page-description">
                      Download full database snapshots, export order CSVs, or restore backups from synced mobile terminals.
                    </p>
                  </div>
                </div>

                {/* Live Synced Mobile Data in Cloud Backup */}
                <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <DatabaseBackup size={18} color="var(--color-primary)" />
                        Synced Mobile Data in Cloud Backup
                      </h3>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
                        All mobile terminal orders, inventory updates, and cashier records stream into this database snapshot in real-time.
                      </p>
                    </div>
                    <span className="badge badge-success">
                      Cloud Sync Active
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                    <div style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Synced Orders</span>
                      <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {serverStats?.allTime?.ordersCount || ordersData.total || 0}
                      </span>
                    </div>

                    <div style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Total Revenue</span>
                      <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>
                        {CURRENCY}{(serverStats?.allTime?.revenue || 0).toFixed(2)}
                      </span>
                    </div>

                    <div style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Connected Terminals</span>
                      <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {terminalsData.total || terminalsList.length}
                      </span>
                    </div>

                    <div style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Catalog Products</span>
                      <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {serverStats?.products?.length || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Data Backup Exports */}
                <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 8px 0' }}>Data Backup Exports</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
                    Download a full JSON database snapshot or an Excel-compatible CSV of all orders synced from your mobile terminals.
                  </p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleDownloadBackup('json')}
                      disabled={isExportingBackup}
                    >
                      <Download size={15} style={{ marginRight: '6px' }} />
                      {isExportingBackup ? 'Downloading...' : 'Download Full Backup (JSON)'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleDownloadBackup('csv')}
                      disabled={isExportingBackup}
                    >
                      <Download size={15} style={{ marginRight: '6px' }} />
                      {isExportingBackup ? 'Exporting...' : 'Export All Orders (CSV)'}
                    </button>
                  </div>
                </div>

                {/* Upload & Restore Backup Card */}
                <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <History size={16} color="var(--color-primary)" />
                    Restore / Upload Database from JSON Backup
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
                    Upload a previously exported JSON backup to restore orders, products, licenses, and terminal registrations. A safety snapshot of your current data is automatically created before applying.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="file"
                        accept=".json,application/json"
                        id="backup-file-input"
                        style={{ display: 'none' }}
                        onChange={handleSelectRestoreFile}
                      />
                      <label htmlFor="backup-file-input" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                        <Plus size={15} style={{ marginRight: '6px' }} />
                        {restoreFile ? 'Choose Different JSON File' : 'Select JSON Backup File'}
                      </label>

                      {restorePreview && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleExecuteRestore}
                          disabled={isRestoring}
                        >
                          <Check size={15} style={{ marginRight: '6px' }} />
                          {isRestoring ? 'Restoring Database...' : 'Confirm & Restore Database'}
                        </button>
                      )}
                    </div>

                    {restorePreview && (
                      <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                          Selected File: {restorePreview.name} ({restorePreview.sizeKb} KB)
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Verified Contents: <strong>{restorePreview.ordersCount}</strong> synced orders, <strong>{restorePreview.productsCount}</strong> catalog products, <strong>{restorePreview.devicesCount}</strong> terminal devices, <strong>{restorePreview.shopsCount}</strong> client shops.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Restoring a Replaced Terminal Guide */}
                <div className="card" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 8px 0' }}>Restoring a Replaced Terminal</h3>
                  <ol style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '20px', lineHeight: 1.8, margin: 0 }}>
                    <li>In <strong>Mobile Terminals</strong>, click <strong>Unlink</strong> on the old hardware record to release the license.</li>
                    <li>Install the Bakery POS mobile app on the replacement phone.</li>
                    <li>Enter the company server Wi-Fi IP and the client shop License Key.</li>
                    <li>Click <strong>Approve Terminal</strong> in BakerAdmin. The phone pulls down its complete order history automatically in batches.</li>
                  </ol>
                </div>
              </>
            )}

          </div>
        </main>
      </div>

      {/* ─── TERMINAL ACTION CONFIRMATION MODAL ─── */}
      {actionModal.isOpen && (() => {
        const isBulk = actionModal.isBulk;
        const terminal = actionModal.terminal;
        const action = actionModal.action || 'activate';

        const actionConfig = {
          activate: {
            title: 'Confirm Terminal Activation',
            badgeText: 'Activate & Authorize',
            icon: CheckCircle2,
            iconColor: '#16a34a',
            iconBg: '#ecfdf5',
            iconBorder: '#bbf7d0',
            btnClass: 'btn-success',
            btnLabel: 'Confirm Activation',
            targetStatus: 'ACTIVE',
            targetBadgeClass: 'badge-success',
            noticeText: 'This will authorize the terminal to connect, record sales, issue receipts, and sync offline transactions.',
            noticeBg: '#f0fdf4',
            noticeBorder: '#bbf7d0',
            noticeColor: '#15803d',
            presets: [
              'Hardware verified & authorized for store operations',
              'Payment verified, re-activated by administrator',
              'Authorized replacement device / approved'
            ]
          },
          suspend: {
            title: 'Confirm Terminal Suspension',
            badgeText: 'Administrative Hold',
            icon: PauseCircle,
            iconColor: '#d97706',
            iconBg: '#fffbeb',
            iconBorder: '#fde68a',
            btnClass: 'btn-warning',
            btnLabel: 'Confirm Suspension',
            targetStatus: 'SUSPENDED',
            targetBadgeClass: 'badge-warning',
            noticeText: 'The terminal will be placed on hold. The cashier will be prompted to contact management and sync will be blocked.',
            noticeBg: '#fffbeb',
            noticeBorder: '#fde68a',
            noticeColor: '#b45309',
            presets: [
              'Payment overdue or subscription hold',
              'Temporary administrative hold for stock audit',
              'Shift ended / terminal inactive'
            ]
          },
          block: {
            title: 'Confirm Remote Device Block',
            badgeText: 'Security Lockout',
            icon: ShieldAlert,
            iconColor: '#dc2626',
            iconBg: '#fef2f2',
            iconBorder: '#fecaca',
            btnClass: 'btn-destructive',
            btnLabel: 'Confirm Remote Block',
            targetStatus: 'BLOCKED',
            targetBadgeClass: 'badge-danger',
            noticeText: 'Emergency lockout: This hardware will be immediately disconnected and blocked from communicating with BakerAdmin.',
            noticeBg: '#fef2f2',
            noticeBorder: '#fecaca',
            noticeColor: '#b91c1c',
            presets: [
              'Security policy violation or unauthorized device',
              'Reported lost or stolen device',
              'Suspicious activity detected'
            ]
          },
          unlink: {
            title: 'Confirm Terminal Hardware Unlink',
            badgeText: 'Hardware Unlink',
            icon: Unlink,
            iconColor: '#dc2626',
            iconBg: '#fff1f2',
            iconBorder: '#fecdd3',
            btnClass: 'btn-destructive',
            btnLabel: 'Confirm Unlink',
            targetStatus: 'UNLINKED',
            targetBadgeClass: 'badge-neutral',
            noticeText: 'This will sever the hardware ID binding from the client shop license, allowing a replacement device to pair.',
            noticeBg: '#fff1f2',
            noticeBorder: '#fecdd3',
            noticeColor: '#9f1239',
            presets: [
              'Device hardware replacement / unlinked from license',
              'Old phone decommissioned / retired',
              'Reassigning license to new hardware'
            ]
          }
        };

        const config = actionConfig[action] || {
          title: `Confirm ${action}`,
          badgeText: action,
          icon: Shield,
          iconColor: '#d97706',
          iconBg: '#fffbeb',
          iconBorder: '#fde68a',
          btnClass: 'btn-primary',
          btnLabel: `Confirm ${action}`,
          targetStatus: (action || '').toUpperCase(),
          targetBadgeClass: 'badge-neutral',
          noticeText: `Are you sure you want to execute ${action} on this terminal?`,
          noticeBg: '#f8fafc',
          noticeBorder: '#e2e8f0',
          noticeColor: '#475569',
          presets: []
        };

        const ActionIcon = config.icon;

        return (
          <div
            className="modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setActionModal(prev => ({ ...prev, isOpen: false }));
              }
            }}
          >
            <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: config.iconBg,
                      border: `1px solid ${config.iconBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <ActionIcon size={22} color={config.iconColor} />
                  </div>
                  <div>
                    <h2 className="modal-title">{isBulk ? `Confirm Bulk ${action}` : config.title}</h2>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Terminal Access & Policy Enforcement
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
                  style={{ width: '28px', height: '28px', padding: 0 }}
                  title="Close"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Terminal Summary Card */}
              <div
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                  marginBottom: '16px'
                }}
              >
                {isBulk ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Target Terminals ({selectedTerminalIds.length} selected)
                      </span>
                      <span className={`badge ${config.targetBadgeClass}`}>
                        ➔ {config.targetStatus}
                      </span>
                    </div>
                    <div style={{ maxHeight: '80px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedTerminalIds.map((id) => (
                        <code key={id} style={{ fontSize: '11px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '2px 6px', borderRadius: '4px' }}>
                          {id}
                        </code>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Smartphone size={16} color="var(--text-secondary)" />
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {terminal?.model || 'Mobile POS Client'}
                        </span>
                        {terminal?.shopName && (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            • {terminal.shopName}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`badge badge-${terminal?.status === 'active' ? 'success' : terminal?.status === 'pending' ? 'warning' : 'danger'}`}>
                          {(terminal?.status || 'UNKNOWN').toUpperCase()}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>➔</span>
                        <span className={`badge ${config.targetBadgeClass}`}>
                          {config.targetStatus}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Hardware ID:</span>
                      <code style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {terminal?.deviceId || 'N/A'}
                      </code>

                      <span style={{ color: 'var(--text-muted)' }}>Last IP & Seen:</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {terminal?.lastIp || 'unknown'} • {formatDateTimeAddis(terminal?.lastPing)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Policy Impact Notice */}
              <div
                style={{
                  backgroundColor: config.noticeBg,
                  border: `1px solid ${config.noticeBorder}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}
              >
                <Info size={15} color={config.noticeColor} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '12.5px', color: config.noticeColor, lineHeight: 1.4 }}>
                  {config.noticeText}
                </span>
              </div>

              {/* Audit Log Reason Input */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Shield size={13} color="var(--text-secondary)" />
                  <span>Audit Log Reason <span style={{ color: 'var(--color-danger)' }}>*</span></span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>(Required for compliance)</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%' }}
                  placeholder="Enter administrative reason for compliance audit log..."
                  value={actionModal.reason}
                  onChange={(e) => setActionModal(prev => ({ ...prev, reason: e.target.value }))}
                  required
                  autoFocus
                />

                {/* Quick Presets */}
                {config.presets.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Quick Reason Presets:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {config.presets.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`reason-chip ${actionModal.reason === preset ? 'active' : ''}`}
                          onClick={() => setActionModal(prev => ({ ...prev, reason: preset }))}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="modal-actions" style={{ margin: 0, paddingTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`btn ${config.btnClass}`}
                  onClick={handleExecuteAction}
                  disabled={!actionModal.reason.trim()}
                >
                  <ActionIcon size={15} style={{ marginRight: '4px' }} />
                  {config.btnLabel}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── TERMINAL DETAILS INSPECTION DRAWER ─── */}
      {activeDetailTerminal && (
        <div className="drawer-overlay" onClick={() => setActiveDetailTerminal(null)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Terminal Details</h2>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{activeDetailTerminal.deviceId}</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveDetailTerminal(null)}>
                <X size={15} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <span className="form-label">Current Status</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <span className={`badge badge-${activeDetailTerminal.status}`}>
                    {activeDetailTerminal.status.toUpperCase()}
                  </span>
                  <span className={`badge ${activeDetailTerminal.isOnline ? 'badge-active' : 'badge-neutral'}`}>
                    {activeDetailTerminal.isOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span className="form-label">Model</span>
                  <p style={{ margin: '2px 0 0 0', fontSize: '13px', fontWeight: 600 }}>{activeDetailTerminal.model}</p>
                </div>
                <div>
                  <span className="form-label">OS & App Version</span>
                  <p style={{ margin: '2px 0 0 0', fontSize: '13px' }}>
                    {activeDetailTerminal.osVersion || 'Android'} (v{activeDetailTerminal.appVersion || '1.0.8'})
                  </p>
                </div>
                <div>
                  <span className="form-label">Assigned Shop</span>
                  <p style={{ margin: '2px 0 0 0', fontSize: '13px', fontWeight: 600 }}>{activeDetailTerminal.shop?.name || activeDetailTerminal.shopName}</p>
                </div>
                <div>
                  <span className="form-label">License Key</span>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', fontFamily: 'monospace' }}>{activeDetailTerminal.licenseKey}</p>
                </div>
              </div>

              <div>
                <span className="form-label">Last Ping Time</span>
                <p style={{ margin: '2px 0 0 0', fontSize: '13px' }}>{formatDateTimeAddis(activeDetailTerminal.lastPing)}</p>
              </div>

              <div>
                <span className="form-label">Total Synced Sales</span>
                <p style={{ margin: '2px 0 0 0', fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {CURRENCY}{Number(activeDetailTerminal.totalRevenue || 0).toFixed(2)} ({activeDetailTerminal.orderCount || 0} orders)
                </p>
              </div>

              <hr style={{ margin: 0, borderColor: 'var(--border-color)', borderStyle: 'solid', borderWidth: '1px 0 0 0' }} />

              {/* Audit Trail for this device */}
              <div>
                <span className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                  Security & Administrative Audit Trail ({activeDetailTerminal.auditTrail?.length || 0})
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {(activeDetailTerminal.auditTrail || []).map((log, i) => (
                    <div key={i} style={{ padding: '8px 10px', backgroundColor: 'var(--bg-subtle)', borderRadius: '6px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.action}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{formatTimeOnlyAddis(log.timestamp)}</span>
                      </div>
                      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{log.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Last 20 Sync Events */}
              <div>
                <span className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                  Sync History ({activeDetailTerminal.syncEvents?.length || 0})
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                  {(activeDetailTerminal.syncEvents || []).map((ev, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>
                      <span>Synced {ev.ordersCount} orders ({ev.addedCount} new)</span>
                      <span style={{ color: 'var(--text-muted)' }}>{formatTimeOnlyAddis(ev.timestamp)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD CLIENT SHOP MODAL ─── */}
      {showAddShopModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddShopModal(false);
          }}
        >
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h2 className="modal-title" style={{ margin: 0 }}>
                <Store size={18} color="var(--color-primary)" />
                Register New Shop Client
              </h2>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAddShopModal(false)}
                style={{ width: '28px', height: '28px', padding: 0 }}
                title="Close"
              >
                <X size={15} />
              </button>
            </div>
            <p className="modal-description">Add a business shop to manage multi-terminal licensing.</p>

            <form onSubmit={handleCreateShop}>
              <div style={{ marginBottom: '12px' }}>
                <label className="form-label">Shop Business Name</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Bole Branch, Sarbet Bakery"
                  value={newShopForm.name}
                  onChange={(e) => setNewShopForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label">Contact Phone</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '100%' }}
                    placeholder="+251 911 000 000"
                    value={newShopForm.contactPhone}
                    onChange={(e) => setNewShopForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Subscription Plan</label>
                  <select
                    className="form-select"
                    style={{ width: '100%' }}
                    value={newShopForm.plan}
                    onChange={(e) => setNewShopForm(prev => ({ ...prev, plan: e.target.value }))}
                  >
                    <option value="starter">Starter (1-2 Terminals)</option>
                    <option value="standard">Standard (up to 5 Terminals)</option>
                    <option value="enterprise">Enterprise (Unlimited)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div>
                  <label className="form-label">Paid Until Date</label>
                  <input
                    type="date"
                    className="form-input"
                    style={{ width: '100%' }}
                    value={newShopForm.paidUntil}
                    onChange={(e) => setNewShopForm(prev => ({ ...prev, paidUntil: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Grace Period (Days)</label>
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: '100%' }}
                    value={newShopForm.gracePeriodDays}
                    onChange={(e) => setNewShopForm(prev => ({ ...prev, gracePeriodDays: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ margin: 0, paddingTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddShopModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Shop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT BILLING MODAL ─── */}
      {editBillingShop && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditBillingShop(null);
          }}
        >
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h2 className="modal-title" style={{ margin: 0 }}>
                <SlidersHorizontal size={18} color="var(--color-primary)" />
                Edit Billing Configuration
              </h2>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setEditBillingShop(null)}
                style={{ width: '28px', height: '28px', padding: 0 }}
                title="Close"
              >
                <X size={15} />
              </button>
            </div>
            <p className="modal-description">Update subscription plan and paid-until date for {editBillingShop.name}.</p>

            <form onSubmit={handleUpdateBilling}>
              <div style={{ marginBottom: '12px' }}>
                <label className="form-label">Paid Until Date</label>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: '100%' }}
                  value={(editBillingShop.paidUntil || '').split('T')[0]}
                  onChange={(e) => setEditBillingShop(prev => ({ ...prev, paidUntil: e.target.value }))}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="form-label">Subscription Plan</label>
                <select
                  className="form-select"
                  style={{ width: '100%' }}
                  value={editBillingShop.plan}
                  onChange={(e) => setEditBillingShop(prev => ({ ...prev, plan: e.target.value }))}
                >
                  <option value="starter">Starter</option>
                  <option value="standard">Standard</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editBillingShop.autoSuspend}
                    onChange={(e) => setEditBillingShop(prev => ({ ...prev, autoSuspend: e.target.checked }))}
                  />
                  <span>Auto-suspend terminals if unpaid past grace period</span>
                </label>
              </div>

              <div className="modal-actions" style={{ margin: 0, paddingTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditBillingShop(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Billing Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── GENERATE LICENSE MODAL ─── */}
      {showLicenseModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLicenseModal(false);
          }}
        >
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h2 className="modal-title" style={{ margin: 0 }}>
                <Plus size={18} color="var(--color-primary)" />
                Issue Terminal Client License
              </h2>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowLicenseModal(false)}
                style={{ width: '28px', height: '28px', padding: 0 }}
                title="Close"
              >
                <X size={15} />
              </button>
            </div>
            <p className="modal-description">Generate a new activation license key assigned to a bakery shop branch.</p>

            <form onSubmit={handleCreateLicense}>
              <div style={{ marginBottom: '12px' }}>
                <label className="form-label">Client Shop</label>
                <select
                  className="form-select"
                  style={{ width: '100%' }}
                  value={newLicShopId}
                  onChange={(e) => setNewLicShopId(e.target.value)}
                  required
                >
                  <option value="">Select shop to assign license...</option>
                  {shops.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.plan || 'standard'})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="form-label">Custom License Key (Leave empty to auto-generate)</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', fontFamily: 'monospace' }}
                  placeholder="e.g. ARADA-STORE-001 (Optional)"
                  value={newLicKey}
                  onChange={(e) => setNewLicKey(e.target.value.toUpperCase())}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Max Allowed Devices</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="form-input"
                  style={{ width: '100%' }}
                  value={newLicMaxDevices}
                  onChange={(e) => setNewLicMaxDevices(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions" style={{ margin: 0, paddingTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowLicenseModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={15} style={{ marginRight: '4px' }} />
                  Issue License
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── RECEIPT DETAIL MODAL ─── */}
      {selectedReceipt && (
        <div className="modal-backdrop" onClick={() => setSelectedReceipt(null)}>
          <div className="modal-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 className="modal-title" style={{ margin: 0 }}>Order #{selectedReceipt.id}</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedReceipt(null)}>
                <X size={14} />
              </button>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.6 }}>
              <p style={{ margin: 0 }}><strong>Local Time:</strong> {formatDateTimeAddis(selectedReceipt.createdAt)}</p>
              <p style={{ margin: 0 }}><strong>Customer:</strong> {selectedReceipt.customerName || 'Walk-in'}</p>
              <p style={{ margin: 0 }}><strong>Terminal:</strong> {selectedReceipt.phoneModel} ({selectedReceipt.deviceId})</p>
              <p style={{ margin: 0 }}><strong>Payment Method:</strong> {selectedReceipt.paymentMethod || 'Cash'}</p>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '10px 0', marginBottom: '12px' }}>
              {Array.isArray(selectedReceipt.items) && selectedReceipt.items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0' }}>
                  <span>{it.name} x{it.quantity}</span>
                  <span style={{ fontWeight: 600 }}>{CURRENCY}{(Number(it.price || 0) * Number(it.quantity || 1)).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              <span>Total</span>
              <span>{CURRENCY}{Number(selectedReceipt.total || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── TOAST NOTIFICATION CONTAINER ─── */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
