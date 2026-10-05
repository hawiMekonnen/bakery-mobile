import os
import sys

MOBILE_ROOT = r'c:\Users\user\Desktop\bakery-mobile'

# ==============================================================================
# 1. BakeryStore.js
# ==============================================================================
BAKERY_STORE_CODE = '''import React, { createContext, useContext, useReducer, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  { id: 1, name: 'Crispy Honey Fetira', category: 'Pastry', price: 75, cost: 25, emoji: '🥞', available: true, soldCount: 0 },
  { id: 2, name: 'Egg & Cheese Fetira', category: 'Savory', price: 95, cost: 35, emoji: '🫓', available: true, soldCount: 0 },
  { id: 3, name: 'Pistachio Baklava', category: 'Pastry', price: 65, cost: 24, emoji: '🥮', available: true, soldCount: 0 },
  { id: 4, name: 'Honey Walnut Baklava', category: 'Pastry', price: 60, cost: 22, emoji: '🍯', available: true, soldCount: 0 },
  { id: 5, name: 'Crispy Lentil Sambusa', category: 'Savory', price: 25, cost: 8, emoji: '🥟', available: true, soldCount: 0 },
  { id: 6, name: 'Spiced Beef Sambusa', category: 'Savory', price: 35, cost: 14, emoji: '🥟', available: true, soldCount: 0 },

  // Bakery Staples & Pastries
  { id: 7, name: 'Butter Croissant', category: 'Pastry', price: 55, cost: 20, emoji: '🥐', available: true, soldCount: 0 },
  { id: 8, name: 'Sourdough Loaf', category: 'Bread', price: 85, cost: 35, emoji: '🍞', available: true, soldCount: 0 },
  { id: 9, name: 'French Baguette', category: 'Bread', price: 60, cost: 22, emoji: '🥖', available: true, soldCount: 0 },
  { id: 10, name: 'Dark Chocolate Cake', category: 'Cakes', price: 350, cost: 140, emoji: '🎂', available: true, soldCount: 0 },
  { id: 11, name: 'Strawberry Cheesecake', category: 'Cakes', price: 280, cost: 110, emoji: '🍰', available: true, soldCount: 0 },
  { id: 12, name: 'Blueberry Muffin', category: 'Pastry', price: 45, cost: 18, emoji: '🧁', available: true, soldCount: 0 },
  { id: 13, name: 'Glazed Ring Donut', category: 'Pastry', price: 40, cost: 15, emoji: '🍩', available: true, soldCount: 0 },
  { id: 14, name: 'Choc-Chip Cookie', category: 'Pastry', price: 35, cost: 14, emoji: '🍪', available: true, soldCount: 0 },
  { id: 15, name: 'Cinnamon Roll', category: 'Pastry', price: 65, cost: 25, emoji: '🥯', available: true, soldCount: 0 },

  // Beverages & Sandwiches
  { id: 16, name: 'Cardamom Spiced Tea', category: 'Coffee', price: 35, cost: 10, emoji: '🫖', available: true, soldCount: 0 },
  { id: 17, name: 'Artisan Espresso', category: 'Coffee', price: 40, cost: 12, emoji: '☕', available: true, soldCount: 0 },
  { id: 18, name: 'Caramel Iced Latte', category: 'Coffee', price: 65, cost: 20, emoji: '🧋', available: true, soldCount: 0 },
  { id: 19, name: 'Turkey Pesto Sandwich', category: 'Sandwiches', price: 120, cost: 55, emoji: '🥪', available: true, soldCount: 0 },
  { id: 20, name: 'Soft Artisan Pretzel', category: 'Bread', price: 45, cost: 15, emoji: '🥨', available: true, soldCount: 0 },
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

const INITIAL_STATE = {
  products: INITIAL_PRODUCTS,
  inventory: INITIAL_INVENTORY,
  orders: INITIAL_ORDERS,
  notifications: INITIAL_NOTIFICATIONS,
  auth: DEFAULT_AUTH,
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

      const updatedProducts = state.products.map(p => {
        const matchingItem = order.items.find(i => i.id === p.id);
        if (matchingItem) {
          return { ...p, soldCount: (p.soldCount || 0) + matchingItem.quantity };
        }
        return p;
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

    case 'RESET_ORDERS': {
      const updated = {
        ...state,
        orders: [],
        products: state.products.map(p => ({ ...p, soldCount: 0 })),
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
        const mergedProducts = [...savedProducts, ...missingDefaultProds];

        const savedInv = (loadedData && Array.isArray(loadedData.inventory)) ? loadedData.inventory : [];
        const existingInvNames = new Set(savedInv.map(i => (i.name || '').toLowerCase()));
        const missingDefaultInv = INITIAL_INVENTORY.filter(i => !existingInvNames.has((i.name || '').toLowerCase()));
        const mergedInventory = [...savedInv, ...missingDefaultInv];

        const savedAuth = (loadedData && loadedData.auth) ? loadedData.auth : DEFAULT_AUTH;
        const savedNotifs = (loadedData && Array.isArray(loadedData.notifications))
          ? loadedData.notifications.filter(n => n.type !== 'sale')
          : INITIAL_NOTIFICATIONS;

        // Final payload to hydrate the app state
        const finalPayload = {
          products: mergedProducts,
          inventory: mergedInventory,
          orders: combinedOrders,
          notifications: savedNotifs,
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
    <BakeryContext.Provider value={{ state, dispatch, isReady }}>
      {children}
    </BakeryContext.Provider>
  );
}

export function useBakery() {
  const context = useContext(BakeryContext);
  if (!context) throw new Error('useBakery must be used inside BakeryProvider');
  return context;
}
'''

# ==============================================================================
# 2. App.js (Gated with isReady loading screen)
# ==============================================================================
APP_CODE = '''import React from 'react';
import { Platform, View, Text, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BakeryProvider, useBakery } from './src/store/BakeryStore';
import { COLORS, FONTS } from './src/theme/colors';

// Auth
import LoginScreen from './src/screens/LoginScreen';

// Tab Screens
import DashboardScreen from './src/screens/DashboardScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Feature Screens (navigated from Home)
import POSScreen from './src/screens/POSScreen';
import ProductsScreen from './src/screens/ProductsScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Dashboard" component={DashboardScreen} />
      <HomeStack.Screen name="POS" component={POSScreen} />
      <HomeStack.Screen name="Products" component={ProductsScreen} />
      <HomeStack.Screen name="Orders" component={OrdersScreen} />
      <HomeStack.Screen name="History" component={OrdersScreen} />
      <HomeStack.Screen name="Inventory" component={InventoryScreen} />
      <HomeStack.Screen name="Analytics" component={AnalyticsScreen} />
      <HomeStack.Screen name="Profile" component={ProfileScreen} />
    </HomeStack.Navigator>
  );
}

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const barHeight = Platform.OS === 'ios' ? 60 + insets.bottom : 64 + insets.bottom;
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          }
          return <Ionicons name={iconName} size={23} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: barHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginTop: 2,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen
        name="History"
        component={OrdersScreen}
        options={{ tabBarLabel: 'History' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// Root app that gates between Loading, Login, and Main tabs
function RootNavigator() {
  const { state, isReady } = useBakery();

  // Show premium loading splash while loading from phone storage
  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 50, marginBottom: 12 }}>🥐</Text>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 14, fontSize: 16, fontWeight: '800', color: COLORS.textPrimary }}>
          Loading Bakery...
        </Text>
        <Text style={{ marginTop: 6, fontSize: 12, color: COLORS.textMuted }}>
          Restoring saved orders and products
        </Text>
      </View>
    );
  }

  const isLoggedIn = state.auth?.isLoggedIn === true;

  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  return <TabNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BakeryProvider>
          <NavigationContainer>
            <StatusBar style="dark" backgroundColor={COLORS.surface} />
            <RootNavigator />
          </NavigationContainer>
        </BakeryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
'''

# ==============================================================================
# 3. DashboardScreen.js (Displays Today & All-Time Orders + Recent Orders List)
# ==============================================================================
DASHBOARD_CODE = '''import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBakery } from '../store/BakeryStore';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';

const { width } = Dimensions.get('window');
const TILE_W = (width - 32 - 12) / 2;

const FEATURES = [
  {
    id: 'POS',
    label: 'Point of Sale',
    sublabel: 'New checkout & cart',
    icon: 'cart',
    color: COLORS.primary,
    bg: COLORS.primaryLight,
    route: 'POS',
  },
  {
    id: 'Products',
    label: 'Bakery Menu',
    sublabel: 'Fetira, Baklava, Sambusa...',
    icon: 'fast-food',
    color: COLORS.secondary,
    bg: '#FFEDD5',
    route: 'Products',
  },
  {
    id: 'Orders',
    label: 'Order History',
    sublabel: 'Past receipts & logs',
    icon: 'receipt',
    color: COLORS.info,
    bg: COLORS.infoLight,
    route: 'Orders',
  },
  {
    id: 'Inventory',
    label: 'Stock & Inventory',
    sublabel: 'Flour, honey, phyllo...',
    icon: 'cube',
    color: '#475569',
    bg: '#F1F5F9',
    route: 'Inventory',
  },
  {
    id: 'Analytics',
    label: 'Income Ledger',
    sublabel: 'Cash, Card & Mobile',
    icon: 'wallet',
    color: COLORS.success,
    bg: COLORS.successLight,
    route: 'Analytics',
  },
  {
    id: 'Profile',
    label: 'My Profile',
    sublabel: 'Security & settings',
    icon: 'person-circle',
    color: COLORS.purple,
    bg: COLORS.purpleLight,
    route: 'Profile',
  },
];

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useBakery();
  const { products, orders, inventory, auth, notifications = [] } = state;

  const [notifModalVisible, setNotifModalVisible] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o => o.createdAt && o.createdAt.startsWith(todayStr));
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const todayCash = todayOrders
    .filter(o => (o.paymentMethod || '').toLowerCase() === 'cash')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const todayCard = todayOrders
    .filter(o => (o.paymentMethod || '').toLowerCase() === 'card')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const todayMobile = todayOrders
    .filter(o => (o.paymentMethod || '').toLowerCase() === 'mobile')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const totalAllTimeRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const lowStockCount = inventory.filter(
    i => (Number(i.stock) || 0) <= (Number(i.minStock) || 0)
  ).length;

  const unreadNotifs = notifications.filter(n => !n.read).length;

  const currentHour = new Date().getHours();
  const greetingText = currentHour < 12 ? 'Good Morning ☀️' : currentHour < 17 ? 'Good Afternoon 🌤️' : 'Good Evening 🌙';

  const handleNavigate = (route) => {
    if (route === 'Orders') {
      try {
        navigation.navigate('Orders');
      } catch (e) {
        navigation.navigate('History');
      }
    } else {
      navigation.navigate(route);
    }
  };

  const openNotifications = () => {
    setNotifModalVisible(true);
  };

  const handleMarkAllRead = () => {
    dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' });
  };

  const handleClearNotifications = () => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  };

  return (
    <View style={styles.safeArea}>
      {/* ─── Top App Header: POS removed, Notification bell & Avatar ─── */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 10) + 8 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerGreeting}>{greetingText}</Text>
          <View style={styles.brandRow}>
            <Text style={styles.brandName}>Bakery</Text>
            <Text style={styles.brandEmoji}>🥐</Text>
          </View>
          <Text style={styles.businessSub}>{auth.businessName || 'Artisan Bakery & Cafe'}</Text>
        </View>

        <View style={styles.headerRight}>
          {/* Notification Bell Button */}
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={openNotifications}
            activeOpacity={0.75}
          >
            <Ionicons name="notifications-outline" size={22} color={COLORS.textPrimary} />
            {unreadNotifs > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadNotifs > 9 ? '9+' : unreadNotifs}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Profile Avatar Button */}
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.7}
          >
            <Text style={styles.avatarBtnLetter}>
              {(auth.username || 'A').charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Summary Cards: Today Sales & All-Time Orders ─── */}
        <View style={styles.summaryRow}>
          <TouchableOpacity
            style={[styles.summaryCard, styles.summaryCardPrimary]}
            onPress={() => navigation.navigate('Analytics')}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={styles.primaryCardLabel}>TODAY'S SALES</Text>
              <Ionicons name="trending-up" size={16} color="rgba(255,255,255,0.85)" />
            </View>
            <Text style={styles.primaryCardValue}>${todayRevenue.toFixed(2)}</Text>
            <Text style={styles.primaryCardSub}>{todayOrders.length} orders today</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.summaryCard}
            onPress={() => handleNavigate('Orders')}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={styles.secondaryCardLabel}>SAVED ORDERS</Text>
              <Ionicons name="receipt" size={16} color={COLORS.primary} />
            </View>
            <Text style={[styles.secondaryCardValue, { color: COLORS.primary }]}>
              {orders.length}
            </Text>
            <Text style={styles.secondaryCardSub}>
              ${totalAllTimeRevenue.toFixed(2)} in database
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── Today's Income by Method ─── */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionTitleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.sectionEmoji}>💵</Text>
              <Text style={styles.sectionTitle}>Today's Collections</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Analytics')}>
              <Text style={styles.seeAllLink}>Full Ledger →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.incomeCard}>
            <View style={styles.incomeMethodRow}>
              <View style={[styles.incomeMethodBox, { borderLeftColor: COLORS.cashColor }]}>
                <Text style={styles.incomeMethodEmoji}>💵</Text>
                <Text style={styles.incomeMethodLabel}>CASH</Text>
                <Text style={[styles.incomeMethodVal, { color: COLORS.cashColor }]}>
                  ${todayCash.toFixed(2)}
                </Text>
              </View>

              <View style={[styles.incomeMethodBox, { borderLeftColor: COLORS.cardColor }]}>
                <Text style={styles.incomeMethodEmoji}>💳</Text>
                <Text style={styles.incomeMethodLabel}>CARD</Text>
                <Text style={[styles.incomeMethodVal, { color: COLORS.cardColor }]}>
                  ${todayCard.toFixed(2)}
                </Text>
              </View>

              <View style={[styles.incomeMethodBox, { borderLeftColor: COLORS.mobileColor }]}>
                <Text style={styles.incomeMethodEmoji}>📱</Text>
                <Text style={styles.incomeMethodLabel}>MOBILE</Text>
                <Text style={[styles.incomeMethodVal, { color: COLORS.mobileColor }]}>
                  ${todayMobile.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.incomeTotalRow}>
              <Text style={styles.incomeTotalLabel}>Total Collected Today</Text>
              <Text style={styles.incomeTotalVal}>${todayRevenue.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* ─── Recent Completed Orders (Visible directly on Dashboard) ─── */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionTitleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.sectionEmoji}>🧾</Text>
              <Text style={styles.sectionTitle}>Recent Orders ({orders.length})</Text>
            </View>
            <TouchableOpacity onPress={() => handleNavigate('Orders')}>
              <Text style={styles.seeAllLink}>View All →</Text>
            </TouchableOpacity>
          </View>

          {orders.length === 0 ? (
            <View style={styles.emptyOrdersCard}>
              <Text style={{ fontSize: 28, marginBottom: 6 }}>🛍️</Text>
              <Text style={styles.emptyOrdersTitle}>No Orders Yet</Text>
              <Text style={styles.emptyOrdersSub}>
                Start a new sale from Point of Sale. Your orders will be safely saved here.
              </Text>
              <TouchableOpacity
                style={styles.emptyOrdersBtn}
                onPress={() => navigation.navigate('POS')}
                activeOpacity={0.8}
              >
                <Ionicons name="cart" size={15} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyOrdersBtnText}>Open POS</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.recentOrdersList}>
              {orders.slice(0, 3).map((item, index) => {
                const isCash = (item.paymentMethod || '').toLowerCase() === 'cash';
                const isCard = (item.paymentMethod || '').toLowerCase() === 'card';
                const badgeColor = isCash ? COLORS.cashColor : isCard ? COLORS.cardColor : COLORS.mobileColor;
                const badgeBg = isCash ? COLORS.successLight : isCard ? COLORS.infoLight : COLORS.purpleLight;
                const timeStr = item.createdAt
                  ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';
                const dateStr = item.createdAt
                  ? (item.createdAt.split('T')[0] === todayStr ? 'Today' : item.createdAt.split('T')[0])
                  : '';

                return (
                  <TouchableOpacity
                    key={item.id || index}
                    style={[
                      styles.recentOrderRow,
                      index === Math.min(orders.length, 3) - 1 && { borderBottomWidth: 0 },
                    ]}
                    onPress={() => handleNavigate('Orders')}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.recentOrderId}>{item.id}</Text>
                        <View style={[styles.recentPayBadge, { backgroundColor: badgeBg }]}>
                          <Text style={[styles.recentPayBadgeText, { color: badgeColor }]}>
                            {item.paymentMethod || 'Cash'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.recentOrderSub}>
                        {item.customerName || 'Walk-in'} • {item.items ? item.items.length : 0} items • {dateStr} {timeStr}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.recentOrderTotal}>${Number(item.total).toFixed(2)}</Text>
                      <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} style={{ marginTop: 2 }} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ─── Feature Grid (Safe Navigation) ─── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Quick Navigate</Text>
          <View style={styles.featureGrid}>
            {FEATURES.map(feat => (
              <TouchableOpacity
                key={feat.id}
                style={[styles.featureTile, { width: TILE_W }]}
                onPress={() => handleNavigate(feat.route)}
                activeOpacity={0.75}
              >
                <View style={[styles.featureTileIconBg, { backgroundColor: feat.bg }]}>
                  <Ionicons name={feat.icon} size={24} color={feat.color} />
                </View>
                <Text style={styles.featureTileLabel}>{feat.label}</Text>
                <Text style={styles.featureTileSub} numberOfLines={1}>{feat.sublabel}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─── Bakery Menu Highlights ─── */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionTitleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.sectionEmoji}>⭐</Text>
              <Text style={styles.sectionTitle}>Featured Bakery Items</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Products')}>
              <Text style={styles.seeAllLink}>Full Menu →</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
            {products.slice(0, 10).map(p => (
              <TouchableOpacity
                key={p.id}
                style={styles.topProductCard}
                onPress={() => navigation.navigate('POS')}
                activeOpacity={0.8}
              >
                <View style={styles.topProductEmojiBox}>
                  <Text style={{ fontSize: 32 }}>{p.emoji || '🥐'}</Text>
                </View>
                <Text style={styles.topProductName} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.topProductPrice}>${Number(p.price).toFixed(2)}</Text>
                <View style={styles.topProductSoldBadge}>
                  <Text style={styles.topProductSoldText}>
                    {(p.soldCount || 0) > 0 ? `${p.soldCount} sold` : p.category}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* ─── Notification Center Modal ─── */}
      <Modal
        visible={notifModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNotifModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notifModalCard}>
            <View style={styles.notifModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="notifications" size={22} color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={styles.notifModalTitle}>Notifications</Text>
                {unreadNotifs > 0 && (
                  <View style={styles.notifCountBadge}>
                    <Text style={styles.notifCountText}>{unreadNotifs} new</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setNotifModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Quick Actions */}
            {notifications.length > 0 && (
              <View style={styles.notifActionsRow}>
                {unreadNotifs > 0 && (
                  <TouchableOpacity onPress={handleMarkAllRead} style={styles.notifActionBtn}>
                    <Ionicons name="checkmark-done" size={16} color={COLORS.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.notifActionText}>Mark all as read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleClearNotifications} style={[styles.notifActionBtn, { marginLeft: 'auto' }]}>
                  <Ionicons name="trash-outline" size={15} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.notifActionText, { color: COLORS.textMuted }]}>Clear</Text>
                </TouchableOpacity>
              </View>
            )}

            {notifications.length === 0 ? (
              <View style={styles.notifEmpty}>
                <Ionicons name="notifications-off-outline" size={40} color={COLORS.textMuted} />
                <Text style={styles.notifEmptyText}>No notifications</Text>
                <Text style={styles.notifEmptySub}>You are all caught up!</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isWarn = item.type === 'warning';
                  return (
                    <View style={[styles.notifRow, !item.read && styles.notifRowUnread]}>
                      <View style={[styles.notifDot, { backgroundColor: isWarn ? COLORS.danger : COLORS.info }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.notifItemTitle, !item.read && { fontWeight: '700' }]}>
                          {item.title}
                        </Text>
                        <Text style={styles.notifItemMessage}>{item.message}</Text>
                        <Text style={styles.notifItemTime}>
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerBar: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.sm,
  },
  headerLeft: {
    flex: 1,
  },
  headerGreeting: {
    fontSize: FONTS.xs,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandName: {
    fontSize: FONTS.xl,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  brandEmoji: {
    fontSize: 20,
    marginLeft: 6,
  },
  businessSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  avatarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  avatarBtnLetter: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  summaryCardPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.8,
  },
  primaryCardValue: {
    fontSize: FONTS.xxl,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  primaryCardSub: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  secondaryCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  secondaryCardValue: {
    fontSize: FONTS.xxl,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  secondaryCardSub: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 4,
  },
  sectionBlock: {
    marginBottom: 18,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  seeAllLink: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.primary,
  },
  incomeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  incomeMethodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  incomeMethodBox: {
    flex: 1,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    padding: 10,
    borderLeftWidth: 3.5,
  },
  incomeMethodEmoji: {
    fontSize: 16,
    marginBottom: 4,
  },
  incomeMethodLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  incomeMethodVal: {
    fontSize: FONTS.sm,
    fontWeight: '800',
    marginTop: 2,
  },
  incomeTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 10,
  },
  incomeTotalLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  incomeTotalVal: {
    fontSize: FONTS.md,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  // Recent Orders
  recentOrdersList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  recentOrderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  recentOrderId: {
    fontSize: FONTS.xs,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginRight: 8,
  },
  recentPayBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  recentPayBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  recentOrderSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  recentOrderTotal: {
    fontSize: FONTS.sm,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  emptyOrdersCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  emptyOrdersTitle: {
    fontSize: FONTS.sm,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  emptyOrdersSub: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 12,
    maxWidth: 260,
  },
  emptyOrdersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  emptyOrdersBtnText: {
    color: '#FFF',
    fontSize: FONTS.xs,
    fontWeight: '800',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureTile: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  featureTileIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureTileLabel: {
    fontSize: FONTS.sm,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  featureTileSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  topProductCard: {
    width: 115,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  topProductEmojiBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  topProductName: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  topProductPrice: {
    fontSize: FONTS.xs,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginBottom: 6,
  },
  topProductSoldBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  topProductSoldText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  notifModalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 20,
    maxHeight: '80%',
  },
  notifModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  notifModalTitle: {
    fontSize: FONTS.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  notifCountBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginLeft: 8,
  },
  notifCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    marginBottom: 8,
  },
  notifActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  notifActionText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.primary,
  },
  notifEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  notifEmptyText: {
    fontSize: FONTS.md,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 10,
  },
  notifEmptySub: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  notifRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  notifRowUnread: {
    backgroundColor: COLORS.primaryLight + '25',
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 10,
  },
  notifItemTitle: {
    fontSize: FONTS.xs,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  notifItemMessage: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  notifItemTime: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});
'''

def update_file(rel_path, code):
    full_path = os.path.join(MOBILE_ROOT, rel_path)
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(code)
    print(f'Successfully updated: {full_path}')

if __name__ == '__main__':
    update_file(r'src\store\BakeryStore.js', BAKERY_STORE_CODE)
    update_file(r'App.js', APP_CODE)
    update_file(r'src\screens\DashboardScreen.js', DASHBOARD_CODE)
    print('All files successfully updated!')
