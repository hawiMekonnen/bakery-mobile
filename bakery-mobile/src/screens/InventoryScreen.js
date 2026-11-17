import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBakery } from '../store/BakeryStore';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';

const STOCK_FILTERS = ['All', 'In stock', 'Low stock'];

export default function InventoryScreen({ navigation }) {
  const { state, dispatch } = useBakery();
  const { inventory = [], auth = {} } = state || {};

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All'); // 'All' | 'In stock' | 'Low stock'
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('kg');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');

  const lowStockItems = useMemo(() => {
    return inventory.filter(
      (i) => (Number(i.stock) || 0) <= (Number(i.minStock) || 0)
    );
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch = (item.name || '').toLowerCase().includes(search.toLowerCase());
      const isLow = (Number(item.stock) || 0) <= (Number(item.minStock) || 0);
      let matchesFilter = true;
      if (filterType === 'In stock') matchesFilter = !isLow;
      if (filterType === 'Low stock') matchesFilter = isLow;
      return matchesSearch && matchesFilter;
    });
  }, [inventory, search, filterType]);

  const openAddModal = () => {
    setEditingItem(null);
    setName('');
    setUnit('kg');
    setStock('');
    setMinStock('');
    setCostPerUnit('');
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setName(item.name || '');
    setUnit(item.unit || 'kg');
    setStock(String(item.stock || ''));
    setMinStock(String(item.minStock || ''));
    setCostPerUnit(String(item.costPerUnit || ''));
    setModalVisible(true);
  };

  const handleSaveItem = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter item name.');
      return;
    }
    const numStock = parseFloat(stock) || 0;
    const numMin = parseFloat(minStock) || 0;
    const numCost = parseFloat(costPerUnit) || 0;

    if (editingItem) {
      dispatch({
        type: 'UPDATE_INVENTORY',
        payload: {
          ...editingItem,
          name: name.trim(),
          unit,
          stock: numStock,
          minStock: numMin,
          costPerUnit: numCost,
        },
      });
    } else {
      dispatch({
        type: 'ADD_INVENTORY',
        payload: {
          name: name.trim(),
          unit,
          stock: numStock,
          minStock: numMin,
          costPerUnit: numCost,
        },
      });
    }

    setModalVisible(false);
  };

  const handleDeleteItem = (item) => {
    Alert.alert(
      'Delete Material',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            dispatch({ type: 'DELETE_INVENTORY', payload: item.id });
            setModalVisible(false);
          },
        },
      ]
    );
  };

  const handleAdjust = (id, mode, amount) => {
    dispatch({
      type: 'ADJUST_STOCK',
      payload: { id, mode, amount },
    });
  };

  return (
    <View style={styles.container}>
      {/* ─── Top Header ─── */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (navigation.canGoBack && navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Home');
            }
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Stock</Text>
          <Text style={styles.headerSubtitle}>
            {inventory.length} ingredients · {lowStockItems.length} low stock
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerHistoryBtn}
          onPress={() => navigation.navigate('StockAudit')}
          activeOpacity={0.8}
          accessibilityLabel="Track Ingredients History"
        >
          <Ionicons name="time-outline" size={19} color="#0F172A" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerAddBtn}
          onPress={openAddModal}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={17} color="#FFF" style={{ marginRight: 4 }} />
          <Text style={styles.headerAddText}>Add material</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── 1. Hero Card: STOCK HEALTH ─── */}
        <View style={[styles.heroCard, auth?.brandColor ? { backgroundColor: auth.brandColor } : null]}>
          {/* Concentric rings watermark */}
          <View style={styles.heroCircleWatermark} pointerEvents="none">
            <View style={[styles.circleRing, { width: 140, height: 140 }]} />
            <View style={[styles.circleRing, { width: 220, height: 220 }]} />
            <View style={[styles.circleRing, { width: 300, height: 300 }]} />
          </View>

          <Text style={styles.heroOverline}>STOCK HEALTH</Text>
          <Text style={styles.heroHeading}>
            {lowStockItems.length === 0
              ? 'Everything is above minimum'
              : `${lowStockItems.length} ingredients below minimum`}
          </Text>

          {/* Two Sub-Metric Boxes */}
          <View style={styles.heroSubStatsRow}>
            <View style={styles.heroSubBox}>
              <Text style={styles.heroSubBoxNum}>{inventory.length}</Text>
              <Text style={styles.heroSubBoxLabel}>Ingredients</Text>
            </View>

            <View style={styles.heroSubBox}>
              <Text
                style={[
                  styles.heroSubBoxNum,
                  lowStockItems.length > 0 && { color: '#FCD34D' },
                ]}
              >
                {lowStockItems.length}
              </Text>
              <Text style={styles.heroSubBoxLabel}>Low stock</Text>
            </View>
          </View>
        </View>

        {/* ─── 1.5. Stock Tracking Shortcut Banner ─── */}
        <TouchableOpacity
          style={styles.trackingBanner}
          onPress={() => navigation.navigate('StockAudit')}
          activeOpacity={0.8}
        >
          <View style={styles.trackingBannerIcon}>
            <Ionicons name="time" size={18} color="#0B3B2A" />
          </View>
          <View style={styles.trackingBannerTextWrap}>
            <Text style={styles.trackingBannerTitle}>Ingredient Tracking & Hourly Log</Text>
            <Text style={styles.trackingBannerSub}>
              Track when ingredients are added & modified by hour
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        {/* ─── 2. Search and Filter Row ─── */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search raw ingredients"
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
            onPress={() => {
              const next =
                filterType === 'All'
                  ? 'Low stock'
                  : filterType === 'Low stock'
                  ? 'In stock'
                  : 'All';
              setFilterType(next);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="filter-outline" size={18} color="#0F382C" />
          </TouchableOpacity>
        </View>

        {/* ─── 3. Filter Chips (All, In stock, Low stock) ─── */}
        <View style={styles.filterChipsRow}>
          {STOCK_FILTERS.map((f) => {
            const isActive = filterType === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setFilterType(f)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── 4. Stock Items List ─── */}
        {filteredInventory.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="cube-outline" size={38} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No inventory tracked</Text>
            <Text style={styles.emptySub}>
              Tap "+ Add material" above to track ingredients, stock levels, and costs.
            </Text>
          </View>
        ) : (
          filteredInventory.map((item) => {
            const numStock = Number(item.stock) || 0;
            const numMin = Number(item.minStock) || 0;
            const numCost = Number(item.costPerUnit) || 0;
            const isLow = numStock <= numMin;

            // Maximum capacity for progress bar visualization
            const maxCap = Math.max(numMin * 2, numStock * 1.25, 20);
            const progressPercent = Math.min(100, Math.max(4, (numStock / maxCap) * 100));
            const minMarkerPercent = Math.min(95, Math.max(5, (numMin / maxCap) * 100));
            const totalVal = numStock * numCost;

            return (
              <View key={item.id} style={styles.itemCard}>
                {/* Header Row: Icon + Name & Price + Stock & Badge */}
                <View style={styles.itemHeader}>
                  <View style={styles.iconTile}>
                    <Ionicons name="cube-outline" size={18} color="#10B981" />
                  </View>

                  <View style={styles.itemTitleCol}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.itemCostPerUnit}>
                      ETB {numCost.toFixed(2)} per {item.unit || 'kg'}
                    </Text>
                  </View>

                  <View style={styles.itemStockCol}>
                    <Text style={styles.itemStock}>
                      {item.stock} {item.unit || 'kg'}
                    </Text>
                    <View style={[styles.stockBadge, isLow ? styles.lowBadge : styles.goodBadge]}>
                      <Ionicons
                        name={isLow ? 'alert-circle-outline' : 'checkmark-outline'}
                        size={11}
                        color={isLow ? '#D97706' : '#059669'}
                        style={{ marginRight: 3 }}
                      />
                      <Text style={[styles.stockBadgeText, isLow ? styles.lowBadgeText : styles.goodBadgeText]}>
                        {isLow ? 'Low stock' : 'In stock'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Progress Bar with Min Marker Notch */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${progressPercent}%`,
                          backgroundColor: isLow ? '#F59E0B' : '#10B981',
                        },
                      ]}
                    />
                  </View>
                  {/* Vertical Min Notch Marker */}
                  <View
                    style={[
                      styles.minMarkerNotch,
                      { left: `${minMarkerPercent}%` },
                    ]}
                  />
                </View>

                {/* Labels below Progress Bar: Minimum X kg ... Value ETB XXX.XX */}
                <View style={styles.progressMetaRow}>
                  <Text style={styles.minStockText}>
                    Minimum {item.minStock} {item.unit || 'kg'}
                  </Text>
                  <Text style={styles.valueText}>
                    Value ETB {totalVal.toFixed(2)}
                  </Text>
                </View>

                {/* Quick Stepper Pills & Edit Button Row */}
                <View style={styles.steppersRow}>
                  <View style={styles.stepPillsGroup}>
                    <TouchableOpacity
                      style={styles.quickStepBtn}
                      onPress={() => handleAdjust(item.id, 'sub', 1)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickStepText}>-1</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.quickStepBtn}
                      onPress={() => handleAdjust(item.id, 'sub', 5)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickStepText}>-5</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.quickStepBtn, styles.quickStepAdd]}
                      onPress={() => handleAdjust(item.id, 'add', 5)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.quickStepText, { color: '#059669' }]}>+5</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.quickStepBtn, styles.quickStepAdd]}
                      onPress={() => handleAdjust(item.id, 'add', 10)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.quickStepText, { color: '#059669' }]}>+10</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.editIconBtn}
                    onPress={() => openEditModal(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil-outline" size={15} color="#475569" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* Extra Bottom Padding for floating nav bar */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ─── Add / Edit Material Modal ─── */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {editingItem ? 'Edit Raw Material' : 'Add Raw Material'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>MATERIAL NAME</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Brown Lentils"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>CURRENT STOCK</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={stock}
                    onChangeText={setStock}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>MINIMUM STOCK</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={minStock}
                    onChangeText={setMinStock}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>UNIT</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="kg / L / pcs"
                    placeholderTextColor="#94A3B8"
                    value={unit}
                    onChangeText={setUnit}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>COST PER UNIT (ETB)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="0.00"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={costPerUnit}
                    onChangeText={setCostPerUnit}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveItem}
                activeOpacity={0.88}
              >
                <Text style={styles.saveBtnText}>
                  {editingItem ? 'Save Material' : 'Add Material'}
                </Text>
              </TouchableOpacity>

              {editingItem && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteItem(editingItem)}
                  activeOpacity={0.88}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={styles.deleteBtnText}>Delete Material</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  headerHistoryBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    ...SHADOWS.card,
  },
  headerAddText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trackingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    ...SHADOWS.card,
  },
  trackingBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5F6EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingBannerTextWrap: {
    flex: 1,
  },
  trackingBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  trackingBannerSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },

  /* ─── Hero Card: STOCK HEALTH ─── */
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
  heroHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 16,
  },
  heroSubStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  heroSubBox: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  heroSubBoxNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroSubBoxLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#D1FAE5',
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
    height: 44,
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

  /* ─── Filter Chips ─── */
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  filterChipActive: {
    backgroundColor: '#0F382C',
    borderColor: '#0F382C',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  /* ─── Stock Item Card ─── */
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitleCol: {
    flex: 1,
    marginLeft: 10,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemCostPerUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  itemStockCol: {
    alignItems: 'flex-end',
  },
  itemStock: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  goodBadge: {
    backgroundColor: '#ECFDF5',
  },
  lowBadge: {
    backgroundColor: '#FEF3C7',
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  goodBadgeText: {
    color: '#059669',
  },
  lowBadgeText: {
    color: '#D97706',
  },

  /* Progress Bar with Min Marker */
  progressContainer: {
    position: 'relative',
    height: 5,
    marginTop: 14,
    marginBottom: 6,
  },
  progressTrack: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  minMarkerNotch: {
    position: 'absolute',
    top: -2,
    bottom: -2,
    width: 2,
    backgroundColor: '#0F382C',
    borderRadius: 1,
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  minStockText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  valueText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },

  /* Steppers & Edit Button */
  steppersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  stepPillsGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  quickStepBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStepAdd: {
    backgroundColor: '#ECFDF5',
  },
  quickStepText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  editIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Empty state */
  emptyWrap: {
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
  emptySub: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#64748B',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 14,
  },
  saveBtn: {
    backgroundColor: '#0F382C',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteBtn: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
});
