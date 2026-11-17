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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBakery } from '../store/BakeryStore';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';

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

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Strict Daily Calculation: Items sold starts from 0 every day based on today's orders
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const todayOrders = (state.orders || []).filter((o) => {
    const od = (o.createdAt || o.date || '').slice(0, 10);
    return od === todayDateStr;
  });

  // Product ID -> quantity sold TODAY map
  const todaySoldMap = {};
  todayOrders.forEach((order) => {
    (order.items || []).forEach((it) => {
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

  // Handlers for Prepared Stepper (Incremental & Direct Typed Input)
  const handleStepPrepared = (item, delta) => {
    const currentPrep = typeof item.preparedCount === 'number' ? item.preparedCount : 0;
    const nextPrep = Math.max(0, currentPrep + delta);
    dispatch({
      type: 'UPDATE_PRODUCT_PREPARED',
      payload: { id: item.id, preparedCount: nextPrep },
    });
  };

  const handleDirectPreparedChange = (item, text) => {
    const clean = text.replace(/[^0-9]/g, '');
    const val = clean === '' ? 0 : parseInt(clean, 10);
    dispatch({
      type: 'UPDATE_PRODUCT_PREPARED',
      payload: { id: item.id, preparedCount: val },
    });
  };

  const handleQuickAddBatch = (item, amount) => {
    dispatch({
      type: 'ADD_PRODUCT_BATCH',
      payload: { id: item.id, amount },
    });
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
    Alert.alert('Updated', `All items have been set to ${val} prepared units.`);
  };

  const handleResetDay = () => {
    Alert.alert(
      'Reset Daily Sales Count',
      'Are you sure you want to reset today\'s sales counts to zero for a new shift?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset to 0',
          style: 'destructive',
          onPress: () => {
            dispatch({ type: 'RESET_DAILY_ITEMS_SOLD', payload: { resetPrepared: false } });
            Alert.alert('Reset Complete', 'Today\'s sales counts have been reset to 0.');
          },
        },
      ]
    );
  };

  const renderProductItem = ({ item }) => {
    const prep = typeof item.preparedCount === 'number' ? item.preparedCount : 30;
    const sold = todaySoldMap[item.id] || 0;
    const remaining = Math.max(0, prep - sold);
    const progressPercent = prep > 0 ? Math.min(100, Math.round((sold / prep) * 100)) : 0;

    let statusColor = COLORS.brandGreenText;
    let statusBg = COLORS.softGreen;
    let statusText = `${remaining} in stock`;

    if (remaining === 0) {
      statusColor = COLORS.dangerText;
      statusBg = COLORS.dangerBg;
      statusText = 'SOLD OUT';
    } else if (remaining <= 5) {
      statusColor = COLORS.warningText;
      statusBg = COLORS.warningBg;
      statusText = `LOW: ${remaining} LEFT`;
    }

    return (
      <View style={styles.card}>
        {/* Top Product Header Row */}
        <View style={styles.cardTopRow}>
          <View style={styles.prodLeft}>
            <View style={styles.iconTile}>
              <Ionicons name="fast-food-outline" size={20} color={COLORS.brandGreenText} />
            </View>
            <View style={styles.prodInfo}>
              <Text style={styles.prodName}>{item.name}</Text>
              <Text style={styles.prodMeta}>
                {item.category} • ETB {Number(item.price).toFixed(2)}
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
                <Ionicons name="remove" size={14} color={COLORS.ink} />
              </TouchableOpacity>

              <TextInput
                style={styles.stepInput}
                value={String(prep)}
                keyboardType="number-pad"
                selectTextOnFocus
                onChangeText={(txt) => handleDirectPreparedChange(item, txt)}
              />

              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => handleStepPrepared(item, +1)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={14} color={COLORS.ink} />
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

          {/* Sold Column */}
          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>SOLD TODAY</Text>
            <View style={styles.soldValueBox}>
              <Text style={styles.soldValueText}>{sold}</Text>
              <Text style={styles.soldSublabel}>items sold</Text>
            </View>
          </View>

          {/* Remaining Column */}
          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>REMAINING</Text>
            <View style={[styles.remainingValueBox, { borderColor: statusColor + '40' }]}>
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
                  backgroundColor: remaining === 0 ? COLORS.dangerText : COLORS.brandGreen,
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
        icon="stats-chart-outline"
        title="Daily Items Sold"
        subtitle="Prepared vs Sold Inventory Tracker"
      />

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderProductItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Top Summary Metrics: 2x2 Grid */}
            <View style={styles.summaryGrid2x2}>
              <View style={styles.summaryRow}>
                {/* Total Prepared */}
                <View style={styles.summaryCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardPreparedLbl}>TOTAL PREPARED</Text>
                    <Ionicons name="basket-outline" size={16} color={COLORS.muted} />
                  </View>
                  <Text style={styles.cardVal}>{totalPrepared}</Text>
                  <Text style={styles.cardSubText}>Initial daily batch</Text>
                </View>

                {/* Sold in POS */}
                <View style={styles.summaryCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardSoldLbl}>SOLD IN POS</Text>
                    <Ionicons name="cart-outline" size={16} color={COLORS.brandGreenText} />
                  </View>
                  <Text style={[styles.cardVal, { color: COLORS.brandGreenText }]}>{totalSold}</Text>
                  <Text style={styles.cardSubText}>Sold today</Text>
                </View>
              </View>

              <View style={styles.summaryRow}>
                {/* Remaining Stock */}
                <View style={styles.summaryCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardRemainingLbl}>REMAINING</Text>
                    <Ionicons name="cube-outline" size={16} color={COLORS.brandDarkGreen} />
                  </View>
                  <Text style={styles.cardVal}>{totalRemaining}</Text>
                  <Text style={styles.cardSubText}>Available to sell</Text>
                </View>

                {/* Sell-Through */}
                <View style={styles.summaryCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardRateLbl}>SELL-THROUGH</Text>
                    <Ionicons name="pie-chart-outline" size={16} color={COLORS.warningText} />
                  </View>
                  <Text style={[styles.cardVal, { color: COLORS.warningText }]}>{sellThroughRate}%</Text>
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
                <Ionicons name="options-outline" size={16} color={COLORS.brandDarkGreen} style={{ marginRight: 6 }} />
                <Text style={styles.batchSetBtnText}>Quick Set All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.newDayBtn}
                onPress={handleResetDay}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={16} color={COLORS.muted} style={{ marginRight: 6 }} />
                <Text style={styles.newDayBtnText}>New Morning Shift</Text>
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color={COLORS.muted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search prepared items..."
                placeholderTextColor={COLORS.muted}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={COLORS.muted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Category Filter Pills */}
            <FlatList
              horizontal
              data={CATEGORIES}
              keyExtractor={(c) => c}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
              renderItem={({ item }) => {
                const isActive = selectedCategory === item;
                return (
                  <TouchableOpacity
                    style={[styles.catPill, isActive && styles.catPillActive]}
                    onPress={() => setSelectedCategory(item)}
                  >
                    <Text style={[styles.catPillText, isActive && styles.catPillTextActive]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </>
        }
      />

      {/* Batch Set All Modal */}
      <Modal visible={batchSetModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Quick Set All Prepared</Text>
            <Text style={styles.dialogDesc}>
              Set the prepared batch count for all products across the menu to a standard amount.
            </Text>
            <TextInput
              style={styles.dialogInput}
              keyboardType="number-pad"
              value={batchPreparedInput}
              onChangeText={setBatchPreparedInput}
              selectTextOnFocus
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setBatchSetModalVisible(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogConfirmBtn}
                onPress={handleApplyBatchSet}
              >
                <Text style={styles.dialogConfirmText}>Apply to All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.appBg,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 12,
  },
  summaryGrid2x2: {
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: 14,
    ...SHADOWS.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardPreparedLbl: {
    fontSize: 10,
    fontFamily: FONTS.extraBold,
    color: COLORS.muted,
  },
  cardSoldLbl: {
    fontSize: 10,
    fontFamily: FONTS.extraBold,
    color: COLORS.brandGreenText,
  },
  cardRemainingLbl: {
    fontSize: 10,
    fontFamily: FONTS.extraBold,
    color: COLORS.brandDarkGreen,
  },
  cardRateLbl: {
    fontSize: 10,
    fontFamily: FONTS.extraBold,
    color: COLORS.warningText,
  },
  cardVal: {
    fontSize: 22,
    fontFamily: FONTS.extraBold,
    color: COLORS.ink,
    marginVertical: 2,
  },
  cardSubText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
  },
  actionToolbar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  batchSetBtn: {
    flex: 1,
    height: 42,
    borderRadius: RADIUS.chip,
    backgroundColor: COLORS.softGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchSetBtnText: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: COLORS.brandDarkGreen,
  },
  newDayBtn: {
    flex: 1,
    height: 42,
    borderRadius: RADIUS.chip,
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  newDayBtnText: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.input,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    marginBottom: 10,
    ...SHADOWS.card,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.body,
    fontFamily: FONTS.medium,
    color: COLORS.ink,
  },
  categoryScroll: {
    gap: 8,
    marginBottom: 12,
  },
  catPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: RADIUS.chip,
    backgroundColor: COLORS.card,
    ...SHADOWS.card,
  },
  catPillActive: {
    backgroundColor: COLORS.brandDarkGreen,
  },
  catPillText: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
  },
  catPillTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: 14,
    ...SHADOWS.card,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  prodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.tile,
    backgroundColor: COLORS.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  prodInfo: {
    flex: 1,
  },
  prodName: {
    fontSize: FONTS.body,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
  },
  prodMeta: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.badge,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.extraBold,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.appBg,
    borderRadius: RADIUS.chip,
    padding: 10,
  },
  metricCol: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 9,
    fontFamily: FONTS.extraBold,
    color: COLORS.muted,
    marginBottom: 6,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.chip,
    padding: 2,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: COLORS.appBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: FONTS.extraBold,
    color: COLORS.ink,
    paddingVertical: 0,
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  quickChip: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 6,
    paddingVertical: 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  quickChipText: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    color: COLORS.brandGreenText,
  },
  soldValueBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.chip,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  soldValueText: {
    fontSize: 16,
    fontFamily: FONTS.extraBold,
    color: COLORS.ink,
  },
  soldSublabel: {
    fontSize: 9,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
  },
  remainingValueBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.chip,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderWidth: 1.5,
  },
  remainingValueText: {
    fontSize: 16,
    fontFamily: FONTS.extraBold,
  },
  remainingSublabel: {
    fontSize: 9,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.appBg,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(14, 31, 23, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: 22,
    ...SHADOWS.hero,
  },
  dialogTitle: {
    fontSize: FONTS.h2,
    fontFamily: FONTS.extraBold,
    color: COLORS.ink,
    marginBottom: 4,
  },
  dialogDesc: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
    marginBottom: 14,
    lineHeight: 18,
  },
  dialogInput: {
    height: 48,
    borderRadius: RADIUS.input,
    backgroundColor: COLORS.appBg,
    paddingHorizontal: 14,
    fontSize: FONTS.body,
    fontFamily: FONTS.extraBold,
    color: COLORS.ink,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    textAlign: 'center',
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  dialogCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.chip,
    backgroundColor: COLORS.appBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogCancelText: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
  },
  dialogConfirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.chip,
    backgroundColor: COLORS.brandDarkGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogConfirmText: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
});
