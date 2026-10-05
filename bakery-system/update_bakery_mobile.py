import os
import sys

MOBILE_ROOT = r'c:\Users\user\Desktop\bakery-mobile'

# ==========================================
# 1. BakeryStore.js (No Mock Orders, soldCount 0, Fresh Live Ready)
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

// Bumping to fresh live storage key to remove any cached mock data
const STORAGE_KEY = '@bakery_live_production_store_v2';

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

// Clean: 0 mock orders - ready for real usage
export const INITIAL_ORDERS = [];

const DEFAULT_AUTH = {
  username: 'admin',
  password: '1234',
  businessName: 'Bakery',
  role: 'Manager',
  isLoggedIn: false,
};

const INITIAL_STATE = {
  products: INITIAL_PRODUCTS,
  inventory: INITIAL_INVENTORY,
  orders: INITIAL_ORDERS,
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
      return {
        ...state,
        orders: [order, ...state.orders],
        products: updatedProducts,
      };
    }

    case 'RESET_ORDERS':
      return {
        ...state,
        orders: [],
        products: state.products.map(p => ({ ...p, soldCount: 0 })),
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
      return {
        ...state,
        inventory: state.inventory.map(item => {
          if (item.id !== id) return item;
          let newStock = item.stock;
          if (mode === 'set') newStock = Math.max(0, numAmount);
          else if (mode === 'add') newStock = item.stock + numAmount;
          else if (mode === 'sub') newStock = Math.max(0, item.stock - numAmount);
          return { ...item, stock: parseFloat(newStock.toFixed(2)) };
        }),
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
# 2. App.js (Registers both 'Orders' and 'History' on HomeStack + Tab)
# ==========================================
APP_CODE = '''import React from 'react';
import { Platform } from 'react-native';
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

// Home Stack: Dashboard + all feature screens
// Register BOTH "Orders" and "History" so any navigation calls succeed seamlessly!
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

// Root app that gates between Login and Main tabs
function RootNavigator() {
  const { state } = useBakery();
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

# ==========================================
# 3. DashboardScreen.js (Removed "Live Register", Fixed Navigation to History/Orders)
# ==========================================
DASHBOARD_CODE = '''import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
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
    route: 'Orders', // Handled seamlessly
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
  const { state } = useBakery();
  const { products, orders, inventory, auth } = state;

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

  const currentHour = new Date().getHours();
  const greetingText = currentHour < 12 ? 'Good Morning ☀️' : currentHour < 17 ? 'Good Afternoon 🌤️' : 'Good Evening 🌙';

  const handleNavigate = (route) => {
    if (route === 'Orders') {
      // Safe navigation: works whether on stack or switching tabs
      try {
        navigation.navigate('Orders');
      } catch (e) {
        navigation.navigate('History');
      }
    } else {
      navigation.navigate(route);
    }
  };

  return (
    <View style={styles.safeArea}>
      {/* ─── Top App Header (Live Register Removed) ─── */}
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
          <TouchableOpacity
            style={styles.quickPosBtn}
            onPress={() => navigation.navigate('POS')}
            activeOpacity={0.8}
          >
            <Ionicons name="cart" size={16} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.quickPosBtnText}>POS</Text>
          </TouchableOpacity>

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
    gap: 8,
  },
  quickPosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    ...SHADOWS.sm,
  },
  quickPosBtnText: {
    color: '#FFF',
    fontSize: FONTS.xs,
    fontWeight: '800',
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
});
'''

# ==========================================
# 4. OrdersScreen.js (With Back Button support & Clean Empty State)
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

const FILTER_PAYMENTS = ['All', 'Cash', 'Card', 'Mobile'];

export default function OrdersScreen({ navigation }) {
  const { state } = useBakery();
  const { orders } = state;

  const [search, setSearch] = useState('');
  const [filterPayment, setFilterPayment] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

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

      {/* Order Detail Modal */}
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
                  <Text style={styles.receiptBrand}>BAKERY</Text>
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

              <TouchableOpacity
                style={styles.modalDoneBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalDoneText}>Close Receipt</Text>
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
    marginBottom: 16,
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
    marginBottom: 16,
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
  modalDoneBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalDoneText: {
    color: '#FFF',
    fontSize: FONTS.sm,
    fontWeight: '800',
  },
});
'''

# ==========================================
# 5. ProfileScreen.js (With Back button support & Clear Sales option)
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBakery } from '../store/BakeryStore';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';

export default function ProfileScreen({ navigation }) {
  const { state, dispatch } = useBakery();
  const { auth, orders, products } = state;

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
              <Text style={styles.settingTitle}>Local Database</Text>
              <Text style={[styles.settingValue, { color: COLORS.success, fontWeight: '700' }]}>
                Ready & Active
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
    marginBottom: 18,
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

# ==========================================
# 6. AnalyticsScreen.js (Safe navigation to Orders / POS)
# ==========================================
ANALYTICS_CODE = '''import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBakery } from '../store/BakeryStore';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';

export default function AnalyticsScreen({ navigation }) {
  const { state } = useBakery();
  const { orders } = state;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o => o.createdAt && o.createdAt.startsWith(todayStr));
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const cashOrders = todayOrders.filter(o => (o.paymentMethod || '').toLowerCase() === 'cash');
  const cardOrders = todayOrders.filter(o => (o.paymentMethod || '').toLowerCase() === 'card');
  const mobileOrders = todayOrders.filter(o => (o.paymentMethod || '').toLowerCase() === 'mobile');

  const cashTotal = cashOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const cardTotal = cardOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const mobileTotal = mobileOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const allTimeRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const handleGoToOrders = () => {
    try {
      navigation.navigate('Orders');
    } catch (e) {
      navigation.navigate('History');
    }
  };

  return (
    <View style={styles.container}>
      {/* ─── Interactive Screen Header ─── */}
      <ScreenHeader
        canGoBack
        onBack={() => navigation.goBack()}
        emoji="💳"
        title="Income Ledger"
        subtitle={`Today gathered: $${todayRevenue.toFixed(2)} • All time: $${allTimeRevenue.toFixed(2)}`}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Total Today Card */}
        <View style={styles.totalHeroCard}>
          <Text style={styles.heroLabel}>TODAY'S TOTAL GATHERED</Text>
          <Text style={styles.heroAmount}>${todayRevenue.toFixed(2)}</Text>
          <Text style={styles.heroSub}>{todayOrders.length} transactions completed today</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 110,
  },
  totalHeroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
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
});
'''

FILES_TO_WRITE = [
  (os.path.join(MOBILE_ROOT, 'src', 'store', 'BakeryStore.js'), BAKERY_STORE_CODE),
  (os.path.join(MOBILE_ROOT, 'App.js'), APP_CODE),
  (os.path.join(MOBILE_ROOT, 'src', 'screens', 'DashboardScreen.js'), DASHBOARD_CODE),
  (os.path.join(MOBILE_ROOT, 'src', 'screens', 'OrdersScreen.js'), ORDERS_CODE),
  (os.path.join(MOBILE_ROOT, 'src', 'screens', 'ProfileScreen.js'), PROFILE_CODE),
  (os.path.join(MOBILE_ROOT, 'src', 'screens', 'AnalyticsScreen.js'), ANALYTICS_CODE),
]

def main():
  for path, content in FILES_TO_WRITE:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
      f.write(content.strip() + '\n')
    print(f'Successfully updated: {path}')

if __name__ == '__main__':
  main()
