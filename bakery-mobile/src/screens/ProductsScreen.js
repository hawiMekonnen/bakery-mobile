import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBakery } from '../store/BakeryStore';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';

const CATEGORIES = ['All', 'Pastry', 'Savory', 'Bread', 'Cakes', 'Coffee', 'Sandwiches'];
const EMOJI_OPTIONS = [
  '🥞', '🫓', '🥟', '🥮', '🍯',
  '🥐', '🍞', '🥖', '🥨', '🎂',
  '🍰', '🧁', '🍩', '🍪', '🥧',
  '☕', '🧋', '🫖', '🥪', '🍕'
];

export default function ProductsScreen({ navigation }) {
  const { state, dispatch } = useBakery();
  const { products } = state;

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Pastry');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [emoji, setEmoji] = useState('🥐');
  const [available, setAvailable] = useState(true);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCat === 'All' || p.category === selectedCat;
    return matchesSearch && matchesCat;
  });

  const availableCount = products.filter(p => p.available !== false).length;

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setCategory('Pastry');
    setPrice('');
    setCost('');
    setEmoji('🥐');
    setAvailable(true);
    setModalVisible(true);
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    setName(p.name);
    setCategory(p.category || 'Pastry');
    setPrice(String(p.price));
    setCost(String(p.cost || ''));
    setEmoji(p.emoji || '🥐');
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
          emoji,
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
          emoji,
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
      {/* ─── Interactive Screen Header with + Add Button ─── */}
      <ScreenHeader
        canGoBack
        onBack={() => navigation.goBack()}
        emoji="🥐"
        title="Bakery Menu"
        subtitle={`${products.length} total items • ${availableCount} active`}
        rightAction={
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={openAddModal}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={17} color="#FFF" style={{ marginRight: 3 }} />
            <Text style={styles.headerAddText}>New Item</Text>
          </TouchableOpacity>
        }
      />

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search menu items..."
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

      {/* Category Pills */}
      <View style={styles.categoryWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContent}
        >
          {CATEGORIES.map(cat => {
            const isActive = selectedCat === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                onPress={() => setSelectedCat(cat)}
              >
                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.itemCard}
            onPress={() => openEditModal(item)}
            activeOpacity={0.75}
          >
            <View style={styles.itemEmojiBox}>
              <Text style={{ fontSize: 28 }}>{item.emoji || '🥐'}</Text>
            </View>

            <View style={styles.itemInfo}>
              <View style={styles.itemNameRow}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.available === false && (
                  <View style={styles.unavailableBadge}>
                    <Text style={styles.unavailableText}>Unavailable</Text>
                  </View>
                )}
              </View>
              <Text style={styles.itemCategory}>{item.category} • Cost: ${Number(item.cost || 0).toFixed(2)}</Text>
              <Text style={styles.itemPrice}>${Number(item.price).toFixed(2)}</Text>
            </View>

            <View style={styles.itemActions}>
              <TouchableOpacity
                style={styles.actionIconBtn}
                onPress={() => openEditModal(item)}
              >
                <Ionicons name="create-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionIconBtn}
                onPress={() => handleDeleteProduct(item)}
              >
                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Add / Edit Product Modal */}
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
                {editingProduct ? 'Edit Product' : 'Add New Bakery Product'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Emoji Selector */}
              <Text style={styles.fieldLabel}>FOOD ICON / EMOJI</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
                {EMOJI_OPTIONS.map(em => (
                  <TouchableOpacity
                    key={em}
                    style={[styles.emojiPickBtn, emoji === em && styles.emojiPickBtnActive]}
                    onPress={() => setEmoji(em)}
                  >
                    <Text style={{ fontSize: 24 }}>{em}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Product Name */}
              <Text style={styles.fieldLabel}>PRODUCT NAME</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Crispy Honey Fetira"
                placeholderTextColor={COLORS.textMuted}
                value={name}
                onChangeText={setName}
              />

              {/* Category */}
              <Text style={styles.fieldLabel}>CATEGORY</Text>
              <View style={styles.catGrid}>
                {['Pastry', 'Savory', 'Bread', 'Cakes', 'Coffee', 'Sandwiches'].map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.catPickBtn, category === c && styles.catPickBtnActive]}
                    onPress={() => setCategory(c)}
                  >
                    <Text style={[styles.catPickText, category === c && { color: '#FFF' }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Price & Cost */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>SELLING PRICE ($)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="75.00"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="decimal-pad"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>PRODUCTION COST ($)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="25.00"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="decimal-pad"
                    value={cost}
                    onChangeText={setCost}
                  />
                </View>
              </View>

              {/* Availability Switch */}
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Available for Sale</Text>
                  <Text style={styles.switchSub}>Show in POS register</Text>
                </View>
                <Switch
                  value={available}
                  onValueChange={setAvailable}
                  trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                  thumbColor={available ? COLORS.primary : '#FFF'}
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSaveProduct}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>
                {editingProduct ? 'Save Changes' : 'Add to Bakery Menu'}
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
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
    paddingBottom: 110,
    gap: 10,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  itemEmojiBox: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemName: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  unavailableBadge: {
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
    marginLeft: 6,
  },
  unavailableText: {
    fontSize: 9,
    color: COLORS.danger,
    fontWeight: '700',
  },
  itemCategory: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: FONTS.sm,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
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
  emojiRow: {
    gap: 8,
    paddingBottom: 12,
  },
  emojiPickBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emojiPickBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
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
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  catPickBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catPickBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  catPickText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  switchLabel: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  switchSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: FONTS.sm,
    fontWeight: '800',
  },
});
