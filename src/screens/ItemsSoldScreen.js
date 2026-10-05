import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBakery } from '../store/BakeryStore';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';
import ManagerPinModal from '../components/ManagerPinModal';

const CATEGORIES = ['All', 'Pastry', 'Savory', 'Bread', 'Cakes', 'Coffee', 'Sandwiches'];

export default function ItemsSoldScreen({ navigation }) {
  const { state, dispatch } = useBakery();
  const { products = [] } = state;

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');

  // Edit Single Item Prepared Count Modal
  const [editingProduct, setEditingProduct] = useState(null);
  const [editPreparedInput, setEditPreparedInput] = useState('');

  // Quick Set All Prepared Modal
  const [batchSetModalVisible, setBatchSetModalVisible] = useState(false);
  const [batchPreparedInput, setBatchPreparedInput] = useState('30');
  const [pinModalVisible, setPinModalVisible] = useState(false);

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Strict Daily Calculation: Items sold starts from 0 every day based on today's orders
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const todayOrders = (state.orders || []).filter(o => {
    const od = (o.createdAt || o.date || '').slice(0, 10);
    return od === todayDateStr;
  });

  // Product ID -> quantity sold TODAY map
  const todaySoldMap = {};
  todayOrders.forEach(order => {
    (order.items || []).forEach(it => {
      todaySoldMap[it.id] = (todaySoldMap[it.id] || 0) + (Number(it.quantity) || 1);
    });
  });

  // Aggregated Daily Metrics
  const totalPrepared = products.reduce((sum, p) => sum + (Number(p.preparedCount) || 0), 0);
  const totalSold = products.reduce((sum, p) => sum + (todaySoldMap[p.id] || 0), 0);
  const totalRemaining = products.reduce((sum, p) => {
    const prep = Number(p.preparedCount) || 0;
    const sold = todaySoldMap[p.id] || 0;
    return sum + Math.max(0, prep - sold);
  }, 0);
  const sellThroughRate = totalPrepared > 0 ? Math.round((totalSold / totalPrepared) * 100) : 0;

  // Handlers for Prepared Stepper
  const handleStepPrepared = (item, delta) => {
    const currentPrep = typeof item.preparedCount === 'number' ? item.preparedCount : 30;
    const nextPrep = Math.max(0, currentPrep + delta);
    dispatch({
      type: 'UPDATE_PRODUCT_PREPARED',
      payload: { id: item.id, preparedCount: nextPrep },
    });
  };

  const handleQuickAddBatch = (item, amount) => {
    dispatch({
      type: 'ADD_PRODUCT_BATCH',
      payload: { id: item.id, amount },
    });
  };

  const openEditModal = (item) => {
    setEditingProduct(item);
    const current = typeof item.preparedCount === 'number' ? item.preparedCount : 30;
    setEditPreparedInput(String(current));
  };

  const handleSaveSinglePrepared = () => {
    if (!editingProduct) return;
    const val = parseInt(editPreparedInput, 10);
    if (isNaN(val) || val < 0) {
      Alert.alert('Invalid Count', 'Please enter a valid positive number.');
      return;
    }
    dispatch({
      type: 'UPDATE_PRODUCT_PREPARED',
      payload: { id: editingProduct.id, preparedCount: val },
    });
    setEditingProduct(null);
  };

  const handleApplyBatchSet = () => {
    const val = parseInt(batchPreparedInput, 10);
    if (isNaN(val) || val < 0) {
      Alert.alert('Invalid Count', 'Please enter a valid number.');
      return;
    }
    dispatch({
      type: 'BATCH_SET_ALL_PREPARED',
      payload: { amount: val },
    });
    setBatchSetModalVisible(false);
    Alert.alert('Updated!', `All items have been set to ${val} prepared units.`);
  };

  const handleResetDay = () => {
    setPinModalVisible(true);
  };

  const handleAuthorizedReset = () => {
    dispatch({ type: 'RESET_DAILY_ITEMS_SOLD', payload: { resetPrepared: false } });
    Alert.alert('Shift Reset Authorized! ✓', 'Daily sold counts have been reset to 0.');
  };

  const renderProductItem = ({ item }) => {
    const prep = typeof item.preparedCount === 'number' ? item.preparedCount : 30;
    // Strictly starts from 0 every single day
    const sold = todaySoldMap[item.id] || 0;
    const remaining = Math.max(0, prep - sold);
    const progressPercent = prep > 0 ? Math.min(100, Math.round((sold / prep) * 100)) : 0;

    let statusColor = '#16A34A';
    let statusBg = '#DCFCE7';
    let statusText = `${remaining} in stock`;

    if (remaining === 0) {
      statusColor = '#DC2626';
      statusBg = '#FEE2E2';
      statusText = 'SOLD OUT';
    } else if (remaining <= 5) {
      statusColor = '#D97706';
      statusBg = '#FEF3C7';
      statusText = `LOW: ${remaining} LEFT`;
    }

    return (
      <View style={styles.card}>
        {/* Top Product Header Row */}
        <View style={styles.cardTopRow}>
          <View style={styles.prodLeft}>
            <View style={styles.emojiCircle}>
              <Text style={styles.emojiText}>{item.emoji || '🥐'}</Text>
            </View>
            <View style={styles.prodInfo}>
              <Text style={styles.prodName}>{item.name}</Text>
              <Text style={styles.prodMeta}>
                {item.category} • ${Number(item.price).toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>

        {/* 3 Metrics Columns: Prepared (Editable), Sold, Remaining */}
        <View style={styles.metricsRow}>
          {/* Prepared Column (Editable) */}
          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>PREPARED INITIAL</Text>
            <View style={styles.stepperWrap}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => handleStepPrepared(item, -1)}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={16} color={COLORS.textPrimary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.stepValueBox}
                onPress={() => openEditModal(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.stepValueText}>{prep}</Text>
                <Text style={styles.tapEditHint}>Tap to edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => handleStepPrepared(item, +1)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={16} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Quick Batch Fresh Add Chips */}
            <View style={styles.quickAddRow}>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => handleQuickAddBatch(item, 5)}
              >
                <Text style={styles.quickChipText}>+5 Fresh</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => handleQuickAddBatch(item, 10)}
              >
                <Text style={styles.quickChipText}>+10 Fresh</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sold Column (Deducted when sold in POS) */}
          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>SOLD TODAY</Text>
            <View style={styles.soldValueBox}>
              <Text style={styles.soldValueText}>{sold}</Text>
              <Text style={styles.soldSublabel}>items sold</Text>
            </View>
          </View>

          {/* Remaining Column (Prepared minus Sold) */}
          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>REMAINING</Text>
            <View style={[styles.remainingValueBox, { borderColor: statusColor + '55' }]}>
              <Text style={[styles.remainingValueText, { color: statusColor }]}>{remaining}</Text>
              <Text style={styles.remainingSublabel}>available</Text>
            </View>
          </View>
        </View>

        {/* Sell-Through Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: remaining === 0 ? '#DC2626' : COLORS.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {progressPercent}% sold ({sold} of {prep} items)
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        canGoBack={true}
        onBack={() => navigation.goBack()}
        emoji="🥐"
        title="Daily Items Sold"
        subtitle="Prepared vs Sold Inventory Tracker"
      />

      <FlatList
        data={filteredProducts}
        keyExtractor={item => String(item.id)}
        renderItem={renderProductItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Top Summary Metrics: 2x2 Grid with generous width, tall padding & zero cutoff */}
            <View style={styles.summaryGrid2x2}>
              <View style={styles.summaryRow}>
                {/* Total Prepared */}
                <View style={[styles.summaryCard, styles.cardPrepared]}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardPreparedLbl}>TOTAL PREPARED</Text>
                    <Ionicons name="basket-outline" size={16} color="#64748B" />
                  </View>
                  <Text style={styles.cardPreparedVal}>{totalPrepared}</Text>
                  <Text style={styles.cardSubText}>Initial daily batch</Text>
                </View>

                {/* Sold in POS */}
                <View style={[styles.summaryCard, styles.cardSold]}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardSoldLbl}>SOLD IN POS</Text>
                    <Ionicons name="cart-outline" size={16} color="#2563EB" />
                  </View>
                  <Text style={styles.cardSoldVal}>{totalSold}</Text>
                  <Text style={styles.cardSubText}>Sold today (resets daily)</Text>
                </View>
              </View>

              <View style={styles.summaryRow}>
                {/* Remaining Stock */}
                <View style={[styles.summaryCard, styles.cardRemaining]}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardRemainingLbl}>REMAINING STOCK</Text>
                    <Ionicons name="cube-outline" size={16} color="#16A34A" />
                  </View>
                  <Text style={styles.cardRemainingVal}>{totalRemaining}</Text>
                  <Text style={styles.cardSubText}>Available to sell</Text>
                </View>

                {/* Sell-Through */}
                <View style={[styles.summaryCard, styles.cardRate]}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardRateLbl}>SELL-THROUGH</Text>
                    <Ionicons name="pie-chart-outline" size={16} color="#D97706" />
                  </View>
                  <Text style={styles.cardRateVal}>{sellThroughRate}%</Text>
                  <Text style={styles.cardSubText}>Prepared vs sold</Text>
                </View>
              </View>
            </View>

            {/* Quick Action Toolbar */}
            <View style={styles.actionToolbar}>
              <TouchableOpacity
                style={styles.batchSetBtn}
                onPress={() => setBatchSetModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="options-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={styles.batchSetBtnText}>Quick Set All Prepared</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.newDayBtn}
                onPress={handleResetDay}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={16} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                <Text style={styles.newDayBtnText}>New Morning Shift</Text>
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search prepared items..."
                placeholderTextColor={COLORS.textMuted}
                value={search}
                onChangeText={setSearch}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Category Filter Pills */}
            <FlatList
              horizontal
              data={CATEGORIES}
              keyExtractor={c => c}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.catPill,
                    selectedCategory === item && styles.catPillActive,
                  ]}
                  onPress={() => setSelectedCategory(item)}
                >
                  <Text
                    style={[
                      styles.catPillText,
                      selectedCategory === item && styles.catPillTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </>
        }
      />

      {/* Edit Single Item Prepared Count Modal */}
      {editingProduct && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Edit Prepared Quantity</Text>
              <Text style={styles.modalSubtitle}>
                {editingProduct.emoji} {editingProduct.name}
              </Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={editPreparedInput}
                onChangeText={setEditPreparedInput}
                autoFocus
                placeholder="e.g. 40"
              />
              <Text style={styles.modalHint}>
                When items are sold in POS, they will automatically be deducted from this number.
              </Text>
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setEditingProduct(null)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleSaveSinglePrepared}
                >
                  <Text style={styles.modalSaveText}>Update</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Quick Set All Prepared Modal */}
      {batchSetModalVisible && (
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Set Prepared Quantity for All Items</Text>
              <Text style={styles.modalSubtitle}>
                Enter the daily initial prepared quantity to apply to all products in the bakery.
              </Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={batchPreparedInput}
                onChangeText={setBatchPreparedInput}
                autoFocus
                placeholder="30"
              />
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setBatchSetModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleApplyBatchSet}
                >
                  <Text style={styles.modalSaveText}>Set All Items</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}


      {/* Manager PIN Security Guard */}
      <ManagerPinModal
        visible={pinModalVisible}
        onClose={() => setPinModalVisible(false)}
        onSuccess={handleAuthorizedReset}
        actionTitle="Authorize Shift Reset"
        actionDescription="Enter 4-digit Manager PIN to reset today's shift counters to zero."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  summaryGrid2x2: {
    gap: 10,
    marginTop: 2,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    minHeight: 82,
    justifyContent: 'space-between',
    ...SHADOWS.sm,
  },
  cardPrepared: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  cardPreparedLbl: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  cardPreparedVal: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginVertical: 2,
  },
  cardSold: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  cardSoldLbl: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  cardSoldVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1D4ED8',
    marginVertical: 2,
  },
  cardRemaining: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  cardRemainingLbl: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
    letterSpacing: 0.5,
  },
  cardRemainingVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#15803D',
    marginVertical: 2,
  },
  cardRate: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  cardRateLbl: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  cardRateVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#B45309',
    marginVertical: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardSubText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  actionToolbar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  batchSetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary + '33',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  batchSetBtnText: {
    fontSize: FONTS.xs,
    fontWeight: '800',
    color: COLORS.primary,
  },
  newDayBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  newDayBtnText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sm,
    color: COLORS.textPrimary,
  },
  categoryScroll: {
    paddingBottom: 14,
    gap: 8,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  catPillText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  catPillTextActive: {
    color: '#FFF',
  },
  // Card styles
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  prodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  emojiCircle: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  emojiText: {
    fontSize: 20,
  },
  prodInfo: {
    flex: 1,
  },
  prodName: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  prodMeta: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  metricCol: {
    flex: 1,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValueBox: {
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  stepValueText: {
    fontSize: FONTS.md,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  tapEditHint: {
    fontSize: 8,
    color: COLORS.primary,
    fontWeight: '700',
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  quickChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.xs,
  },
  quickChipText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary,
  },
  soldValueBox: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  soldValueText: {
    fontSize: FONTS.xl,
    fontWeight: '900',
    color: '#2563EB',
  },
  soldSublabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  remainingValueBox: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderRadius: RADIUS.sm,
    width: '100%',
    paddingVertical: 4,
  },
  remainingValueText: {
    fontSize: FONTS.xl,
    fontWeight: '900',
  },
  remainingSublabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 2,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.borderLight,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    textAlign: 'right',
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 20,
    ...SHADOWS.lg,
  },
  modalTitle: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
    marginBottom: 14,
  },
  modalInput: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: FONTS.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 16,
    lineHeight: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSubtle,
  },
  modalCancelText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  modalSaveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  modalSaveText: {
    fontSize: FONTS.xs,
    fontWeight: '800',
    color: '#FFF',
  },
});
