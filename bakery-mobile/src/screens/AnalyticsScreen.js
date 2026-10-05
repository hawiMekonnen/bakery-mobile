import React, { useState } from 'react';
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
import CalendarModal from '../components/CalendarModal';

const getFormattedDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split('T')[0];
};

export default function AnalyticsScreen({ navigation }) {
  const { state } = useBakery();
  const { orders } = state;

  const todayStr = getFormattedDate(0);
  const yesterdayStr = getFormattedDate(1);

  const [selectedDate, setSelectedDate] = useState(todayStr); // 'YYYY-MM-DD' or 'All'
  const [calendarVisible, setCalendarVisible] = useState(false);

  // Distinct dates with sales
  const allOrderDates = Array.from(
    new Set(orders.map(o => (o.createdAt || '').split('T')[0]).filter(Boolean))
  ).sort().reverse();

  // Filter orders according to selected date
  const filteredOrders = orders.filter(o => {
    const orderDate = (o.createdAt || '').split('T')[0];
    if (selectedDate === 'All') return true;
    return orderDate === selectedDate;
  });

  const periodRevenue = filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const cashOrders = filteredOrders.filter(o => (o.paymentMethod || '').toLowerCase() === 'cash');
  const cardOrders = filteredOrders.filter(o => (o.paymentMethod || '').toLowerCase() === 'card');
  const mobileOrders = filteredOrders.filter(o => (o.paymentMethod || '').toLowerCase() === 'mobile');

  const cashTotal = cashOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const cardTotal = cardOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const mobileTotal = mobileOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const allTimeRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const handlePrevDay = () => {
    const base = selectedDate && selectedDate !== 'All' ? new Date(selectedDate + 'T00:00:00') : new Date();
    base.setDate(base.getDate() - 1);
    setSelectedDate(base.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const base = selectedDate && selectedDate !== 'All' ? new Date(selectedDate + 'T00:00:00') : new Date();
    base.setDate(base.getDate() + 1);
    setSelectedDate(base.toISOString().split('T')[0]);
  };

  const getDateLabel = () => {
    if (selectedDate === 'All') return 'All Time';
    if (selectedDate === todayStr) return 'Today';
    if (selectedDate === yesterdayStr) return 'Yesterday';
    return selectedDate;
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
        subtitle={`Period: $${periodRevenue.toFixed(2)} • All time: $${allTimeRevenue.toFixed(2)}`}
        rightAction={
          <TouchableOpacity
            style={styles.calendarHeaderBtn}
            onPress={() => setCalendarVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar" size={15} color={COLORS.primary} style={{ marginRight: 5 }} />
            <Text style={styles.calendarHeaderBtnText}>
              {selectedDate === 'All' ? 'Pick Any Day' : selectedDate}
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Date Chips */}
        <View style={styles.filterPillsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <TouchableOpacity
              style={[styles.periodPill, selectedDate === todayStr && styles.periodPillActive]}
              onPress={() => setSelectedDate(todayStr)}
            >
              <Text style={[styles.periodPillText, selectedDate === todayStr && styles.periodPillTextActive]}>Today</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.periodPill, selectedDate === yesterdayStr && styles.periodPillActive]}
              onPress={() => setSelectedDate(yesterdayStr)}
            >
              <Text style={[styles.periodPillText, selectedDate === yesterdayStr && styles.periodPillTextActive]}>Yesterday</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.periodPill, selectedDate === 'All' && styles.periodPillActive]}
              onPress={() => setSelectedDate('All')}
            >
              <Text style={[styles.periodPillText, selectedDate === 'All' && styles.periodPillTextActive]}>All Time</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.periodPill, styles.pickDatePill, selectedDate !== 'All' && selectedDate !== todayStr && selectedDate !== yesterdayStr && styles.periodPillActive]}
              onPress={() => setCalendarVisible(true)}
            >
              <Ionicons
                name="calendar"
                size={13}
                color={selectedDate !== 'All' && selectedDate !== todayStr && selectedDate !== yesterdayStr ? '#FFF' : COLORS.primary}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.periodPillText, selectedDate !== 'All' && selectedDate !== todayStr && selectedDate !== yesterdayStr && styles.periodPillTextActive]}>
                {selectedDate !== 'All' && selectedDate !== todayStr && selectedDate !== yesterdayStr ? selectedDate : 'Select Any Day 📅'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Day Stepper Bar (Active when a single date is chosen) */}
        {selectedDate !== 'All' && (
          <View style={styles.dayNavBar}>
            <TouchableOpacity onPress={handlePrevDay} style={styles.dayNavArrow} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={16} color={COLORS.textPrimary} />
              <Text style={styles.dayNavArrowText}>Prev Day</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setCalendarVisible(true)} style={styles.dayNavCenter} activeOpacity={0.7}>
              <Ionicons name="calendar-outline" size={15} color={COLORS.primary} style={{ marginRight: 5 }} />
              <Text style={styles.dayNavDateText}>{getDateLabel()}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleNextDay} style={styles.dayNavArrow} activeOpacity={0.7}>
              <Text style={styles.dayNavArrowText}>Next Day</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Selected Period Hero Card */}
        <View style={styles.totalHeroCard}>
          <Text style={styles.heroLabel}>
            {selectedDate === 'All' ? 'ALL-TIME TOTAL GATHERED' : `COLLECTIONS FOR ${getDateLabel().toUpperCase()}`}
          </Text>
          <Text style={styles.heroAmount}>${periodRevenue.toFixed(2)}</Text>
          <Text style={styles.heroSub}>
            {filteredOrders.length} transactions completed on {getDateLabel()}
          </Text>
        </View>

        {/* Payment Method Breakdown */}
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

        {/* Historical Daily Performance Log */}
        <Text style={styles.sectionTitle}>Daily Performance Log</Text>
        <View style={styles.dailyHistoryCard}>
          {allOrderDates.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: COLORS.textMuted }}>No sales recorded on other dates yet.</Text>
            </View>
          ) : (
            allOrderDates.map((dateStr, idx) => {
              const dayOrders = orders.filter(o => (o.createdAt || '').startsWith(dateStr));
              const dayTotal = dayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
              const dayCash = dayOrders.filter(o => (o.paymentMethod || '').toLowerCase() === 'cash').reduce((s, o) => s + (Number(o.total) || 0), 0);
              const dayCard = dayOrders.filter(o => (o.paymentMethod || '').toLowerCase() === 'card').reduce((s, o) => s + (Number(o.total) || 0), 0);
              const dayMobile = dayOrders.filter(o => (o.paymentMethod || '').toLowerCase() === 'mobile').reduce((s, o) => s + (Number(o.total) || 0), 0);

              const isSelected = selectedDate === dateStr;

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[
                    styles.dailyHistoryRow,
                    idx === allOrderDates.length - 1 && { borderBottomWidth: 0 },
                    isSelected && { backgroundColor: COLORS.primaryLight + '40' },
                  ]}
                  onPress={() => setSelectedDate(dateStr)}
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

      {/* Full Month Interactive Calendar Modal */}
      <CalendarModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        selectedDate={selectedDate}
        onSelectDate={(dateStr) => setSelectedDate(dateStr)}
        onClearDate={() => setSelectedDate('All')}
        markedDates={allOrderDates}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  calendarHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary + '33',
  },
  calendarHeaderBtnText: {
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
    marginBottom: 8,
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
  pickDatePill: {
    borderColor: COLORS.primary + '4D',
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
  dayNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    marginVertical: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  dayNavArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  dayNavArrowText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginHorizontal: 2,
  },
  dayNavCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  dayNavDateText: {
    fontSize: FONTS.xs,
    fontWeight: '800',
    color: COLORS.primaryDark,
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
});
