import React, { useState, useEffect } from 'react';
import { Platform, View, Text, ActivityIndicator, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BakeryProvider, useBakery } from './src/store/BakeryStore';
import EulaModal, { EULA_STORAGE_KEY } from './src/components/EulaModal';
import DeviceLockoutModal from './src/components/DeviceLockoutModal';
import {
  getCloudConfig,
  getDeviceInfo,
  checkApprovalStatus,
  connectToTerminalEventStream,
  setDeviceStatus,
  pushBatchOrders
} from './src/services/cloudSyncService';
import { COLORS } from './src/theme/colors';

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
  // Ensure enough height so labels are never clipped across platforms
  const barHeight = Platform.OS === 'ios' ? 64 + insets.bottom : 68 + insets.bottom;
  const bottomPadding = insets.bottom > 0 ? insets.bottom + 2 : 8;

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
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={21} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          borderTopWidth: 1,
          height: barHeight,
          paddingBottom: bottomPadding,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          paddingBottom: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
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

// Root app: Loading → Login → Agreement Popup → Main tabs + Realtime Enforcement Lockout
function RootNavigator() {
  const { state, isReady, dispatch } = useBakery();
  const [eulaAccepted, setEulaAccepted] = useState(true);
  const [checkedEula, setCheckedEula] = useState(false);

  // Terminal Lockout State
  const [lockoutActive, setLockoutActive] = useState(false);
  const [lockoutStatus, setLockoutStatus] = useState('active');
  const [lockoutReason, setLockoutReason] = useState('');
  const [cloudCfg, setCloudCfg] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);

  // Check initial EULA
  useEffect(() => {
    AsyncStorage.getItem(EULA_STORAGE_KEY)
      .then(val => {
        setEulaAccepted(!!val);
        setCheckedEula(true);
      })
      .catch(() => setCheckedEula(true));
  }, []);

  // Hydrate Cloud Config & Device Info
  useEffect(() => {
    getCloudConfig().then(cfg => {
      setCloudCfg(cfg);
      if (['suspended', 'blocked', 'unlinked', 'offline_expired'].includes(cfg.deviceStatus)) {
        setLockoutStatus(cfg.deviceStatus);
        setLockoutReason(cfg.lockoutMessage || '');
        setLockoutActive(true);
      }
    });
    getDeviceInfo().then(info => setDeviceInfo(info));
  }, []);

  // Periodic Terminal Status Check & Realtime SSE Stream
  useEffect(() => {
    let isMounted = true;

    const verifyStatus = async () => {
      try {
        const res = await checkApprovalStatus();
        if (!isMounted) return;
        if (res.status && ['suspended', 'blocked', 'unlinked', 'offline_expired'].includes(res.status)) {
          setLockoutStatus(res.status);
          setLockoutReason(res.reason || res.message || '');
          setLockoutActive(true);
        } else if (res.success && res.status === 'active') {
          setLockoutActive(false);
          setLockoutStatus('active');
        }
      } catch {}
    };

    // 1. Initial check
    verifyStatus();

    // 2. Fallback Polling every 35s
    const poller = setInterval(verifyStatus, 35000);

    // 3. Status check on AppState return to foreground
    const appStateSub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        verifyStatus();
      }
    });

    // 4. Real-time Server-Sent Events push listener (receives admin actions in seconds)
    const unsubscribeSSE = connectToTerminalEventStream(commandPayload => {
      if (!isMounted) return;
      const cmd = commandPayload.command;
      const reason = commandPayload.reason || '';

      if (cmd === 'suspend') {
        setDeviceStatus('suspended', reason);
        setLockoutStatus('suspended');
        setLockoutReason(reason || 'Terminal suspended by administrator.');
        setLockoutActive(true);
      } else if (cmd === 'block') {
        setDeviceStatus('blocked', reason);
        setLockoutStatus('blocked');
        setLockoutReason(reason || 'Access blocked by administrator.');
        setLockoutActive(true);
      } else if (cmd === 'unlink') {
        setDeviceStatus('unlinked', reason);
        setLockoutStatus('unlinked');
        setLockoutReason(reason || 'Device unlinked from license.');
        setLockoutActive(true);
      } else if (cmd === 'activate') {
        setDeviceStatus('active', '');
        setLockoutActive(false);
        setLockoutStatus('active');
        setLockoutReason('');
      }
    });

    return () => {
      isMounted = false;
      clearInterval(poller);
      appStateSub?.remove?.();
      unsubscribeSSE();
    };
  }, []);

  // Loading splash while AsyncStorage hydrates
  if (!isReady || !checkedEula) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: 54, height: 54, borderRadius: 8, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '800' }}>B</Text>
        </View>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 14, fontSize: 15, fontWeight: '700', color: '#0F172A' }}>
          Loading BakerAdmin POS...
        </Text>
        <Text style={{ marginTop: 4, fontSize: 12, color: '#64748B' }}>
          Initializing terminal database
        </Text>
      </View>
    );
  }

  // Not logged in -> Show LoginScreen
  const isLoggedIn = state.auth?.isLoggedIn === true;
  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  return (
    <>
      <TabNavigator />

      {/* Global First-Time Agreement Popup */}
      {!eulaAccepted && (
        <EulaModal
          visible={!eulaAccepted}
          isFirstTimeSetup={true}
          onAccept={() => setEulaAccepted(true)}
          onClose={() => setEulaAccepted(true)}
        />
      )}

      {/* Global Enterprise Device Lockout Modal (Blocks POS immediately upon admin suspend/block) */}
      <DeviceLockoutModal
        visible={lockoutActive}
        deviceStatus={lockoutStatus}
        lockoutMessage={lockoutReason}
        serverUrl={cloudCfg?.serverUrl}
        deviceId={deviceInfo?.deviceId}
        deviceModel={deviceInfo?.model}
        offlineToken={cloudCfg?.offlineToken}
        onAuthorized={() => {
          setLockoutActive(false);
          setLockoutStatus('active');
        }}
        onUnlinked={() => {
          setLockoutActive(false);
          dispatch({ type: 'LOGOUT' });
        }}
      />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BakeryProvider>
          <NavigationContainer>
            <StatusBar style="dark" backgroundColor="#FFFFFF" />
            <RootNavigator />
          </NavigationContainer>
        </BakeryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
