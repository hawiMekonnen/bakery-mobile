import React, { useState } from 'react';
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
import { pushBatchOrders } from '../services/cloudSyncService';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import CloudSyncModal from '../components/CloudSyncModal';
import { HeroCard, Card, IconTile, StatusBadge, SegmentedBar } from '../components/UI';

const { width } = Dimensions.get('window');

const QUICK_NAV_FEATURES = [
  {
    id: 'ItemsSold',
    label: 'Daily Items Sold',
    sublabel: 'Prepared vs sold',
    icon: 'pie-chart-outline',
    route: 'ItemsSold',
  },
  {
    id: 'POS',
    label: 'Point of Sale',
    sublabel: 'New checkout register',
    icon: 'cart-outline',
    route: 'POS',
  },
  {
    id: 'Products',
    label: 'Bakery Menu',
    sublabel: 'Catalog & pricing',
    icon: 'restaurant-outline',
    route: 'Products',
  },
  {
    id: 'Orders',
    label: 'Order History',
    sublabel: 'Past receipts & logs',
    icon: 'receipt-outline',
    route: 'Orders',
  },
  {
    id: 'Inventory',
    label: 'Stock & Inventory',
    sublabel: 'Ingredients & raw stock',
    icon: 'cube-outline',
    route: 'Inventory',
  },
  {
    id: 'StockAudit',
    label: 'Ingredient Tracking',
    sublabel: 'Stock additions by hour',
    icon: 'time-outline',
    route: 'StockAudit',
  },
  {
    id: 'Analytics',
    label: 'Income Ledger',
    sublabel: 'Collections & trends',
    icon: 'wallet-outline',
    route: 'Analytics',
  },
  {
    id: 'Profile',
    label: 'My Profile',
    sublabel: 'Security & settings',
    icon: 'person-outline',
    route: 'Profile',
  },
];

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { state, dispatch, cloudSyncStatus } = useBakery();
  const [cloudModalVisible, setCloudModalVisible] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { products = [], orders = [], inventory = [], auth = {}, notifications = [] } = state;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o => o.createdAt && o.createdAt.startsWith(todayStr));

  // Sold count today
  const todaySoldMap = {};
  todayOrders.forEach(o => {
    (o.items || []).forEach(it => {
      todaySoldMap[it.id] = (todaySoldMap[it.id] || 0) + (Number(it.quantity) || 1);
    });
  });

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

  const unsyncedOrders = orders.filter(o => o.syncStatus !== 'synced');
  const unsyncedTotal = unsyncedOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const unreadNotifs = notifications.filter(n => !n.read).length;

  const currentHour = new Date().getHours();
  const greetingText = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';
  const bakeryName = auth.businessName || 'Bakery';
  const initialLetter = (bakeryName.charAt(0) || 'B').toUpperCase();

  const handleNavigate = (route) => {
    if (route === 'Orders' || route === 'History') {
      try {
        navigation.navigate('Orders');
      } catch (e) {
        navigation.navigate('History');
      }
    } else if (route === 'Stock' || route === 'Inventory') {
      try {
        navigation.navigate('Stock');
      } catch (e) {
        navigation.navigate('Inventory');
      }
    } else if (route === 'StockAudit' || route === 'StockTracking') {
      try {
        navigation.navigate('StockAudit');
      } catch (e) {
        navigation.navigate('StockTracking');
      }
    } else {
      try {
        navigation.navigate(route);
      } catch (e) {
        console.warn('Navigation error:', e);
      }
    }
  };

  const handleQuickSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await pushBatchOrders(unsyncedOrders.length > 0 ? unsyncedOrders : orders, {
        pendingCount: unsyncedOrders.length,
        inventory,
        products,
      });
      if (res && res.success && unsyncedOrders.length > 0) {
        const syncedIds = unsyncedOrders.map(o => o.id);
        dispatch({ type: 'MARK_ORDERS_SYNCED', payload: { syncedOrderIds: syncedIds } });
      }
    } catch (e) {
      setCloudModalVisible(true);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      {/* ─── Top Bar Header ─── */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 10) + 6 }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.initialBadge, auth?.brandColor ? { backgroundColor: auth.brandColor } : null]}>
            <Text style={styles.initialBadgeText}>{initialLetter}</Text>
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.headerGreeting}>{greetingText}</Text>
            <Text style={styles.headerBakeryName} numberOfLines={1}>{bakeryName}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Connectivity Status Chip */}
          <TouchableOpacity
            style={[
              styles.statusChip,
              cloudSyncStatus?.state === 'synced' ? styles.statusChipOnline : styles.statusChipOffline,
            ]}
            onPress={() => setCloudModalVisible(true)}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: cloudSyncStatus?.state === 'synced' ? COLORS.brandGreen : COLORS.warningText },
              ]}
            />
            <Text
              style={[
                styles.statusChipText,
                { color: cloudSyncStatus?.state === 'synced' ? COLORS.brandGreenText : COLORS.warningText },
              ]}
            >
              {cloudSyncStatus?.state === 'synced' ? 'Online' : 'Offline'}
            </Text>
          </TouchableOpacity>

          {/* Notification Bell Button with Dot */}
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => setNotifModalVisible(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="notifications-outline" size={21} color={COLORS.ink} />
            {unreadNotifs > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── 1. Hero Card: Today's Sales ─── */}
        <HeroCard style={[styles.heroSpacing, auth?.brandColor ? { backgroundColor: auth.brandColor } : null]}>
          <Text style={styles.heroOverline}>TODAY'S SALES</Text>
          <Text style={styles.heroAmount}>ETB {todayRevenue.toFixed(2)}</Text>
          <Text style={styles.heroSub}>{todayOrders.length} orders today</Text>

          {unsyncedOrders.length > 0 && (
            <View style={styles.uploadStrip}>
              <View>
                <Text style={styles.uploadStripTitle}>
                  {unsyncedOrders.length} {unsyncedOrders.length === 1 ? 'order' : 'orders'} waiting to upload
                </Text>
                <Text style={styles.uploadStripSub}>Cloud sync pending</Text>
              </View>
              <TouchableOpacity
                style={styles.syncNowBtn}
                onPress={handleQuickSync}
                disabled={isSyncing}
                activeOpacity={0.8}
              >
                <Text style={styles.syncNowBtnText}>
                  {isSyncing ? 'Syncing...' : 'Sync now'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </HeroCard>

        {/* ─── 2. Row of Shortcut Buttons ─── */}
        <View style={styles.shortcutRow}>
          {/* New Sale (Brand green square tile) */}
          <TouchableOpacity
            style={styles.shortcutItem}
            onPress={() => navigation.navigate('POS')}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutTile, { backgroundColor: COLORS.brandGreen }]}>
              <Ionicons name="cart" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.shortcutLabel}>New sale</Text>
          </TouchableOpacity>

          {/* Menu */}
          <TouchableOpacity
            style={styles.shortcutItem}
            onPress={() => navigation.navigate('Products')}
            activeOpacity={0.8}
          >
            <View style={styles.shortcutTile}>
              <Ionicons name="restaurant-outline" size={20} color={COLORS.brandDarkGreen} />
            </View>
            <Text style={styles.shortcutLabel}>Menu</Text>
          </TouchableOpacity>

          {/* Stock */}
          <TouchableOpacity
            style={styles.shortcutItem}
            onPress={() => handleNavigate('Stock')}
            activeOpacity={0.8}
          >
            <View style={styles.shortcutTile}>
              <Ionicons name="cube-outline" size={20} color={COLORS.brandDarkGreen} />
            </View>
            <Text style={styles.shortcutLabel}>Stock</Text>
          </TouchableOpacity>

          {/* Ledger */}
          <TouchableOpacity
            style={styles.shortcutItem}
            onPress={() => navigation.navigate('Analytics')}
            activeOpacity={0.8}
          >
            <View style={styles.shortcutTile}>
              <Ionicons name="wallet-outline" size={20} color={COLORS.brandDarkGreen} />
            </View>
            <Text style={styles.shortcutLabel}>Ledger</Text>
          </TouchableOpacity>
        </View>

        {/* ─── 3. Collections Today Card ─── */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderTitle}>Collections today</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Analytics')}>
              <Text style={styles.cardHeaderLink}>Full ledger</Text>
            </TouchableOpacity>
          </View>
          <SegmentedBar cash={todayCash} card={todayCard} mobile={todayMobile} style={{ marginTop: 12 }} />
        </Card>

        {/* ─── 4. Recent Orders Card ─── */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderTitle}>Recent orders</Text>
            <TouchableOpacity onPress={() => handleNavigate('Orders')}>
              <Text style={styles.cardHeaderLink}>View all</Text>
            </TouchableOpacity>
          </View>

          {orders.length === 0 ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Ionicons name="receipt-outline" size={32} color={COLORS.mutedText} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.ink, marginTop: 8 }}>
                No orders recorded yet
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.mutedText, marginTop: 2 }}>
                Orders completed at Point of Sale will appear here
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: 6 }}>
              {orders.slice(0, 3).map((ord, idx) => {
                const isSynced = ord.syncStatus === 'synced';
                const timeStr = ord.createdAt
                  ? new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';
                const itemCount = (ord.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);

                return (
                  <TouchableOpacity
                    key={ord.id}
                    style={[styles.recentOrderRow, idx < 2 && styles.rowBorder]}
                    onPress={() => handleNavigate('Orders')}
                    activeOpacity={0.7}
                  >
                    <IconTile icon="receipt-outline" style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recentOrderId}>{ord.id}</Text>
                      <Text style={styles.recentOrderMeta}>
                        {timeStr ? `${timeStr} • ` : ''}{itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                      <Text style={styles.recentOrderTotal}>ETB {Number(ord.total).toFixed(2)}</Text>
                      {!isSynced && (
                        <View style={styles.notSyncedChip}>
                          <Text style={styles.notSyncedChipText}>Not synced</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Card>

        {/* ─── 5. Quick Navigate 2-Column Grid (Keeps all 7 destinations) ─── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Quick Navigate</Text>
        </View>
        <View style={styles.quickGrid}>
          {QUICK_NAV_FEATURES.map(f => (
            <TouchableOpacity
              key={f.id}
              style={styles.quickCard}
              onPress={() => handleNavigate(f.route)}
              activeOpacity={0.8}
            >
              <IconTile icon={f.icon} style={{ marginBottom: 10 }} />
              <Text style={styles.quickCardTitle}>{f.label}</Text>
              <Text style={styles.quickCardSub}>{f.sublabel}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ─── 6. Featured Bakery Items (Horizontal List) ─── */}
        {products.length > 0 && (
          <View style={{ marginTop: 22 }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Featured Menu Items</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Products')}>
                <Text style={styles.cardHeaderLink}>Full menu</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredScroll}>
              {products.slice(0, 8).map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.featuredCard}
                  onPress={() => navigation.navigate('POS')}
                  activeOpacity={0.8}
                >
                  <View style={styles.featuredIconBox}>
                    <Ionicons name="fast-food-outline" size={24} color={COLORS.brandDarkGreen} />
                  </View>
                  <Text style={styles.featuredName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.featuredPrice}>ETB {Number(p.price).toFixed(2)}</Text>
                  <View style={styles.featuredCategoryBadge}>
                    <Text style={styles.featuredCategoryText}>{p.category || 'Menu'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bottom padding to clear floating nav bar */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ─── Notification Center Modal ─── */}
      <Modal visible={notifModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.notifModalCard}>
            <View style={styles.notifModalHeader}>
              <View>
                <Text style={styles.notifModalTitle}>Notifications</Text>
                <Text style={styles.notifModalSub}>Terminal activity and alerts</Text>
              </View>
              <TouchableOpacity onPress={() => setNotifModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={COLORS.ink} />
              </TouchableOpacity>
            </View>

            {notifications.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Ionicons name="notifications-off-outline" size={36} color={COLORS.mutedText} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.ink, marginTop: 10 }}>
                  No notifications
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.mutedText, marginTop: 2 }}>
                  System updates and sync notices will appear here
                </Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item, idx) => item.id || String(idx)}
                renderItem={({ item }) => (
                  <View style={styles.notifItem}>
                    <IconTile icon="information-circle-outline" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notifItemTitle}>{item.title || 'System Notice'}</Text>
                      <Text style={styles.notifItemMessage}>{item.message || item.text}</Text>
                    </View>
                  </View>
                )}
                style={{ maxHeight: 360 }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Cloud Sync Modal */}
      <CloudSyncModal
        visible={cloudModalVisible}
        onClose={() => setCloudModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.appBackground,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: COLORS.appBackground,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  initialBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.brandDarkGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialBadgeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  headerGreeting: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.mutedText,
  },
  headerBakeryName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.ink,
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 30,
    borderRadius: RADIUS.chip,
  },
  statusChipOffline: {
    backgroundColor: COLORS.warningBg,
  },
  statusChipOnline: {
    backgroundColor: COLORS.softGreen,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  notifDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.dangerText,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 110,
  },
  heroSpacing: {
    marginBottom: 16,
  },
  heroOverline: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroAmount: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginVertical: 4,
  },
  heroSub: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginBottom: 16,
  },
  uploadStrip: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  uploadStripTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  uploadStripSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  syncNowBtn: {
    backgroundColor: COLORS.brandGreen,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncNowBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  shortcutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  shortcutItem: {
    alignItems: 'center',
    flex: 1,
  },
  shortcutTile: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...SHADOWS.sm,
  },
  shortcutLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
  },
  sectionCard: {
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.ink,
    letterSpacing: -0.3,
  },
  cardHeaderLink: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.greenTextLight,
  },
  recentOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  recentOrderId: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.ink,
  },
  recentOrderMeta: {
    fontSize: 11.5,
    color: COLORS.mutedText,
    marginTop: 2,
  },
  recentOrderTotal: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.ink,
  },
  notSyncedChip: {
    backgroundColor: COLORS.warningBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  notSyncedChipText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: COLORS.warningText,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.ink,
    letterSpacing: -0.3,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickCard: {
    width: (width - 40 - 12) / 2,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: 14,
    ...SHADOWS.card,
  },
  quickCardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.ink,
  },
  quickCardSub: {
    fontSize: 11,
    color: COLORS.mutedText,
    marginTop: 2,
  },
  featuredScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  featuredCard: {
    width: 140,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: 12,
    ...SHADOWS.card,
  },
  featuredIconBox: {
    width: '100%',
    height: 72,
    borderRadius: 14,
    backgroundColor: COLORS.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  featuredName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  featuredPrice: {
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.greenTextLight,
    marginTop: 2,
  },
  featuredCategoryBadge: {
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: COLORS.appBackground,
    alignSelf: 'flex-start',
  },
  featuredCategoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.mutedText,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(14, 31, 23, 0.6)',
    justifyContent: 'flex-end',
  },
  notifModalCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    padding: 22,
    maxHeight: '80%',
    ...SHADOWS.lg,
  },
  notifModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  notifModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.ink,
  },
  notifModalSub: {
    fontSize: 12,
    color: COLORS.mutedText,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.appBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  notifItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  notifItemMessage: {
    fontSize: 12,
    color: COLORS.mutedText,
    marginTop: 2,
  },
});
