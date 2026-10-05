import React from 'react';
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
import ItemsSoldScreen from './src/screens/ItemsSoldScreen';
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
      <HomeStack.Screen name="ItemsSold" component={ItemsSoldScreen} />
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
