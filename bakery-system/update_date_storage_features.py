import os
import sys

MOBILE_ROOT = r'c:\Users\user\Desktop\bakery-mobile'

# ==========================================
# 1. BakeryStore.js (Immediate Persistence, Custom Products Stored Permanently)
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

// Permanent master storage key - will never be reset
const STORAGE_KEY = '@bakery_master_production_v1';

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
    message: 'Bakery system ready. All changes are stored locally on your device.',
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
    // Memory mode fallback
  }
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
      const order = action.payload;
      const updatedProducts = state.products.map(p => {
        const matchingItem = order.items.find(i => i.id === p.id);
        if (matchingItem) {
          return { ...p, soldCount: (p.soldCount || 0) + matchingItem.quantity };
        }
        return p;
      });

      const updated = {
        ...state,
        orders: [order, ...state.orders],
        products: updatedProducts,
      };
      persistStateImmediate(updated);
      return updated;
    }

    case 'RESET_ORDERS': {
      const updated = {
        ...state,
        orders: [],
        products: state.products.map(p => ({ ...p, soldCount: 0 })),
      };
      persistStateImmediate(updated);
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

    // ─── Products (User Add, Edit, Delete with Instant Phone Storage) ───
    case 'ADD_PRODUCT': {
      const newProduct = {
        ...action.payload,
        id: Date.now(), // Guaranteed unique timestamp ID
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

    // ─── Inventory ───
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
      return { ...action.payload, auth: { ...(action.payload.auth || state.auth), isLoggedIn: state.auth.isLoggedIn } };
    }

    default:
      return state;
  }
}

const BakeryContext = createContext(null);

export function BakeryProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const initialLoadDone = useRef(false);

  // Load and merge persisted state on app launch
  useEffect(() => {
    safeGetItem(STORAGE_KEY).then(saved => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.products)) {
            // Keep all saved products (including any custom products added by the user)
            const existingNames = new Set(parsed.products.map(p => (p.name || '').toLowerCase()));
            const missingDefaults = INITIAL_PRODUCTS.filter(p => !existingNames.has(p.name.toLowerCase()));
            const mergedProducts = [...parsed.products, ...missingDefaults];

            const existingInvNames = new Set((parsed.inventory || []).map(i => (i.name || '').toLowerCase()));
            const missingInv = INITIAL_INVENTORY.filter(i => !existingInvNames.has(i.name.toLowerCase()));
            const mergedInventory = [...(parsed.inventory || []), ...missingInv];

            dispatch({
              type: 'LOAD_STATE',
              payload: {
                ...parsed,
                products: mergedProducts,
                inventory: mergedInventory,
                orders: parsed.orders || [],
                notifications: (parsed.notifications || INITIAL_NOTIFICATIONS).filter(n => n.type !== 'sale'),
                auth: { ...(parsed.auth || DEFAULT_AUTH), isLoggedIn: false },
              },
            });
            initialLoadDone.current = true;
            return;
          }
        } catch (e) {
          console.log('Error parsing stored bakery state:', e);
        }
      }
      // If no stored state exists yet, save initial state
      safeSetItem(STORAGE_KEY, JSON.stringify(INITIAL_STATE));
      initialLoadDone.current = true;
    });
  }, []);

  // Sync state whenever it changes
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
# 2. OrdersScreen.js (Filter by Date: Today, Yesterday, Any Day + Calendar Modal)
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

// Helper date strings
const getFormattedDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split('T')[0];
};

export default function OrdersScreen({ navigation }) {
  const { state } = useBakery();
  const { orders, auth } = state;

  const [search, setSearch] = useState('');
  const [filterPayment, setFilterPayment] = useState('All');
  const [filterDate, setFilterDate] = useState('All'); // 'All' | 'Today' | 'Yesterday' | '7Days' | YYYY-MM-DD
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const todayStr = getFormattedDate(0);
  const yesterdayStr = getFormattedDate(1);

  // Extract all distinct dates in order records
  const allOrderDates = Array.from(
    new Set(orders.map(o => (o.createdAt || '').split('T')[0]).filter(Boolean))
  ).sort().reverse();

  // Filter orders by payment, search, and DATE
  const filteredOrders = orders.filter(o => {
    const orderDate = (o.createdAt || '').split('T')[0];

    // Date matching
    let matchesDate = true;
    if (filterDate === 'Today') {
      matchesDate = orderDate === todayStr;
    } else if (filterDate === 'Yesterday') {
      matchesDate = orderDate === yesterdayStr;
    } else if (filterDate === '7Days') {
      const orderTs = new Date(o.createdAt || '').getTime();
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      matchesDate = orderTs >= sevenDaysAgo;
    } else if (filterDate !== 'All') {
      matchesDate = orderDate === filterDate;
    }

    // Payment matching
    const matchesPayment =
      filterPayment === 'All' ||
      (o.paymentMethod || '').toLowerCase() === filterPayment.toLowerCase();

    // Search query matching
    const matchesSearch =
      (o.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.customerName || '').toLowerCase().includes(search.toLowerCase());

    return matchesDate && matchesPayment && matchesSearch;
  });

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
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

  const selectCustomDate = (dateStr) => {
    setFilterDate(dateStr);
    setDatePickerVisible(false);
  };

  const getDateLabel = () => {
    if (filterDate === 'All') return 'All Dates';
    if (filterDate === 'Today') return 'Today';
    if (filterDate === 'Yesterday') return 'Yesterday';
    if (filterDate === '7Days') return 'Last 7 Days';
    return filterDate;
  };

  return (
    <View style={styles.container}>
      {/* ─── Screen Header ─── */}
      <ScreenHeader
        canGoBack={canGoBack}
        onBack={() => navigation.goBack()}
        emoji="🧾"
        title="Order History"
        subtitle={`${filteredOrders.length} sales • $${totalRevenue.toFixed(2)} total`}
        rightAction={
          <TouchableOpacity
            style={styles.datePickerTriggerBtn}
            onPress={() => setDatePickerVisible(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="calendar" size={15} color={COLORS.primary} style={{ marginRight: 4 }} />
            <Text style={styles.datePickerTriggerText}>{getDateLabel()}</Text>
            <Ionicons name="chevron-down" size={14} color={COLORS.primary} />
          </TouchableOpacity>
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

      {/* Date Quick Filter Chips */}
      <View style={styles.dateChipsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateChipsContent}>
          <TouchableOpacity
            style={[styles.dateChip, filterDate === 'All' && styles.dateChipActive]}
            onPress={() => setFilterDate('All')}
          >
            <Text style={[styles.dateChipText, filterDate === 'All' && styles.dateChipTextActive]}>All Dates</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dateChip, filterDate === 'Today' && styles.dateChipActive]}
            onPress={() => setFilterDate('Today')}
          >
            <Text style={[styles.dateChipText, filterDate === 'Today' && styles.dateChipTextActive]}>Today</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dateChip, filterDate === 'Yesterday' && styles.dateChipActive]}
            onPress={() => setFilterDate('Yesterday')}
          >
            <Text style={[styles.dateChipText, filterDate === 'Yesterday' && styles.dateChipTextActive]}>Yesterday</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dateChip, filterDate === '7Days' && styles.dateChipActive]}
            onPress={() => setFilterDate('7Days')}
          >
            <Text style={[styles.dateChipText, filterDate === '7Days' && styles.dateChipTextActive]}>Last 7 Days</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dateChip, !['All', 'Today', 'Yesterday', '7Days'].includes(filterDate) && styles.dateChipActive]}
            onPress={() => setDatePickerVisible(true)}
          >
            <Ionicons
              name="calendar-outline"
              size={13}
              color={!['All', 'Today', 'Yesterday', '7Days'].includes(filterDate) ? '#FFF' : COLORS.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.dateChipText, !['All', 'Today', 'Yesterday', '7Days'].includes(filterDate) && styles.dateChipTextActive]}>
              {!['All', 'Today', 'Yesterday', '7Days'].includes(filterDate) ? filterDate : 'Pick Date'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Payment Method Filters */}
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

      {/* Active Filter Indicator Bar */}
      {filterDate !== 'All' && (
        <View style={styles.activeFilterNotice}>
          <Text style={styles.activeFilterNoticeText}>
            Showing orders for: <Text style={{ fontWeight: '800' }}>{getDateLabel()}</Text> ({filteredOrders.length} orders • ${totalRevenue.toFixed(2)})
          </Text>
          <TouchableOpacity onPress={() => setFilterDate('All')}>
            <Text style={styles.clearFilterLink}>Show All</Text>
          </TouchableOpacity>
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
              {search || filterDate !== 'All' ? 'No Matching Orders' : 'No Sales Recorded Yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {filterDate !== 'All'
                ? `No sales found for ${getDateLabel()}. Try selecting "All Dates".`
                : 'Every sale you complete at Point of Sale will appear here permanently.'}
            </Text>
            {filterDate !== 'All' ? (
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setFilterDate('All')}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyActionText}>View All Dates</Text>
              </TouchableOpacity>
            ) : (
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
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                  <Text style={styles.orderDate}>{dateStr} • {timeStr}</Text>
                </View>
                <View style={styles.viewReceiptRow}>
                  <Text style={styles.viewReceiptText}>View Receipt</Text>
                  <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Date Picker Modal */}
      <Modal
        visible={datePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Filter by Date</Text>
                <Text style={styles.modalSubtitle}>Select any day to inspect sales</Text>
              </View>
              <TouchableOpacity onPress={() => setDatePickerVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }}>
              {/* Preset buttons */}
              <View style={styles.presetGrid}>
                <TouchableOpacity
                  style={[styles.presetBtn, filterDate === 'All' && styles.presetBtnActive]}
                  onPress={() => selectCustomDate('All')}
                >
                  <Text style={[styles.presetBtnTitle, filterDate === 'All' && { color: '#FFF' }]}>All Dates</Text>
                  <Text style={[styles.presetBtnSub, filterDate === 'All' && { color: 'rgba(255,255,255,0.8)' }]}>{orders.length} total sales</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.presetBtn, filterDate === 'Today' && styles.presetBtnActive]}
                  onPress={() => selectCustomDate('Today')}
                >
                  <Text style={[styles.presetBtnTitle, filterDate === 'Today' && { color: '#FFF' }]}>Today</Text>
                  <Text style={[styles.presetBtnSub, filterDate === 'Today' && { color: 'rgba(255,255,255,0.8)' }]}>{todayStr}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.presetBtn, filterDate === 'Yesterday' && styles.presetBtnActive]}
                  onPress={() => selectCustomDate('Yesterday')}
                >
                  <Text style={[styles.presetBtnTitle, filterDate === 'Yesterday' && { color: '#FFF' }]}>Yesterday</Text>
                  <Text style={[styles.presetBtnSub, filterDate === 'Yesterday' && { color: 'rgba(255,255,255,0.8)' }]}>{yesterdayStr}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.presetBtn, filterDate === '7Days' && styles.presetBtnActive]}
                  onPress={() => selectCustomDate('7Days')}
                >
                  <Text style={[styles.presetBtnTitle, filterDate === '7Days' && { color: '#FFF' }]}>Last 7 Days</Text>
                  <Text style={[styles.presetBtnSub, filterDate === '7Days' && { color: 'rgba(255,255,255,0.8)' }]}>Weekly Summary</Text>
                </TouchableOpacity>
              </View>

              {/* List of distinct dates with sales */}
              <Text style={styles.datePickerSectionTitle}>RECORDED DATES IN SYSTEM</Text>
              {allOrderDates.length === 0 ? (
                <Text style={styles.noDatesText}>No sales recorded on other dates yet.</Text>
              ) : (
                allOrderDates.map(dateItem => {
                  const dayOrders = orders.filter(o => (o.createdAt || '').startsWith(dateItem));
                  const dayRevenue = dayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
                  const isSelected = filterDate === dateItem;

                  return (
                    <TouchableOpacity
                      key={dateItem}
                      style={[styles.dateListItem, isSelected && styles.dateListItemActive]}
                      onPress={() => selectCustomDate(dateItem)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons
                          name="calendar"
                          size={18}
                          color={isSelected ? COLORS.primary : COLORS.textMuted}
                          style={{ marginRight: 10 }}
                        />
                        <View>
                          <Text style={[styles.dateListTitle, isSelected && { color: COLORS.primary }]}>
                            {dateItem} {dateItem === todayStr ? '(Today)' : dateItem === yesterdayStr ? '(Yesterday)' : ''}
                          </Text>
                          <Text style={styles.dateListSub}>{dayOrders.length} transactions</Text>
                        </View>
                      </View>
                      <Text style={[styles.dateListRevenue, isSelected && { color: COLORS.primaryDark }]}>
                        ${dayRevenue.toFixed(2)}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  datePickerTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary + '33',
  },
  datePickerTriggerText: {
    color: COLORS.primaryDark,
    fontSize: FONTS.xs,
    fontWeight: '800',
    marginRight: 4,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 40,
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
  // Date Chips Row
  dateChipsWrapper: {
    paddingVertical: 6,
  },
  dateChipsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dateChipText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  dateChipTextActive: {
    color: '#FFF',
  },
  // Payment Filters
  paymentFilters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 8,
  },
  payTab: {
    flex: 1,
    paddingVertical: 6,
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
  // Active Filter Notice Bar
  activeFilterNotice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: RADIUS.md,
  },
  activeFilterNoticeText: {
    fontSize: FONTS.xs,
    color: COLORS.primaryDark,
  },
  clearFilterLink: {
    fontSize: FONTS.xs,
    fontWeight: '800',
    color: COLORS.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 110,
    gap: 10,
    flexGrow: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: FONTS.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
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
  // Modal Date Picker
  datePickerModalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 20,
    maxHeight: '80%',
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetBtn: {
    width: '48%',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  presetBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  presetBtnTitle: {
    fontSize: FONTS.sm,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  presetBtnSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  datePickerSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  noDatesText: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    paddingVertical: 12,
  },
  dateListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  dateListItemActive: {
    backgroundColor: COLORS.primaryLight + '40',
    paddingHorizontal: 8,
    borderRadius: RADIUS.md,
  },
  dateListTitle: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dateListSub: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  dateListRevenue: {
    fontSize: FONTS.sm,
    fontWeight: '800',
    color: COLORS.textPrimary,
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

# ==========================================
# 3. AnalyticsScreen.js (Income Ledger by Date: Today, Yesterday, Any Day + History Log)
# ==========================================
ANALYTICS_CODE = '''import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBakery } from '../store/BakeryStore';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';

const getFormattedDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split('T')[0];
};

export default function AnalyticsScreen({ navigation }) {
  const { state } = useBakery();
  const { orders } = state;

  const [selectedPeriod, setSelectedPeriod] = useState('Today'); // 'Today' | 'Yesterday' | '7Days' | 'All' | YYYY-MM-DD
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const todayStr = getFormattedDate(0);
  const yesterdayStr = getFormattedDate(1);

  // Distinct dates with sales
  const allOrderDates = Array.from(
    new Set(orders.map(o => (o.createdAt || '').split('T')[0]).filter(Boolean))
  ).sort().reverse();

  // Filter orders according to selected period/date
  const filteredOrders = orders.filter(o => {
    const orderDate = (o.createdAt || '').split('T')[0];
    if (selectedPeriod === 'Today') return orderDate === todayStr;
    if (selectedPeriod === 'Yesterday') return orderDate === yesterdayStr;
    if (selectedPeriod === '7Days') {
      const orderTs = new Date(o.createdAt || '').getTime();
      return orderTs >= Date.now() - 7 * 24 * 60 * 60 * 1000;
    }
    if (selectedPeriod === 'All') return true;
    return orderDate === selectedPeriod;
  });

  const periodRevenue = filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const cashOrders = filteredOrders.filter(o => (o.paymentMethod || '').toLowerCase() === 'cash');
  const cardOrders = filteredOrders.filter(o => (o.paymentMethod || '').toLowerCase() === 'card');
  const mobileOrders = filteredOrders.filter(o => (o.paymentMethod || '').toLowerCase() === 'mobile');

  const cashTotal = cashOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const cardTotal = cardOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const mobileTotal = mobileOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const allTimeRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const getPeriodLabel = () => {
    if (selectedPeriod === 'Today') return "Today's Collections";
    if (selectedPeriod === 'Yesterday') return "Yesterday's Collections";
    if (selectedPeriod === '7Days') return "Last 7 Days Collections";
    if (selectedPeriod === 'All') return "All-Time Collections";
    return `Collections for ${selectedPeriod}`;
  };

  const handleGoToOrders = () => {
    try {
      navigation.navigate('Orders');
    } catch (e) {
      navigation.navigate('History');
    }
  };

  return (
    <View style={styles.container}>
      {/* ─── Screen Header ─── */}
      <ScreenHeader
        canGoBack
        onBack={() => navigation.goBack()}
        emoji="💳"
        title="Income Ledger"
        subtitle={`Period total: $${periodRevenue.toFixed(2)} • All time: $${allTimeRevenue.toFixed(2)}`}
        rightAction={
          <TouchableOpacity
            style={styles.pickerHeaderBtn}
            onPress={() => setDatePickerVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
            <Text style={styles.pickerHeaderBtnText}>
              {selectedPeriod === 'Today' ? 'Today' : selectedPeriod === 'Yesterday' ? 'Yesterday' : selectedPeriod === '7Days' ? '7 Days' : selectedPeriod === 'All' ? 'All' : selectedPeriod}
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Date Selector Filter Pills */}
        <View style={styles.filterPillsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <TouchableOpacity
              style={[styles.periodPill, selectedPeriod === 'Today' && styles.periodPillActive]}
              onPress={() => setSelectedPeriod('Today')}
            >
              <Text style={[styles.periodPillText, selectedPeriod === 'Today' && styles.periodPillTextActive]}>Today</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.periodPill, selectedPeriod === 'Yesterday' && styles.periodPillActive]}
              onPress={() => setSelectedPeriod('Yesterday')}
            >
              <Text style={[styles.periodPillText, selectedPeriod === 'Yesterday' && styles.periodPillTextActive]}>Yesterday</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.periodPill, selectedPeriod === '7Days' && styles.periodPillActive]}
              onPress={() => setSelectedPeriod('7Days')}
            >
              <Text style={[styles.periodPillText, selectedPeriod === '7Days' && styles.periodPillTextActive]}>Last 7 Days</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.periodPill, selectedPeriod === 'All' && styles.periodPillActive]}
              onPress={() => setSelectedPeriod('All')}
            >
              <Text style={[styles.periodPillText, selectedPeriod === 'All' && styles.periodPillTextActive]}>All Time</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.periodPill, !['Today', 'Yesterday', '7Days', 'All'].includes(selectedPeriod) && styles.periodPillActive]}
              onPress={() => setDatePickerVisible(true)}
            >
              <Ionicons
                name="calendar-outline"
                size={13}
                color={!['Today', 'Yesterday', '7Days', 'All'].includes(selectedPeriod) ? '#FFF' : COLORS.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.periodPillText, !['Today', 'Yesterday', '7Days', 'All'].includes(selectedPeriod) && styles.periodPillTextActive]}>
                {!['Today', 'Yesterday', '7Days', 'All'].includes(selectedPeriod) ? selectedPeriod : 'Pick Date'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Selected Period Hero Card */}
        <View style={styles.totalHeroCard}>
          <Text style={styles.heroLabel}>{getPeriodLabel().toUpperCase()}</Text>
          <Text style={styles.heroAmount}>${periodRevenue.toFixed(2)}</Text>
          <Text style={styles.heroSub}>
            {filteredOrders.length} transactions completed ({selectedPeriod === 'Today' ? todayStr : selectedPeriod === 'Yesterday' ? yesterdayStr : selectedPeriod})
          </Text>
        </View>

        {/* Collections Breakdown by Payment Method */}
        <Text style={styles.sectionTitle}>Payment Method Breakdown</Text>

        <View style={styles.methodCard}>
          <View style={[styles.methodRow, { borderLeftColor: COLORS.cashColor }]}>
            <View style={styles.methodInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, marginRight: 8 }}>💵</Text>
                <View>
                  <Text style={styles.methodName}>Cash Drawer</Text>
                  <Text style={styles.methodCount}>{cashOrders.length} transactions</Text>
                </View>
              </View>
              <Text style={[styles.methodAmount, { color: COLORS.cashColor }]}>
                ${cashTotal.toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={[styles.methodRow, { borderLeftColor: COLORS.cardColor }]}>
            <View style={styles.methodInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, marginRight: 8 }}>💳</Text>
                <View>
                  <Text style={styles.methodName}>Credit & Debit Card</Text>
                  <Text style={styles.methodCount}>{cardOrders.length} transactions</Text>
                </View>
              </View>
              <Text style={[styles.methodAmount, { color: COLORS.cardColor }]}>
                ${cardTotal.toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={[styles.methodRow, { borderLeftColor: COLORS.mobileColor, borderBottomWidth: 0 }]}>
            <View style={styles.methodInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, marginRight: 8 }}>📱</Text>
                <View>
                  <Text style={styles.methodName}>Mobile Money / Telebirr</Text>
                  <Text style={styles.methodCount}>{mobileOrders.length} transactions</Text>
                </View>
              </View>
              <Text style={[styles.methodAmount, { color: COLORS.mobileColor }]}>
                ${mobileTotal.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── Historical Daily Breakdown Log ─── */}
        <Text style={styles.sectionTitle}>Daily Performance Log</Text>
        <View style={styles.dailyHistoryCard}>
          {allOrderDates.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: COLORS.textMuted }}>No historical days recorded yet.</Text>
            </View>
          ) : (
            allOrderDates.map((dateStr, idx) => {
              const dayOrders = orders.filter(o => (o.createdAt || '').startsWith(dateStr));
              const dayTotal = dayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
              const dayCash = dayOrders.filter(o => (o.paymentMethod || '').toLowerCase() === 'cash').reduce((s, o) => s + (Number(o.total) || 0), 0);
              const dayCard = dayOrders.filter(o => (o.paymentMethod || '').toLowerCase() === 'card').reduce((s, o) => s + (Number(o.total) || 0), 0);
              const dayMobile = dayOrders.filter(o => (o.paymentMethod || '').toLowerCase() === 'mobile').reduce((s, o) => s + (Number(o.total) || 0), 0);

              const isSelected = selectedPeriod === dateStr;

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[
                    styles.dailyHistoryRow,
                    idx === allOrderDates.length - 1 && { borderBottomWidth: 0 },
                    isSelected && { backgroundColor: COLORS.primaryLight + '40' },
                  ]}
                  onPress={() => setSelectedPeriod(dateStr)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.dailyHistoryDate}>{dateStr}</Text>
                      {dateStr === todayStr && <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>Today</Text></View>}
                      {dateStr === yesterdayStr && <View style={styles.yesterdayBadge}><Text style={styles.yesterdayBadgeText}>Yesterday</Text></View>}
                    </View>
                    <Text style={styles.dailyHistorySub}>
                      {dayOrders.length} sales • Cash: ${dayCash.toFixed(0)} | Card: ${dayCard.toFixed(0)} | Mobile: ${dayMobile.toFixed(0)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.dailyHistoryTotal}>${dayTotal.toFixed(2)}</Text>
                    <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} style={{ marginTop: 2 }} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Quick Navigate Back to POS or Orders */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => navigation.navigate('POS')}
            activeOpacity={0.8}
          >
            <Ionicons name="cart" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.navBtnText}>New Checkout</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={handleGoToOrders}
            activeOpacity={0.8}
          >
            <Ionicons name="receipt" size={18} color={COLORS.info} style={{ marginRight: 6 }} />
            <Text style={[styles.navBtnText, { color: COLORS.info }]}>View Orders</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal
        visible={datePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Date for Ledger</Text>
                <Text style={styles.modalSubtitle}>Inspect income and method breakdown</Text>
              </View>
              <TouchableOpacity onPress={() => setDatePickerVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }}>
              <View style={styles.presetGrid}>
                <TouchableOpacity
                  style={[styles.presetBtn, selectedPeriod === 'Today' && styles.presetBtnActive]}
                  onPress={() => { setSelectedPeriod('Today'); setDatePickerVisible(false); }}
                >
                  <Text style={[styles.presetBtnTitle, selectedPeriod === 'Today' && { color: '#FFF' }]}>Today</Text>
                  <Text style={[styles.presetBtnSub, selectedPeriod === 'Today' && { color: 'rgba(255,255,255,0.8)' }]}>{todayStr}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.presetBtn, selectedPeriod === 'Yesterday' && styles.presetBtnActive]}
                  onPress={() => { setSelectedPeriod('Yesterday'); setDatePickerVisible(false); }}
                >
                  <Text style={[styles.presetBtnTitle, selectedPeriod === 'Yesterday' && { color: '#FFF' }]}>Yesterday</Text>
                  <Text style={[styles.presetBtnSub, selectedPeriod === 'Yesterday' && { color: 'rgba(255,255,255,0.8)' }]}>{yesterdayStr}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.presetBtn, selectedPeriod === '7Days' && styles.presetBtnActive]}
                  onPress={() => { setSelectedPeriod('7Days'); setDatePickerVisible(false); }}
                >
                  <Text style={[styles.presetBtnTitle, selectedPeriod === '7Days' && { color: '#FFF' }]}>Last 7 Days</Text>
                  <Text style={[styles.presetBtnSub, selectedPeriod === '7Days' && { color: 'rgba(255,255,255,0.8)' }]}>Weekly Ledger</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.presetBtn, selectedPeriod === 'All' && styles.presetBtnActive]}
                  onPress={() => { setSelectedPeriod('All'); setDatePickerVisible(false); }}
                >
                  <Text style={[styles.presetBtnTitle, selectedPeriod === 'All' && { color: '#FFF' }]}>All Time</Text>
                  <Text style={[styles.presetBtnSub, selectedPeriod === 'All' && { color: 'rgba(255,255,255,0.8)' }]}>Total Business</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.datePickerSectionTitle}>OR PICK ANY SPECIFIC DAY</Text>
              {allOrderDates.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.dateListItem, selectedPeriod === d && styles.dateListItemActive]}
                  onPress={() => { setSelectedPeriod(d); setDatePickerVisible(false); }}
                >
                  <Text style={[styles.dateListTitle, selectedPeriod === d && { color: COLORS.primary }]}>{d}</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  pickerHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary + '33',
  },
  pickerHeaderBtnText: {
    color: COLORS.primaryDark,
    fontSize: FONTS.xs,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  filterPillsRow: {
    marginBottom: 14,
  },
  periodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodPillText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  periodPillTextActive: {
    color: '#FFF',
  },
  totalHeroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: 20,
    alignItems: 'center',
    marginBottom: 18,
    ...SHADOWS.md,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.8,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    marginVertical: 6,
    letterSpacing: -0.6,
  },
  heroSub: {
    fontSize: FONTS.xs,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  methodCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 20,
    ...SHADOWS.sm,
  },
  methodRow: {
    padding: 16,
    borderLeftWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  methodInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  methodName: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  methodCount: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  methodAmount: {
    fontSize: FONTS.md,
    fontWeight: '800',
  },
  // Daily History Card
  dailyHistoryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    ...SHADOWS.sm,
  },
  dailyHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  dailyHistoryDate: {
    fontSize: FONTS.sm,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  todayBadge: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
    marginLeft: 6,
  },
  todayBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.success,
  },
  yesterdayBadge: {
    backgroundColor: COLORS.infoLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
    marginLeft: 6,
  },
  yesterdayBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.info,
  },
  dailyHistorySub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  dailyHistoryTotal: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  navBtnText: {
    fontSize: FONTS.xs,
    fontWeight: '800',
    color: COLORS.primary,
  },
  // Date Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  datePickerModalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 20,
    maxHeight: '80%',
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
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetBtn: {
    width: '48%',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  presetBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  presetBtnTitle: {
    fontSize: FONTS.sm,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  presetBtnSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  datePickerSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  dateListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  dateListItemActive: {
    backgroundColor: COLORS.primaryLight + '40',
    paddingHorizontal: 8,
    borderRadius: RADIUS.md,
  },
  dateListTitle: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
'''

# ==========================================
# 4. ProfileScreen.js (With Storage Status & Database Export/Backup)
# ==========================================
PROFILE_CODE = '''import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBakery } from '../store/BakeryStore';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';

export default function ProfileScreen({ navigation }) {
  const { state, dispatch } = useBakery();
  const { auth, orders, products, inventory } = state;

  const [editMode, setEditMode] = useState(null); // 'username' | 'password' | 'business' | null
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const canGoBack = navigation && typeof navigation.canGoBack === 'function' && navigation.canGoBack();

  const openEdit = (mode) => {
    setEditMode(mode);
    setNewUsername(auth.username);
    setNewPassword('');
    setConfirmPassword('');
    setCurrentPassword('');
    setBusinessName(auth.businessName || '');
    setShowPass(false);
    setShowNewPass(false);
  };

  const handleSaveUsername = () => {
    if (!newUsername.trim()) {
      Alert.alert('Error', 'Username cannot be empty.');
      return;
    }
    dispatch({
      type: 'UPDATE_CREDENTIALS',
      payload: { newUsername: newUsername.trim() },
    });
    Alert.alert('Success', 'Username updated successfully!');
    setEditMode(null);
  };

  const handleSavePassword = () => {
    if (currentPassword !== auth.password) {
      Alert.alert('Error', 'Current password is incorrect.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      Alert.alert('Error', 'New password must be at least 4 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
    dispatch({
      type: 'UPDATE_CREDENTIALS',
      payload: { newPassword },
    });
    Alert.alert('Success', 'Password changed successfully!');
    setEditMode(null);
  };

  const handleSaveBusinessName = () => {
    if (!businessName.trim()) {
      Alert.alert('Error', 'Business name cannot be empty.');
      return;
    }
    dispatch({
      type: 'UPDATE_CREDENTIALS',
      payload: { businessName: businessName.trim() },
    });
    Alert.alert('Success', 'Business name updated!');
    setEditMode(null);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => dispatch({ type: 'LOGOUT' }),
        },
      ]
    );
  };

  const handleResetSales = () => {
    Alert.alert(
      'Clear Sales Records',
      'Are you sure you want to clear all order history and reset daily sales to zero? (Your products and inventory will remain safe)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Sales',
          style: 'destructive',
          onPress: () => {
            dispatch({ type: 'RESET_ORDERS' });
            Alert.alert('Cleared', 'All sales records have been cleared to zero.');
          },
        },
      ]
    );
  };

  const handleExportBackup = async () => {
    try {
      const backupData = JSON.stringify(
        {
          app: 'Bakery Mobile System',
          version: '2.0',
          exportedAt: new Date().toISOString(),
          products,
          inventory,
          orders,
          auth: { ...auth, isLoggedIn: false },
        },
        null,
        2
      );

      await Share.share({
        title: `Bakery Backup - ${new Date().toISOString().split('T')[0]}`,
        message: backupData,
      });
    } catch (e) {
      Alert.alert('Export', 'Backup data prepared.');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o => o.createdAt && o.createdAt.startsWith(todayStr));
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  return (
    <View style={styles.container}>
      {/* ─── Interactive Screen Header ─── */}
      <ScreenHeader
        canGoBack={canGoBack}
        onBack={() => navigation.goBack()}
        emoji="👤"
        title="My Profile"
        subtitle={`${auth.role || 'Manager'} • Active Session`}
        badge="🟢 Online"
        badgeColor={COLORS.success}
        rightAction={
          <TouchableOpacity
            style={styles.headerLogoutBtn}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={16} color={COLORS.danger} style={{ marginRight: 4 }} />
            <Text style={styles.headerLogoutText}>Logout</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Hero Card */}
        <View style={styles.profileHero}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>
              {(auth.username || 'A').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.displayName}>{auth.username}</Text>
          <Text style={styles.displayRole}>{auth.role || 'Bakery Manager'}</Text>
          <Text style={styles.displayBusiness}>{auth.businessName || 'Bakery'}</Text>

          <View style={styles.statRow}>
            <View style={styles.statPill}>
              <Text style={styles.statPillValue}>{orders.length}</Text>
              <Text style={styles.statPillLabel}>All Orders</Text>
            </View>
            <View style={[styles.statPill, styles.statPillHighlight]}>
              <Text style={[styles.statPillValue, { color: COLORS.primary }]}>
                ${todayRevenue.toFixed(2)}
              </Text>
              <Text style={styles.statPillLabel}>Today</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillValue}>{products.length}</Text>
              <Text style={styles.statPillLabel}>Products</Text>
            </View>
          </View>
        </View>

        {/* ─── Phone Storage & Persistence Status ─── */}
        <View style={styles.storageStatusCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Ionicons name="save" size={18} color={COLORS.success} style={{ marginRight: 8 }} />
            <Text style={styles.storageStatusTitle}>Automatic Phone Storage Active</Text>
          </View>
          <Text style={styles.storageStatusSub}>
            All menu items you add via "+ New Item", raw ingredients, and sales records are permanently saved to your device's memory. No code editing needed!
          </Text>
          <View style={styles.storageStatsRow}>
            <Text style={styles.storageStatText}>• {products.length} Products</Text>
            <Text style={styles.storageStatText}>• {inventory.length} Ingredients</Text>
            <Text style={styles.storageStatText}>• {orders.length} Receipts</Text>
          </View>

          <TouchableOpacity style={styles.backupBtn} onPress={handleExportBackup} activeOpacity={0.8}>
            <Ionicons name="cloud-download-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.backupBtnText}>Export / Backup Database JSON</Text>
          </TouchableOpacity>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT CREDENTIALS</Text>

          {/* Change Username */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => openEdit('username')}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="person-outline" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Username</Text>
              <Text style={styles.settingValue}>{auth.username}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Change Password */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => openEdit('password')}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIcon, { backgroundColor: COLORS.infoLight }]}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.info} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Password</Text>
              <Text style={styles.settingValue}>{'•'.repeat(auth.password?.length || 4)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Business Name */}
          <TouchableOpacity
            style={[styles.settingRow, styles.lastRow]}
            onPress={() => openEdit('business')}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIcon, { backgroundColor: COLORS.successLight }]}>
              <Ionicons name="storefront-outline" size={18} color={COLORS.success} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Bakery Name</Text>
              <Text style={styles.settingValue} numberOfLines={1}>{auth.businessName || 'Bakery'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SYSTEM STATUS</Text>

          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.purple} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Application Version</Text>
              <Text style={styles.settingValue}>Bakery System v2.0</Text>
            </View>
          </View>

          <View style={[styles.settingRow, styles.lastRow]}>
            <View style={[styles.settingIcon, { backgroundColor: COLORS.successLight }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.success} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Local Database Mode</Text>
              <Text style={[styles.settingValue, { color: COLORS.success, fontWeight: '700' }]}>
                Ready & Offline Capable
              </Text>
            </View>
          </View>
        </View>

        {/* Clear Sales Data / Reset Button */}
        <TouchableOpacity
          style={styles.clearDataBtn}
          onPress={handleResetSales}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-circle-outline" size={18} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.clearDataText}>Reset / Clear Sales Records</Text>
        </TouchableOpacity>

        {/* Sign Out Action Button */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} style={{ marginRight: 8 }} />
          <Text style={styles.signOutText}>Sign Out from Terminal</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Modal: Username */}
      {editMode === 'username' && (
        <View style={styles.editOverlay}>
          <View style={styles.editBox}>
            <Text style={styles.editTitle}>Change Username</Text>
            <TextInput
              style={styles.editInput}
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="New username"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.editCancelBtn} onPress={() => setEditMode(null)}>
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editSaveBtn} onPress={handleSaveUsername}>
                <Text style={styles.editSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Edit Modal: Password */}
      {editMode === 'password' && (
        <View style={styles.editOverlay}>
          <View style={styles.editBox}>
            <Text style={styles.editTitle}>Change Password</Text>
            <TextInput
              style={styles.editInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current password"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showPass}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.editInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password (min 4 characters)"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showNewPass}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.editInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showNewPass}
              autoCapitalize="none"
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.editCancelBtn} onPress={() => setEditMode(null)}>
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editSaveBtn} onPress={handleSavePassword}>
                <Text style={styles.editSaveText}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Edit Modal: Business Name */}
      {editMode === 'business' && (
        <View style={styles.editOverlay}>
          <View style={styles.editBox}>
            <Text style={styles.editTitle}>Update Bakery Name</Text>
            <TextInput
              style={styles.editInput}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Bakery Name"
              placeholderTextColor={COLORS.textMuted}
              autoFocus
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.editCancelBtn} onPress={() => setEditMode(null)}>
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editSaveBtn} onPress={handleSaveBusinessName}>
                <Text style={styles.editSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  headerLogoutText: {
    color: COLORS.danger,
    fontSize: FONTS.xs,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 110,
  },
  profileHero: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  avatarLetter: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
  },
  displayName: {
    fontSize: FONTS.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  displayRole: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  displayBusiness: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
    width: '100%',
  },
  statPill: {
    flex: 1,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  statPillHighlight: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary + '33',
  },
  statPillValue: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statPillLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  // Storage Status Card
  storageStatusCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 16,
  },
  storageStatusTitle: {
    fontSize: FONTS.sm,
    fontWeight: '800',
    color: '#15803D',
  },
  storageStatusSub: {
    fontSize: FONTS.xs,
    color: '#166534',
    lineHeight: 18,
    marginBottom: 10,
  },
  storageStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  storageStatText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  backupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backupBtnText: {
    fontSize: FONTS.xs,
    fontWeight: '800',
    color: COLORS.primary,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  settingValue: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  clearDataBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clearDataText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.xs,
    fontWeight: '700',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLORS.danger + '33',
  },
  signOutText: {
    color: COLORS.danger,
    fontSize: FONTS.sm,
    fontWeight: '800',
  },
  // Edit Overlay Modals
  editOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 99,
  },
  editBox: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 20,
    ...SHADOWS.lg,
  },
  editTitle: {
    fontSize: FONTS.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
  editInput: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: FONTS.sm,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  editCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSubtle,
  },
  editCancelText: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  editSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  editSaveText: {
    fontSize: FONTS.sm,
    fontWeight: '800',
    color: '#FFF',
  },
});
'''

FILES_TO_WRITE = [
  (os.path.join(MOBILE_ROOT, 'src', 'store', 'BakeryStore.js'), BAKERY_STORE_CODE),
  (os.path.join(MOBILE_ROOT, 'src', 'screens', 'OrdersScreen.js'), ORDERS_CODE),
  (os.path.join(MOBILE_ROOT, 'src', 'screens', 'AnalyticsScreen.js'), ANALYTICS_CODE),
  (os.path.join(MOBILE_ROOT, 'src', 'screens', 'ProfileScreen.js'), PROFILE_CODE),
]

def main():
  for path, content in FILES_TO_WRITE:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
      f.write(content.strip() + '\n')
    print(f'Successfully updated: {path}')

if __name__ == '__main__':
  main()
