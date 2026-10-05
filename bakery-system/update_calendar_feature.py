import os
import sys

MOBILE_ROOT = r'c:\Users\user\Desktop\bakery-mobile'

# ==========================================
# 1. CalendarModal.js
# ==========================================
CALENDAR_MODAL_CODE = '''import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function CalendarModal({
  visible,
  onClose,
  selectedDate, // 'YYYY-MM-DD' or 'All'
  onSelectDate, // (dateStr: 'YYYY-MM-DD') => void
  onClearDate,  // () => void
  markedDates = [], // array of dates 'YYYY-MM-DD' with sales
}) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const initialYear = selectedDate && selectedDate !== 'All'
    ? parseInt(selectedDate.split('-')[0], 10)
    : today.getFullYear();

  const initialMonth = selectedDate && selectedDate !== 'All'
    ? parseInt(selectedDate.split('-')[1], 10) - 1
    : today.getMonth();

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  useEffect(() => {
    if (selectedDate && selectedDate !== 'All' && visible) {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        setViewYear(parseInt(parts[0], 10));
        setViewMonth(parseInt(parts[1], 10) - 1);
      }
    }
  }, [selectedDate, visible]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const daysGrid = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysGrid.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysGrid.push(d);
  }

  const handleSelectDay = (dayNum) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');
    const fullDate = `${viewYear}-${mm}-${dd}`;
    onSelectDate(fullDate);
    onClose();
  };

  const markedSet = new Set(markedDates);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.calendarCard}>
          {/* Header with Month Navigation */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>

            <View style={{ alignItems: 'center' }}>
              <Text style={styles.monthTitle}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
              <Text style={styles.monthSub}>Tap any day to inspect sales</Text>
            </View>

            <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Weekday Row */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((wd, idx) => (
              <Text key={idx} style={[styles.weekdayText, idx === 0 && { color: COLORS.danger }]}>
                {wd}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {daysGrid.map((dayNum, index) => {
              if (dayNum === null) {
                return <View key={`empty-${index}`} style={styles.dayCellEmpty} />;
              }

              const mm = String(viewMonth + 1).padStart(2, '0');
              const dd = String(dayNum).padStart(2, '0');
              const cellDate = `${viewYear}-${mm}-${dd}`;

              const isSelected = selectedDate === cellDate;
              const isToday = cellDate === todayStr;
              const hasSales = markedSet.has(cellDate);

              return (
                <TouchableOpacity
                  key={`day-${cellDate}`}
                  style={[
                    styles.dayCell,
                    isToday && styles.dayCellToday,
                    isSelected && styles.dayCellSelected,
                  ]}
                  onPress={() => handleSelectDay(dayNum)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isToday && styles.dayTextToday,
                      isSelected && styles.dayTextSelected,
                    ]}
                  >
                    {dayNum}
                  </Text>
                  {hasSales && (
                    <View
                      style={[
                        styles.salesDot,
                        isSelected && { backgroundColor: '#FFF' },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Quick Shortcuts & Close */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.todayShortcutBtn}
              onPress={() => {
                onSelectDate(todayStr);
                onClose();
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="today-outline" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
              <Text style={styles.todayShortcutText}>Today</Text>
            </TouchableOpacity>

            {onClearDate && (
              <TouchableOpacity
                style={styles.allDatesBtn}
                onPress={() => {
                  onClearDate();
                  onClose();
                }}
                activeOpacity={0.75}
              >
                <Text style={styles.allDatesText}>All Dates</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.75}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 18,
    ...SHADOWS.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  monthTitle: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  monthSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    marginBottom: 6,
  },
  weekdayText: {
    width: 40,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dayCellEmpty: {
    width: 40,
    height: 40,
    marginVertical: 2,
  },
  dayCell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    position: 'relative',
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  dayCellSelected: {
    backgroundColor: COLORS.primary,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dayTextToday: {
    fontWeight: '800',
    color: COLORS.primary,
  },
  dayTextSelected: {
    color: '#FFF',
    fontWeight: '800',
  },
  salesDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 12,
  },
  todayShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  todayShortcutText: {
    fontSize: FONTS.xs,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  allDatesBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSubtle,
  },
  allDatesText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  closeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSubtle,
  },
  closeBtnText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
'''

# ==========================================
# 2. OrdersScreen.js (Full Calendar Any-Day Filter + Prev/Next Day Stepper)
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBakery } from '../store/BakeryStore';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';
import CalendarModal from '../components/CalendarModal';
import { printReceipt, shareReceiptPDF } from '../utils/receiptPrinter';

const FILTER_PAYMENTS = ['All', 'Cash', 'Card', 'Mobile'];

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
  const [selectedDate, setSelectedDate] = useState('All'); // 'All' | 'YYYY-MM-DD'
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const todayStr = getFormattedDate(0);
  const yesterdayStr = getFormattedDate(1);

  // Distinct dates in order history
  const allOrderDates = Array.from(
    new Set(orders.map(o => (o.createdAt || '').split('T')[0]).filter(Boolean))
  );

  // Filter orders by date, payment method, and search text
  const filteredOrders = orders.filter(o => {
    const orderDate = (o.createdAt || '').split('T')[0];
    const matchesDate = selectedDate === 'All' ? true : orderDate === selectedDate;
    const matchesPayment =
      filterPayment === 'All' ||
      (o.paymentMethod || '').toLowerCase() === filterPayment.toLowerCase();
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

  // Day-by-Day Stepping
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
    if (selectedDate === 'All') return 'All Dates';
    if (selectedDate === todayStr) return `Today (${todayStr})`;
    if (selectedDate === yesterdayStr) return `Yesterday (${yesterdayStr})`;
    return selectedDate;
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
            style={styles.calendarHeaderBtn}
            onPress={() => setCalendarVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar" size={16} color={COLORS.primary} style={{ marginRight: 5 }} />
            <Text style={styles.calendarHeaderBtnText}>
              {selectedDate === 'All' ? 'Pick Any Day' : selectedDate}
            </Text>
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

      {/* Quick Date Chips */}
      <View style={styles.dateChipsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateChipsContent}>
          <TouchableOpacity
            style={[styles.dateChip, selectedDate === 'All' && styles.dateChipActive]}
            onPress={() => setSelectedDate('All')}
          >
            <Text style={[styles.dateChipText, selectedDate === 'All' && styles.dateChipTextActive]}>All Dates</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dateChip, selectedDate === todayStr && styles.dateChipActive]}
            onPress={() => setSelectedDate(todayStr)}
          >
            <Text style={[styles.dateChipText, selectedDate === todayStr && styles.dateChipTextActive]}>Today</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dateChip, selectedDate === yesterdayStr && styles.dateChipActive]}
            onPress={() => setSelectedDate(yesterdayStr)}
          >
            <Text style={[styles.dateChipText, selectedDate === yesterdayStr && styles.dateChipTextActive]}>Yesterday</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dateChip, styles.pickDateChip, selectedDate !== 'All' && selectedDate !== todayStr && selectedDate !== yesterdayStr && styles.dateChipActive]}
            onPress={() => setCalendarVisible(true)}
          >
            <Ionicons
              name="calendar"
              size={13}
              color={selectedDate !== 'All' && selectedDate !== todayStr && selectedDate !== yesterdayStr ? '#FFF' : COLORS.primary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.dateChipText, selectedDate !== 'All' && selectedDate !== todayStr && selectedDate !== yesterdayStr && styles.dateChipTextActive]}>
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
              {selectedDate !== 'All' ? 'No Orders on This Date' : 'No Sales Recorded Yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {selectedDate !== 'All'
                ? `No sales were completed on ${selectedDate}. You can use "Prev/Next Day" or tap the calendar to view any other date.`
                : 'Every sale you complete at Point of Sale will appear here.'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {selectedDate !== 'All' && (
                <TouchableOpacity
                  style={styles.emptyActionBtnSecondary}
                  onPress={() => setSelectedDate('All')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyActionSecondaryText}>View All Dates</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setCalendarVisible(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="calendar" size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyActionText}>Pick Another Date</Text>
              </TouchableOpacity>
            </View>
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

      {/* Full Month Interactive Calendar Modal */}
      <CalendarModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        selectedDate={selectedDate}
        onSelectDate={(dateStr) => setSelectedDate(dateStr)}
        onClearDate={() => setSelectedDate('All')}
        markedDates={allOrderDates}
      />

      {/* Receipt View Modal */}
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
  // Date Chips
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
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickDateChip: {
    borderColor: COLORS.primary + '4D',
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
  // Day Stepper Bar
  dayNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginVertical: 4,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    ...SHADOWS.sm,
  },
  emptyActionText: {
    color: '#FFF',
    fontSize: FONTS.xs,
    fontWeight: '800',
  },
  emptyActionBtnSecondary: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyActionSecondaryText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.xs,
    fontWeight: '700',
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

# ==========================================
# 3. AnalyticsScreen.js (Full Calendar Any-Day Filter + Prev/Next Day Stepper)
# ==========================================
ANALYTICS_CODE = '''import React, { useState } from 'react';
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
'''

FILES_TO_WRITE = [
  (os.path.join(MOBILE_ROOT, 'src', 'components', 'CalendarModal.js'), CALENDAR_MODAL_CODE),
  (os.path.join(MOBILE_ROOT, 'src', 'screens', 'OrdersScreen.js'), ORDERS_CODE),
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
