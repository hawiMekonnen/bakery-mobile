import React, { createContext, useContext, useReducer, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushSyncData, isAutoSyncEnabled, getServerUrl } from '../services/syncService';
import {
  getCloudConfig,
  getDeviceInfo,
  registerWithCloud,
  requestApprovalFromCloud,
  checkApprovalStatus,
  sendCloudHeartbeat,
  pushCloudSync,
} from '../services/cloudSyncService';
import DeviceLockoutModal from '../components/DeviceLockoutModal';

// Permanent master storage key
const STORAGE_KEY = '@bakery_master_production_v1';
// Dedicated permanent orders vault (dual-layer protection so orders are NEVER lost)
const ORDERS_VAULT_KEY = '@bakery_permanent_orders_vault';

// Legacy keys to auto-recover any previous session orders
const LEGACY_STORAGE_KEYS = [
  '@bakery_live_production_store_v3',
  '@bakery_live_production_store_v2',
  '@bakery_storage_v4',
  '@bakery_storage_v3',
  '@bakery_storage_v2',
  '@bakery_storage_v1',
  '@bakery_store',
  '@bakery_state',
];

export const INITIAL_PRODUCTS = [];
export const INITIAL_INVENTORY = [];
export const INITIAL_ORDERS = [];

const DEFAULT_AUTH = {
  username: 'admin',
  password: '123Newadissadmin',
  businessName: 'My Bakery',
  brandColor: '#0F382C',
  role: 'Manager',
  isLoggedIn: false,
};

const INITIAL_NOTIFICATIONS = [];

const DEFAULT_SECURITY = {
  managerPin: '1234',
  requirePinForReset: true,
  requirePinForVoid: true,
  autoLockMinutes: 0,
};

const INITIAL_STATE = {
  products: INITIAL_PRODUCTS,
  inventory: INITIAL_INVENTORY,
  orders: INITIAL_ORDERS,
  stockHistory: [],
  notifications: INITIAL_NOTIFICATIONS,
  auth: DEFAULT_AUTH,
  security: DEFAULT_SECURITY,
  securityLogs: [
    {
      id: 'sec-init',
      event: 'SYSTEM_STARTUP',
      description: 'System security active with PIN protection and anti-tamper receipt hashing.',
      timestamp: new Date().toISOString(),
      user: 'admin',
    },
  ],
  lastActiveDate: new Date().toISOString().slice(0, 10),
};

// Addis Ababa UTC+3 Timestamp & Hour Window Calculator
export function getStockTimestampInfo(dateInput = new Date()) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const validD = isNaN(d.getTime()) ? new Date() : d;

  let timeStr = '';
  let dateStr = '';
  let hour = validD.getHours();
  let hourWindow = '';

  try {
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Addis_Ababa',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    timeStr = timeFormatter.format(validD);

    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Addis_Ababa',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    dateStr = dateFormatter.format(validD);

    const hourNumFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Addis_Ababa',
      hour: 'numeric',
      hour12: false,
    });
    const h24 = parseInt(hourNumFormatter.format(validD), 10);
    hour = isNaN(h24) ? validD.getHours() : h24;
  } catch (e) {
    const h = validD.getHours();
    const m = validD.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = (h % 12) || 12;
    const formattedM = m < 10 ? ('0' + m) : m;
    timeStr = h12 + ':' + formattedM + ' ' + ampm;
    dateStr = validD.toDateString();
    hour = h;
  }

  const startHour12 = (hour % 12) || 12;
  const startAmPm = hour < 12 ? 'AM' : 'PM';
  const endH24 = (hour + 1) % 24;
  const endHour12 = (endH24 % 12) || 12;
  const endAmPm = endH24 < 12 ? 'AM' : 'PM';
  hourWindow = `${startHour12}:00 ${startAmPm} - ${endHour12}:00 ${endAmPm}`;

  return {
    timestamp: validD.toISOString(),
    timeStr,
    dateStr,
    hour,
    hourWindow,
  };
}

// Safe async storage helper functions
async function safeGetItem(key) {
  try {
    return await AsyncStorage.getItem(key);
  } catch (e) {
    console.warn('[BakeryStore] safeGetItem error:', e);
    return null;
  }
}

async function safeSetItem(key, value) {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    console.warn('[BakeryStore] safeSetItem error:', e);
  }
}

// Dedicated Permanent Orders Vault Helpers
async function appendOrderToVault(newOrder) {
  try {
    const raw = await AsyncStorage.getItem(ORDERS_VAULT_KEY);
    let vault = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) vault = parsed;
      } catch (err) {}
    }
    // Prevent duplicate entries
    if (!vault.some(o => o.id === newOrder.id)) {
      vault = [newOrder, ...vault];
      await AsyncStorage.setItem(ORDERS_VAULT_KEY, JSON.stringify(vault));
    }
  } catch (e) {
    console.warn('[BakeryStore] appendOrderToVault error:', e);
  }
}

async function getVaultOrders() {
  try {
    const raw = await AsyncStorage.getItem(ORDERS_VAULT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function persistStateImmediate(newState) {
  safeSetItem(STORAGE_KEY, JSON.stringify(newState));
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...state, ...action.payload };

    case 'LOGIN': {
      const { username } = action.payload || {};
      const updated = {
        ...state,
        auth: {
          ...state.auth,
          isLoggedIn: true,
          currentUser: username || 'admin',
          lastLoginTime: new Date().toISOString(),
        },
      };
      // Persist login state while keeping all existing orders, products, and inventory intact!
      persistStateImmediate(updated);
      return updated;
    }

    case 'LOGOUT': {
      const updated = {
        ...state,
        auth: {
          ...state.auth,
          isLoggedIn: false,
        },
      };
      // CRITICAL: LOGOUT ONLY SETS isLoggedIn TO FALSE!
      // ALL ORDERS, PRODUCTS, INVENTORY AND USER SETTINGS REMAIN 100% PRESERVED IN STORAGE!
      persistStateImmediate(updated);
      return updated;
    }

    case 'UPDATE_MANAGER_PIN': {
      const updated = {
        ...state,
        security: {
          ...(state.security || DEFAULT_SECURITY),
          managerPin: String(action.payload),
        },
        securityLogs: [
          {
            id: `sec-${Date.now()}`,
            event: 'PIN_UPDATED',
            description: 'Manager security PIN was changed.',
            timestamp: new Date().toISOString(),
            user: state.auth?.username || 'admin',
          },
          ...(state.securityLogs || []),
        ].slice(0, 50),
      };
      persistStateImmediate(updated);
      return updated;
    }

    case 'ADD_SECURITY_LOG': {
      const newLog = {
        id: `sec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        ...action.payload,
      };
      const updated = {
        ...state,
        securityLogs: [newLog, ...(state.securityLogs || [])].slice(0, 50),
      };
      persistStateImmediate(updated);
      return updated;
    }

        case 'MARK_ORDERS_SYNCED': {
      const { syncedOrderIds = [] } = action.payload || {};
      const idSet = new Set(syncedOrderIds.map(String));
      const updatedOrders = (state.orders || []).map(o => {
        if (idSet.has(String(o.id))) {
          return { ...o, syncStatus: 'synced', syncedAt: new Date().toISOString() };
        }
        return o;
      });
      const updated = { ...state, orders: updatedOrders };
      persistStateImmediate(updated);
      return updated;
    }

    case 'UPDATE_CREDENTIALS': {
      const { newUsername, newPassword, businessName, brandColor } = action.payload;
      const updated = {
        ...state,
        auth: {
          ...state.auth,
          username: newUsername || state.auth.username,
          password: newPassword || state.auth.password,
          businessName: businessName || state.auth.businessName,
          brandColor: brandColor || state.auth.brandColor || '#0F382C',
        },
      };
      persistStateImmediate(updated);
      return updated;
    }

    case 'UPDATE_BRANDING': {
      const { businessName, brandColor } = action.payload || {};
      const updated = {
        ...state,
        auth: {
          ...state.auth,
          businessName: businessName !== undefined ? businessName : state.auth.businessName,
          brandColor: brandColor !== undefined ? brandColor : (state.auth.brandColor || '#0F382C'),
        },
      };
      persistStateImmediate(updated);
      return updated;
    }

    case 'ADD_ORDER': {
      const order = {
        ...action.payload,
        syncStatus: 'pending',
        account: state.auth?.username || 'admin',
        createdBy: state.auth?.username || 'admin',
      };

      const todayStr = new Date().toISOString().slice(0, 10);
      const isNewDay = state.lastActiveDate && state.lastActiveDate !== todayStr;
      
      const updatedProducts = state.products.map(p => {
        const matchingItem = order.items.find(i => i.id === p.id);
        const currentSold = isNewDay ? 0 : (p.soldCount || 0);
        if (matchingItem) {
          const newSoldCount = currentSold + (matchingItem.quantity || 1);
          const prep = typeof p.preparedCount === 'number' ? p.preparedCount : 30;
          return {
            ...p,
            soldCount: newSoldCount,
            remainingCount: Math.max(0, prep - newSoldCount),
          };
        }
        return isNewDay ? { ...p, soldCount: 0, remainingCount: typeof p.preparedCount === 'number' ? p.preparedCount : 30 } : p;
      });

      const updatedOrders = [order, ...state.orders];
      const updated = {
        ...state,
        orders: updatedOrders,
        products: updatedProducts,
      };

      // 1. Immediately persist full application state
      persistStateImmediate(updated);
      // 2. Immediately append to dedicated permanent orders vault
      appendOrderToVault(order);

      return updated;
    }

    
    // Items Sold & Prepared Stock Management
    case 'UPDATE_PRODUCT_PREPARED': {
      const { id, preparedCount } = action.payload;
      const count = Math.max(0, parseInt(preparedCount, 10) || 0);
      const updatedProducts = state.products.map(p => {
        if (p.id === id) {
          const sold = Number(p.soldCount) || 0;
          return {
            ...p,
            preparedCount: count,
            remainingCount: Math.max(0, count - sold),
          };
        }
        return p;
      });
      const updated = { ...state, products: updatedProducts };
      persistStateImmediate(updated);
      return updated;
    }

    case 'ADD_PRODUCT_BATCH': {
      const { id, amount } = action.payload;
      const addAmt = parseInt(amount, 10) || 0;
      const updatedProducts = state.products.map(p => {
        if (p.id === id) {
          const curPrep = typeof p.preparedCount === 'number' ? p.preparedCount : 30;
          const newPrep = curPrep + addAmt;
          const sold = Number(p.soldCount) || 0;
          return {
            ...p,
            preparedCount: newPrep,
            remainingCount: Math.max(0, newPrep - sold),
          };
        }
        return p;
      });
      const updated = { ...state, products: updatedProducts };
      persistStateImmediate(updated);
      return updated;
    }

    case 'BATCH_SET_ALL_PREPARED': {
      const { amount } = action.payload;
      const count = Math.max(0, parseInt(amount, 10) || 0);
      const updatedProducts = state.products.map(p => {
        const sold = Number(p.soldCount) || 0;
        return {
          ...p,
          preparedCount: count,
          remainingCount: Math.max(0, count - sold),
        };
      });
      const updated = { ...state, products: updatedProducts };
      persistStateImmediate(updated);
      return updated;
    }

    case 'RESET_DAILY_ITEMS_SOLD': {
      const { resetPrepared = false } = action.payload || {};
      const updatedProducts = state.products.map(p => {
        const prep = resetPrepared ? 0 : (typeof p.preparedCount === 'number' ? p.preparedCount : 30);
        return {
          ...p,
          soldCount: 0,
          preparedCount: prep,
          remainingCount: prep,
        };
      });
      const updated = { ...state, products: updatedProducts };
      persistStateImmediate(updated);
      return updated;
    }

    case 'RESET_ORDERS': {
      const updated = {
        ...state,
        orders: [],
        products: state.products.map(p => ({ ...p, soldCount: 0, preparedCount: 30, remainingCount: 30 })),
      };
      persistStateImmediate(updated);
      safeSetItem(ORDERS_VAULT_KEY, JSON.stringify([]));
      return updated;
    }

    // Notifications
    case 'ADD_NOTIFICATION': {
      const updated = {
        ...state,
        notifications: [action.payload, ...(state.notifications || [])].slice(0, 50),
      };
      persistStateImmediate(updated);
      return updated;
    }

    case 'MARK_ALL_NOTIFICATIONS_READ': {
      const updated = {
        ...state,
        notifications: (state.notifications || []).map(n => ({ ...n, read: true })),
      };
      persistStateImmediate(updated);
      return updated;
    }

    case 'CLEAR_NOTIFICATIONS': {
      const updated = {
        ...state,
        notifications: [],
      };
      persistStateImmediate(updated);
      return updated;
    }

    // Products (Add, Edit, Delete with Instant Phone Storage)
    case 'ADD_PRODUCT': {
      const newProduct = {
        ...action.payload,
        id: Date.now(),
        soldCount: 0,
        isCustom: true,
      };
      const updated = {
        ...state,
        products: [newProduct, ...state.products],
      };
      persistStateImmediate(updated);
      return updated;
    }

    case 'UPDATE_PRODUCT': {
      const updated = {
        ...state,
        products: state.products.map(p => (p.id === action.payload.id ? action.payload : p)),
      };
      persistStateImmediate(updated);
      return updated;
    }

    case 'DELETE_PRODUCT': {
      const updated = {
        ...state,
        products: state.products.filter(p => p.id !== action.payload),
      };
      persistStateImmediate(updated);
      return updated;
    }

    case 'TOGGLE_PRODUCT_AVAILABILITY': {
      const updated = {
        ...state,
        products: state.products.map(p =>
          p.id === action.payload ? { ...p, available: !p.available } : p
        ),
      };
      persistStateImmediate(updated);
      return updated;
    }

    // Inventory
    case 'ADD_INVENTORY': {
      const newItem = {
        ...action.payload,
        id: Date.now(),
        stock: Number(action.payload.stock) || 0,
        minStock: Number(action.payload.minStock) || 0,
        costPerUnit: Number(action.payload.costPerUnit) || 0,
      };

      const timeInfo = getStockTimestampInfo(new Date());
      const auditLog = {
        id: 'stk-log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        itemId: newItem.id,
        itemName: newItem.name,
        unit: newItem.unit || 'unit',
        action: 'ADD',
        actionLabel: 'Added New Ingredient',
        previousStock: 0,
        newStock: newItem.stock,
        changeDelta: newItem.stock,
        costPerUnit: newItem.costPerUnit,
        minStock: newItem.minStock,
        timestamp: timeInfo.timestamp,
        timeStr: timeInfo.timeStr,
        dateStr: timeInfo.dateStr,
        hour: timeInfo.hour,
        hourWindow: timeInfo.hourWindow,
        user: state.auth?.username || 'admin',
        note: action.payload.note || `Added ${newItem.stock} ${newItem.unit || 'units'} of ${newItem.name} to stock`,
      };
      const updatedHistory = [auditLog, ...(state.stockHistory || [])].slice(0, 1000);

      const updated = {
        ...state,
        inventory: [...state.inventory, newItem],
        stockHistory: updatedHistory,
      };
      persistStateImmediate(updated);
      return updated;
    }

    case 'UPDATE_INVENTORY': {
      const existing = (state.inventory || []).find(item => item.id === action.payload.id);
      const prevStock = existing ? (Number(existing.stock) || 0) : 0;
      const newStock = action.payload.stock !== undefined ? (Number(action.payload.stock) || 0) : prevStock;
      const delta = parseFloat((newStock - prevStock).toFixed(2));
      const timeInfo = getStockTimestampInfo(new Date());

      let actType = 'UPDATE';
      let actLabel = 'Material Details Edited';
      if (delta > 0) {
        actType = 'RESTOCK';
        actLabel = 'Stock Increased';
      } else if (delta < 0) {
        actType = 'USAGE';
        actLabel = 'Stock Reduced';
      }

      const auditLog = {
        id: 'stk-log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        itemId: action.payload.id,
        itemName: action.payload.name || (existing ? existing.name : 'Ingredient'),
        unit: action.payload.unit || (existing ? existing.unit : 'unit'),
        action: actType,
        actionLabel: actLabel,
        previousStock: prevStock,
        newStock: newStock,
        changeDelta: delta,
        costPerUnit: action.payload.costPerUnit !== undefined ? Number(action.payload.costPerUnit) : (existing ? existing.costPerUnit : 0),
        minStock: action.payload.minStock !== undefined ? Number(action.payload.minStock) : (existing ? existing.minStock : 0),
        timestamp: timeInfo.timestamp,
        timeStr: timeInfo.timeStr,
        dateStr: timeInfo.dateStr,
        hour: timeInfo.hour,
        hourWindow: timeInfo.hourWindow,
        user: state.auth?.username || 'admin',
        note: delta !== 0
          ? `Stock level changed from ${prevStock} to ${newStock} (${delta > 0 ? '+' : ''}${delta})`
          : `Ingredient specifications updated`,
      };
      const updatedHistory = [auditLog, ...(state.stockHistory || [])].slice(0, 1000);

      const updated = {
        ...state,
        inventory: (state.inventory || []).map(item =>
          item.id === action.payload.id ? { ...item, ...action.payload } : item
        ),
        stockHistory: updatedHistory,
      };
      persistStateImmediate(updated);
      return updated;
    }

    case 'ADJUST_STOCK': {
      const { id, mode, amount } = action.payload;
      const numAmount = parseFloat(amount) || 0;
      let alertNotif = null;
      let loggedEntry = null;

      const updatedInventory = (state.inventory || []).map(item => {
        if (item.id !== id) return item;
        let newStock = item.stock;
        if (mode === 'set') newStock = Math.max(0, numAmount);
        else if (mode === 'add') newStock = item.stock + numAmount;
        else if (mode === 'sub') newStock = Math.max(0, item.stock - numAmount);
        const finalStock = parseFloat(newStock.toFixed(2));
        const delta = parseFloat((finalStock - item.stock).toFixed(2));

        const timeInfo = getStockTimestampInfo(new Date());
        loggedEntry = {
          id: 'stk-log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          itemId: item.id,
          itemName: item.name,
          unit: item.unit,
          action: mode === 'add' ? 'RESTOCK' : mode === 'sub' ? 'USAGE' : 'ADJUST',
          actionLabel: mode === 'add' ? 'Stock Restocked' : mode === 'sub' ? 'Stock Deducted' : 'Stock Adjusted',
          previousStock: item.stock,
          newStock: finalStock,
          changeDelta: delta,
          costPerUnit: item.costPerUnit,
          minStock: item.minStock,
          timestamp: timeInfo.timestamp,
          timeStr: timeInfo.timeStr,
          dateStr: timeInfo.dateStr,
          hour: timeInfo.hour,
          hourWindow: timeInfo.hourWindow,
          user: state.auth?.username || 'admin',
          note: mode === 'add'
            ? `Restocked +${numAmount} ${item.unit} (${item.stock} ➔ ${finalStock})`
            : mode === 'sub'
            ? `Used/deducted -${numAmount} ${item.unit} (${item.stock} ➔ ${finalStock})`
            : `Set stock count to ${finalStock} ${item.unit} (was ${item.stock})`,
        };

        if (finalStock <= item.minStock) {
          alertNotif = {
            id: `notif-stock-${id}-${Date.now()}`,
            title: 'Low Stock Alert',
            message: `${item.name} is running low (${finalStock} ${item.unit} remaining).`,
            type: 'warning',
            timestamp: new Date().toISOString(),
            read: false,
          };
        }
        return { ...item, stock: finalStock };
      });

      const updatedHistory = loggedEntry
        ? [loggedEntry, ...(state.stockHistory || [])].slice(0, 1000)
        : (state.stockHistory || []);

      const updated = {
        ...state,
        inventory: updatedInventory,
        stockHistory: updatedHistory,
        notifications: alertNotif
          ? [alertNotif, ...(state.notifications || [])].slice(0, 50)
          : state.notifications,
      };
      persistStateImmediate(updated);
      return updated;
    }

    case 'DELETE_INVENTORY': {
      const deletedItem = (state.inventory || []).find(item => item.id === action.payload);
      let updatedHistory = state.stockHistory || [];
      if (deletedItem) {
        const timeInfo = getStockTimestampInfo(new Date());
        const auditLog = {
          id: 'stk-log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          itemId: deletedItem.id,
          itemName: deletedItem.name,
          unit: deletedItem.unit,
          action: 'DELETE',
          actionLabel: 'Ingredient Deleted',
          previousStock: deletedItem.stock,
          newStock: 0,
          changeDelta: -deletedItem.stock,
          costPerUnit: deletedItem.costPerUnit,
          minStock: deletedItem.minStock,
          timestamp: timeInfo.timestamp,
          timeStr: timeInfo.timeStr,
          dateStr: timeInfo.dateStr,
          hour: timeInfo.hour,
          hourWindow: timeInfo.hourWindow,
          user: state.auth?.username || 'admin',
          note: `Deleted ingredient "${deletedItem.name}" from inventory`,
        };
        updatedHistory = [auditLog, ...(state.stockHistory || [])].slice(0, 1000);
      }
      const updated = {
        ...state,
        inventory: (state.inventory || []).filter(item => item.id !== action.payload),
        stockHistory: updatedHistory,
      };
      persistStateImmediate(updated);
      return updated;
    }

    case 'LOG_STOCK_EVENT': {
      const timeInfo = getStockTimestampInfo(action.payload?.timestamp || new Date());
      const logItem = {
        id: 'stk-log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        timeStr: timeInfo.timeStr,
        dateStr: timeInfo.dateStr,
        hour: timeInfo.hour,
        hourWindow: timeInfo.hourWindow,
        timestamp: timeInfo.timestamp,
        user: state.auth?.username || 'admin',
        ...action.payload,
      };
      const updated = {
        ...state,
        stockHistory: [logItem, ...(state.stockHistory || [])].slice(0, 1000),
      };
      persistStateImmediate(updated);
      return updated;
    }

    case 'CLEAR_STOCK_HISTORY': {
      const updated = {
        ...state,
        stockHistory: [],
      };
      persistStateImmediate(updated);
      return updated;
    }

    case 'RESTORE_CLOUD_BACKUP': {
      const { orders, products, inventory, shopName, stockHistory } = action.payload;
      const updated = {
        ...state,
        orders: Array.isArray(orders) ? orders : state.orders,
        products: (Array.isArray(products) && products.length > 0) ? products : state.products,
        inventory: (Array.isArray(inventory) && inventory.length > 0) ? inventory : state.inventory,
        stockHistory: Array.isArray(stockHistory) ? stockHistory : (state.stockHistory || []),
        auth: {
          ...state.auth,
          businessName: shopName || state.auth.businessName,
        },
      };
      persistStateImmediate(updated);
      if (Array.isArray(orders)) {
        safeSetItem(ORDERS_VAULT_KEY, JSON.stringify(orders));
      }
      return updated;
    }

    case 'RESTORE_BACKUP': {
      persistStateImmediate(action.payload);
      if (Array.isArray(action.payload.orders)) {
        safeSetItem(ORDERS_VAULT_KEY, JSON.stringify(action.payload.orders));
      }
      return {
        ...action.payload,
        stockHistory: Array.isArray(action.payload.stockHistory) ? action.payload.stockHistory : (state.stockHistory || []),
        auth: { ...(action.payload.auth || state.auth), isLoggedIn: state.auth.isLoggedIn },
      };
    }

    default:
      return state;
  }
}

const BakeryContext = createContext(null);

export function BakeryProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [isReady, setIsReady] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState({
    state: 'offline', // 'synced' | 'syncing' | 'offline' | 'unauthorized' | 'suspended' | 'revoked'
    lastSynced: null,
    serverUrl: '',
    message: '',
  });

  const [lockoutState, setLockoutState] = useState({
    isLocked: false,
    status: 'active',
    message: '',
    licenseKey: '',
    serverUrl: '',
    deviceId: '',
    deviceModel: '',
  });

  const [pendingCredentials, setPendingCredentials] = useState(null);

  // Admin approval gate on first sign-in & security enforcement
  const requestLoginWithApproval = async ({ username, password }) => {
    try {
      const [cfg, info] = await Promise.all([getCloudConfig(), getDeviceInfo()]);

      // Always contact BakerAdmin server to verify real approval status
      const reqRes = await requestApprovalFromCloud(cfg.serverUrl);

      if (reqRes.success && reqRes.status === 'active') {
        dispatch({
          type: 'LOGIN',
          payload: { username: username || 'admin', password: password || '1234' },
        });
        setLockoutState(prev => ({ ...prev, isLocked: false, status: 'active' }));
        return { success: true, status: 'active' };
      }

      if (reqRes.status === 'pending') {
        // Device is pending admin verification: DO NOT LOG IN!
        // Lock screen engages and polls until admin clicks Approve in BakerAdmin.
        setPendingCredentials({
          username: username || 'admin',
          password: password || '1234',
        });
        setLockoutState({
          isLocked: true,
          status: 'pending',
          message: reqRes.message || 'Waiting for administrator approval in BakerAdmin.',
          licenseKey: cfg.licenseKey,
          serverUrl: cfg.serverUrl,
          deviceId: info.deviceId,
          deviceModel: info.model,
        });
        return { success: false, status: 'pending', message: reqRes.message };
      }

      if (reqRes.networkOffline) {
        return {
          success: false,
          offline: true,
          serverUrl: cfg.serverUrl,
          message: 'Admin server unreachable. You must connect to the same Wi-Fi as BakerAdmin to verify administrator approval.',
        };
      }

      if (reqRes.status === 'suspended' || reqRes.status === 'blocked' || reqRes.status === 'rejected' || reqRes.status === 'unlinked') {
        setLockoutState({
          isLocked: true,
          status: reqRes.status,
          message: reqRes.message || 'Terminal access restricted by administrator.',
          licenseKey: cfg.licenseKey,
          serverUrl: cfg.serverUrl,
          deviceId: info.deviceId,
          deviceModel: info.model,
        });
        return { success: false, status: reqRes.status, message: reqRes.message };
      }

      return {
        success: false,
        message: reqRes.message || 'Cannot complete terminal authorization.',
      };
    } catch (err) {
      return {
        success: false,
        message: err.message || 'Authentication error',
      };
    }
  };

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Cloud Anti-Transfer Handshake & Background Offline-First Sync
  useEffect(() => {
    if (!isReady) return;
    let isMounted = true;

    async function initAndSync() {
      try {
        const [cfg, info] = await Promise.all([getCloudConfig(), getDeviceInfo()]);
        if (!isMounted) return;

        // If device was revoked or suspended by admin, lock out immediately
        if (cfg.deviceStatus === 'suspended' || cfg.deviceStatus === 'revoked' || cfg.deviceStatus === 'rejected') {
          setLockoutState({
            isLocked: true,
            status: cfg.deviceStatus,
            message: cfg.lockoutMessage || 'Unauthorized device',
            licenseKey: cfg.licenseKey,
            serverUrl: cfg.serverUrl,
            deviceId: info.deviceId,
            deviceModel: info.model,
          });
          return;
        }

        // If user is already logged in, verify status & sync in background
        if (stateRef.current.auth?.isLoggedIn) {
          const reqRes = await requestApprovalFromCloud(
            cfg.serverUrl,
            stateRef.current.auth?.businessName
          );
          if (!isMounted) return;

          if (reqRes.success && reqRes.status === 'active') {
            setCloudSyncStatus(prev => ({
              ...prev,
              state: 'synced',
              serverUrl: cfg.serverUrl,
            }));
            await pushCloudSync(stateRef.current, cfg.serverUrl);
          } else if (reqRes.status && reqRes.status !== 'active') {
            setLockoutState({
              isLocked: true,
              status: reqRes.status,
              message: reqRes.message,
              licenseKey: cfg.licenseKey,
              serverUrl: cfg.serverUrl,
              deviceId: info.deviceId,
              deviceModel: info.model,
            });
          }
        }
      } catch (e) {
        if (isMounted) {
          setCloudSyncStatus(prev => ({ ...prev, state: 'offline' }));
        }
      }
    }

    initAndSync();

    // Background loop: Heartbeat & Data push every 25 seconds
    const interval = setInterval(async () => {
      try {
        // 1. Heartbeat check for remote killswitch
        const hb = await sendCloudHeartbeat();
        if (!isMounted) return;

        if (hb.killed) {
          const [cfg, info] = await Promise.all([getCloudConfig(), getDeviceInfo()]);
          setLockoutState({
            isLocked: true,
            status: hb.status,
            message: hb.message,
            licenseKey: cfg.licenseKey,
            serverUrl: cfg.serverUrl,
            deviceId: info.deviceId,
            deviceModel: info.model,
          });
          return;
        }

        // 2. Offline-First Cloud Sync Push
        const res = await pushCloudSync(stateRef.current);
        if (!isMounted) return;

        if (res.success) {
          if (res.results && res.results.length > 0) {
            const confirmedIds = res.results.filter(r => r.status === 'synced' || r.status === 'duplicate').map(r => r.orderId);
            if (confirmedIds.length > 0) {
              dispatch({ type: 'MARK_ORDERS_SYNCED', payload: { syncedOrderIds: confirmedIds } });
            }
          }
          setCloudSyncStatus({
            state: 'synced',
            lastSynced: res.timestamp,
            serverUrl: res.serverUrl,
            message: res.message,
          });
        } else if (res.unauthorized) {
          const [cfg, info] = await Promise.all([getCloudConfig(), getDeviceInfo()]);
          setLockoutState({
            isLocked: true,
            status: 'unauthorized',
            message: res.message,
            licenseKey: cfg.licenseKey,
            serverUrl: cfg.serverUrl,
            deviceId: info.deviceId,
            deviceModel: info.model,
          });
        } else {
          setCloudSyncStatus(prev => ({
            ...prev,
            state: 'offline',
            message: 'Local offline mode active',
          }));
        }
      } catch (err) {
        if (isMounted) {
          setCloudSyncStatus(prev => ({ ...prev, state: 'offline' }));
        }
      }
    }, 25000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isReady]);

  // Load and merge persisted state on app launch
  useEffect(() => {
    async function loadPersistedData() {
      try {
        let loadedData = null;

        // 1. Try master storage key first
        const masterRaw = await safeGetItem(STORAGE_KEY);
        if (masterRaw) {
          try {
            const parsed = JSON.parse(masterRaw);
            if (parsed && typeof parsed === 'object') {
              loadedData = parsed;
            }
          } catch (e) {
            console.warn('[BakeryStore] Error parsing master storage:', e);
          }
        }

        // 2. If no orders found in master, scan all legacy storage keys to recover previous orders!
        if (!loadedData || !Array.isArray(loadedData.orders) || loadedData.orders.length === 0) {
          for (const legKey of LEGACY_STORAGE_KEYS) {
            const legRaw = await safeGetItem(legKey);
            if (legRaw) {
              try {
                const parsed = JSON.parse(legRaw);
                if (parsed && typeof parsed === 'object') {
                  if (Array.isArray(parsed.orders) && parsed.orders.length > 0) {
                    console.log(`[BakeryStore] Recovered ${parsed.orders.length} orders from legacy key: ${legKey}`);
                    loadedData = loadedData
                      ? { ...loadedData, orders: [...parsed.orders, ...(loadedData.orders || [])] }
                      : parsed;
                    break;
                  }
                }
              } catch (e) {}
            }
          }
        }

        // 3. Check dedicated permanent orders vault
        const vaultOrders = await getVaultOrders();
        let combinedOrders = (loadedData && Array.isArray(loadedData.orders)) ? loadedData.orders : [];

        if (vaultOrders && vaultOrders.length > 0) {
          const existingIds = new Set(combinedOrders.map(o => o.id));
          const missingFromLoaded = vaultOrders.filter(o => !existingIds.has(o.id));
          if (missingFromLoaded.length > 0) {
            combinedOrders = [...combinedOrders, ...missingFromLoaded];
          }
        }

        // 4. Products & Inventory (Strictly real data; purge any lingering legacy mock items)
        let savedProducts = (loadedData && Array.isArray(loadedData.products)) ? loadedData.products : [];
        // Filter out legacy mock products
        savedProducts = savedProducts.filter(p => p.name !== 'Crispy Honey Fetira' && p.name !== 'Egg & Cheese Fetira' && p.name !== 'Pistachio Baklava');

        const todayDateStr = new Date().toISOString().slice(0, 10);
        const todayOrdersList = (combinedOrders || []).filter(o => {
          const od = (o.createdAt || o.date || '').slice(0, 10);
          return od === todayDateStr;
        });
        const todaySoldMap = {};
        todayOrdersList.forEach(o => {
          (o.items || []).forEach(it => {
            todaySoldMap[it.id] = (todaySoldMap[it.id] || 0) + (Number(it.quantity) || 1);
          });
        });

        const mergedProducts = savedProducts.map(p => {
          const prep = typeof p.preparedCount === 'number' ? p.preparedCount : 0;
          const sold = todaySoldMap[p.id] || 0;
          return {
            ...p,
            preparedCount: prep,
            soldCount: sold,
            remainingCount: Math.max(0, prep - sold),
          };
        });

        let savedInv = (loadedData && Array.isArray(loadedData.inventory)) ? loadedData.inventory : [];
        savedInv = savedInv.filter(i => i.name !== 'All-Purpose Flour' && i.name !== 'Phyllo Dough Sheets' && i.name !== 'Pure Acacia Honey');
        const mergedInventory = savedInv;

        let savedStockHistory = (loadedData && Array.isArray(loadedData.stockHistory))
          ? loadedData.stockHistory
          : [];

        // If no stockHistory exists yet, create initial creation audit entries for any existing ingredients
        if (savedStockHistory.length === 0 && mergedInventory.length > 0) {
          savedStockHistory = mergedInventory.map((item, idx) => {
            const d = new Date(Date.now() - (mergedInventory.length - idx) * 25 * 60 * 1000);
            const tInfo = getStockTimestampInfo(d);
            return {
              id: 'stk-init-' + item.id + '-' + idx,
              itemId: item.id,
              itemName: item.name,
              unit: item.unit || 'unit',
              action: 'ADD',
              actionLabel: 'Added New Ingredient',
              previousStock: 0,
              newStock: Number(item.stock) || 0,
              changeDelta: Number(item.stock) || 0,
              costPerUnit: item.costPerUnit || 0,
              minStock: item.minStock || 0,
              timestamp: tInfo.timestamp,
              timeStr: tInfo.timeStr,
              dateStr: tInfo.dateStr,
              hour: tInfo.hour,
              hourWindow: tInfo.hourWindow,
              user: 'admin',
              note: `Added ${item.stock} ${item.unit || 'units'} of ${item.name} to stock`,
            };
          }).reverse();
        }

        const savedAuth = (loadedData && loadedData.auth) ? loadedData.auth : DEFAULT_AUTH;
        const savedSecurity = (loadedData && loadedData.security) ? loadedData.security : DEFAULT_SECURITY;
        const savedSecurityLogs = (loadedData && Array.isArray(loadedData.securityLogs))
          ? loadedData.securityLogs
          : [
              {
                id: 'sec-init',
                event: 'SYSTEM_STARTUP',
                description: 'System security active with PIN protection and anti-tamper receipt hashing.',
                timestamp: new Date().toISOString(),
                user: 'admin',
              },
            ];
        const savedNotifs = (loadedData && Array.isArray(loadedData.notifications))
          ? loadedData.notifications.filter(n => n.type !== 'sale')
          : INITIAL_NOTIFICATIONS;

        // Final payload to hydrate the app state
        const finalPayload = {
          products: mergedProducts,
          inventory: mergedInventory,
          orders: combinedOrders,
          stockHistory: savedStockHistory,
          notifications: savedNotifs,
          security: savedSecurity,
          securityLogs: savedSecurityLogs,
          lastActiveDate: todayDateStr,
          auth: {
            ...DEFAULT_AUTH,
            ...savedAuth,
            isLoggedIn: false,
          },
        };

        dispatch({
          type: 'LOAD_STATE',
          payload: finalPayload,
        });

        // Ensure both master storage and vault are fully synchronized
        await safeSetItem(STORAGE_KEY, JSON.stringify(finalPayload));
        if (combinedOrders.length > 0) {
          await safeSetItem(ORDERS_VAULT_KEY, JSON.stringify(combinedOrders));
        }
      } catch (err) {
        console.warn('[BakeryStore] Error during state restoration:', err);
      } finally {
        setIsReady(true);
      }
    }

    loadPersistedData();
  }, []);

  // Sync state changes after initial load
  useEffect(() => {
    if (!isReady) return;
    safeSetItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, isReady]);

  return (
    <BakeryContext.Provider
      value={{
        state,
        dispatch,
        isReady,
        wifiSyncStatus: cloudSyncStatus,
        cloudSyncStatus,
        requestLoginWithApproval,
      }}
    >
      {children}
      <DeviceLockoutModal
        visible={lockoutState.isLocked}
        deviceStatus={lockoutState.status}
        lockoutMessage={lockoutState.message}
        licenseKey={lockoutState.licenseKey}
        serverUrl={lockoutState.serverUrl}
        deviceId={lockoutState.deviceId}
        deviceModel={lockoutState.deviceModel}
        onAuthorized={() => {
          setLockoutState(prev => ({ ...prev, isLocked: false, status: 'active' }));
          setCloudSyncStatus(prev => ({ ...prev, state: 'synced' }));
          if (pendingCredentials) {
            dispatch({ type: 'LOGIN', payload: pendingCredentials });
            setPendingCredentials(null);
          }
        }}
      />
    </BakeryContext.Provider>
  );
}

export function useBakery() {
  const context = useContext(BakeryContext);
  if (!context) throw new Error('useBakery must be used inside BakeryProvider');
  return context;
}
