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
import WifiSyncModal from '../components/WifiSyncModal';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';

const { width } = Dimensions.get('window');
const TILE_W = (width - 32 - 12) / 2;

const FEATURES = [
  {
    id: 'ItemsSold',
    label: 'Daily Items Sold',
    sublabel: 'Prepared vs sold stock',
    icon: 'pie-chart',
    color: '#D97706',
    bg: '#FEF3C7',
    route: 'ItemsSold',
  },
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
  const { state, dispatch, wifiSyncStatus } = useBakery();
  const [wifiModalVisible, setWifiModalVisible] = useState(false);
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
          <WifiSyncModal
        visible={wifiModalVisible}
        onClose={() => setWifiModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Wi-Fi Status Bar
  wifiStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 12,
  },
  wifiStatusSynced: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  wifiStatusOffline: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  wifiStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  wifiStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  wifiStatusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  wifiSyncActionText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
  },
  // Prepared Banner Card
  preparedBannerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  preparedBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  preparedBannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  preparedIconCircle: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preparedBannerTitle: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  preparedBannerSub: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  preparedArrowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 2,
  },
  preparedArrowText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
  },
  preparedStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  preparedStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  preparedStatVal: {
    fontSize: FONTS.md,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  preparedStatLbl: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 1,
    textTransform: 'uppercase',
  },
  preparedStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },

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
