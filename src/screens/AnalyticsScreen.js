import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
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
    new Set(orders.map((o) => (o.createdAt || '').split('T')[0]).filter(Boolean))
  )
    .sort()
    .reverse();

  // Filter orders according to selected date
  const filteredOrders = orders.filter((o) => {
    const orderDate = (o.createdAt || '').split('T')[0];
    if (selectedDate === 'All') return true;
    return orderDate === selectedDate;
  });

  const periodRevenue = filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const cashOrders = filteredOrders.filter((o) => (o.paymentMethod || '').toLowerCase() === 'cash');
  const cardOrders = filteredOrders.filter((o) => (o.paymentMethod || '').toLowerCase() === 'card');
  const mobileOrders = filteredOrders.filter((o) => (o.paymentMethod || '').toLowerCase() === 'mobile');

  const cashTotal = cashOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const cardTotal = cardOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const mobileTotal = mobileOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const allTimeRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const canGoBack = navigation && typeof navigation.canGoBack === 'function' && navigation.canGoBack();

  const handlePrevDay = () => {
    const base =
      selectedDate && selectedDate !== 'All'
        ? new Date(selectedDate + 'T00:00:00')
        : new Date();
    base.setDate(base.getDate() - 1);
    setSelectedDate(base.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const base =
      selectedDate && selectedDate !== 'All'
        ? new Date(selectedDate + 'T00:00:00')
        : new Date();
    base.setDate(base.getDate() + 1);
    setSelectedDate(base.toISOString().split('T')[0]);
  };

  const getDateLabel = () => {
    if (selectedDate === 'All') return 'All Time';
    if (selectedDate === todayStr) return 'Today';
    if (selectedDate === yesterdayStr) return 'Yesterday';
    return selectedDate;
  };

  return (
    <View style={styles.container}>
      {/* ─── Screen Header ─── */}
      <ScreenHeader
        canGoBack={canGoBack}
        onBack={() => navigation.goBack()}
        icon="bar-chart-outline"
        title="Income"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Date Chips */}
        <View style={styles.chipsScrollWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <TouchableOpacity
              style={[styles.chip, selectedDate === todayStr && styles.chipActive]}
              onPress={() => setSelectedDate(todayStr)}
            >
              <Text style={[styles.chipText, selectedDate === todayStr && styles.chipTextActive]}>
                Today
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, selectedDate === yesterdayStr && styles.chipActive]}
              onPress={() => setSelectedDate(yesterdayStr)}
            >
              <Text style={[styles.chipText, selectedDate === yesterdayStr && styles.chipTextActive]}>
                Yesterday
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, selectedDate === 'All' && styles.chipActive]}
              onPress={() => setSelectedDate('All')}
            >
              <Text style={[styles.chipText, selectedDate === 'All' && styles.chipTextActive]}>
                All Time
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.chip,
                selectedDate !== 'All' && selectedDate !== todayStr && selectedDate !== yesterdayStr && styles.chipActive,
              ]}
              onPress={() => setCalendarVisible(true)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedDate !== 'All' && selectedDate !== todayStr && selectedDate !== yesterdayStr && styles.chipTextActive,
                ]}
              >
                {selectedDate !== 'All' && selectedDate !== todayStr && selectedDate !== yesterdayStr ? selectedDate : 'Select date...'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Day Stepper Bar (if specific date is active) */}
        {selectedDate !== 'All' && (
          <View style={styles.dayNavBar}>
            <TouchableOpacity onPress={handlePrevDay} style={styles.dayNavBtn}>
              <Ionicons name="chevron-back" size={16} color={COLORS.ink} />
              <Text style={styles.dayNavText}>Prev</Text>
            </TouchableOpacity>
            <Text style={styles.dayNavCurrent}>{getDateLabel()}</Text>
            <TouchableOpacity onPress={handleNextDay} style={styles.dayNavBtn}>
              <Text style={styles.dayNavText}>Next</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.ink} />
            </TouchableOpacity>
          </View>
        )}

        {/* Hero Card matching Skyservice */}
        <View style={styles.heroCard}>
          <View style={[styles.heroRing, { width: 300, height: 300, top: -120, right: -80 }]} />
          <View style={[styles.heroRing, { width: 180, height: 180, top: -60, right: -20 }]} />

          <Text style={styles.heroLabel}>
            {selectedDate === 'All' ? 'ALL-TIME TOTAL GATHERED' : `COLLECTIONS FOR ${getDateLabel().toUpperCase()}`}
          </Text>
          <Text style={styles.heroAmount}>ETB {periodRevenue.toFixed(2)}</Text>
          <Text style={styles.heroSub}>
            {filteredOrders.length} transactions completed on {getDateLabel()}
          </Text>
        </View>

        {/* Payment Method Breakdown Card */}
        <Text style={styles.sectionHeader}>COLLECTIONS BREAKDOWN</Text>
        <View style={styles.groupCard}>
          {/* Segmented bar */}
          <View style={styles.segmentedBar}>
            <View
              style={[
                styles.segment,
                {
                  flex: periodRevenue > 0 ? Math.max(1, cashTotal) : 1,
                  backgroundColor: COLORS.cashColor,
                },
              ]}
            />
            <View
              style={[
                styles.segment,
                {
                  flex: periodRevenue > 0 ? Math.max(1, cardTotal) : 1,
                  backgroundColor: COLORS.cardColor,
                },
              ]}
            />
            <View
              style={[
                styles.segment,
                {
                  flex: periodRevenue > 0 ? Math.max(1, mobileTotal) : 1,
                  backgroundColor: COLORS.mobileColor,
                },
              ]}
            />
          </View>

          {/* Cash Row */}
          <View style={styles.cardRow}>
            <View style={styles.softIconTile}>
              <Ionicons name="cash-outline" size={18} color={COLORS.cashColor} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.rowTitle}>Cash Drawer</Text>
              <Text style={styles.rowSub}>{cashOrders.length} transactions</Text>
            </View>
            <Text style={[styles.rowAmount, { color: COLORS.cashColor }]}>
              ETB {cashTotal.toFixed(2)}
            </Text>
          </View>

          <View style={styles.rowDivider} />

          {/* Card Row */}
          <View style={styles.cardRow}>
            <View style={[styles.softIconTile, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="card-outline" size={18} color={COLORS.cardColor} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.rowTitle}>Credit & Debit Card</Text>
              <Text style={styles.rowSub}>{cardOrders.length} transactions</Text>
            </View>
            <Text style={[styles.rowAmount, { color: COLORS.cardColor }]}>
              ETB {cardTotal.toFixed(2)}
            </Text>
          </View>

          <View style={styles.rowDivider} />

          {/* Mobile Row */}
          <View style={styles.cardRow}>
            <View style={[styles.softIconTile, { backgroundColor: '#F5F3FF' }]}>
              <Ionicons name="phone-portrait-outline" size={18} color={COLORS.mobileColor} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.rowTitle}>Mobile Money / Telebirr</Text>
              <Text style={styles.rowSub}>{mobileOrders.length} transactions</Text>
            </View>
            <Text style={[styles.rowAmount, { color: COLORS.mobileColor }]}>
              ETB {mobileTotal.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Daily Performance Log */}
        <Text style={styles.sectionHeader}>DAILY PERFORMANCE LOG</Text>
        <View style={styles.groupCard}>
          {allOrderDates.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: COLORS.muted }}>No historical sales logged yet.</Text>
            </View>
          ) : (
            allOrderDates.map((dateStr, idx) => {
              const dayOrders = orders.filter((o) => (o.createdAt || '').startsWith(dateStr));
              const dayTotal = dayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
              const isSelected = selectedDate === dateStr;

              return (
                <View key={dateStr}>
                  <TouchableOpacity
                    style={[
                      styles.cardRow,
                      isSelected && { backgroundColor: COLORS.softGreen },
                    ]}
                    onPress={() => setSelectedDate(dateStr)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.softIconTile}>
                      <Ionicons name="calendar-outline" size={18} color={COLORS.brandGreenText} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.rowTitle}>{dateStr}</Text>
                      <Text style={styles.rowSub}>{dayOrders.length} orders recorded</Text>
                    </View>
                    <Text style={styles.rowAmount}>ETB {dayTotal.toFixed(2)}</Text>
                  </TouchableOpacity>
                  {idx < allOrderDates.length - 1 && <View style={styles.rowDivider} />}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Calendar Modal */}
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
    backgroundColor: COLORS.appBg,
  },
  pickDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.chip,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    ...SHADOWS.card,
  },
  pickDayText: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: COLORS.brandDarkGreen,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 12,
  },
  chipsScrollWrapper: {
    marginVertical: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.chip,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    ...SHADOWS.card,
  },
  chipActive: {
    backgroundColor: COLORS.brandDarkGreen,
    borderColor: COLORS.brandDarkGreen,
  },
  chipText: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  dayNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.chip,
    paddingHorizontal: 14,
    paddingVertical: 8,
    ...SHADOWS.card,
  },
  dayNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayNavText: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
  },
  dayNavCurrent: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.extraBold,
    color: COLORS.brandDarkGreen,
  },
  heroCard: {
    backgroundColor: COLORS.brandDarkGreen,
    borderRadius: RADIUS.hero,
    padding: 22,
    overflow: 'hidden',
    ...SHADOWS.hero,
  },
  heroRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(18, 183, 106, 0.15)',
  },
  heroLabel: {
    fontSize: FONTS.overline,
    fontFamily: FONTS.extraBold,
    letterSpacing: 0.8,
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 6,
  },
  heroAmount: {
    fontSize: 34,
    fontFamily: FONTS.extraBold,
    color: '#FFFFFF',
  },
  heroSub: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.medium,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 6,
  },
  sectionHeader: {
    fontSize: FONTS.overline,
    fontFamily: FONTS.extraBold,
    letterSpacing: 0.8,
    color: COLORS.muted,
    marginTop: 8,
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  groupCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    paddingVertical: 4,
    ...SHADOWS.card,
  },
  segmentedBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 6,
    overflow: 'hidden',
    gap: 2,
  },
  segment: {
    height: '100%',
    borderRadius: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowDivider: {
    height: 1,
    backgroundColor: COLORS.hairline,
    marginLeft: 66,
  },
  softIconTile: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.tile,
    backgroundColor: COLORS.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: FONTS.body,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
  },
  rowSub: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
    marginTop: 2,
  },
  rowAmount: {
    fontSize: FONTS.body,
    fontFamily: FONTS.extraBold,
    color: COLORS.ink,
  },
});
