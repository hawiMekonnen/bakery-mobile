import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBakery } from '../store/BakeryStore';
import { COLORS, FONTS, RADIUS, SHADOW } from '../theme/colors';
import { PrimaryButton, Badge, EmptyState } from '../components/UI';

const ROLES = ['Head Baker', 'Baker Assistant', 'Pastry Chef', 'Cashier', 'Barista', 'Store Manager'];
const SHIFTS = ['Morning (05:00 - 13:00)', 'Afternoon (12:00 - 20:00)', 'Full Day (06:00 - 18:00)'];

export default function StaffScreen() {
  const { state, dispatch } = useBakery();
  const { staff } = state;

  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState(ROLES[0]);
  const [phone, setPhone] = useState('');
  const [shift, setShift] = useState(SHIFTS[0]);

  const onDutyCount = staff.filter(s => s.status === 'On Duty').length;

  const filteredStaff = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  );

  const openAddModal = () => {
    setEditingStaff(null);
    setName('');
    setRole(ROLES[0]);
    setPhone('');
    setShift(SHIFTS[0]);
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingStaff(item);
    setName(item.name);
    setRole(item.role || ROLES[0]);
    setPhone(item.phone || '');
    setShift(item.shift || SHIFTS[0]);
    setModalVisible(true);
  };

  const handleToggleStatus = (item) => {
    const nextStatus = item.status === 'On Duty' ? 'Off Duty' : 'On Duty';
    dispatch({
      type: 'UPDATE_STAFF',
      payload: {
        id: item.id,
        status: nextStatus,
      },
    });
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter staff name.');
      return;
    }

    if (editingStaff) {
      dispatch({
        type: 'UPDATE_STAFF',
        payload: {
          id: editingStaff.id,
          name: name.trim(),
          role,
          phone: phone.trim(),
          shift,
        },
      });
    } else {
      dispatch({
        type: 'ADD_STAFF',
        payload: {
          name: name.trim(),
          role,
          phone: phone.trim(),
          shift,
          status: 'On Duty',
        },
      });
    }

    setModalVisible(false);
  };

  const handleDelete = (id, staffName) => {
    Alert.alert(
      'Remove Staff',
      `Are you sure you want to remove "${staffName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => dispatch({ type: 'DELETE_STAFF', payload: id }),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Summary & Search */}
        <View style={styles.topSection}>
          <View style={styles.summaryBar}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryNum}>{onDutyCount}</Text>
              <Text style={styles.summaryLabel}>On Duty Now</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryBox}>
              <Text style={styles.summaryNum}>{staff.length}</Text>
              <Text style={styles.summaryLabel}>Total Staff</Text>
            </View>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search staff by name or role..."
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

            <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Staff List */}
        <FlatList
          data={filteredStaff}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isOnDuty = item.status === 'On Duty';

            return (
              <View style={styles.staffCard}>
                <View style={styles.staffCardHeader}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                      {item.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.staffName}>{item.name}</Text>
                    <Text style={styles.staffRole}>{item.role}</Text>
                    <Text style={styles.staffMeta}>
                      {item.shift || 'Morning Shift'} • {item.phone || 'No phone'}
                    </Text>
                  </View>

                  <Badge
                    text={item.status || 'Off Duty'}
                    color={isOnDuty ? COLORS.success : COLORS.textMuted}
                  />
                </View>

                {/* Footer Controls */}
                <View style={styles.staffCardFooter}>
                  <TouchableOpacity
                    style={[
                      styles.toggleDutyBtn,
                      isOnDuty ? styles.toggleDutyBtnOff : styles.toggleDutyBtnOn,
                    ]}
                    onPress={() => handleToggleStatus(item)}
                  >
                    <Ionicons
                      name={isOnDuty ? 'log-out-outline' : 'log-in-outline'}
                      size={16}
                      color={isOnDuty ? COLORS.warning : COLORS.success}
                    />
                    <Text
                      style={[
                        styles.toggleDutyText,
                        isOnDuty ? { color: COLORS.warning } : { color: COLORS.success },
                      ]}
                    >
                      {isOnDuty ? 'Clock Out' : 'Clock In'}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.actionBtnsGroup}>
                    <TouchableOpacity
                      style={styles.actionIcon}
                      onPress={() => openEditModal(item)}
                    >
                      <Ionicons name="pencil-outline" size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionIcon}
                      onPress={() => handleDelete(item.id, item.name)}
                    >
                      <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No Staff Members Found"
              subtitle="Add bakery crew members and track their shifts."
            />
          }
        />

        {/* Add / Edit Staff Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setModalVisible(false)}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingStaff ? 'Edit Staff Member' : 'New Staff Member'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Maria Gonzalez"
                placeholderTextColor={COLORS.textMuted}
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>Role / Position</Text>
              <View style={styles.pillGrid}>
                {ROLES.map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.rolePill, role === r && styles.rolePillActive]}
                    onPress={() => setRole(r)}
                  >
                    <Text style={[styles.rolePillText, role === r && styles.rolePillTextActive]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. (555) 234-5678"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <Text style={styles.inputLabel}>Shift Schedule</Text>
              <View style={styles.shiftList}>
                {SHIFTS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.shiftCard, shift === s && styles.shiftCardActive]}
                    onPress={() => setShift(s)}
                  >
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={shift === s ? COLORS.primary : COLORS.textMuted}
                    />
                    <Text style={[styles.shiftCardText, shift === s && styles.shiftCardTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <PrimaryButton
                title={editingStaff ? 'Update Staff Member' : 'Add Staff Member'}
                onPress={handleSave}
              />
            </View>
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  topSection: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.md,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryBox: {
    alignItems: 'center',
  },
  summaryNum: {
    fontSize: FONTS.lg,
    fontWeight: '800',
    color: COLORS.primary,
  },
  summaryLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sm,
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: FONTS.sm,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  staffCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.sm,
  },
  staffCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FONTS.sm,
    fontWeight: '800',
    color: COLORS.primary,
  },
  staffName: {
    fontSize: FONTS.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  staffRole: {
    fontSize: FONTS.xs,
    color: COLORS.secondary,
    fontWeight: '600',
    marginTop: 1,
  },
  staffMeta: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  staffCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  toggleDutyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  toggleDutyBtnOn: {
    backgroundColor: '#E6F4EA',
  },
  toggleDutyBtnOff: {
    backgroundColor: '#FEF3C7',
  },
  toggleDutyText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
  },
  actionBtnsGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  actionIcon: {
    padding: 6,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modalTitle: {
    fontSize: FONTS.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  formInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: FONTS.sm,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rolePillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  rolePillText: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  rolePillTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  shiftList: {
    gap: 8,
    marginBottom: 20,
  },
  shiftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    borderRadius: RADIUS.md,
    gap: 10,
  },
  shiftCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF7ED',
  },
  shiftCardText: {
    fontSize: FONTS.sm,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  shiftCardTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  modalFooter: {
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
