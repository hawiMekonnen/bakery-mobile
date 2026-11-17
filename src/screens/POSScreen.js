import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBakery } from '../store/BakeryStore';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BluetoothPrinterModal from '../components/BluetoothPrinterModal';
import { isBluetoothConnected, printToBluetoothPrinter, getPrinterPaperWidth } from '../services/bluetoothPrinterService';
import { pushSyncData } from '../services/syncService';
import { printReceipt, shareReceiptPDF } from '../utils/receiptPrinter';

const CATEGORIES = ['All', 'Pastry', 'Savory', 'Bread', 'Cakes', 'Coffee', 'Sandwiches'];

const PAYMENT_METHODS = [
  { id: 'Cash', label: 'Cash', icon: 'cash-outline' },
  { id: 'Card', label: 'Card', icon: 'card-outline' },
  { id: 'Mobile', label: 'Mobile', icon: 'phone-portrait-outline' },
];

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatReceiptDateTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const month = MONTHS_SHORT[d.getMonth()] || '';
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
    return String(dateStr);
  }
};

export default function POSScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const cartBottomPosition = Math.max(insets.bottom, 12) + 78;

  const { state, dispatch } = useBakery();
  const { products = [], auth = {} } = state;

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [checkoutSheetVisible, setCheckoutSheetVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [btModalVisible, setBtModalVisible] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const doAddToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const addToCart = (product) => {
    const prep = typeof product.preparedCount === 'number' ? product.preparedCount : 30;
    const sold = Number(product.soldCount) || 0;
    const remaining = Math.max(0, prep - sold);
    if (remaining <= 0) {
      Alert.alert(
        'Item Sold Out',
        `${product.name} is marked as Sold Out (0 remaining). Prepare more in Daily Items Sold tracker, or add anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Anyway', onPress: () => doAddToCart(product) },
        ]
      );
      return;
    }
    doAddToCart(product);
  };

  const changeQuantityBy = (id, delta) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === id);
      if (!existing) return prev;
      const nextQty = existing.quantity + delta;
      if (nextQty <= 0) {
        return prev.filter((item) => item.id !== id);
      }
      return prev.map((item) =>
        item.id === id ? { ...item, quantity: nextQty } : item
      );
    });
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setPaymentMethod('Cash');
    setAmountReceived('');
  };

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  }, [cart]);

  const tax = 0;
  const total = subtotal;
  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  }, [cart]);

  const parsedReceived = parseFloat(amountReceived);
  const effectiveReceived = isNaN(parsedReceived) ? total : parsedReceived;
  const changeDue = Math.max(0, effectiveReceived - total);

  // Quick cash tender presets: Exact, next 10, next 50, 100
  const cashPresets = useMemo(() => {
    const t = total;
    if (t <= 0) return [40, 50, 100];
    const exactCeil = Math.ceil(t);
    const p1 = Math.ceil(t / 10) * 10;
    const p2 = Math.ceil(t / 50) * 50;
    const p3 = Math.ceil(t / 100) * 100;
    const set = new Set([
      p1 > exactCeil ? p1 : exactCeil + 5,
      p2 > exactCeil ? p2 : exactCeil + 10,
      p3 > exactCeil ? p3 : exactCeil + 50,
    ]);
    return Array.from(set).slice(0, 3);
  }, [total]);

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add products before checking out.');
      return;
    }

    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = {
      id: orderId,
      createdAt: new Date().toISOString(),
      customerName: customerName.trim() || 'Walk-in Customer',
      paymentMethod,
      status: 'Completed',
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      amountReceived: parseFloat(effectiveReceived.toFixed(2)),
      changeDue: parseFloat(changeDue.toFixed(2)),
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    };

    dispatch({ type: 'ADD_ORDER', payload: newOrder });

    // Auto-sync in background
    pushSyncData({ ...state, orders: [newOrder, ...(state.orders || [])] }).catch(() => {});

    setLastCompletedOrder(newOrder);
    setCheckoutSheetVisible(false);
    clearCart();
    setReceiptModalVisible(true);
  };

  const handlePrint = async () => {
    if (!lastCompletedOrder) return;
    setIsPrinting(true);
    try {
      const paperWidth = await getPrinterPaperWidth();
      const result = await printToBluetoothPrinter(
        lastCompletedOrder,
        auth.businessName || 'Bakery',
        paperWidth
      );
      if (result.success) {
        Alert.alert(
          'Receipt Printed',
          `Receipt #${lastCompletedOrder.id} printed to ${result.printerName || 'Bluetooth printer'}.`
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
    if (!lastCompletedOrder) return;
    setIsPrinting(true);
    await shareReceiptPDF(lastCompletedOrder, auth.businessName || 'Bakery');
    setIsPrinting(false);
  };

  return (
    <View style={styles.container}>
      {/* ─── Top Header (New sale · Walk-in customer) ─── */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>New sale</Text>
          <TouchableOpacity
            style={styles.customerPickerBtn}
            onPress={() => setCheckoutSheetVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={12} color="#059669" style={{ marginRight: 4 }} />
            <Text style={styles.customerPickerText}>
              {customerName.trim() ? customerName : 'Walk-in customer'}
            </Text>
            <Ionicons name="chevron-down" size={12} color="#059669" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.headerReceiptBtn}
          onPress={() => setCheckoutSheetVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="receipt-outline" size={18} color="#0F172A" />
          {totalItemsCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{totalItemsCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ─── Search Bar & Layout Button ─── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search menu"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.gridBtn} activeOpacity={0.8}>
          <Ionicons name="apps-outline" size={18} color="#0F382C" />
        </TouchableOpacity>
      </View>

      {/* ─── Category Chips ─── */}
      <View style={styles.categoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.75}
              >
                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── Subheader: MENU · Tap + to add to cart ─── */}
      <View style={styles.menuSubheaderRow}>
        <Text style={styles.menuOverline}>MENU</Text>
        <Text style={styles.menuHint}>Tap + to add to cart</Text>
      </View>

      {/* ─── 2-Column Product Grid matching reference ─── */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.productListContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="fast-food-outline" size={36} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No menu items found</Text>
            <Text style={styles.emptySubtitle}>
              {products.length === 0
                ? 'Your catalog is empty. Add products in Bakery Menu to start selling.'
                : 'No items match your search filter.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const inCart = cart.find((c) => c.id === item.id);
          const inCartQty = inCart ? inCart.quantity : 0;
          const isSavory = item.category === 'Savory';
          const topTileBg = isSavory ? '#ECFDF5' : '#FEF3C7';
          const tagColor = isSavory ? '#10B981' : '#D97706';

          return (
            <View style={[styles.productCard, inCartQty > 0 && styles.productCardActive]}>
              {/* Top Half: Tinted Container with Category & In Cart Badge & Tag Icon */}
              <View style={[styles.cardTopHalf, { backgroundColor: topTileBg }]}>
                <View style={styles.topBadgeRow}>
                  <View style={styles.catBadgePill}>
                    <Text style={styles.catBadgePillText}>{item.category || 'Menu'}</Text>
                  </View>

                  {inCartQty > 0 && (
                    <View style={styles.inCartPill}>
                      <Ionicons name="checkmark" size={11} color="#FFFFFF" style={{ marginRight: 2 }} />
                      <Text style={styles.inCartPillText}>In cart</Text>
                    </View>
                  )}
                </View>

                {/* Big Tag Icon */}
                <View style={styles.centerIconWrap}>
                  <Ionicons name="pricetag-outline" size={28} color={tagColor} />
                </View>
              </View>

              {/* Bottom Half: Name & Price & Stepper */}
              <View style={styles.cardBottomHalf}>
                <Text style={styles.productName} numberOfLines={2}>
                  {item.name}
                </Text>

                <View style={styles.productBottomRow}>
                  <Text style={styles.productPrice}>
                    ETB {Number(item.price).toFixed(2)}
                  </Text>

                  {inCartQty > 0 ? (
                    <View style={styles.inlineStepper}>
                      <TouchableOpacity
                        style={styles.stepperSubBtn}
                        onPress={() => changeQuantityBy(item.id, -1)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="remove" size={13} color="#475569" />
                      </TouchableOpacity>
                      <Text style={styles.stepperQtyText}>{inCartQty}</Text>
                      <TouchableOpacity
                        style={styles.stepperAddBtn}
                        onPress={() => changeQuantityBy(item.id, 1)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add" size={13} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addMiniSquareBtn}
                      onPress={() => addToCart(item)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="add" size={17} color="#10B981" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* ─── Bottom Floating Sticky Cart Bar ─── */}
      {cart.length > 0 && (
        <View style={[styles.floatingCartBar, { bottom: cartBottomPosition }]}>
          <View style={styles.floatingCartLeft}>
            <View style={styles.cartIconCircle}>
              <Ionicons name="cart-outline" size={20} color="#10B981" />
              {totalItemsCount > 0 && (
                <View style={styles.cartIconBadge}>
                  <Text style={styles.cartIconBadgeText}>{totalItemsCount}</Text>
                </View>
              )}
            </View>

            <View style={{ marginLeft: 10 }}>
              <Text style={styles.cartTotalTaxLabel}>Total</Text>
              <Text style={styles.cartTotalAmount}>ETB {total.toFixed(2)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.checkoutBtn, auth.brandColor ? { backgroundColor: auth.brandColor } : null]}
            onPress={() => setCheckoutSheetVisible(true)}
            activeOpacity={0.88}
          >
            <Text style={styles.checkoutBtnText}>Checkout</Text>
            <Ionicons name="chevron-forward" size={15} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Checkout and Cart Bottom Sheet Modal ─── */}
      <Modal
        visible={checkoutSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCheckoutSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheetContainer}>
            {/* Sheet Handle */}
            <View style={styles.sheetHandle} />

            {/* Header */}
            <View style={styles.sheetHeaderRow}>
              <View>
                <Text style={styles.sheetMainTitle}>Checkout and cart</Text>
                <Text style={styles.sheetMainSubtitle}>
                  {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} ready for billing
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setCheckoutSheetVisible(false)}
                style={styles.sheetCloseSquareBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {cart.length === 0 ? (
              <View style={styles.emptySheetWrap}>
                <Ionicons name="cart-outline" size={44} color="#94A3B8" />
                <Text style={styles.emptySheetTitle}>Your cart is empty</Text>
                <Text style={styles.emptySheetText}>Tap items on menu to add</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
                {/* Cart Items List */}
                <View style={{ gap: 8, marginBottom: 14 }}>
                  {cart.map((item) => (
                    <View key={item.id} style={styles.cartRowCard}>
                      <View style={styles.cartRowIconBox}>
                        <Ionicons name="pricetag-outline" size={16} color="#10B981" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.cartRowItemName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.cartRowItemPrice}>
                          ETB {Number(item.price).toFixed(2)} each
                        </Text>
                      </View>

                      {/* Stepper */}
                      <View style={styles.cartRowStepper}>
                        <TouchableOpacity
                          style={styles.cartStepSub}
                          onPress={() => changeQuantityBy(item.id, -1)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="remove" size={14} color="#475569" />
                        </TouchableOpacity>
                        <Text style={styles.cartStepQty}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.cartStepAdd}
                          onPress={() => changeQuantityBy(item.id, 1)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="add" size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Customer Name (Optional) */}
                <Text style={styles.formSectionLabel}>Customer name (optional)</Text>
                <TextInput
                  style={styles.formInputBox}
                  placeholder="e.g. Walk-in Customer"
                  placeholderTextColor="#94A3B8"
                  value={customerName}
                  onChangeText={setCustomerName}
                />

                {/* Payment Method Selector */}
                <Text style={[styles.formSectionLabel, { marginTop: 14 }]}>Payment method</Text>
                <View style={styles.paymentMethodRow}>
                  {PAYMENT_METHODS.map((m) => {
                    const isSelected = paymentMethod === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[
                          styles.paymentMethodBtn,
                          isSelected && styles.paymentMethodBtnActive,
                        ]}
                        onPress={() => setPaymentMethod(m.id)}
                        activeOpacity={0.75}
                      >
                        <Ionicons
                          name={m.icon}
                          size={16}
                          color={isSelected ? '#059669' : '#475569'}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={[
                            styles.paymentMethodText,
                            isSelected && styles.paymentMethodTextActive,
                          ]}
                        >
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Cash Received Container (if Cash is selected) */}
                {paymentMethod === 'Cash' && (
                  <View style={styles.cashTenderContainer}>
                    <Text style={styles.cashTenderLabel}>Cash received (ETB)</Text>
                    <TextInput
                      style={styles.cashTenderInput}
                      placeholder={total.toFixed(0)}
                      placeholderTextColor="#94A3B8"
                      keyboardType="decimal-pad"
                      value={amountReceived}
                      onChangeText={setAmountReceived}
                    />

                    {/* Quick Preset Tender Chips */}
                    <View style={styles.cashPresetsRow}>
                      <TouchableOpacity
                        style={[
                          styles.presetChip,
                          amountReceived === total.toFixed(2) && styles.presetChipActive,
                        ]}
                        onPress={() => setAmountReceived(total.toFixed(2))}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            amountReceived === total.toFixed(2) && styles.presetChipTextActive,
                          ]}
                        >
                          Exact
                        </Text>
                      </TouchableOpacity>

                      {cashPresets.map((val) => {
                        const valStr = String(val);
                        const isPresetActive = amountReceived === valStr;
                        return (
                          <TouchableOpacity
                            key={val}
                            style={[
                              styles.presetChip,
                              isPresetActive && styles.presetChipActive,
                            ]}
                            onPress={() => setAmountReceived(valStr)}
                            activeOpacity={0.75}
                          >
                            <Text
                              style={[
                                styles.presetChipText,
                                isPresetActive && styles.presetChipTextActive,
                              ]}
                            >
                              ETB {val}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Change Due Green Banner */}
                    <View style={styles.changeDueBanner}>
                      <Text style={styles.changeDueBannerLabel}>Change due</Text>
                      <Text style={styles.changeDueBannerAmount}>
                        ETB {changeDue.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Order Cost Summary Card */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryTotalLabel}>Total due</Text>
                    <Text style={styles.summaryTotalVal}>ETB {total.toFixed(2)}</Text>
                  </View>
                </View>

                {/* Complete Sale Button */}
                <TouchableOpacity
                  style={styles.completeSalePrimaryBtn}
                  onPress={handleCheckout}
                  activeOpacity={0.88}
                >
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.completeSalePrimaryText}>
                    Complete sale · ETB {total.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── Receipt Modal ─── */}
      {lastCompletedOrder && (
        <Modal
          visible={receiptModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setReceiptModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.receiptSheetContainer}>
              <View style={styles.sheetHandle} />

              <View style={styles.receiptSheetHeader}>
                <View>
                  <Text style={styles.receiptSheetTitle}>Receipt #{lastCompletedOrder.id}</Text>
                  <Text style={styles.receiptSheetSub}>
                    {new Date(lastCompletedOrder.createdAt).toLocaleString()}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setReceiptModalVisible(false)}
                  style={styles.sheetCloseSquareBtn}
                >
                  <Ionicons name="close" size={18} color="#0F172A" />
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
                    <Text style={styles.slipMetaVal}>#{lastCompletedOrder.id}</Text>
                  </View>
                  <View style={styles.slipMetaRow}>
                    <Text style={styles.slipMetaLabel}>Date:</Text>
                    <Text style={styles.slipMetaVal}>{formatReceiptDateTime(lastCompletedOrder.createdAt)}</Text>
                  </View>
                  <View style={styles.slipMetaRow}>
                    <Text style={styles.slipMetaLabel}>Payment Type:</Text>
                    <Text style={styles.slipMetaVal}>{lastCompletedOrder.paymentMethod || 'Cash'}</Text>
                  </View>

                  <View style={styles.slipDivider} />

                  {/* 3. Items and their price */}
                  {(lastCompletedOrder.items || []).map((it, idx) => (
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
                    <Text style={styles.slipMetaVal}>ETB {Number(lastCompletedOrder.subtotal || lastCompletedOrder.total || 0).toFixed(2)}</Text>
                  </View>
                  <View style={[styles.slipMetaRow, { marginTop: 4 }]}>
                    <Text style={styles.slipTotalLabel}>TOTAL</Text>
                    <Text style={styles.slipTotalVal}>ETB {Number(lastCompletedOrder.total || lastCompletedOrder.subtotal || 0).toFixed(2)}</Text>
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
                  onPress={() => setReceiptModalVisible(false)}
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
        onPrintOrder={lastCompletedOrder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  /* ─── Top Header ─── */
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 14,
    backgroundColor: '#F3F4F6',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.extraBold,
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  customerPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  customerPickerText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#059669',
  },
  headerReceiptBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    ...SHADOWS.card,
  },
  headerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },

  /* ─── Search and Layout Button Row ─── */
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: '#0F172A',
  },
  gridBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },

  /* ─── Category Chips ─── */
  categoriesContainer: {
    marginBottom: 10,
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  categoryChipActive: {
    backgroundColor: '#0F382C',
    borderColor: '#0F382C',
  },
  categoryText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#0F172A',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },

  /* ─── Subheader ─── */
  menuSubheaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  menuOverline: {
    fontSize: 11,
    fontFamily: FONTS.extraBold,
    letterSpacing: 0.8,
    color: '#64748B',
  },
  menuHint: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: '#64748B',
  },

  /* ─── Product 2-Column Grid ─── */
  productListContent: {
    paddingHorizontal: 12,
    paddingBottom: 220,
  },
  productRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  productCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  productCardActive: {
    borderColor: '#10B981',
    borderWidth: 2,
  },
  cardTopHalf: {
    height: 105,
    padding: 10,
    justifyContent: 'space-between',
  },
  topBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catBadgePill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catBadgePillText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#0F172A',
  },
  inCartPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inCartPillText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  centerIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  cardBottomHalf: {
    padding: 12,
  },
  productName: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: '#0F172A',
    minHeight: 34,
  },
  productBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  productPrice: {
    fontSize: 13,
    fontFamily: FONTS.extraBold,
    color: '#059669',
  },
  addMiniSquareBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepperSubBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperQtyText: {
    fontSize: 12,
    fontFamily: FONTS.extraBold,
    color: '#0F172A',
    minWidth: 16,
    textAlign: 'center',
  },
  stepperAddBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ─── Bottom Floating Sticky Cart Bar ─── */
  floatingCartBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 99,
    elevation: 10,
    ...SHADOWS.card,
  },
  floatingCartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartIconBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0F382C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartIconBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  cartTotalTaxLabel: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: '#64748B',
  },
  cartTotalAmount: {
    fontSize: 17,
    fontFamily: FONTS.extraBold,
    color: '#0F172A',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F382C',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  checkoutBtnText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },

  /* ─── Checkout Sheet Modal ─── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '90%',
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetMainTitle: {
    fontSize: 20,
    fontFamily: FONTS.extraBold,
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  sheetMainSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#64748B',
    marginTop: 2,
  },
  sheetCloseSquareBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Cart Row */
  cartRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cartRowIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartRowItemName: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: '#0F172A',
  },
  cartRowItemPrice: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: '#64748B',
    marginTop: 2,
  },
  cartRowStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartStepSub: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartStepQty: {
    fontSize: 13,
    fontFamily: FONTS.extraBold,
    color: '#0F172A',
    minWidth: 16,
    textAlign: 'center',
  },
  cartStepAdd: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Form Section */
  formSectionLabel: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#334155',
    marginBottom: 6,
  },
  formInputBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 46,
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: '#0F172A',
  },

  /* Payment Method Row */
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  paymentMethodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  paymentMethodBtnActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  paymentMethodText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#475569',
  },
  paymentMethodTextActive: {
    color: '#059669',
  },

  /* Cash Tender Container */
  cashTenderContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  cashTenderLabel: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: '#64748B',
    marginBottom: 6,
  },
  cashTenderInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 48,
    fontSize: 18,
    fontFamily: FONTS.extraBold,
    color: '#0F172A',
    marginBottom: 10,
  },
  cashPresetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  presetChipText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#0F172A',
  },
  presetChipTextActive: {
    color: '#059669',
  },
  changeDueBanner: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  changeDueBannerLabel: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: '#0F172A',
  },
  changeDueBannerAmount: {
    fontSize: 17,
    fontFamily: FONTS.extraBold,
    color: '#059669',
  },

  /* Summary Card */
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#64748B',
  },
  summaryVal: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: '#0F172A',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontFamily: FONTS.extraBold,
    color: '#0F172A',
  },
  summaryTotalVal: {
    fontSize: 18,
    fontFamily: FONTS.extraBold,
    color: '#0F172A',
  },

  /* Complete Sale Primary Button */
  completeSalePrimaryBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 20 : 6,
    ...SHADOWS.card,
  },
  completeSalePrimaryText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
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
    fontFamily: FONTS.bold,
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptySheetWrap: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptySheetTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: '#0F172A',
    marginTop: 10,
  },
  emptySheetText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: '#64748B',
    marginTop: 4,
  },

  /* Receipt Modal */
  receiptSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  receiptSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  receiptSheetTitle: {
    fontSize: 18,
    fontFamily: FONTS.extraBold,
    color: '#0F172A',
  },
  receiptSheetSub: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#64748B',
    marginTop: 2,
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
    fontFamily: FONTS.extraBold,
    textAlign: 'center',
    color: '#0F172A',
    letterSpacing: 1,
  },
  slipSub: {
    fontSize: 11,
    fontFamily: FONTS.medium,
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
    fontFamily: FONTS.medium,
    color: '#64748B',
  },
  slipMetaVal: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#0F172A',
  },
  slipItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  slipItemName: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: '#0F172A',
    flex: 1,
  },
  slipItemPrice: {
    fontSize: 13,
    fontFamily: FONTS.extraBold,
    color: '#0F172A',
    marginLeft: 8,
  },
  slipTotalLabel: {
    fontSize: 15,
    fontFamily: FONTS.extraBold,
    color: '#0F172A',
  },
  slipTotalVal: {
    fontSize: 16,
    fontFamily: FONTS.extraBold,
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
    fontFamily: FONTS.bold,
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
