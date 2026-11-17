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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBakery } from '../store/BakeryStore';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';

const ROLES = ['Head Baker', 'Baker Assistant', 'Pastry Chef', 'Cashier', 'Barista', 'Store Manager'];
const SHIFTS = ['Morning (05:00 - 13:00)', 'Afternoon (12:00 - 20:00)', 'Full Day (06:00 - 18:00)'];

export default function StaffScreen({ navigation }) {
  const { state, dispatch } = useBakery();
  const { staff = [] } = state;

  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState(ROLES[0]);
  const [phone, setPhone] = useState('');
  const [shift, setShift] = useState(SHIFTS[0]);

  const onDutyCount = staff.filter((s) => s.status === 'On Duty').length;
  const canGoBack = navigation && typeof navigation.canGoBack === 'function' && navigation.canGoBack();

  const filteredStaff = staff.filter(
    (s) =>
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
    <View style={styles.container}>
      <ScreenHeader
        canGoBack={canGoBack}
        onBack={() => navigation.goBack()}
        icon="people-outline"
        title="Staff & Shifts"
        subtitle={`${onDutyCount} on duty now • ${staff.length} team members`}
        rightAction={
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={openAddModal}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={17} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.headerAddText}>Add Staff</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={filteredStaff}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Top 2 Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={[styles.statNum, { color: COLORS.brandGreenText }]}>{onDutyCount}</Text>
                <Text style={styles.statLabel}>On Duty Now</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{staff.length}</Text>
                <Text style={styles.statLabel}>Total Staff</Text>
              </View>
            </View>

            {/* Search Box */}
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color={COLORS.muted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search staff by name or role..."
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
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="people-outline" size={38} color={COLORS.muted} />
            </View>
            <Text style={styles.emptyTitle}>No staff members found</Text>
            <Text style={styles.emptySub}>Tap "+ Add Staff" to record bakers and cashiers.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isOnDuty = item.status === 'On Duty';

          return (
            <View style={styles.staffCard}>
              <View style={styles.cardHeader}>
                <View style={styles.avatarTile}>
                  <Text style={styles.avatarText}>
                    {item.name.slice(0, 2).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.staffName}>{item.name}</Text>
                  <Text style={styles.staffRole}>{item.role}</Text>
                  <Text style={styles.staffMeta}>
                    {item.shift || 'Morning Shift'} • {item.phone || 'No phone'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.dutyBadge,
                    isOnDuty ? styles.dutyBadgeOn : styles.dutyBadgeOff,
                  ]}
                >
                  <Text
                    style={[
                      styles.dutyBadgeText,
                      isOnDuty ? styles.dutyBadgeTextOn : styles.dutyBadgeTextOff,
                    ]}
                  >
                    {item.status || 'Off Duty'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    isOnDuty ? styles.toggleBtnOff : styles.toggleBtnOn,
                  ]}
                  onPress={() => handleToggleStatus(item)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      isOnDuty ? styles.toggleTextOff : styles.toggleTextOn,
                    ]}
                  >
                    {isOnDuty ? 'Mark Off Duty' : 'Mark On Duty'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.iconActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => openEditModal(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={17} color={COLORS.ink} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDelete(item.id, item.name)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={17} color={COLORS.dangerText} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Add / Edit Staff Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {editingStaff ? 'Edit Staff Member' : 'Add New Staff'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.sheetCloseBtn}>
                <Ionicons name="close" size={20} color={COLORS.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>FULL NAME</Text>
              <TextInput
                style={styles.sheetInput}
                placeholder="e.g. Abebe Bikila"
                placeholderTextColor={COLORS.muted}
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.fieldLabel}>ASSIGNED ROLE</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, marginBottom: 14 }}
              >
                {ROLES.map((r) => {
                  const isSel = role === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleChip, isSel && styles.roleChipActive]}
                      onPress={() => setRole(r)}
                    >
                      <Text style={[styles.roleChipText, isSel && styles.roleChipTextActive]}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.fieldLabel}>PHONE NUMBER (OPTIONAL)</Text>
              <TextInput
                style={styles.sheetInput}
                placeholder="+251 91 123 4567"
                placeholderTextColor={COLORS.muted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <Text style={styles.fieldLabel}>SHIFT</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, marginBottom: 18 }}
              >
                {SHIFTS.map((s) => {
                  const isSel = shift === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.roleChip, isSel && styles.roleChipActive]}
                      onPress={() => setShift(s)}
                    >
                      <Text style={[styles.roleChipText, isSel && styles.roleChipTextActive]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={styles.sheetSaveBtn}
                onPress={handleSave}
                activeOpacity={0.88}
              >
                <Text style={styles.sheetSaveText}>
                  {editingStaff ? 'Save Updates' : 'Add to Staff Roster'}
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
    backgroundColor: COLORS.appBg,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandGreen,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.chip,
  },
  headerAddText: {
    color: '#FFFFFF',
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: 14,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  statNum: {
    fontSize: 22,
    fontFamily: FONTS.extraBold,
    color: COLORS.ink,
  },
  statLabel: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
    marginTop: 2,
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
    marginBottom: 12,
    ...SHADOWS.card,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.body,
    fontFamily: FONTS.medium,
    color: COLORS.ink,
  },
  staffCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: 14,
    ...SHADOWS.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarTile: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.tile,
    backgroundColor: COLORS.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontFamily: FONTS.extraBold,
    color: COLORS.brandGreenText,
  },
  staffName: {
    fontSize: FONTS.body,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
  },
  staffRole: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
    marginTop: 1,
  },
  staffMeta: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
    marginTop: 2,
  },
  dutyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.badge,
  },
  dutyBadgeOn: {
    backgroundColor: COLORS.softGreen,
  },
  dutyBadgeOff: {
    backgroundColor: COLORS.appBg,
  },
  dutyBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  dutyBadgeTextOn: {
    color: COLORS.brandGreenText,
  },
  dutyBadgeTextOff: {
    color: COLORS.muted,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.chip,
  },
  toggleBtnOn: {
    backgroundColor: COLORS.softGreen,
  },
  toggleBtnOff: {
    backgroundColor: COLORS.appBg,
  },
  toggleText: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
  },
  toggleTextOn: {
    color: COLORS.brandGreenText,
  },
  toggleTextOff: {
    color: COLORS.muted,
  },
  iconActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.chip,
    backgroundColor: COLORS.appBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 54,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: FONTS.h3,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
  },
  emptySub: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
    marginTop: 4,
  },
  // Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(14, 31, 23, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    padding: 22,
    maxHeight: '90%',
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.hairline,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: FONTS.h2,
    fontFamily: FONTS.extraBold,
    color: COLORS.ink,
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.appBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: FONTS.overline,
    fontFamily: FONTS.extraBold,
    letterSpacing: 0.8,
    color: COLORS.muted,
    marginBottom: 6,
  },
  sheetInput: {
    height: 48,
    borderRadius: RADIUS.chip,
    backgroundColor: COLORS.appBg,
    paddingHorizontal: 14,
    fontSize: FONTS.body,
    fontFamily: FONTS.medium,
    color: COLORS.ink,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    marginBottom: 12,
  },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.chip,
    backgroundColor: COLORS.appBg,
  },
  roleChipActive: {
    backgroundColor: COLORS.brandDarkGreen,
  },
  roleChipText: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
  },
  roleChipTextActive: {
    color: '#FFFFFF',
  },
  sheetSaveBtn: {
    height: 52,
    borderRadius: RADIUS.button,
    backgroundColor: COLORS.brandDarkGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  sheetSaveText: {
    fontSize: FONTS.body,
    fontFamily: FONTS.extraBold,
    color: '#FFFFFF',
  },
});
