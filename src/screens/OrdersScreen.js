import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBakery } from '../store/BakeryStore';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import BluetoothPrinterModal from '../components/BluetoothPrinterModal';
import { isBluetoothConnected, printToBluetoothPrinter, getPrinterPaperWidth } from '../services/bluetoothPrinterService';
import CalendarModal from '../components/CalendarModal';
import { printReceipt, shareReceiptPDF } from '../utils/receiptPrinter';

const FILTER_PAYMENTS = [
  { id: 'All', label: 'All payments', dot: null },
  { id: 'Cash', label: 'Cash', dot: '#10B981' },
  { id: 'Card', label: 'Card', dot: '#3B82F6' },
  { id: 'Mobile', label: 'Mobile', dot: '#8B5CF6' },
];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getFormattedDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split('T')[0];
};

const formatGroupDateHeader = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return 'Recent Orders';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, monthIdx, day);
      if (!isNaN(d.getTime())) {
        const weekday = WEEKDAYS[d.getDay()] || '';
        const month = MONTHS[monthIdx] || '';
        return `${weekday}, ${month} ${day}, ${year}`;
      }
    }
    return dateStr;
  } catch {
    return dateStr || 'Recent Orders';
  }
};

const formatOrderTime = (createdAt) => {
  if (!createdAt) return '';
  try {
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return '';
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    const formattedM = m < 10 ? `0${m}` : m;
    return `${h}:${formattedM} ${ampm}`;
  } catch {
    return '';
  }
};

const formatReceiptDateTime = (createdAt) => {
  if (!createdAt) return '';
  try {
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return String(createdAt);
    const month = MONTHS[d.getMonth()] || '';
    const day = d.getDate();
    const year = d.getFullYear();
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    const formattedM = m < 10 ? `0${m}` : m;
    return `${month} ${day}, ${year}, ${h}:${formattedM} ${ampm}`;
  } catch {
    return String(createdAt);
  }
};

export default function OrdersScreen({ navigation }) {
  const { state } = useBakery();
  const { orders = [], auth = {} } = state || {};

  const [search, setSearch] = useState('');
  const [filterPayment, setFilterPayment] = useState('All');
  const [selectedDate, setSelectedDate] = useState('All'); // 'All' | 'YYYY-MM-DD'
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [btModalVisible, setBtModalVisible] = useState(false);

  const todayStr = getFormattedDate(0);
  const yesterdayStr = getFormattedDate(1);

  // Distinct dates in order history
  const allOrderDates = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return Array.from(
      new Set(orders.map((o) => (o && o.createdAt ? o.createdAt.split('T')[0] : '')).filter(Boolean))
    );
  }, [orders]);

  // Filter orders by date, payment method, and search text
  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return orders.filter((o) => {
      if (!o) return false;
      const orderDate = (o.createdAt || '').split('T')[0];
      const matchesDate = selectedDate === 'All' ? true : orderDate === selectedDate;
      const matchesPayment =
        filterPayment === 'All' ||
        (o.paymentMethod || '').toLowerCase() === filterPayment.toLowerCase();
      const matchesSearch =
        (o.id || '').toLowerCase().includes((search || '').toLowerCase()) ||
        (o.customerName || '').toLowerCase().includes((search || '').toLowerCase());

      return matchesDate && matchesPayment && matchesSearch;
    });
  }, [orders, selectedDate, filterPayment, search]);

  const totalRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [filteredOrders]);

  const avgSale = filteredOrders.length > 0 ? (totalRevenue / filteredOrders.length).toFixed(2) : '0.00';

  const distinctDays = useMemo(() => {
    return Array.from(new Set(filteredOrders.map((o) => (o.createdAt || '').split('T')[0]).filter(Boolean)));
  }, [filteredOrders]);

  // Payment totals
  const { cashTotal, cardTotal, mobileTotal } = useMemo(() => {
    let cash = 0;
    let card = 0;
    let mobile = 0;
    filteredOrders.forEach((o) => {
      const p = (o.paymentMethod || '').toLowerCase();
      const amt = Number(o.total) || 0;
      if (p === 'cash') cash += amt;
      else if (p === 'card') card += amt;
      else mobile += amt;
    });
    return { cashTotal: cash, cardTotal: card, mobileTotal: mobile };
  }, [filteredOrders]);

  // Best seller
  const bestSeller = useMemo(() => {
    const counts = {};
    filteredOrders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const name = it.name || 'Bakery Item';
        const qty = Number(it.quantity) || 1;
        counts[name] = (counts[name] || 0) + qty;
      });
    });
    let topName = 'No sales';
    let topQty = 0;
    Object.entries(counts).forEach(([name, qty]) => {
      if (qty > topQty) {
        topName = name;
        topQty = qty;
      }
    });
    return { name: topName, count: topQty };
  }, [filteredOrders]);

  // Group filtered orders by Date Header
  const groupedSections = useMemo(() => {
    const groups = {};
    filteredOrders.forEach((order) => {
      const d = (order.createdAt || '').split('T')[0] || 'Unknown Date';
      if (!groups[d]) {
        groups[d] = {
          dateStr: d,
          orders: [],
          total: 0,
        };
      }
      groups[d].orders.push(order);
      groups[d].total += Number(order.total) || 0;
    });

    return Object.values(groups).sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  }, [filteredOrders]);

  const openOrderDetail = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const handlePrint = async () => {
    if (!selectedOrder) return;
    setIsPrinting(true);
    try {
      const paperWidth = await getPrinterPaperWidth();
      const result = await printToBluetoothPrinter(
        selectedOrder,
        auth.businessName || 'Bakery',
        paperWidth
      );
      if (result.success) {
        Alert.alert(
          'Receipt Printed',
          `Receipt #${selectedOrder.id} printed to ${result.printerName || 'Bluetooth printer'}.`
        );
      } else {
        setBtModalVisible(true);
      }
    } catch (err) {
      Alert.alert('Print Error', 'Could not complete print job. Please check printer connection.');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleShare = async () => {
    if (!selectedOrder) return;
    setIsPrinting(true);
    await shareReceiptPDF(selectedOrder, auth.businessName || 'Bakery');
    setIsPrinting(false);
  };

  // Safe Segment bar percentages (always numbers > 0)
  const grandTotalSafe = totalRevenue > 0 ? totalRevenue : 1;
  const cashFlex = Math.max(0.01, isNaN(cashTotal / grandTotalSafe) ? 0.33 : cashTotal / grandTotalSafe);
  const cardFlex = Math.max(0.01, isNaN(cardTotal / grandTotalSafe) ? 0.33 : cardTotal / grandTotalSafe);
  const mobileFlex = Math.max(0.01, isNaN(mobileTotal / grandTotalSafe) ? 0.33 : mobileTotal / grandTotalSafe);

  const heroSubtitle =
    filteredOrders.length === 1
      ? '1 sale'
      : `${filteredOrders.length} sales across ${distinctDays.length || 1} ${
          distinctDays.length === 1 ? 'day' : 'days'
        }`;

  return (
    <View style={styles.container}>
      {/* ─── Top Header ─── */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>History</Text>
          <Text style={styles.headerSubtitle}>All past receipts</Text>
        </View>

        <TouchableOpacity
          style={styles.pickDayBtn}
          onPress={() => setCalendarVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={15} color="#0F382C" style={{ marginRight: 6 }} />
          <Text style={styles.pickDayText}>
            {selectedDate === 'All' ? 'Pick a day' : selectedDate}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── 1. Hero Card: Dark Green with Concentric Watermark ─── */}
        <View style={[styles.heroCard, auth?.brandColor ? { backgroundColor: auth.brandColor } : null]}>
          {/* Subtle Concentric Rings Watermark */}
          <View style={styles.heroCircleWatermark} pointerEvents="none">
            <View style={[styles.circleRing, { width: 140, height: 140 }]} />
            <View style={[styles.circleRing, { width: 220, height: 220 }]} />
            <View style={[styles.circleRing, { width: 300, height: 300 }]} />
          </View>

          <Text style={styles.heroOverline}>TOTAL SALES</Text>
          <Text style={styles.heroAmount}>ETB {totalRevenue.toFixed(2)}</Text>
          <Text style={styles.heroSub}>{heroSubtitle}</Text>

          {/* Segmented Color Progress Bar */}
          <View style={styles.segmentedBarTrack}>
            <View style={[styles.segmentFill, { flex: cashFlex, backgroundColor: '#10B981' }]} />
            <View style={[styles.segmentFill, { flex: cardFlex, backgroundColor: '#3B82F6' }]} />
            <View style={[styles.segmentFill, { flex: mobileFlex, backgroundColor: '#8B5CF6' }]} />
          </View>

          {/* Legend Row: Cash, Card, Mobile */}
          <View style={styles.heroBreakdownRow}>
            <View style={styles.heroBreakdownCol}>
              <View style={styles.heroDotLabelRow}>
                <View style={[styles.heroLegendDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.heroLegendText}>Cash</Text>
              </View>
              <Text style={styles.heroLegendAmount}>ETB {cashTotal.toFixed(2)}</Text>
            </View>

            <View style={styles.heroBreakdownCol}>
              <View style={styles.heroDotLabelRow}>
                <View style={[styles.heroLegendDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.heroLegendText}>Card</Text>
              </View>
              <Text style={styles.heroLegendAmount}>ETB {cardTotal.toFixed(2)}</Text>
            </View>

            <View style={styles.heroBreakdownCol}>
              <View style={styles.heroDotLabelRow}>
                <View style={[styles.heroLegendDot, { backgroundColor: '#8B5CF6' }]} />
                <Text style={styles.heroLegendText}>Mobile</Text>
              </View>
              <Text style={styles.heroLegendAmount}>ETB {mobileTotal.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* ─── 2. Two Metric Cards: AVERAGE SALE & BEST SELLER ─── */}
        <View style={styles.metricCardsRow}>
          {/* Average Sale Card */}
          <View style={styles.metricCard}>
            <View style={styles.metricIconBoxCash}>
              <Ionicons name="cash-outline" size={18} color="#10B981" />
            </View>
            <Text style={styles.metricOverline}>AVERAGE SALE</Text>
            <Text style={styles.metricAmount}>ETB {avgSale}</Text>
            <Text style={styles.metricSub}>per order</Text>
          </View>

          {/* Best Seller Card */}
          <View style={styles.metricCard}>
            <View style={styles.metricIconBoxStar}>
              <Ionicons name="star-outline" size={18} color="#D97706" />
            </View>
            <Text style={styles.metricOverline}>BEST SELLER</Text>
            <Text style={styles.metricAmount} numberOfLines={1}>{bestSeller.name}</Text>
            <Text style={styles.metricSub}>{bestSeller.count} sold</Text>
          </View>
        </View>

        {/* ─── 3. Search and Filter Row ─── */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Order number or customer"
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setCalendarVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="filter-outline" size={18} color="#0F382C" />
          </TouchableOpacity>
        </View>

        {/* ─── 4. Date Filter Chips ─── */}
        <View style={styles.chipsScrollWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            <TouchableOpacity
              style={[styles.chip, selectedDate === 'All' && styles.chipActive]}
              onPress={() => setSelectedDate('All')}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, selectedDate === 'All' && styles.chipTextActive]}>
                All dates
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, selectedDate === todayStr && styles.chipActive]}
              onPress={() => setSelectedDate(todayStr)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, selectedDate === todayStr && styles.chipTextActive]}>
                Today
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, selectedDate === yesterdayStr && styles.chipActive]}
              onPress={() => setSelectedDate(yesterdayStr)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, selectedDate === yesterdayStr && styles.chipTextActive]}>
                Yesterday
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.chip,
                selectedDate !== 'All' && selectedDate !== todayStr && selectedDate !== yesterdayStr && styles.chipActive,
              ]}
              onPress={() => setCalendarVisible(true)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedDate !== 'All' && selectedDate !== todayStr && selectedDate !== yesterdayStr && styles.chipTextActive,
                ]}
              >
                {selectedDate !== 'All' && selectedDate !== todayStr && selectedDate !== yesterdayStr ? selectedDate : 'Pick date'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ─── 5. Payment Filter Chips ─── */}
        <View style={styles.chipsScrollWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {FILTER_PAYMENTS.map((pay) => {
              const isActive = filterPayment === pay.id;
              return (
                <TouchableOpacity
                  key={pay.id}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => setFilterPayment(pay.id)}
                  activeOpacity={0.75}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {pay.dot && !isActive && (
                      <View style={[styles.paymentDot, { backgroundColor: pay.dot }]} />
                    )}
                    {pay.dot && isActive && (
                      <View style={[styles.paymentDot, { backgroundColor: '#FFFFFF' }]} />
                    )}
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {pay.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ─── 6. Order Groups List ─── */}
        {groupedSections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="receipt-outline" size={36} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>
              {selectedDate !== 'All' ? 'No orders on this day' : 'No sales recorded yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              Orders placed in Point of Sale will automatically appear here.
            </Text>
          </View>
        ) : (
          groupedSections.map((group) => (
            <View key={group.dateStr} style={styles.dateGroupWrapper}>
              {/* Group Header: ● Sunday, Nov 8, 2026 ... 1 sale · ETB 63.00 */}
              <View style={styles.groupHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.groupBulletDot} />
                  <Text style={styles.groupDateHeader}>
                    {formatGroupDateHeader(group.dateStr)}
                  </Text>
                </View>
                <Text style={styles.groupTotalHeader}>
                  {group.orders.length} {group.orders.length === 1 ? 'sale' : 'sales'} · ETB {group.total.toFixed(2)}
                </Text>
              </View>

              {/* Order Cards with Green Accent Strip */}
              {group.orders.map((order) => {
                const isCash = (order.paymentMethod || '').toLowerCase() === 'cash';
                const isCard = (order.paymentMethod || '').toLowerCase() === 'card';
                const badgeBg = isCash ? '#ECFDF5' : isCard ? '#EFF6FF' : '#F5F3FF';
                const badgeColor = isCash ? '#059669' : isCard ? '#2563EB' : '#7C3AED';

                const timeStr = formatOrderTime(order.createdAt);
                const itemsSummary = (order.items || []).map((i) => `${i.quantity}x ${i.name}`).join(', ');

                return (
                  <View key={order.id} style={styles.orderCard}>
                    {/* Left Green Accent Bar */}
                    <View style={styles.cardLeftStrip} />

                    <View style={styles.cardBody}>
                      {/* Top Header Row */}
                      <View style={styles.orderCardHeader}>
                        <View style={styles.orderIconBox}>
                          <Ionicons name="receipt-outline" size={17} color="#10B981" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.orderIdBold}>{order.id}</Text>
                          <Text style={styles.orderMetaText}>
                            {timeStr ? `${timeStr} · ` : ''}{order.customerName || 'Walk-in customer'}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.orderPriceText}>ETB {Number(order.total || 0).toFixed(2)}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                            {order.syncStatus !== 'synced' && (
                              <View style={styles.notSyncedBadge}>
                                <Text style={styles.notSyncedBadgeText}>Not synced</Text>
                              </View>
                            )}
                            <View style={[styles.orderPayBadge, { backgroundColor: badgeBg }]}>
                              <Text style={[styles.orderPayText, { color: badgeColor }]}>
                                {order.paymentMethod || 'Cash'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* Items Bubble */}
                      <View style={styles.itemsBubble}>
                        <Text style={styles.itemsBubbleText} numberOfLines={1}>
                          {itemsSummary || '1x Item'}
                        </Text>
                      </View>

                      {/* Bottom Footer Row */}
                      <View style={styles.cardFooterRow}>
                        <Text style={styles.receiptFooterLabel}>Receipt {order.id}</Text>
                        <TouchableOpacity
                          style={styles.viewReceiptBtn}
                          onPress={() => openOrderDetail(order)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.viewReceiptText}>View receipt</Text>
                          <Ionicons name="chevron-forward" size={13} color="#059669" style={{ marginLeft: 2 }} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}

        {/* Extra Bottom Padding for floating nav bar */}
        <View style={{ height: 120 }} />
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

      {/* Receipt Modal */}
      {selectedOrder && (
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.receiptSheet}>
              <View style={styles.sheetHandle} />

              <View style={styles.sheetTopRow}>
                <View>
                  <Text style={styles.sheetReceiptTitle}>Receipt #{selectedOrder.id}</Text>
                  <Text style={styles.sheetReceiptSub}>
                    {formatOrderTime(selectedOrder.createdAt)} · {selectedOrder.customerName || 'Walk-in customer'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.sheetCloseBtn}
                >
                  <Ionicons name="close" size={20} color="#0F172A" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                <View style={styles.receiptSlipCard}>
                  {/* 1. Bakery Name at the top */}
                  <Text style={styles.slipBrand}>
                    {(auth.businessName || 'BAKERY').toUpperCase()}
                  </Text>
                  <View style={styles.slipDivider} />

                  {/* 2. Order ID, Date, Payment Type */}
                  <View style={styles.slipMetaRow}>
                    <Text style={styles.slipMetaLabel}>Order ID:</Text>
                    <Text style={styles.slipMetaVal}>#{selectedOrder.id}</Text>
                  </View>
                  <View style={styles.slipMetaRow}>
                    <Text style={styles.slipMetaLabel}>Date:</Text>
                    <Text style={styles.slipMetaVal}>{formatReceiptDateTime(selectedOrder.createdAt)}</Text>
                  </View>
                  <View style={styles.slipMetaRow}>
                    <Text style={styles.slipMetaLabel}>Payment Type:</Text>
                    <Text style={styles.slipMetaVal}>{selectedOrder.paymentMethod || 'Cash'}</Text>
                  </View>

                  <View style={styles.slipDivider} />

                  {/* 3. Items and their price */}
                  {(selectedOrder.items || []).map((it, idx) => (
                    <View key={idx} style={styles.slipItemRow}>
                      <Text style={styles.slipItemName}>
                        {it.quantity}x {it.name}
                      </Text>
                      <Text style={styles.slipItemPrice}>
                        ETB {(Number(it.price) * Number(it.quantity)).toFixed(2)}
                      </Text>
                    </View>
                  ))}

                  <View style={styles.slipDivider} />

                  {/* 4. Subtotal amount and Total */}
                  <View style={styles.slipMetaRow}>
                    <Text style={styles.slipMetaLabel}>Subtotal</Text>
                    <Text style={styles.slipMetaVal}>ETB {Number(selectedOrder.subtotal || selectedOrder.total || 0).toFixed(2)}</Text>
                  </View>
                  <View style={[styles.slipMetaRow, { marginTop: 4 }]}>
                    <Text style={styles.slipTotalLabel}>TOTAL</Text>
                    <Text style={styles.slipTotalVal}>ETB {Number(selectedOrder.total || selectedOrder.subtotal || 0).toFixed(2)}</Text>
                  </View>

                  <View style={styles.slipDivider} />

                  {/* 5. For internal purpose only */}
                  <Text style={styles.slipInternalNotice}>For internal purpose only</Text>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.receiptActionButtons}>
                <TouchableOpacity
                  style={styles.primaryPrintBtn}
                  onPress={handlePrint}
                  disabled={isPrinting}
                  activeOpacity={0.88}
                >
                  <Ionicons name="print-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryPrintText}>
                    {isPrinting ? 'Printing...' : 'Print Receipt'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryDoneBtn}
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.88}
                >
                  <Ionicons name="checkmark-outline" size={18} color="#0F382C" style={{ marginRight: 6 }} />
                  <Text style={styles.secondaryDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Bluetooth Printer Modal */}
      <BluetoothPrinterModal
        visible={btModalVisible}
        onClose={() => setBtModalVisible(false)}
        onPrintOrder={selectedOrder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 14,
    backgroundColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  pickDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  pickDayText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F382C',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },

  /* ─── Hero Card ─── */
  heroCard: {
    backgroundColor: '#0F382C',
    borderRadius: 22,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  heroCircleWatermark: {
    position: 'absolute',
    right: -40,
    top: -40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroOverline: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#A7F3D0',
    marginBottom: 6,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 13,
    fontWeight: '500',
    color: '#D1FAE5',
    marginTop: 4,
    marginBottom: 16,
  },
  segmentedBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 14,
  },
  segmentFill: {
    height: '100%',
  },
  heroBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  heroBreakdownCol: {
    flex: 1,
  },
  heroDotLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  heroLegendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  heroLegendText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D1FAE5',
  },
  heroLegendAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 1,
  },

  /* ─── Metric Cards ─── */
  metricCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  metricIconBoxCash: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricIconBoxStar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricOverline: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#64748B',
    marginBottom: 4,
  },
  metricAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 2,
  },

  /* ─── Search and Filter Row ─── */
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
  },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },

  /* ─── Filter Chips ─── */
  chipsScrollWrapper: {
    marginVertical: 1,
  },
  chipsRow: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  chipActive: {
    backgroundColor: '#0F382C',
    borderColor: '#0F382C',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  paymentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },

  /* ─── Order Groups List ─── */
  dateGroupWrapper: {
    marginTop: 6,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  groupBulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  groupDateHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F382C',
  },
  groupTotalHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },

  /* ─── Order Cards ─── */
  orderCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  cardLeftStrip: {
    width: 4,
    backgroundColor: '#10B981',
  },
  cardBody: {
    flex: 1,
    padding: 14,
  },
  orderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderIdBold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  orderMetaText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  orderPriceText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  notSyncedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  notSyncedBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#D97706',
  },
  orderPayBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  orderPayText: {
    fontSize: 10,
    fontWeight: '800',
  },
  itemsBubble: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
  },
  itemsBubbleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  receiptFooterLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
  },
  viewReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewReceiptText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },

  /* Empty state */
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  /* ─── Receipt Modal ─── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  receiptSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetReceiptTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetReceiptSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptSlipCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  slipBrand: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    color: '#0F172A',
    letterSpacing: 1,
  },
  slipSub: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    color: '#64748B',
    marginTop: 2,
  },
  slipDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  slipMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  slipMetaLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  slipMetaVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  slipItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  slipItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  slipItemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 8,
  },
  slipTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  slipTotalVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },
  slipInternalNotice: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  receiptActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  primaryPrintBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F382C',
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryPrintText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryDoneBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  secondaryDoneText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F382C',
  },
});
