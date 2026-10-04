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

export default function InventoryScreen({ navigation }) {
  const { state, dispatch } = useBakery();
  const { inventory } = state;

  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('kg');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');

  const lowStockItems = inventory.filter(i => (Number(i.stock) || 0) <= (Number(i.minStock) || 0));

  const filteredInventory = inventory.filter(item =>
    (item.name || '').toLowerCase().includes(search.toLowerCase())
  );

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
    setName(item.name);
    setUnit(item.unit || 'kg');
    setStock(String(item.stock));
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

  const handleAdjust = (id, mode, amount) => {
    dispatch({
      type: 'ADJUST_STOCK',
      payload: { id, mode, amount },
    });
  };

  return (
    <View style={styles.container}>
      {/* ─── Interactive Screen Header with + Add Material ─── */}
      <ScreenHeader
        canGoBack
        onBack={() => navigation.goBack()}
        emoji="📦"
        title="Stock & Inventory"
        subtitle={`${inventory.length} raw ingredients • ${lowStockItems.length} low stock`}
        rightAction={
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={openAddModal}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={17} color="#FFF" style={{ marginRight: 3 }} />
            <Text style={styles.headerAddText}>Add Material</Text>
          </TouchableOpacity>
        }
      />

      {/* Low Stock Warning Banner if any */}
      {lowStockItems.length > 0 && (
        <View style={styles.lowStockBanner}>
          <Ionicons name="warning" size={18} color={COLORS.danger} style={{ marginRight: 8 }} />
          <Text style={styles.lowStockBannerText}>
            {lowStockItems.length} items below minimum threshold: {lowStockItems.map(i => i.name).join(', ')}
          </Text>
        </View>
      )}

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search raw ingredients..."
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

      {/* Inventory List */}
      <FlatList
        data={filteredInventory}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isLow = (Number(item.stock) || 0) <= (Number(item.minStock) || 0);

          return (
            <View style={[styles.itemCard, isLow && styles.itemCardLow]}>
              <View style={styles.itemHeader}>
                <View>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>
                    Min: {item.minStock} {item.unit} • ${Number(item.costPerUnit || 0).toFixed(2)}/{item.unit}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.itemStock, isLow && { color: COLORS.danger }]}>
                    {item.stock} {item.unit}
                  </Text>
                  {isLow ? (
                    <View style={styles.lowBadge}>
                      <Text style={styles.lowBadgeText}>Restock Needed</Text>
                    </View>
                  ) : (
                    <View style={styles.goodBadge}>
                      <Text style={styles.goodBadgeText}>In Stock</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Quick Stock Controls */}
              <View style={styles.quickControls}>
                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => handleAdjust(item.id, 'sub', 1)}
                >
                  <Text style={styles.quickBtnText}>-1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => handleAdjust(item.id, 'sub', 5)}
                >
                  <Text style={styles.quickBtnText}>-5</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickBtn, styles.quickBtnAdd]}
                  onPress={() => handleAdjust(item.id, 'add', 5)}
                >
                  <Text style={[styles.quickBtnText, { color: COLORS.primaryDark }]}>+5</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickBtn, styles.quickBtnAdd]}
                  onPress={() => handleAdjust(item.id, 'add', 10)}
                >
                  <Text style={[styles.quickBtnText, { color: COLORS.primaryDark }]}>+10</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => openEditModal(item)}
                >
                  <Ionicons name="create-outline" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Add / Edit Inventory Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? 'Edit Raw Material' : 'Add Raw Material'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>MATERIAL NAME</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Phyllo Dough Sheets"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>UNIT (kg, L, pack)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="kg"
                  placeholderTextColor={COLORS.textMuted}
                  value={unit}
                  onChangeText={setUnit}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>CURRENT STOCK</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="25"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="decimal-pad"
                  value={stock}
                  onChangeText={setStock}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>MINIMUM THRESHOLD</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="10"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="decimal-pad"
                  value={minStock}
                  onChangeText={setMinStock}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>COST PER UNIT ($)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="45.00"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="decimal-pad"
                  value={costPerUnit}
                  onChangeText={setCostPerUnit}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSaveItem}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>
                {editingItem ? 'Save Updates' : 'Add to Inventory'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    ...SHADOWS.sm,
  },
  headerAddText: {
    color: '#FFF',
    fontSize: FONTS.xs,
    fontWeight: '800',
  },
  lowStockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.danger + '33',
  },
  lowStockBannerText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.danger,
    fontWeight: '600',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 42,
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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 110,
    gap: 10,
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  itemCardLow: {
    borderColor: COLORS.danger + '4D',
    backgroundColor: '#FFFBFB',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  itemName: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itemMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  itemStock: {
    fontSize: FONTS.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  lowBadge: {
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginTop: 3,
  },
  lowBadgeText: {
    fontSize: 9,
    color: COLORS.danger,
    fontWeight: '700',
  },
  goodBadge: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginTop: 3,
  },
  goodBadgeText: {
    fontSize: 9,
    color: COLORS.success,
    fontWeight: '700',
  },
  quickControls: {
    flexDirection: 'row',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 10,
    alignItems: 'center',
  },
  quickBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickBtnAdd: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary + '33',
  },
  quickBtnText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  editBtn: {
    marginLeft: 'auto',
    padding: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSubtle,
  },
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
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: FONTS.sm,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: FONTS.sm,
    fontWeight: '800',
  },
});
