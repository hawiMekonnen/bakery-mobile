import os
import sys

MOBILE_ROOT = r'c:\Users\user\Desktop\bakery-mobile'

# ==========================================
# 1. receiptPrinter.js
# ==========================================
RECEIPT_PRINTER_CODE = '''import { Share, Alert, Platform } from 'react-native';

// Safe imports for Expo Print & Sharing
let Print = null;
let Sharing = null;

try {
  Print = require('expo-print');
} catch (e) {
  console.log('expo-print not available');
}

try {
  Sharing = require('expo-sharing');
} catch (e) {
  console.log('expo-sharing not available');
}

export function generateReceiptHTML(order, businessName = 'Bakery') {
  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString();
  const items = order.items || [];

  const itemsRows = items.map(item => `
    <tr>
      <td style="padding: 4px 0; font-size: 13px;">${item.name} x${item.quantity}</td>
      <td style="padding: 4px 0; font-size: 13px; text-align: right;">$${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Receipt ${order.id}</title>
        <style>
          @page { size: auto; margin: 10mm; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 100%;
            max-width: 340px;
            margin: 0 auto;
            padding: 16px;
            color: #111;
            background: #fff;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .title { font-size: 22px; font-weight: 900; letter-spacing: 1.5px; margin-bottom: 2px; }
          .subtitle { font-size: 12px; color: #555; margin-bottom: 12px; }
          .dashed { border-top: 1px dashed #222; margin: 10px 0; }
          .double-dashed { border-top: 2px dashed #222; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; }
          .info-table td { font-size: 12px; padding: 2px 0; }
          .total-table td { font-size: 13px; padding: 3px 0; }
          .grand-total { font-size: 17px; font-weight: 900; }
          .footer { font-size: 11px; text-align: center; color: #444; margin-top: 16px; line-height: 1.4; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="title">${businessName.toUpperCase()}</div>
          <div class="subtitle">Artisan Bakery & Cafe • Fresh Daily</div>
        </div>

        <div class="dashed"></div>

        <table class="info-table">
          <tr>
            <td><strong>Receipt #:</strong></td>
            <td style="text-align: right;">${order.id}</td>
          </tr>
          <tr>
            <td><strong>Date & Time:</strong></td>
            <td style="text-align: right;">${dateStr}</td>
          </tr>
          <tr>
            <td><strong>Customer:</strong></td>
            <td style="text-align: right;">${order.customerName || 'Walk-in'}</td>
          </tr>
          <tr>
            <td><strong>Payment:</strong></td>
            <td style="text-align: right;">${order.paymentMethod || 'Cash'}</td>
          </tr>
        </table>

        <div class="dashed"></div>

        <table>
          <thead>
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: left; font-size: 12px; padding-bottom: 4px;">Item</th>
              <th style="text-align: right; font-size: 12px; padding-bottom: 4px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="dashed"></div>

        <table class="total-table">
          <tr>
            <td>Subtotal:</td>
            <td style="text-align: right;">$${Number(order.subtotal || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <td>Tax (5%):</td>
            <td style="text-align: right;">$${Number(order.tax || 0).toFixed(2)}</td>
          </tr>
          <tr class="grand-total">
            <td style="padding-top: 6px;">TOTAL:</td>
            <td style="text-align: right; padding-top: 6px;">$${Number(order.total || 0).toFixed(2)}</td>
          </tr>
        </table>

        <div class="double-dashed"></div>

        <div class="footer">
          Thank you for choosing ${businessName}!<br>
          Please come again soon 🥐<br>
          *** Retain for your records ***
        </div>
      </body>
    </html>
  `;
}

export function generateReceiptText(order, businessName = 'Bakery') {
  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString();
  const itemsText = (order.items || [])
    .map(i => `${i.name} x${i.quantity}  $${(Number(i.price) * Number(i.quantity)).toFixed(2)}`)
    .join('\\n');

  return `
================================
         ${businessName.toUpperCase()}
   Artisan Bakery & Cafe
================================
Receipt:  ${order.id}
Date:     ${dateStr}
Customer: ${order.customerName || 'Walk-in'}
Payment:  ${order.paymentMethod || 'Cash'}
--------------------------------
${itemsText}
--------------------------------
Subtotal: $${Number(order.subtotal || 0).toFixed(2)}
Tax (5%): $${Number(order.tax || 0).toFixed(2)}
TOTAL:    $${Number(order.total || 0).toFixed(2)}
================================
Thank you for your visit! 🥐
`.trim();
}

export async function printReceipt(order, businessName = 'Bakery') {
  const html = generateReceiptHTML(order, businessName);

  try {
    if (Print && typeof Print.printAsync === 'function') {
      await Print.printAsync({ html });
      return { success: true };
    }
  } catch (error) {
    console.log('printAsync error, falling back to share:', error);
  }

  // Fallback to PDF share if printAsync fails or on unsupported platform
  return shareReceiptPDF(order, businessName);
}

export async function shareReceiptPDF(order, businessName = 'Bakery') {
  const html = generateReceiptHTML(order, businessName);

  try {
    if (Print && typeof Print.printToFileAsync === 'function') {
      const { uri } = await Print.printToFileAsync({ html });
      if (Sharing && typeof Sharing.isAvailableAsync === 'function' && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `Receipt ${order.id}`,
        });
        return { success: true };
      }
    }
  } catch (error) {
    console.log('PDF generation/share error:', error);
  }

  // Ultimate fallback: Text Share
  return shareReceiptText(order, businessName);
}

export async function shareReceiptText(order, businessName = 'Bakery') {
  const message = generateReceiptText(order, businessName);
  try {
    await Share.share({
      title: `Receipt ${order.id}`,
      message,
    });
    return { success: true };
  } catch (error) {
    Alert.alert('Receipt', message);
    return { success: false };
  }
}
'''

# ==========================================
# 2. BakeryStore.js (With Notification Center State & Dispatch)
# ==========================================
BAKERY_STORE_CODE = '''import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { Alert } from 'react-native';

// Safe AsyncStorage import
let AsyncStorage = null;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  console.log('AsyncStorage not available, running in memory-only mode');
}

const STORAGE_KEY = '@bakery_live_production_store_v3';

export const INITIAL_PRODUCTS = [
  // Traditional Items (Fetira, Baklava, Sambusa)
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
    id: 'notif-welcome',
    title: 'POS Ready for Sales',
    message: 'Bakery register is synchronized and ready for live transactions.',
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
  nextProductId: 21,
  nextInventoryId: 10,
  auth: DEFAULT_AUTH,
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...state, ...action.payload };

    case 'LOGIN': {
      const { username, password } = action.payload;
      if (
        username === state.auth.username &&
        password === state.auth.password
      ) {
        return { ...state, auth: { ...state.auth, isLoggedIn: true } };
      }
      return state;
    }

    case 'LOGOUT':
      return { ...state, auth: { ...state.auth, isLoggedIn: false } };

    case 'UPDATE_CREDENTIALS': {
      const { newUsername, newPassword, businessName } = action.payload;
      return {
        ...state,
        auth: {
          ...state.auth,
          username: newUsername || state.auth.username,
          password: newPassword || state.auth.password,
          businessName: businessName || state.auth.businessName,
        },
      };
    }

    case 'ADD_ORDER': {
      const order = action.payload;
      const updatedProducts = state.products.map(p => {
        const matchingItem = order.items.find(i => i.id === p.id);
        if (matchingItem) {
          return { ...p, soldCount: (p.soldCount || 0) + matchingItem.quantity };
        }
        return p;
      });

      // Automatically generate a real-time sale notification
      const saleNotification = {
        id: `notif-${Date.now()}`,
        title: 'New Sale Completed',
        message: `Order ${order.id} for $${Number(order.total).toFixed(2)} (${order.paymentMethod}) completed.`,
        type: 'sale',
        timestamp: new Date().toISOString(),
        read: false,
      };

      return {
        ...state,
        orders: [order, ...state.orders],
        products: updatedProducts,
        notifications: [saleNotification, ...(state.notifications || [])].slice(0, 50),
      };
    }

    case 'RESET_ORDERS':
      return {
        ...state,
        orders: [],
        products: state.products.map(p => ({ ...p, soldCount: 0 })),
      };

    // Notifications
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...(state.notifications || [])].slice(0, 50),
      };

    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: (state.notifications || []).map(n => ({ ...n, read: true })),
      };

    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
      };

    case 'ADD_PRODUCT': {
      const newProduct = { ...action.payload, id: state.nextProductId, soldCount: 0 };
      return {
        ...state,
        products: [newProduct, ...state.products],
        nextProductId: state.nextProductId + 1,
      };
    }

    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p => (p.id === action.payload.id ? action.payload : p)),
      };

    case 'DELETE_PRODUCT':
      return { ...state, products: state.products.filter(p => p.id !== action.payload) };

    case 'TOGGLE_PRODUCT_AVAILABILITY':
      return {
        ...state,
        products: state.products.map(p =>
          p.id === action.payload ? { ...p, available: !p.available } : p
        ),
      };

    case 'ADD_INVENTORY': {
      const newItem = {
        ...action.payload,
        id: state.nextInventoryId,
        stock: Number(action.payload.stock) || 0,
        minStock: Number(action.payload.minStock) || 0,
        costPerUnit: Number(action.payload.costPerUnit) || 0,
      };
      return {
        ...state,
        inventory: [...state.inventory, newItem],
        nextInventoryId: state.nextInventoryId + 1,
      };
    }

    case 'UPDATE_INVENTORY':
      return {
        ...state,
        inventory: state.inventory.map(item =>
          item.id === action.payload.id ? { ...item, ...action.payload } : item
        ),
      };

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

      return {
        ...state,
        inventory: updatedInventory,
        notifications: alertNotif
          ? [alertNotif, ...(state.notifications || [])].slice(0, 50)
          : state.notifications,
      };
    }

    case 'DELETE_INVENTORY':
      return { ...state, inventory: state.inventory.filter(item => item.id !== action.payload) };

    default:
      return state;
  }
}

const BakeryContext = createContext(null);

async function safeGetItem(key) {
  if (!AsyncStorage) return null;
  try {
    return await AsyncStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

async function safeSetItem(key, value) {
  if (!AsyncStorage) return;
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    // Memory fallback
  }
}

export function BakeryProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    safeGetItem(STORAGE_KEY).then(saved => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.products)) {
            // Strip out any legacy mock customer orders
            const cleanOrders = (parsed.orders || []).filter(o => 
              !['Sarah Jenkins', 'Michael Brown', 'Elena Rostova', 'David Kim', 'Samuel Girma', 'Abebe Tadesse'].includes(o.customerName)
            );

            // Merge products
            const existingNames = new Set(parsed.products.map(p => (p.name || '').toLowerCase()));
            const missingProducts = INITIAL_PRODUCTS.filter(p => !existingNames.has(p.name.toLowerCase()));
            const mergedProducts = [...parsed.products, ...missingProducts];

            const existingInvNames = new Set((parsed.inventory || []).map(i => (i.name || '').toLowerCase()));
            const missingInv = INITIAL_INVENTORY.filter(i => !existingInvNames.has(i.name.toLowerCase()));
            const mergedInventory = [...(parsed.inventory || []), ...missingInv];

            dispatch({
              type: 'LOAD_STATE',
              payload: {
                ...parsed,
                orders: cleanOrders,
                products: mergedProducts,
                inventory: mergedInventory,
                notifications: parsed.notifications || INITIAL_NOTIFICATIONS,
                auth: { ...(parsed.auth || DEFAULT_AUTH), isLoggedIn: false },
              },
            });
            initialLoadDone.current = true;
            return;
          }
        } catch (e) {
          // Defaults
        }
      }
      initialLoadDone.current = true;
    });
  }, []);

  useEffect(() => {
    if (!initialLoadDone.current) return;
    safeSetItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return (
    <BakeryContext.Provider value={{ state, dispatch }}>
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

# ==========================================
# 3. DashboardScreen.js (Removed POS at top, Added Notification Bell & Center Modal)
# ==========================================
DASHBOARD_CODE = '''import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBakery } from '../store/BakeryStore';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');
const TILE_W = (SCREEN_W - 48 - 10) / 2;

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
        {/* ─── Today's Summary Cards ─── */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.summaryCardPrimary]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.primaryCardLabel}>TODAY'S SALES</Text>
              <Ionicons name="trending-up" size={16} color="rgba(255,255,255,0.85)" />
            </View>
            <Text style={styles.primaryCardValue}>${todayRevenue.toFixed(2)}</Text>
            <Text style={styles.primaryCardSub}>{todayOrders.length} orders recorded</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.secondaryCardLabel}>STOCK HEALTH</Text>
              <Ionicons
                name={lowStockCount > 0 ? 'alert-circle' : 'shield-checkmark'}
                size={16}
                color={lowStockCount > 0 ? COLORS.danger : COLORS.success}
              />
            </View>
            {lowStockCount > 0 ? (
              <>
                <Text style={[styles.secondaryCardValue, { color: COLORS.danger }]}>
                  {lowStockCount} Items
                </Text>
                <Text style={styles.secondaryCardSub}>Need restocking soon</Text>
              </>
            ) : (
              <>
                <Text style={[styles.secondaryCardValue, { color: COLORS.success }]}>
                  All Healthy
                </Text>
                <Text style={styles.secondaryCardSub}>Ingredients in stock</Text>
              </>
            )}
          </View>
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

            {/* Notifications List */}
            {notifications.length === 0 ? (
              <View style={styles.emptyNotifBox}>
                <Ionicons name="notifications-off-outline" size={44} color={COLORS.textMuted} style={{ marginBottom: 10 }} />
                <Text style={styles.emptyNotifTitle}>No Notifications</Text>
                <Text style={styles.emptyNotifSub}>You are completely up to date. Alerts for new sales and stock updates will show up here.</Text>
              </View>
            ) : (
              <ScrollView style={styles.notifList} showsVerticalScrollIndicator={false}>
                {notifications.map(notif => {
                  const isSale = notif.type === 'sale';
                  const isWarning = notif.type === 'warning';
                  const iconName = isSale ? 'cart' : isWarning ? 'alert-circle' : 'information-circle';
                  const iconColor = isSale ? COLORS.success : isWarning ? COLORS.danger : COLORS.info;
                  const iconBg = isSale ? COLORS.successLight : isWarning ? COLORS.dangerLight : COLORS.infoLight;

                  const timeStr = notif.timestamp
                    ? new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <View key={notif.id} style={[styles.notifItem, !notif.read && styles.notifItemUnread]}>
                      <View style={[styles.notifIconCircle, { backgroundColor: iconBg }]}>
                        <Ionicons name={iconName} size={18} color={iconColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.notifItemTitle}>{notif.title}</Text>
                          <Text style={styles.notifItemTime}>{timeStr}</Text>
                        </View>
                        <Text style={styles.notifItemMsg}>{notif.message}</Text>
                      </View>
                      {!notif.read && <View style={styles.unreadDot} />}
                    </View>
                  );
                })}
              </ScrollView>
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
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 110,
  },
  // Top App Header
  headerBar: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    ...SHADOWS.sm,
  },
  headerLeft: {
    flex: 1,
  },
  headerGreeting: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandName: {
    fontSize: FONTS.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.6,
  },
  brandEmoji: {
    fontSize: 22,
    marginLeft: 6,
  },
  businessSub: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    ...SHADOWS.sm,
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  avatarBtnLetter: {
    color: '#FFF',
    fontSize: FONTS.sm,
    fontWeight: '800',
  },

  // Summary Row & Cards
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
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
    marginBottom: 4,
  },
  primaryCardLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  primaryCardValue: {
    fontSize: FONTS.xl,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  primaryCardSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    fontWeight: '500',
  },
  secondaryCardLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryCardValue: {
    fontSize: FONTS.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  secondaryCardSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },

  // Sections
  sectionBlock: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  seeAllLink: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Income Breakdown Card
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
    borderLeftWidth: 3,
    alignItems: 'center',
  },
  incomeMethodEmoji: {
    fontSize: 18,
    marginBottom: 3,
  },
  incomeMethodLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  incomeMethodVal: {
    fontSize: FONTS.sm,
    fontWeight: '800',
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
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  incomeTotalVal: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },

  // Feature Grid
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  featureTile: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'flex-start',
    ...SHADOWS.sm,
  },
  featureTileIconBg: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureTileLabel: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  featureTileSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    lineHeight: 14,
  },

  // Top Products Carousel
  topProductCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    alignItems: 'center',
    width: 114,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  topProductEmojiBox: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
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
    marginBottom: 2,
  },
  topProductPrice: {
    fontSize: FONTS.xs,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
  },
  topProductSoldBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  topProductSoldText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },

  // Notification Modal
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
    marginBottom: 14,
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
    fontSize: 10,
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
    paddingHorizontal: 6,
  },
  notifActionText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.primary,
  },
  notifList: {
    maxHeight: 380,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  notifItemUnread: {
    backgroundColor: '#FFFDF9',
  },
  notifIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifItemTitle: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  notifItemTime: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  notifItemMsg: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: 8,
  },
  emptyNotifBox: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyNotifTitle: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  emptyNotifSub: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
'''

# ==========================================
# 4. POSScreen.js (With Thermal Printing & Share Receipt)
# ==========================================
POS_CODE = '''import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBakery } from '../store/BakeryStore';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';
import { printReceipt, shareReceiptPDF } from '../utils/receiptPrinter';

const CATEGORIES = ['All', 'Pastry', 'Savory', 'Bread', 'Cakes', 'Coffee', 'Sandwiches'];

const PAYMENT_METHODS = [
  { id: 'Cash', label: 'Cash', icon: 'cash-outline', emoji: '💵' },
  { id: 'Card', label: 'Card', icon: 'card-outline', emoji: '💳' },
  { id: 'Mobile', label: 'Mobile', icon: 'phone-portrait-outline', emoji: '📱' },
];

export default function POSScreen({ navigation }) {
  const { state, dispatch } = useBakery();
  const { products, auth } = state;

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [cartModalVisible, setCartModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const changeQuantityBy = (id, delta) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === id);
      if (!existing) return prev;
      const nextQty = existing.quantity + delta;
      if (nextQty <= 0) {
        return prev.filter(item => item.id !== id);
      }
      return prev.map(item =>
        item.id === id ? { ...item, quantity: nextQty } : item
      );
    });
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setNotes('');
    setPaymentMethod('Cash');
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add products before checking out.');
      return;
    }

    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = {
      id: orderId,
      createdAt: new Date().toISOString(),
      customerName: customerName.trim() || 'Walk-in Customer',
      paymentMethod,
      notes: notes.trim(),
      status: 'Completed',
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        emoji: item.emoji || '🥐',
      })),
    };

    dispatch({ type: 'ADD_ORDER', payload: newOrder });

    setLastCompletedOrder(newOrder);
    setCartModalVisible(false);
    clearCart();
    setReceiptModalVisible(true);
  };

  const handlePrint = async () => {
    if (!lastCompletedOrder) return;
    setIsPrinting(true);
    await printReceipt(lastCompletedOrder, auth.businessName || 'Bakery');
    setIsPrinting(false);
  };

  const handleShare = async () => {
    if (!lastCompletedOrder) return;
    setIsPrinting(true);
    await shareReceiptPDF(lastCompletedOrder, auth.businessName || 'Bakery');
    setIsPrinting(false);
  };

  return (
    <View style={styles.container}>
      {/* ─── Interactive Screen Header ─── */}
      <ScreenHeader
        canGoBack
        onBack={() => navigation.goBack()}
        emoji="🛒"
        title="Point of Sale"
        subtitle={`${products.length} products • Quick register`}
        rightAction={
          <TouchableOpacity
            style={[styles.headerCartBtn, cart.length > 0 && styles.headerCartBtnActive]}
            onPress={() => setCartModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="cart" size={17} color={cart.length > 0 ? '#FFF' : COLORS.textPrimary} />
            <Text style={[styles.headerCartText, cart.length > 0 && { color: '#FFF' }]}>
              {totalItemsCount} | ${total.toFixed(0)}
            </Text>
          </TouchableOpacity>
        }
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search fetira, sambusa, baklava, coffee..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Pills */}
      <View style={styles.categoryWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContent}
        >
          {CATEGORIES.map(cat => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Products Grid */}
      <FlatList
        data={filteredProducts}
        keyExtractor={item => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const inCart = cart.find(c => c.id === item.id);
          const inCartQty = inCart ? inCart.quantity : 0;

          return (
            <TouchableOpacity
              style={[styles.productCard, inCartQty > 0 && styles.productCardActive]}
              onPress={() => addToCart(item)}
              activeOpacity={0.75}
            >
              <View style={styles.productTop}>
                <View style={styles.emojiCircle}>
                  <Text style={styles.productEmoji}>{item.emoji || '🥐'}</Text>
                </View>
                {inCartQty > 0 && (
                  <View style={styles.inCartPill}>
                    <Text style={styles.inCartPillText}>{inCartQty}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.productCategory}>{item.category}</Text>

              <View style={styles.productBottomRow}>
                <Text style={styles.productPrice}>${Number(item.price).toFixed(2)}</Text>
                <View style={styles.addIconCircle}>
                  <Ionicons name="add" size={16} color="#FFF" />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Bottom Cart Floating Bar if items are added */}
      {cart.length > 0 && (
        <View style={styles.floatingCartBar}>
          <View>
            <Text style={styles.floatingCartCount}>{totalItemsCount} items selected</Text>
            <Text style={styles.floatingCartTotal}>${total.toFixed(2)} total</Text>
          </View>
          <TouchableOpacity
            style={styles.floatingCheckoutBtn}
            onPress={() => setCartModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.floatingCheckoutText}>Review & Pay →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Cart & Checkout Modal */}
      <Modal
        visible={cartModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCartModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cartModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Current Register Cart</Text>
                <Text style={styles.modalSubtitle}>{totalItemsCount} items ready for sale</Text>
              </View>
              <TouchableOpacity onPress={() => setCartModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {cart.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 44, marginBottom: 8 }}>🛒</Text>
                <Text style={{ fontSize: FONTS.md, fontWeight: '700', color: COLORS.textPrimary }}>Cart is empty</Text>
                <Text style={{ fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 4 }}>Tap any product card to add to order</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 280 }}>
                {cart.map(item => (
                  <View key={item.id} style={styles.cartItemRow}>
                    <Text style={{ fontSize: 24, marginRight: 10 }}>{item.emoji || '🥐'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cartItemName}>{item.name}</Text>
                      <Text style={styles.cartItemPrice}>${Number(item.price).toFixed(2)} each</Text>
                    </View>
                    <View style={styles.qtyControl}>
                      <TouchableOpacity onPress={() => changeQuantityBy(item.id, -1)} style={styles.qtyBtn}>
                        <Ionicons name="remove" size={14} color={COLORS.textPrimary} />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity onPress={() => changeQuantityBy(item.id, 1)} style={styles.qtyBtn}>
                        <Ionicons name="add" size={14} color={COLORS.textPrimary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {cart.length > 0 && (
              <View style={styles.checkoutForm}>
                <Text style={styles.formLabel}>PAYMENT METHOD</Text>
                <View style={styles.paymentMethodRow}>
                  {PAYMENT_METHODS.map(m => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.payMethodBtn, paymentMethod === m.id && styles.payMethodBtnActive]}
                      onPress={() => setPaymentMethod(m.id)}
                    >
                      <Text style={{ fontSize: 16, marginRight: 4 }}>{m.emoji}</Text>
                      <Text style={[styles.payMethodText, paymentMethod === m.id && { color: '#FFF' }]}>{m.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.customerInput}
                  placeholder="Customer Name (optional)"
                  placeholderTextColor={COLORS.textMuted}
                  value={customerName}
                  onChangeText={setCustomerName}
                />

                <View style={styles.cartSummaryRow}>
                  <Text style={styles.cartSummaryLabel}>Subtotal</Text>
                  <Text style={styles.cartSummaryVal}>${subtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.cartSummaryRow}>
                  <Text style={styles.cartSummaryLabel}>Tax (5%)</Text>
                  <Text style={styles.cartSummaryVal}>${tax.toFixed(2)}</Text>
                </View>
                <View style={[styles.cartSummaryRow, { marginTop: 4 }]}>
                  <Text style={styles.cartGrandTotalLabel}>TOTAL DUE</Text>
                  <Text style={styles.cartGrandTotalVal}>${total.toFixed(2)}</Text>
                </View>

                <TouchableOpacity
                  style={styles.completeOrderBtn}
                  onPress={handleCheckout}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.completeOrderText}>Complete Sale (${total.toFixed(2)})</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Sale Complete Receipt & Printing Modal */}
      {lastCompletedOrder && (
        <Modal
          visible={receiptModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setReceiptModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.receiptSuccessCard}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark" size={32} color="#FFF" />
              </View>
              <Text style={styles.successTitle}>Payment Completed!</Text>
              <Text style={styles.successSub}>Order {lastCompletedOrder.id} successfully recorded</Text>
              <Text style={styles.successAmount}>${Number(lastCompletedOrder.total).toFixed(2)}</Text>
              <Text style={styles.successMethod}>Paid via {lastCompletedOrder.paymentMethod}</Text>

              {/* Receipt Print & Share Actions */}
              <View style={styles.printActionRow}>
                <TouchableOpacity
                  style={styles.printBtn}
                  onPress={handlePrint}
                  disabled={isPrinting}
                  activeOpacity={0.8}
                >
                  <Ionicons name="print" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.printBtnText}>
                    {isPrinting ? 'Printing...' : 'Print Receipt'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shareBtn}
                  onPress={handleShare}
                  disabled={isPrinting}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-social-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.shareBtnText}>Share PDF</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => setReceiptModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.doneBtnText}>New Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerCartBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  headerCartText: {
    fontSize: FONTS.xs,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sm,
    color: COLORS.textPrimary,
  },
  categoryWrapper: {
    marginBottom: 8,
  },
  categoryContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  categoryTextActive: {
    color: '#FFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 120,
    gap: 12,
  },
  columnWrapper: {
    gap: 12,
  },
  productCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  productCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFFDF9',
  },
  productTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  emojiCircle: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productEmoji: {
    fontSize: 26,
  },
  inCartPill: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  inCartPillText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  productName: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  productBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  productPrice: {
    fontSize: FONTS.sm,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  addIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Floating Cart Bar
  floatingCartBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: COLORS.surfaceDark,
    borderRadius: RADIUS.xl,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  floatingCartCount: {
    fontSize: FONTS.xs,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  floatingCartTotal: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: '#FFF',
  },
  floatingCheckoutBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  floatingCheckoutText: {
    color: '#FFF',
    fontSize: FONTS.xs,
    fontWeight: '800',
  },
  // Cart Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  cartModalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: FONTS.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  cartItemName: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cartItemPrice: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    padding: 3,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
  },
  qtyText: {
    width: 24,
    textAlign: 'center',
    fontSize: FONTS.xs,
    fontWeight: '700',
  },
  checkoutForm: {
    marginTop: 14,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  payMethodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  payMethodBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  payMethodText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  customerInput: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: FONTS.xs,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  cartSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  cartSummaryLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },
  cartSummaryVal: {
    fontSize: FONTS.xs,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cartGrandTotalLabel: {
    fontSize: FONTS.sm,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  cartGrandTotalVal: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  completeOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    marginTop: 12,
  },
  completeOrderText: {
    color: '#FFF',
    fontSize: FONTS.sm,
    fontWeight: '800',
  },
  // Success Receipt Modal
  receiptSuccessCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 24,
    marginHorizontal: 20,
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: 'auto',
    width: '90%',
    ...SHADOWS.lg,
  },
  successIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: FONTS.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  successSub: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  successAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primaryDark,
    marginVertical: 10,
  },
  successMethod: {
    fontSize: FONTS.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  printActionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 12,
  },
  printBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    ...SHADOWS.sm,
  },
  printBtnText: {
    color: '#FFF',
    fontSize: FONTS.sm,
    fontWeight: '800',
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '4D',
  },
  shareBtnText: {
    color: COLORS.primary,
    fontSize: FONTS.sm,
    fontWeight: '800',
  },
  doneBtn: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    paddingVertical: 11,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  doneBtnText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sm,
    fontWeight: '700',
  },
});
'''

# ==========================================
# 5. OrdersScreen.js (With Thermal Printing & Share on any Receipt)
# ==========================================
ORDERS_CODE = '''import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBakery } from '../store/BakeryStore';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';
import { printReceipt, shareReceiptPDF } from '../utils/receiptPrinter';

const FILTER_PAYMENTS = ['All', 'Cash', 'Card', 'Mobile'];

export default function OrdersScreen({ navigation }) {
  const { state } = useBakery();
  const { orders, auth } = state;

  const [search, setSearch] = useState('');
  const [filterPayment, setFilterPayment] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      (o.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.customerName || '').toLowerCase().includes(search.toLowerCase());
    const matchesPayment =
      filterPayment === 'All' ||
      (o.paymentMethod || '').toLowerCase() === filterPayment.toLowerCase();
    return matchesSearch && matchesPayment;
  });

  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const canGoBack = navigation && typeof navigation.canGoBack === 'function' && navigation.canGoBack();

  const openOrderDetail = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const handlePrint = async () => {
    if (!selectedOrder) return;
    setIsPrinting(true);
    await printReceipt(selectedOrder, auth.businessName || 'Bakery');
    setIsPrinting(false);
  };

  const handleShare = async () => {
    if (!selectedOrder) return;
    setIsPrinting(true);
    await shareReceiptPDF(selectedOrder, auth.businessName || 'Bakery');
    setIsPrinting(false);
  };

  return (
    <View style={styles.container}>
      {/* ─── Interactive Screen Header ─── */}
      <ScreenHeader
        canGoBack={canGoBack}
        onBack={() => navigation.goBack()}
        emoji="🧾"
        title="Order History"
        subtitle={`${orders.length} sales recorded • $${totalRevenue.toFixed(2)} total`}
        rightAction={
          orders.length > 0 ? (
            <View style={styles.badgePill}>
              <Text style={styles.badgePillText}>{filteredOrders.length} shown</Text>
            </View>
          ) : null
        }
      />

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Order # or Customer..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Payment Method Filters */}
      {orders.length > 0 && (
        <View style={styles.paymentFilters}>
          {FILTER_PAYMENTS.map(pay => {
            const isActive = filterPayment === pay;
            return (
              <TouchableOpacity
                key={pay}
                style={[styles.payTab, isActive && styles.payTabActive]}
                onPress={() => setFilterPayment(pay)}
                activeOpacity={0.7}
              >
                <Text style={[styles.payTabText, isActive && styles.payTabTextActive]}>
                  {pay}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Order Cards List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Text style={{ fontSize: 44 }}>🧾</Text>
            </View>
            <Text style={styles.emptyTitle}>
              {search ? 'No Matching Orders' : 'No Sales Recorded Yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {search
                ? 'Try searching with a different order number or customer name.'
                : 'Every sale you complete at Point of Sale will be recorded here.'}
            </Text>
            {!search && (
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => navigation.navigate('POS')}
                activeOpacity={0.85}
              >
                <Ionicons name="cart" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyActionText}>Start First Sale</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const isCash = (item.paymentMethod || '').toLowerCase() === 'cash';
          const isCard = (item.paymentMethod || '').toLowerCase() === 'card';
          const badgeColor = isCash ? COLORS.cashColor : isCard ? COLORS.cardColor : COLORS.mobileColor;
          const badgeBg = isCash ? COLORS.successLight : isCard ? COLORS.infoLight : COLORS.purpleLight;

          const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '';
          const timeStr = item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

          return (
            <TouchableOpacity
              style={styles.orderCard}
              onPress={() => openOrderDetail(item)}
              activeOpacity={0.75}
            >
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderId}>{item.id}</Text>
                  <Text style={styles.customerName}>{item.customerName || 'Walk-in Customer'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.orderTotal}>${Number(item.total).toFixed(2)}</Text>
                  <View style={[styles.payMethodBadge, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.payMethodText, { color: badgeColor }]}>{item.paymentMethod}</Text>
                  </View>
                </View>
              </View>

              {/* Items Summary Pill */}
              <View style={styles.itemsSummary}>
                <Text style={styles.itemsSummaryText} numberOfLines={1}>
                  {(item.items || []).map(i => `${i.quantity}x ${i.name}`).join(' • ')}
                </Text>
              </View>

              <View style={styles.orderFooter}>
                <Text style={styles.orderDate}>{dateStr} • {timeStr}</Text>
                <View style={styles.viewReceiptRow}>
                  <Text style={styles.viewReceiptText}>View Receipt</Text>
                  <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Order Detail Modal with Print Options */}
      {selectedOrder && (
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Receipt {selectedOrder.id}</Text>
                  <Text style={styles.modalSubtitle}>{selectedOrder.customerName}</Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={20} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <View style={styles.receiptPaper}>
                  <Text style={styles.receiptBrand}>{(auth.businessName || 'BAKERY').toUpperCase()}</Text>
                  <Text style={styles.receiptSub}>Artisan Bakery & Cafe</Text>
                  <View style={styles.receiptDashed} />

                  <View style={styles.receiptInfoRow}>
                    <Text style={styles.receiptInfoLabel}>Order ID:</Text>
                    <Text style={styles.receiptInfoVal}>{selectedOrder.id}</Text>
                  </View>
                  <View style={styles.receiptInfoRow}>
                    <Text style={styles.receiptInfoLabel}>Date & Time:</Text>
                    <Text style={styles.receiptInfoVal}>
                      {new Date(selectedOrder.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.receiptInfoRow}>
                    <Text style={styles.receiptInfoLabel}>Payment:</Text>
                    <Text style={styles.receiptInfoVal}>{selectedOrder.paymentMethod}</Text>
                  </View>

                  <View style={styles.receiptDashed} />

                  {/* Items */}
                  {(selectedOrder.items || []).map((it, idx) => (
                    <View key={idx} style={styles.receiptItemRow}>
                      <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, marginRight: 6 }}>{it.emoji || '🥐'}</Text>
                        <Text style={styles.receiptItemName}>{it.name} x{it.quantity}</Text>
                      </View>
                      <Text style={styles.receiptItemPrice}>
                        ${(Number(it.price) * Number(it.quantity)).toFixed(2)}
                      </Text>
                    </View>
                  ))}

                  <View style={styles.receiptDashed} />

                  <View style={styles.receiptTotalRow}>
                    <Text style={styles.receiptTotalLabel}>Subtotal</Text>
                    <Text style={styles.receiptTotalVal}>${Number(selectedOrder.subtotal).toFixed(2)}</Text>
                  </View>
                  <View style={styles.receiptTotalRow}>
                    <Text style={styles.receiptTotalLabel}>Tax (5%)</Text>
                    <Text style={styles.receiptTotalVal}>${Number(selectedOrder.tax).toFixed(2)}</Text>
                  </View>
                  <View style={[styles.receiptTotalRow, { marginTop: 4 }]}>
                    <Text style={styles.receiptGrandTotalLabel}>TOTAL</Text>
                    <Text style={styles.receiptGrandTotalVal}>${Number(selectedOrder.total).toFixed(2)}</Text>
                  </View>
                </View>
              </ScrollView>

              {/* Print and Share Buttons */}
              <View style={styles.modalPrintRow}>
                <TouchableOpacity
                  style={styles.modalPrintBtn}
                  onPress={handlePrint}
                  disabled={isPrinting}
                  activeOpacity={0.8}
                >
                  <Ionicons name="print" size={17} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.modalPrintText}>
                    {isPrinting ? 'Printing...' : 'Print Receipt'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalShareBtn}
                  onPress={handleShare}
                  disabled={isPrinting}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-social-outline" size={17} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.modalShareText}>Share PDF</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.modalDoneBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalDoneText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  badgePill: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  badgePillText: {
    color: COLORS.primaryDark,
    fontSize: FONTS.xs,
    fontWeight: '700',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: FONTS.sm,
    color: COLORS.textPrimary,
  },
  paymentFilters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  payTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  payTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  payTabText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  payTabTextActive: {
    color: '#FFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 110,
    gap: 10,
    flexGrow: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: FONTS.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: RADIUS.full,
    ...SHADOWS.sm,
  },
  emptyActionText: {
    color: '#FFF',
    fontSize: FONTS.sm,
    fontWeight: '800',
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderId: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  customerName: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  orderTotal: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  payMethodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginTop: 3,
  },
  payMethodText: {
    fontSize: 10,
    fontWeight: '700',
  },
  itemsSummary: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginVertical: 10,
  },
  itemsSummaryText: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 8,
  },
  orderDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  viewReceiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewReceiptText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.primary,
    marginRight: 2,
  },
  // Modal Receipt
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: FONTS.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    marginBottom: 14,
  },
  receiptPaper: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  receiptBrand: {
    fontSize: FONTS.lg,
    fontWeight: '900',
    textAlign: 'center',
    color: COLORS.textPrimary,
    letterSpacing: 1.5,
  },
  receiptSub: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  receiptDashed: {
    height: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  receiptInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  receiptInfoLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },
  receiptInfoVal: {
    fontSize: FONTS.xs,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  receiptItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  receiptItemName: {
    fontSize: FONTS.xs,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  receiptItemPrice: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  receiptTotalLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },
  receiptTotalVal: {
    fontSize: FONTS.xs,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  receiptGrandTotalLabel: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  receiptGrandTotalVal: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  modalPrintRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  modalPrintBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    ...SHADOWS.sm,
  },
  modalPrintText: {
    color: '#FFF',
    fontSize: FONTS.sm,
    fontWeight: '800',
  },
  modalShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '4D',
  },
  modalShareText: {
    color: COLORS.primary,
    fontSize: FONTS.sm,
    fontWeight: '800',
  },
  modalDoneBtn: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalDoneText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sm,
    fontWeight: '700',
  },
});
'''

FILES_TO_WRITE = [
  (os.path.join(MOBILE_ROOT, 'src', 'utils', 'receiptPrinter.js'), RECEIPT_PRINTER_CODE),
  (os.path.join(MOBILE_ROOT, 'src', 'store', 'BakeryStore.js'), BAKERY_STORE_CODE),
  (os.path.join(MOBILE_ROOT, 'src', 'screens', 'DashboardScreen.js'), DASHBOARD_CODE),
  (os.path.join(MOBILE_ROOT, 'src', 'screens', 'POSScreen.js'), POS_CODE),
  (os.path.join(MOBILE_ROOT, 'src', 'screens', 'OrdersScreen.js'), ORDERS_CODE),
]

def main():
  for path, content in FILES_TO_WRITE:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
      f.write(content.strip() + '\n')
    print(f'Successfully updated: {path}')

if __name__ == '__main__':
  main()
