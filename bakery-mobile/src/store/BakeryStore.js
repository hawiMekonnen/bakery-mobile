import React, { createContext, useContext, useReducer, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushSyncData, isAutoSyncEnabled, getServerUrl } from '../services/syncService';

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

export const INITIAL_PRODUCTS = [
  // Traditional Ethiopian & Middle Eastern Pastries
  { id: 1, name: 'Crispy Honey Fetira', category: 'Pastry', price: 75, cost: 25, emoji: '🥞', available: true, soldCount: 0, preparedCount: 30, remainingCount: 30 },
  { id: 2, name: 'Egg & Cheese Fetira', category: 'Savory', price: 95, cost: 35, emoji: '🫓', available: true, soldCount: 0, preparedCount: 30, remainingCount: 30 },
  { id: 3, name: 'Pistachio Baklava', category: 'Pastry', price: 65, cost: 24, emoji: '🥮', available: true, soldCount: 0, preparedCount: 30, remainingCount: 30 },
  { id: 4, name: 'Honey Walnut Baklava', category: 'Pastry', price: 60, cost: 22, emoji: '🍯', available: true, soldCount: 0, preparedCount: 30, remainingCount: 30 },
  { id: 5, name: 'Crispy Lentil Sambusa', category: 'Savory', price: 25, cost: 8, emoji: '🥟', available: true, soldCount: 0, preparedCount: 30, remainingCount: 30 },
  { id: 6, name: 'Spiced Beef Sambusa', category: 'Savory', price: 35, cost: 14, emoji: '🥟', available: true, soldCount: 0, preparedCount: 30, remainingCount: 30 },

  // Bakery Staples & Pastries
  { id: 7, name: 'Butter Croissant', category: 'Pastry', price: 55, cost: 20, emoji: '🥐', available: true, soldCount: 0, preparedCount: 30, remainingCount: 30 },
  { id: 8, name: 'Sourdough Loaf', category: 'Bread', price: 85, cost: 35, emoji: '🍞', available: true, soldCount: 0, preparedCount: 30, remainingCount: 30 },
  { id: 9, name: 'French Baguette', category: 'Bread', price: 60, cost: 22, emoji: '🥖', available: true, soldCount: 0, preparedCount: 30, remainingCount: 30 },
  { id: 10, name: 'Dark Chocolate Cake', category: 'Cakes', price: 350, cost: 140, emoji: '🎂', available: true, soldCount: 0, preparedCount: 30, remainingCount: 30 },
  { id: 11, name: 'Strawberry Cheesecake', category: 'Cakes', price: 280, cost: 110, emoji: '🍰', available: true, soldCount: 0, preparedCount: 30, remainingCount: 30 },
  { id: 12, name: 'Blueberry Muffin', category: 'Pastry', price: 45, cost: 18, emoji: '🧁', available: true, soldCount: 0, preparedCount: 30, remainingCount: 30 },
  { id: 13, name: 'Glazed Ring Donut', category: 'Pastry', price: 40, cost: 15, emoji: '🍩', available: true, soldCount: 0, preparedCount: 30, remainingCount: 30 },
  { id: 14, name: 'Choc-Chip Cookie', category: 'Pastry', price: 35, cost: 14, emoji: '🍪', available: true, soldCount: 0, preparedCount: 30, remainingCount: 30 },
  { id: 15, name: 'Cinnamon Roll', category: 'Pastry', price: 65, cost: 25, emoji: '🥯', available: true, soldCount: 0, preparedCount: 30, remainingCount: 30 },

  // Beverages & Sandwiches
  { id: 16, name: 'Cardamom Spiced Tea', category: 'Coffee', price: 35, cost: 10, emoji: '🫖', available: true, soldCount: 0, preparedCount: 30, remainingCount: 30 },
  { id: 17, name: 'Artisan Espresso', category: 'Coffee', price: 40, cost: 12, emoji: '☕', available: true, soldCount: 0, preparedCount: 30, remainingCount: 30 },
  { id: 18, name: 'Caramel Iced Latte', category: 'Coffee', price: 65, cost: 20, emoji: '🧋', available: true, soldCount: 0, preparedCount: 30, remainingCount: 30 },
  { id: 19, name: 'Turkey Pesto Sandwich', category: 'Sandwiches', price: 120, cost: 55, emoji: '🥪', available: true, soldCount: 0, preparedCount: 30, remainingCount: 30 },
  { id: 20, name: 'Soft Artisan Pretzel', category: 'Bread', price: 45, cost: 15, emoji: '🥨', available: true, soldCount: 0, preparedCount: 30, remainingCount: 30 },
];

export const INITIAL_INVENTORY = [
  { id: 1, name: 'All-Purpose Flour', unit: 'kg', stock: 50, minStock: 20, costPerUnit: 28 },
  { id: 2, name: 'Phyllo Dough Sheets', unit: 'kg', stock: 15, minStock: 8, costPerUnit: 45 },
  { id: 3, name: 'Pure Acacia Honey', unit: 'L', stock: 10, minStock: 5, costPerUnit: 90 },
  { id: 4, name: 'Brown Lentils', unit: 'kg', stock: 15, minStock: 6, costPerUnit: 32 },
  { id: 5, name: 'Shelled Pistachios', unit: 'kg', stock: 5, minStock: 3, costPerUnit: 180 },
  { id: 6, name: 'Unsalted Butter', unit: 'kg', stock: 20, minStock: 10, costPerUnit: 65 },
  { id: 7, name: 'Granulated Sugar', unit: 'kg', stock: 25, minStock: 15, costPerUnit: 35 },
  { id: 8, name: 'Instant Dry Yeast', unit: 'kg', stock: 5, minStock: 2, costPerUnit: 95 },
  { id: 9, name: 'Espresso Roast Beans', unit: 'kg', stock: 8, minStock: 5, costPerUnit: 350 },
];

export const INITIAL_ORDERS = [];

const DEFAULT_AUTH = {
  username: 'admin',
  password: '1234',
  businessName: 'Bakery',
  role: 'Manager',
  isLoggedIn: false,
};

const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-ready',
    title: 'Register Online & Active',
    message: 'Bakery system ready. All orders and products are permanently saved to your device.',
    type: 'info',
    timestamp: new Date().toISOString(),
    read: false,
  },
];

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
      const { username, password } = action.payload;
      const validUsername = state.auth.username || 'admin';
      const validPassword = state.auth.password || '1234';

      if (
        (username === validUsername || (username === 'admin' && !state.auth.username)) &&
        password === validPassword
      ) {
        const updated = {
          ...state,
          auth: {
            ...state.auth,
            isLoggedIn: true,
            currentUser: username,
            lastLoginTime: new Date().toISOString(),
          },
        };
        // Persist login state while keeping all existing orders, products, and inventory intact!
        persistStateImmediate(updated);
        return updated;
      }
      return state;
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

    case 'UPDATE_CREDENTIALS': {
      const { newUsername, newPassword, businessName } = action.payload;
      const updated = {
        ...state,
        auth: {
          ...state.auth,
          username: newUsername || state.auth.username,
          password: newPassword || state.auth.password,
          businessName: businessName || state.auth.businessName,
        },
      };
      persistStateImmediate(updated);
      return updated;
    }

    case 'ADD_ORDER': {
      const order = {
        ...action.payload,
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
      const updated = {
        ...state,
        inventory: [...state.inventory, newItem],
      };
      persistStateImmediate(updated);
      return updated;
    }

    case 'UPDATE_INVENTORY': {
      const updated = {
        ...state,
        inventory: state.inventory.map(item =>
          item.id === action.payload.id ? { ...item, ...action.payload } : item
        ),
      };
      persistStateImmediate(updated);
      return updated;
    }

    case 'ADJUST_STOCK': {
      const { id, mode, amount } = action.payload;
      const numAmount = parseFloat(amount) || 0;
      let alertNotif = null;

      const updatedInventory = state.inventory.map(item => {
        if (item.id !== id) return item;
        let newStock = item.stock;
        if (mode === 'set') newStock = Math.max(0, numAmount);
        else if (mode === 'add') newStock = item.stock + numAmount;
        else if (mode === 'sub') newStock = Math.max(0, item.stock - numAmount);
        const finalStock = parseFloat(newStock.toFixed(2));

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

      const updated = {
        ...state,
        inventory: updatedInventory,
        notifications: alertNotif
          ? [alertNotif, ...(state.notifications || [])].slice(0, 50)
          : state.notifications,
      };
      persistStateImmediate(updated);
      return updated;
    }

    case 'DELETE_INVENTORY': {
      const updated = {
        ...state,
        inventory: state.inventory.filter(item => item.id !== action.payload),
      };
      persistStateImmediate(updated);
      return updated;
    }

    case 'RESTORE_BACKUP': {
      persistStateImmediate(action.payload);
      if (Array.isArray(action.payload.orders)) {
        safeSetItem(ORDERS_VAULT_KEY, JSON.stringify(action.payload.orders));
      }
      return { ...action.payload, auth: { ...(action.payload.auth || state.auth), isLoggedIn: state.auth.isLoggedIn } };
    }

    default:
      return state;
  }
}

const BakeryContext = createContext(null);

export function BakeryProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [isReady, setIsReady] = useState(false);
  const [wifiSyncStatus, setWifiSyncStatus] = useState({
    state: 'offline', // 'synced' | 'syncing' | 'offline'
    lastSynced: null,
    serverUrl: '',
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Background Wi-Fi Auto-Sync Loop
  useEffect(() => {
    if (!isReady) return;
    let isMounted = true;

    async function runWifiSync() {
      try {
        const enabled = await isAutoSyncEnabled();
        if (!enabled) return;

        const url = await getServerUrl();
        if (isMounted) {
          setWifiSyncStatus(prev => ({ ...prev, state: 'syncing', serverUrl: url }));
        }

        const res = await pushSyncData(stateRef.current);
        if (!isMounted) return;

        if (res.success) {
          setWifiSyncStatus({
            state: 'synced',
            lastSynced: res.timestamp,
            serverUrl: res.serverUrl,
          });
        } else {
          setWifiSyncStatus(prev => ({
            ...prev,
            state: 'offline',
          }));
        }
      } catch (err) {
        if (isMounted) {
          setWifiSyncStatus(prev => ({ ...prev, state: 'offline' }));
        }
      }
    }

    // Trigger initial sync after state loaded
    runWifiSync();

    // Auto-sync every 15 seconds over Wi-Fi
    const interval = setInterval(runWifiSync, 15000);
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

        // 4. Products & Inventory merging (preserve custom added items)
        const savedProducts = (loadedData && Array.isArray(loadedData.products)) ? loadedData.products : [];
        const existingProdNames = new Set(savedProducts.map(p => (p.name || '').toLowerCase()));
        const missingDefaultProds = INITIAL_PRODUCTS.filter(p => !existingProdNames.has((p.name || '').toLowerCase()));
        
        // Strict Daily Reset: Count items sold today from today's orders only (starts at 0 every day)
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

        const mergedProducts = [...savedProducts, ...missingDefaultProds].map(p => {
          const prep = typeof p.preparedCount === 'number' ? p.preparedCount : 30;
          // Starts from 0 every day unless sold in today's orders
          const sold = todaySoldMap[p.id] || 0;
          return {
            ...p,
            preparedCount: prep,
            soldCount: sold,
            remainingCount: Math.max(0, prep - sold),
          };
        });

        const savedInv = (loadedData && Array.isArray(loadedData.inventory)) ? loadedData.inventory : [];
        const existingInvNames = new Set(savedInv.map(i => (i.name || '').toLowerCase()));
        const missingDefaultInv = INITIAL_INVENTORY.filter(i => !existingInvNames.has((i.name || '').toLowerCase()));
        const mergedInventory = [...savedInv, ...missingDefaultInv];

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
          notifications: savedNotifs,
          security: savedSecurity,
          securityLogs: savedSecurityLogs,
          lastActiveDate: todayDateStr,
          auth: {
            ...DEFAULT_AUTH,
            ...savedAuth,
            // Keep previous login session if active, otherwise preserve credentials
            isLoggedIn: !!savedAuth.isLoggedIn,
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
    <BakeryContext.Provider value={{ state, dispatch, isReady, wifiSyncStatus }}>
      {children}
    </BakeryContext.Provider>
  );
}

export function useBakery() {
  const context = useContext(BakeryContext);
  if (!context) throw new Error('useBakery must be used inside BakeryProvider');
  return context;
}
