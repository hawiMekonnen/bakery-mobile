import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBakery } from '../store/BakeryStore';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';
import BluetoothPrinterModal from '../components/BluetoothPrinterModal';
import { isBluetoothConnected, printToBluetoothPrinter, getPrinterPaperWidth } from '../services/bluetoothPrinterService';
import { pushSyncData } from '../services/syncService';
import { printReceipt, shareReceiptPDF } from '../utils/receiptPrinter';

const CATEGORIES = ['All', 'Pastry', 'Savory', 'Bread', 'Cakes', 'Coffee', 'Sandwiches'];

const PAYMENT_METHODS = [
  { id: 'Cash', label: 'Cash', icon: 'cash-outline', emoji: '💵' },
  { id: 'Card', label: 'Card', icon: 'card-outline', emoji: '💳' },
  { id: 'Mobile', label: 'Mobile', icon: 'phone-portrait-outline', emoji: '📱' },
];

export default function POSScreen({ navigation }) {
  const { state, dispatch } = useBakery();
  const { products, auth } = state;

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [cartModalVisible, setCartModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [btModalVisible, setBtModalVisible] = useState(false);

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const doAddToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
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
        `${product.name} is marked as Sold Out (0 remaining). Prepare more in the Daily Items Sold tracker, or add anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Anyway', onPress: () => doAddToCart(product) }
        ]
      );
      return;
    }
    doAddToCart(product);
  };

  const changeQuantityBy = (id, delta) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === id);
      if (!existing) return prev;
      const nextQty = existing.quantity + delta;
      if (nextQty <= 0) {
        return prev.filter(item => item.id !== id);
      }
      return prev.map(item =>
        item.id === id ? { ...item, quantity: nextQty } : item
      );
    });
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setNotes('');
    setPaymentMethod('Cash');
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

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
      notes: notes.trim(),
      status: 'Completed',
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        emoji: item.emoji || '🥐',
      })),
    };

    dispatch({ type: 'ADD_ORDER', payload: newOrder });

    // Auto-sync order to server in background
    pushSyncData({ ...state, orders: [newOrder, ...(state.orders || [])] }).catch(() => {});

    setLastCompletedOrder(newOrder);
    setCartModalVisible(false);
    clearCart();
    setReceiptModalVisible(true);
  };

  const handlePrint = async () => {
    if (!lastCompletedOrder) return;
    setIsPrinting(true);
    try {
      const paperWidth = await getPrinterPaperWidth();
      const result = await printToBluetoothPrinter(lastCompletedOrder, auth.businessName || 'Bakery', paperWidth);
      if (result.success) {
        Alert.alert(
          'Receipt Sent! 🧾🖨️',
          `Receipt #${lastCompletedOrder.id} sent to printer (${paperWidth} roll).`
        );
      } else {
        if (result.error !== 'PRINT_FAILED') {
          setBtModalVisible(true);
        }
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
      {/* ─── Interactive Screen Header ─── */}
      <ScreenHeader
        canGoBack
        onBack={() => navigation.goBack()}
        emoji="🛒"
        title="Point of Sale"
        subtitle={`${products.length} products • Quick register`}
        rightAction={
          <TouchableOpacity
            style={[styles.headerCartBtn, cart.length > 0 && styles.headerCartBtnActive]}
            onPress={() => setCartModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="cart" size={17} color={cart.length > 0 ? '#FFF' : COLORS.textPrimary} />
            <Text style={[styles.headerCartText, cart.length > 0 && { color: '#FFF' }]}>
              {totalItemsCount} | ${total.toFixed(0)}
            </Text>
          </TouchableOpacity>
        }
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search fetira, sambusa, baklava, coffee..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Pills */}
      <View style={styles.categoryWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContent}
        >
          {CATEGORIES.map(cat => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Products Grid */}
      <FlatList
        data={filteredProducts}
        keyExtractor={item => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const inCart = cart.find(c => c.id === item.id);
          const inCartQty = inCart ? inCart.quantity : 0;

          return (
            <TouchableOpacity
              style={[styles.productCard, inCartQty > 0 && styles.productCardActive]}
              onPress={() => addToCart(item)}
              activeOpacity={0.75}
            >
              <View style={styles.productTop}>
                <View style={styles.emojiCircle}>
                  <Text style={styles.productEmoji}>{item.emoji || '🥐'}</Text>
                </View>
                {inCartQty > 0 && (
                  <View style={styles.inCartPill}>
                    <Text style={styles.inCartPillText}>{inCartQty}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, marginBottom: 4 }}>
                <Text style={styles.productCategory}>{item.category}</Text>
                {(() => {
                  const pPrep = typeof item.preparedCount === 'number' ? item.preparedCount : 30;
                  const pSold = Number(item.soldCount) || 0;
                  const pRem = Math.max(0, pPrep - pSold);
                  if (pRem === 0) {
                    return (
                      <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#DC2626' }}>Sold Out</Text>
                      </View>
                    );
                  }
                  if (pRem <= 5) {
                    return (
                      <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#D97706' }}>{pRem} left</Text>
                      </View>
                    );
                  }
                  return (
                    <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                      <Text style={{ fontSize: 9, fontWeight: '800', color: '#16A34A' }}>{pRem} left</Text>
                    </View>
                  );
                })()}
              </View>

              <View style={styles.productBottomRow}>
                <Text style={styles.productPrice}>${Number(item.price).toFixed(2)}</Text>
                <View style={styles.addIconCircle}>
                  <Ionicons name="add" size={16} color="#FFF" />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Bottom Cart Floating Bar if items are added */}
      {cart.length > 0 && (
        <View style={styles.floatingCartBar}>
          <View>
            <Text style={styles.floatingCartCount}>{totalItemsCount} items selected</Text>
            <Text style={styles.floatingCartTotal}>${total.toFixed(2)} total</Text>
          </View>
          <TouchableOpacity
            style={styles.floatingCheckoutBtn}
            onPress={() => setCartModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.floatingCheckoutText}>Review & Pay →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Cart & Checkout Modal */}
      <Modal
        visible={cartModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCartModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cartModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Current Register Cart</Text>
                <Text style={styles.modalSubtitle}>{totalItemsCount} items ready for sale</Text>
              </View>
              <TouchableOpacity onPress={() => setCartModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {cart.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 44, marginBottom: 8 }}>🛒</Text>
                <Text style={{ fontSize: FONTS.md, fontWeight: '700', color: COLORS.textPrimary }}>Cart is empty</Text>
                <Text style={{ fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 4 }}>Tap any product card to add to order</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 280 }}>
                {cart.map(item => (
                  <View key={item.id} style={styles.cartItemRow}>
                    <Text style={{ fontSize: 24, marginRight: 10 }}>{item.emoji || '🥐'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cartItemName}>{item.name}</Text>
                      <Text style={styles.cartItemPrice}>${Number(item.price).toFixed(2)} each</Text>
                    </View>
                    <View style={styles.qtyControl}>
                      <TouchableOpacity onPress={() => changeQuantityBy(item.id, -1)} style={styles.qtyBtn}>
                        <Ionicons name="remove" size={14} color={COLORS.textPrimary} />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity onPress={() => changeQuantityBy(item.id, 1)} style={styles.qtyBtn}>
                        <Ionicons name="add" size={14} color={COLORS.textPrimary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {cart.length > 0 && (
              <View style={styles.checkoutForm}>
                <Text style={styles.formLabel}>PAYMENT METHOD</Text>
                <View style={styles.paymentMethodRow}>
                  {PAYMENT_METHODS.map(m => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.payMethodBtn, paymentMethod === m.id && styles.payMethodBtnActive]}
                      onPress={() => setPaymentMethod(m.id)}
                    >
                      <Text style={{ fontSize: 16, marginRight: 4 }}>{m.emoji}</Text>
                      <Text style={[styles.payMethodText, paymentMethod === m.id && { color: '#FFF' }]}>{m.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.customerInput}
                  placeholder="Customer Name (optional)"
                  placeholderTextColor={COLORS.textMuted}
                  value={customerName}
                  onChangeText={setCustomerName}
                />

                <View style={styles.cartSummaryRow}>
                  <Text style={styles.cartSummaryLabel}>Subtotal</Text>
                  <Text style={styles.cartSummaryVal}>${subtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.cartSummaryRow}>
                  <Text style={styles.cartSummaryLabel}>Tax (5%)</Text>
                  <Text style={styles.cartSummaryVal}>${tax.toFixed(2)}</Text>
                </View>
                <View style={[styles.cartSummaryRow, { marginTop: 4 }]}>
                  <Text style={styles.cartGrandTotalLabel}>TOTAL DUE</Text>
                  <Text style={styles.cartGrandTotalVal}>${total.toFixed(2)}</Text>
                </View>

                <TouchableOpacity
                  style={styles.completeOrderBtn}
                  onPress={handleCheckout}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.completeOrderText}>Complete Sale (${total.toFixed(2)})</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Sale Complete Receipt & Printing Modal */}
      {lastCompletedOrder && (
        <Modal
          visible={receiptModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setReceiptModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.receiptSuccessCard}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark" size={32} color="#FFF" />
              </View>
              <Text style={styles.successTitle}>Payment Completed!</Text>
              <Text style={styles.successSub}>Order {lastCompletedOrder.id} successfully recorded</Text>
              <Text style={styles.successAmount}>${Number(lastCompletedOrder.total).toFixed(2)}</Text>
              <Text style={styles.successMethod}>Paid via {lastCompletedOrder.paymentMethod}</Text>

              {/* Receipt Print & Share Actions */}
              <View style={styles.printActionRow}>
                <TouchableOpacity
                  style={styles.printBtn}
                  onPress={handlePrint}
                  disabled={isPrinting}
                  activeOpacity={0.8}
                >
                  <Ionicons name="print" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.printBtnText}>
                    {isPrinting ? 'Printing...' : 'Print Receipt'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shareBtn}
                  onPress={handleShare}
                  disabled={isPrinting}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-social-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.shareBtnText}>Share PDF</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => setReceiptModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.doneBtnText}>New Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
          <BluetoothPrinterModal
        visible={btModalVisible}
        onClose={() => setBtModalVisible(false)}
        orderToPrint={lastCompletedOrder}
        businessName={auth.businessName || 'Bakery'}
        onFallbackSystemPrint={async () => {
          if (lastCompletedOrder) {
            await printReceipt(lastCompletedOrder, auth.businessName || 'Bakery');
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerCartBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  headerCartText: {
    fontSize: FONTS.xs,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sm,
    color: COLORS.textPrimary,
  },
  categoryWrapper: {
    marginBottom: 8,
  },
  categoryContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  categoryTextActive: {
    color: '#FFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 120,
    gap: 12,
  },
  columnWrapper: {
    gap: 12,
  },
  productCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  productCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFFDF9',
  },
  productTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  emojiCircle: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productEmoji: {
    fontSize: 26,
  },
  inCartPill: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  inCartPillText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  productName: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  productBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  productPrice: {
    fontSize: FONTS.sm,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  addIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Floating Cart Bar
  floatingCartBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: COLORS.surfaceDark,
    borderRadius: RADIUS.xl,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  floatingCartCount: {
    fontSize: FONTS.xs,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  floatingCartTotal: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: '#FFF',
  },
  floatingCheckoutBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  floatingCheckoutText: {
    color: '#FFF',
    fontSize: FONTS.xs,
    fontWeight: '800',
  },
  // Cart Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  cartModalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 20,
    maxHeight: '90%',
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
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  cartItemName: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cartItemPrice: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    padding: 3,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
  },
  qtyText: {
    width: 24,
    textAlign: 'center',
    fontSize: FONTS.xs,
    fontWeight: '700',
  },
  checkoutForm: {
    marginTop: 14,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  payMethodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  payMethodBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  payMethodText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  customerInput: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: FONTS.xs,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  cartSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  cartSummaryLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },
  cartSummaryVal: {
    fontSize: FONTS.xs,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cartGrandTotalLabel: {
    fontSize: FONTS.sm,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  cartGrandTotalVal: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  completeOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    marginTop: 12,
  },
  completeOrderText: {
    color: '#FFF',
    fontSize: FONTS.sm,
    fontWeight: '800',
  },
  // Success Receipt Modal
  receiptSuccessCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 24,
    marginHorizontal: 20,
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: 'auto',
    width: '90%',
    ...SHADOWS.lg,
  },
  successIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: FONTS.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  successSub: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  successAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primaryDark,
    marginVertical: 10,
  },
  successMethod: {
    fontSize: FONTS.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  printActionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 12,
  },
  printBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    ...SHADOWS.sm,
  },
  printBtnText: {
    color: '#FFF',
    fontSize: FONTS.sm,
    fontWeight: '800',
  },
  shareBtn: {
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
  shareBtnText: {
    color: COLORS.primary,
    fontSize: FONTS.sm,
    fontWeight: '800',
  },
  doneBtn: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    paddingVertical: 11,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  doneBtnText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sm,
    fontWeight: '700',
  },
});
