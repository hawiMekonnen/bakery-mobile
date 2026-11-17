import React, { useState, useEffect } from 'react';
import { Platform, View, Text, ActivityIndicator, AppState, StyleSheet, TouchableOpacity, Image } from 'react-native';
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
import NameYourBakeryModal from './src/components/NameYourBakeryModal';
import {
  getCloudConfig,
  getDeviceInfo,
  checkApprovalStatus,
  connectToTerminalEventStream,
  setDeviceStatus,
  pushBatchOrders,
} from './src/services/cloudSyncService';
import { COLORS, FONTS, RADIUS, SHADOWS } from './src/theme/colors';

// Auth
import LoginScreen from './src/screens/LoginScreen';

// Tab Screens
import DashboardScreen from './src/screens/DashboardScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Feature Screens (navigated from Home & Tabs)
import POSScreen from './src/screens/POSScreen';
import ProductsScreen from './src/screens/ProductsScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import StockAuditScreen from './src/screens/StockAuditScreen';
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
      <HomeStack.Screen name="Stock" component={InventoryScreen} />
      <HomeStack.Screen name="StockAudit" component={StockAuditScreen} />
      <HomeStack.Screen name="StockTracking" component={StockAuditScreen} />
      <HomeStack.Screen name="ItemsSold" component={ItemsSoldScreen} />
      <HomeStack.Screen name="Analytics" component={AnalyticsScreen} />
      <HomeStack.Screen name="Profile" component={ProfileScreen} />
    </HomeStack.Navigator>
  );
}

function CustomFloatingTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);

  return (
    <View style={[styles.floatingTabBar, { bottom: bottomInset }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const isCenter = route.name === 'POS';

        if (isCenter) {
          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => navigation.navigate('POS')}
              activeOpacity={0.88}
              style={styles.centerButtonWrapper}
              accessibilityLabel="New Sale Point of Sale"
            >
              <View style={styles.centerButton}>
                <Ionicons name="cart" size={26} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          );
        }

        let iconName = 'home-outline';
        if (route.name === 'Home') iconName = isFocused ? 'home' : 'home-outline';
        else if (route.name === 'History') iconName = isFocused ? 'receipt' : 'receipt-outline';
        else if (route.name === 'Stock') iconName = isFocused ? 'cube' : 'cube-outline';
        else if (route.name === 'Profile') iconName = isFocused ? 'person' : 'person-outline';

        const label =
          route.name === 'Home'
            ? 'Home'
            : route.name === 'History'
            ? 'History'
            : route.name === 'Stock'
            ? 'Stock'
            : 'Profile';

        return (
          <TouchableOpacity
            key={route.key}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            activeOpacity={0.75}
            style={styles.tabButton}
          >
            <Ionicons
              name={iconName}
              size={22}
              color={isFocused ? COLORS.brandGreen : COLORS.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                { color: isFocused ? COLORS.brandDarkGreen : COLORS.textMuted },
                isFocused && styles.tabTextActive,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomFloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="History" component={OrdersScreen} />
      <Tab.Screen name="POS" component={POSScreen} />
      <Tab.Screen name="Stock" component={InventoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
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
      .then((val) => {
        setEulaAccepted(!!val);
        setCheckedEula(true);
      })
      .catch(() => setCheckedEula(true));
  }, []);

  // Hydrate Cloud Config & Device Info
  useEffect(() => {
    getCloudConfig().then((cfg) => {
      setCloudCfg(cfg);
      if (['suspended', 'blocked', 'unlinked', 'rejected'].includes(cfg.deviceStatus)) {
        setLockoutStatus(cfg.deviceStatus);
        setLockoutReason(cfg.lockoutMessage || 'Terminal access restricted.');
        setLockoutActive(true);
      }
    });
    getDeviceInfo().then((info) => setDeviceInfo(info));
  }, []);

  // Periodic Terminal Status Check & Realtime SSE Stream
  useEffect(() => {
    let isMounted = true;

    const verifyStatus = async () => {
      try {
        const res = await checkApprovalStatus();
        if (!isMounted) return;
        if (res.success && res.status === 'active') {
          setLockoutActive(false);
          setLockoutStatus('active');
        } else if (res.status && res.status !== 'active') {
          setLockoutStatus(res.status);
          setLockoutReason(res.reason || res.message || 'Terminal access restricted.');
          setLockoutActive(true);
        }
      } catch {}
    };

    // 1. Initial check
    verifyStatus();

    // 2. Fallback Polling every 35s
    const poller = setInterval(verifyStatus, 35000);

    // 3. Status check on AppState return to foreground
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        verifyStatus();
      }
    });

    // 4. Real-time Server-Sent Events push listener
    const unsubscribeSSE = connectToTerminalEventStream((commandPayload) => {
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
      <View style={styles.splashContainer}>
        <View style={styles.splashLogoCard}>
          <Image
            source={require('./assets/skyservice-logo.png')}
            style={styles.splashLogo}
            resizeMode="contain"
          />
        </View>
        <ActivityIndicator size="large" color={COLORS.brandGreen} style={{ marginTop: 20 }} />
        <Text style={styles.splashTitle}>Skyservice Bakery POS</Text>
        <Text style={styles.splashSubtitle}>Initializing terminal database...</Text>
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

      {/* Global Enterprise Device Lockout Modal */}
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
            <StatusBar style="dark" backgroundColor="#F2F4F0" />
            <RootNavigator />
          </NavigationContainer>
        </BakeryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  floatingTabBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: 68,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#EEF2EF',
    shadowColor: 'rgba(10, 40, 28, 0.18)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabText: {
    fontSize: 11,
    marginTop: 3,
    fontFamily: FONTS.medium,
  },
  tabTextActive: {
    fontFamily: FONTS.bold,
  },
  centerButtonWrapper: {
    top: -22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  centerButton: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: COLORS.brandGreen,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F2F4F0',
    shadowColor: COLORS.brandGreen,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 10,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: COLORS.brandDarkGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  splashLogo: {
    width: 140,
    height: 48,
  },
  splashTitle: {
    marginTop: 18,
    fontSize: 17,
    fontFamily: FONTS.extraBold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  splashSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: 'rgba(255, 255, 255, 0.75)',
  },
});
