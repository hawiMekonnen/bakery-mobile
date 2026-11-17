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
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBakery } from '../store/BakeryStore';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';

const CATEGORIES = ['All', 'Pastry', 'Savory', 'Bread', 'Cakes', 'Coffee', 'Sandwiches'];

export default function ProductsScreen({ navigation }) {
  const { state, dispatch } = useBakery();
  const { products = [], auth = {} } = state || {};

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Pastry');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [available, setAvailable] = useState(true);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase());
        const matchesCat = selectedCat === 'All' || p.category === selectedCat;
        return matchesSearch && matchesCat;
      })
      .sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return sortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });
  }, [products, search, selectedCat, sortAsc]);

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setCategory('Pastry');
    setPrice('');
    setCost('');
    setAvailable(true);
    setModalVisible(true);
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    setName(p.name || '');
    setCategory(p.category || 'Pastry');
    setPrice(String(p.price || ''));
    setCost(String(p.cost || ''));
    setAvailable(p.available !== false);
    setModalVisible(true);
  };

  const handleSaveProduct = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter product name.');
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price.');
      return;
    }
    const numCost = parseFloat(cost) || 0;

    if (editingProduct) {
      dispatch({
        type: 'UPDATE_PRODUCT',
        payload: {
          ...editingProduct,
          name: name.trim(),
          category,
          price: numPrice,
          cost: numCost,
          available,
        },
      });
    } else {
      dispatch({
        type: 'ADD_PRODUCT',
        payload: {
          name: name.trim(),
          category,
          price: numPrice,
          cost: numCost,
          available,
        },
      });
    }

    setModalVisible(false);
  };

  const handleDeleteProduct = (p) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${p.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch({ type: 'DELETE_PRODUCT', payload: p.id }),
        },
      ]
    );
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
          <Text style={styles.headerTitle}>Bakery menu</Text>
          <Text style={styles.headerSubtitle}>{products.length} menu items</Text>
        </View>

        <TouchableOpacity
          style={styles.headerAddBtn}
          onPress={openAddModal}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={17} color="#FFF" style={{ marginRight: 4 }} />
          <Text style={styles.headerAddText}>New item</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Search and Filter Row ─── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search menu items"
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
          onPress={() => setSortAsc(!sortAsc)}
          activeOpacity={0.8}
        >
          <Ionicons name="filter-outline" size={18} color="#0F382C" />
        </TouchableOpacity>
      </View>

      {/* ─── Category Filter Chips ─── */}
      <View style={styles.categoryWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContent}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCat === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setSelectedCat(cat)}
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

      {/* ─── Section Header (ALL ITEMS · Sorted A to Z) ─── */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionOverline}>ALL ITEMS</Text>
        <TouchableOpacity onPress={() => setSortAsc(!sortAsc)} activeOpacity={0.7}>
          <Text style={styles.sortLabel}>
            {sortAsc ? 'Sorted A to Z' : 'Sorted Z to A'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── Products List ─── */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="restaurant-outline" size={38} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No menu items found</Text>
            <Text style={styles.emptySubtitle}>
              Tap "+ New item" above to add baked goods or beverages.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isPastry = item.category === 'Pastry' || item.category === 'Bread' || item.category === 'Cakes';
          const iconTileBg = isPastry ? '#FEF3C7' : '#ECFDF5';
          const iconColor = isPastry ? '#D97706' : '#10B981';
          const catBadgeBg = isPastry ? '#FEF3C7' : '#ECFDF5';
          const catBadgeColor = isPastry ? '#92400E' : '#065F46';

          const costVal = Number(item.cost || 0);
          const priceVal = Number(item.price || 0);
          const profitVal = Math.max(0, priceVal - costVal);
          const marginVal = priceVal > 0 ? Math.round((profitVal / priceVal) * 100) : 0;

          return (
            <View style={styles.itemCard}>
              {/* Top Row: Icon + Name/Category + Action Buttons */}
              <View style={styles.cardHeaderRow}>
                <View style={[styles.itemIconTile, { backgroundColor: iconTileBg }]}>
                  <Ionicons name="pricetag-outline" size={18} color={iconColor} />
                </View>

                <View style={styles.cardNameCol}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={[styles.categoryBadge, { backgroundColor: catBadgeBg }]}>
                    <Text style={[styles.categoryBadgeText, { color: catBadgeColor }]}>
                      {item.category || 'Menu'}
                    </Text>
                  </View>
                </View>

                {/* Edit & Delete Action Buttons */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.actionBtnEdit}
                    onPress={() => openEditModal(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil-outline" size={15} color="#475569" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtnDelete}
                    onPress={() => handleDeleteProduct(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={15} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* 3-Column Stats Box: COST, PRICE, MARGIN */}
              <View style={styles.statsBoxRow}>
                <View style={styles.statCol}>
                  <Text style={styles.statColLabel}>COST</Text>
                  <Text style={styles.statColValue}>ETB {costVal.toFixed(2)}</Text>
                </View>

                <View style={styles.statCol}>
                  <Text style={styles.statColLabel}>PRICE</Text>
                  <Text style={[styles.statColValue, { color: '#059669' }]}>
                    ETB {priceVal.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.statCol}>
                  <Text style={styles.statColLabel}>MARGIN</Text>
                  <Text style={styles.statColValue}>{marginVal}%</Text>
                </View>
              </View>

              {/* Profit Margin Progress Bar */}
              <View style={styles.marginTrack}>
                <View
                  style={[
                    styles.marginFill,
                    {
                      width: `${Math.min(100, Math.max(5, marginVal))}%`,
                      backgroundColor: '#10B981',
                    },
                  ]}
                />
              </View>

              {/* Bottom Note: Profit per item */}
              <View style={styles.profitRow}>
                <Text style={styles.profitText}>
                  Profit ETB {profitVal.toFixed(2)} each
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* ─── Add / Edit Modal ─── */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Edit Menu Item' : 'New Menu Item'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>ITEM NAME</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Honey Walnut Baklava"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.modalCatChip, category === c && styles.modalCatChipActive]}
                    onPress={() => setCategory(c)}
                  >
                    <Text style={[styles.modalCatText, category === c && styles.modalCatTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>COST (ETB)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="0.00"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={cost}
                    onChangeText={setCost}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>SELLING PRICE (ETB)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="0.00"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Available for Sale</Text>
                <Switch
                  value={available}
                  onValueChange={setAvailable}
                  trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveProduct}
                activeOpacity={0.88}
              >
                <Text style={styles.saveBtnText}>
                  {editingProduct ? 'Save Changes' : 'Create Item'}
                </Text>
              </TouchableOpacity>
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

  /* ─── Search & Filter Row ─── */
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

  /* ─── Category Chips ─── */
  categoryWrapper: {
    marginBottom: 10,
  },
  categoryContent: {
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
    fontWeight: '700',
    color: '#0F172A',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },

  /* ─── Section Header ─── */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  sectionOverline: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#64748B',
  },
  sortLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },

  /* ─── Product Card ─── */
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIconTile: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardNameCol: {
    flex: 1,
    marginLeft: 10,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtnEdit: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDelete: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* 3-Column Stats Row */
  statsBoxRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statCol: {
    flex: 1,
  },
  statColLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#64748B',
  },
  statColValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },

  /* Margin Progress Bar */
  marginTrack: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 10,
  },
  marginFill: {
    height: '100%',
    borderRadius: 2,
  },

  /* Profit Row */
  profitRow: {
    alignItems: 'flex-end',
    marginTop: 6,
  },
  profitText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
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
  modalCatChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  modalCatChipActive: {
    backgroundColor: '#0F382C',
  },
  modalCatText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  modalCatTextActive: {
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  saveBtn: {
    backgroundColor: '#0F382C',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
