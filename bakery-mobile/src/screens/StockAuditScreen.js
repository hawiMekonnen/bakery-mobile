import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBakery, getStockTimestampInfo } from '../store/BakeryStore';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';

const { width } = Dimensions.get('window');

const ACTION_FILTERS = [
  { id: 'ALL', label: 'All Actions' },
  { id: 'ADD', label: 'Added (+)' },
  { id: 'RESTOCK', label: 'Restocked (↑)' },
  { id: 'USAGE', label: 'Deducted (↓)' },
  { id: 'ADJUST', label: 'Adjusted (⇄)' },
  { id: 'UPDATE', label: 'Edited (✎)' },
];

const DATE_FILTERS = [
  { id: 'TODAY', label: 'Today' },
  { id: 'YESTERDAY', label: 'Yesterday' },
  { id: 'WEEK', label: 'Last 7 Days' },
  { id: 'ALL', label: 'All Dates' },
];

export default function StockAuditScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useBakery();
  const { stockHistory = [], inventory = [], auth = {} } = state;

  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState('TODAY');
  const [selectedHour, setSelectedHour] = useState('ALL');

  // Reference for "today" in Addis Ababa timezone
  const todayInfo = useMemo(() => getStockTimestampInfo(new Date()), []);
  const todayDateStr = todayInfo.dateStr;

  // Filter logs by date filter
  const dateFilteredLogs = useMemo(() => {
    if (!Array.isArray(stockHistory)) return [];

    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const yesterdayInfo = getStockTimestampInfo(new Date(now.getTime() - oneDayMs));

    return stockHistory.filter(item => {
      if (!item) return false;
      const itemDate = item.dateStr || '';

      if (selectedDateFilter === 'TODAY') {
        return itemDate === todayDateStr;
      }
      if (selectedDateFilter === 'YESTERDAY') {
        return itemDate === yesterdayInfo.dateStr;
      }
      if (selectedDateFilter === 'WEEK') {
        if (!item.timestamp) return false;
        const diffMs = now.getTime() - new Date(item.timestamp).getTime();
        return diffMs <= 7 * oneDayMs;
      }
      return true; // 'ALL'
    });
  }, [stockHistory, selectedDateFilter, todayDateStr]);

  // Extract unique active hour windows from current date-filtered logs
  const activeHours = useMemo(() => {
    const hourMap = new Map();
    dateFilteredLogs.forEach(log => {
      const hw = log.hourWindow || 'Unknown Hour';
      hourMap.set(hw, (hourMap.get(hw) || 0) + 1);
    });

    const list = Array.from(hourMap.entries()).map(([hourWindow, count]) => ({
      hourWindow,
      count,
    }));

    // Sort by hour if possible
    return list;
  }, [dateFilteredLogs]);

  // Filter by search, action, and hour
  const filteredLogs = useMemo(() => {
    return dateFilteredLogs.filter(log => {
      if (!log) return false;

      // Search match
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const nameMatch = (log.itemName || '').toLowerCase().includes(q);
        const userMatch = (log.user || '').toLowerCase().includes(q);
        const noteMatch = (log.note || '').toLowerCase().includes(q);
        if (!nameMatch && !userMatch && !noteMatch) return false;
      }

      // Action match
      if (selectedAction !== 'ALL') {
        if (log.action !== selectedAction) return false;
      }

      // Hour match
      if (selectedHour !== 'ALL') {
        if (log.hourWindow !== selectedHour) return false;
      }

      return true;
    });
  }, [dateFilteredLogs, search, selectedAction, selectedHour]);

  // Group filtered logs by Date and Hour Window
  const groupedLogs = useMemo(() => {
    const groups = [];
    const groupKeyMap = new Map();

    filteredLogs.forEach(log => {
      const dStr = log.dateStr || 'Unknown Date';
      const isToday = dStr === todayDateStr;
      const dateDisplay = isToday ? 'TODAY' : dStr.toUpperCase();
      const hWin = log.hourWindow || 'General';
      const key = `${dStr}___${hWin}`;

      if (!groupKeyMap.has(key)) {
        const groupObj = {
          key,
          dateDisplay,
          dateStr: dStr,
          hourWindow: hWin,
          items: [],
        };
        groupKeyMap.set(key, groupObj);
        groups.push(groupObj);
      }

      groupKeyMap.get(key).items.push(log);
    });

    return groups;
  }, [filteredLogs, todayDateStr]);

  // Statistics calculation for the banner
  const stats = useMemo(() => {
    const todayLogs = (stockHistory || []).filter(l => l.dateStr === todayDateStr);
    const addedCount = todayLogs.filter(l => l.action === 'ADD').length;
    const restockedCount = todayLogs.filter(l => l.action === 'RESTOCK').length;
    const usageCount = todayLogs.filter(l => l.action === 'USAGE').length;

    // Peak hour
    const hourCounts = {};
    todayLogs.forEach(l => {
      if (l.hourWindow) {
        hourCounts[l.hourWindow] = (hourCounts[l.hourWindow] || 0) + 1;
      }
    });

    let peakHour = 'None yet';
    let maxC = 0;
    Object.entries(hourCounts).forEach(([h, count]) => {
      if (count > maxC) {
        maxC = count;
        peakHour = h.split(' - ')[0]; // just show start hour like "8:00 AM"
      }
    });

    return {
      totalToday: todayLogs.length,
      addedCount,
      restockedCount,
      usageCount,
      peakHour: maxC > 0 ? peakHour : 'N/A',
      activeHoursCount: Object.keys(hourCounts).length,
    };
  }, [stockHistory, todayDateStr]);

  // Action badge color styling
  const getActionBadge = (action) => {
    switch (action) {
      case 'ADD':
        return {
          bg: '#E5F6EC',
          text: '#0B3B2A',
          border: '#A6E5C2',
          label: '+ ADDED',
          icon: 'add-circle-outline',
          indicator: '#12B76A',
        };
      case 'RESTOCK':
        return {
          bg: '#E0F2FE',
          text: '#0369A1',
          border: '#BAE6FD',
          label: 'RESTOCKED ↑',
          icon: 'arrow-up-circle-outline',
          indicator: '#0284C7',
        };
      case 'USAGE':
        return {
          bg: '#FFF3DC',
          text: '#B45309',
          border: '#FDE68A',
          label: 'DEDUCTED ↓',
          icon: 'arrow-down-circle-outline',
          indicator: '#F59E0B',
        };
      case 'ADJUST':
        return {
          bg: '#EEF2FF',
          text: '#4338CA',
          border: '#C7D2FE',
          label: 'ADJUSTED ⇄',
          icon: 'swap-horizontal-outline',
          indicator: '#6366F1',
        };
      case 'UPDATE':
        return {
          bg: '#F3E8FF',
          text: '#6B21A8',
          border: '#E9D5FF',
          label: 'EDITED ✎',
          icon: 'create-outline',
          indicator: '#9333EA',
        };
      case 'DELETE':
        return {
          bg: '#FEE2E2',
          text: '#B91C1C',
          border: '#FECACA',
          label: 'DELETED ✕',
          icon: 'trash-outline',
          indicator: '#EF4444',
        };
      default:
        return {
          bg: '#F1F5F9',
          text: '#475569',
          border: '#CBD5E1',
          label: 'MODIFIED',
          icon: 'ellipsis-horizontal-circle-outline',
          indicator: '#64748B',
        };
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Tracking History',
      'Are you sure you want to clear all ingredient tracking logs? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Logs',
          style: 'destructive',
          onPress: () => {
            dispatch({ type: 'CLEAR_STOCK_HISTORY' });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* ─── Top Header ─── */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top + 6, 20) }]}>
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
          <Text style={styles.headerTitle}>Ingredient Tracking</Text>
          <Text style={styles.headerSubtitle}>
            Stock additions & hourly change log
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.stockNavBtn}
            onPress={() => navigation.navigate('Stock')}
            activeOpacity={0.8}
            accessibilityLabel="Go to Stock Page"
          >
            <Ionicons name="cube-outline" size={16} color={COLORS.brandDarkGreen} />
            <Text style={styles.stockNavText}>Stock</Text>
          </TouchableOpacity>

          {stockHistory.length > 0 && (
            <TouchableOpacity
              style={styles.headerClearBtn}
              onPress={handleClearHistory}
              activeOpacity={0.75}
              accessibilityLabel="Clear history"
            >
              <Ionicons name="trash-outline" size={17} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── 1. Hero KPI Card: HOURLY STOCK TRACKER ─── */}
        <View style={[styles.heroCard, auth?.brandColor ? { backgroundColor: auth.brandColor } : null]}>
          {/* Concentric watermark rings */}
          <View style={styles.heroCircleWatermark} pointerEvents="none">
            <View style={[styles.circleRing, { width: 140, height: 140 }]} />
            <View style={[styles.circleRing, { width: 220, height: 220 }]} />
            <View style={[styles.circleRing, { width: 300, height: 300 }]} />
          </View>

          <View style={styles.heroTopRow}>
            <View style={styles.heroOverlineBadge}>
              <Ionicons name="time" size={12} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.heroOverlineText}>HOURLY AUDIT LOG</Text>
            </View>
            <Text style={styles.heroTimeNow}>Addis Ababa (UTC+3)</Text>
          </View>

          <Text style={styles.heroHeading}>
            {stats.totalToday === 0
              ? 'No ingredient changes logged today'
              : `${stats.totalToday} stock updates across ${stats.activeHoursCount} ${stats.activeHoursCount === 1 ? 'hour' : 'hours'}`}
          </Text>

          {/* 3 Metric Sub-Boxes */}
          <View style={styles.heroSubStatsRow}>
            <View style={styles.heroSubBox}>
              <Text style={styles.heroSubBoxNum}>{stats.totalToday}</Text>
              <Text style={styles.heroSubBoxLabel}>Changes Today</Text>
            </View>

            <View style={styles.heroSubBox}>
              <Text style={[styles.heroSubBoxNum, { color: '#6EE7B7' }]}>
                +{stats.addedCount}
              </Text>
              <Text style={styles.heroSubBoxLabel}>New Added</Text>
            </View>

            <View style={styles.heroSubBox}>
              <Text style={[styles.heroSubBoxNum, { color: '#FCD34D' }]}>
                {stats.peakHour}
              </Text>
              <Text style={styles.heroSubBoxLabel}>Peak Hour</Text>
            </View>
          </View>
        </View>

        {/* ─── 2. Search Box ─── */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search ingredient (e.g. Flour, Sugar)..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
              clearButtonMode="while-editing"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ─── 3. Date Filters (Today, Yesterday, Week, All) ─── */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPillsScroll}
          >
            {DATE_FILTERS.map(df => {
              const active = selectedDateFilter === df.id;
              return (
                <TouchableOpacity
                  key={df.id}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setSelectedDateFilter(df.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {df.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ─── 4. Hourly Slot Filter Selector (Which hour ingredients were added/changed) ─── */}
        <View style={styles.hourlySection}>
          <View style={styles.hourlySectionHeader}>
            <Ionicons name="alarm-outline" size={15} color="#475569" style={{ marginRight: 6 }} />
            <Text style={styles.hourlySectionTitle}>FILTER BY HOUR WINDOW</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hourlyScroll}
          >
            <TouchableOpacity
              style={[
                styles.hourPill,
                selectedHour === 'ALL' && styles.hourPillActive,
              ]}
              onPress={() => setSelectedHour('ALL')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.hourPillText,
                  selectedHour === 'ALL' && styles.hourPillTextActive,
                ]}
              >
                All Hours ({dateFilteredLogs.length})
              </Text>
            </TouchableOpacity>

            {activeHours.map(({ hourWindow, count }) => {
              const active = selectedHour === hourWindow;
              return (
                <TouchableOpacity
                  key={hourWindow}
                  style={[styles.hourPill, active && styles.hourPillActive]}
                  onPress={() => setSelectedHour(hourWindow)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.hourPillText, active && styles.hourPillTextActive]}>
                    {hourWindow}
                  </Text>
                  <View style={[styles.hourBadge, active && styles.hourBadgeActive]}>
                    <Text style={[styles.hourBadgeText, active && styles.hourBadgeTextActive]}>
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ─── 5. Action Type Filters ─── */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPillsScroll}
          >
            {ACTION_FILTERS.map(af => {
              const active = selectedAction === af.id;
              return (
                <TouchableOpacity
                  key={af.id}
                  style={[styles.actionChip, active && styles.actionChipActive]}
                  onPress={() => setSelectedAction(af.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.actionChipText, active && styles.actionChipTextActive]}>
                    {af.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ─── 6. Grouped Timeline List ─── */}
        {groupedLogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="time-outline" size={48} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No Stock Changes Found</Text>
            <Text style={styles.emptyText}>
              {search || selectedAction !== 'ALL' || selectedHour !== 'ALL'
                ? 'No ingredient updates match your active filter criteria.'
                : 'Whenever you add new ingredients or adjust quantities in the Stock page, the changes and exact hour are tracked here automatically.'}
            </Text>
            {(search || selectedAction !== 'ALL' || selectedHour !== 'ALL') ? (
              <TouchableOpacity
                style={styles.clearFilterBtn}
                onPress={() => {
                  setSearch('');
                  setSelectedAction('ALL');
                  setSelectedHour('ALL');
                  setSelectedDateFilter('TODAY');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.clearFilterText}>Reset All Filters</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.goToStockBtn}
                onPress={() => navigation.navigate('Stock')}
                activeOpacity={0.85}
              >
                <Ionicons name="cube" size={17} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.goToStockBtnText}>Go to Stock & Add Material</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.timelineList}>
            {groupedLogs.map(group => (
              <View key={group.key} style={styles.groupBlock}>
                {/* Hourly Section Header Badge */}
                <View style={styles.groupHeaderRow}>
                  <View style={styles.groupHeaderLeft}>
                    <Ionicons name="time" size={15} color={COLORS.brandGreen} style={{ marginRight: 6 }} />
                    <Text style={styles.groupDate}>{group.dateDisplay} • </Text>
                    <Text style={styles.groupHour}>{group.hourWindow}</Text>
                  </View>
                  <View style={styles.groupCountBadge}>
                    <Text style={styles.groupCountText}>
                      {group.items.length} {group.items.length === 1 ? 'action' : 'actions'}
                    </Text>
                  </View>
                </View>

                {/* Cards for each stock event inside this hour window */}
                {group.items.map(item => {
                  const badge = getActionBadge(item.action);
                  const isDeltaPos = Number(item.changeDelta) > 0;
                  const isDeltaNeg = Number(item.changeDelta) < 0;

                  return (
                    <View key={item.id} style={styles.auditCard}>
                      {/* Left accent color strip */}
                      <View style={[styles.cardAccentBar, { backgroundColor: badge.indicator }]} />

                      <View style={styles.cardMain}>
                        {/* Row 1: Item Name & Action Badge */}
                        <View style={styles.cardHeaderRow}>
                          <View style={styles.itemNameWrap}>
                            <Ionicons
                              name="cube"
                              size={15}
                              color={COLORS.brandDarkGreen}
                              style={{ marginRight: 6 }}
                            />
                            <Text style={styles.itemName} numberOfLines={1}>
                              {item.itemName}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.actionBadge,
                              { backgroundColor: badge.bg, borderColor: badge.border },
                            ]}
                          >
                            <Ionicons
                              name={badge.icon}
                              size={12}
                              color={badge.text}
                              style={{ marginRight: 4 }}
                            />
                            <Text style={[styles.actionBadgeText, { color: badge.text }]}>
                              {badge.label}
                            </Text>
                          </View>
                        </View>

                        {/* Row 2: Stock Level Transition & Delta */}
                        <View style={styles.stockTransitionRow}>
                          <View style={styles.stockLevelWrap}>
                            <Text style={styles.stockLevelLabel}>Stock Change</Text>
                            <View style={styles.stockValuesRow}>
                              <Text style={styles.stockValuePrev}>
                                {item.previousStock} {item.unit}
                              </Text>
                              <Ionicons
                                name="arrow-forward"
                                size={13}
                                color="#94A3B8"
                                style={{ marginHorizontal: 6 }}
                              />
                              <Text style={styles.stockValueNew}>
                                {item.newStock} {item.unit}
                              </Text>
                            </View>
                          </View>

                          {/* Delta Pill */}
                          {item.changeDelta !== undefined && item.changeDelta !== 0 && (
                            <View
                              style={[
                                styles.deltaPill,
                                isDeltaPos && styles.deltaPillPos,
                                isDeltaNeg && styles.deltaPillNeg,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.deltaPillText,
                                  isDeltaPos && styles.deltaPillTextPos,
                                  isDeltaNeg && styles.deltaPillTextNeg,
                                ]}
                              >
                                {isDeltaPos ? `+${item.changeDelta}` : item.changeDelta} {item.unit}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Row 3: Note / Description if present */}
                        {item.note && (
                          <View style={styles.noteRow}>
                            <Ionicons name="document-text-outline" size={13} color="#64748B" style={{ marginRight: 5 }} />
                            <Text style={styles.noteText} numberOfLines={2}>
                              {item.note}
                            </Text>
                          </View>
                        )}

                        {/* Row 4: Footer Meta (Hour slot, exact time, staff) */}
                        <View style={styles.cardFooter}>
                          <View style={styles.footerTimeWrap}>
                            <Ionicons name="time-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
                            <Text style={styles.footerTime}>{item.timeStr || ''}</Text>
                            <Text style={styles.footerDot}>•</Text>
                            <Text style={styles.footerHourWindow}>{item.hourWindow || ''}</Text>
                          </View>

                          <View style={styles.footerUserWrap}>
                            <Ionicons name="person-circle-outline" size={14} color="#64748B" style={{ marginRight: 3 }} />
                            <Text style={styles.footerUser}>{item.user || 'admin'}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF7',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2EF',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 19,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5F6EC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  stockNavText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandDarkGreen,
    marginLeft: 4,
  },
  headerClearBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },

  // ─── Hero Card ───
  heroCard: {
    backgroundColor: '#0B3B2A',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 14px rgba(11,59,42,0.18)' },
    }),
  },
  heroCircleWatermark: {
    position: 'absolute',
    right: -40,
    top: -50,
  },
  circleRing: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroOverlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  heroOverlineText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  heroTimeNow: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  heroHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 14,
    lineHeight: 22,
  },
  heroSubStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  heroSubBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  heroSubBoxNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  heroSubBoxLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    textAlign: 'center',
  },

  // ─── Search ───
  searchRow: {
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },

  // ─── Date Filters ───
  filterSection: {
    marginBottom: 12,
  },
  filterPillsScroll: {
    gap: 8,
    paddingRight: 10,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: COLORS.brandDarkGreen,
    borderColor: COLORS.brandDarkGreen,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // ─── Hourly Rail Section ───
  hourlySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hourlySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  hourlySectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  hourlyScroll: {
    gap: 8,
    paddingRight: 8,
  },
  hourPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  hourPillActive: {
    backgroundColor: '#0F382C',
    borderColor: '#0F382C',
  },
  hourPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  hourPillTextActive: {
    color: '#FFFFFF',
  },
  hourBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  hourBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  hourBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  hourBadgeTextActive: {
    color: '#FFFFFF',
  },

  // ─── Action Type Chips ───
  actionChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionChipActive: {
    backgroundColor: '#12B76A',
    borderColor: '#12B76A',
  },
  actionChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  actionChipTextActive: {
    color: '#FFFFFF',
  },

  // ─── Timeline / Grouped Cards ───
  timelineList: {
    marginTop: 4,
  },
  groupBlock: {
    marginBottom: 18,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupDate: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  groupHour: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandGreen,
  },
  groupCountBadge: {
    backgroundColor: '#EEF2EF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  groupCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },

  // ─── Audit Card ───
  auditCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
    }),
  },
  cardAccentBar: {
    width: 5,
    backgroundColor: COLORS.brandGreen,
  },
  cardMain: {
    flex: 1,
    padding: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // Stock Transition
  stockTransitionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAF7',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    marginBottom: 6,
  },
  stockLevelWrap: {
    flex: 1,
  },
  stockLevelLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  stockValuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockValuePrev: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  stockValueNew: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  deltaPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  deltaPillPos: {
    backgroundColor: '#E5F6EC',
  },
  deltaPillNeg: {
    backgroundColor: '#FFF3DC',
  },
  deltaPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  deltaPillTextPos: {
    color: '#0B3B2A',
  },
  deltaPillTextNeg: {
    color: '#B45309',
  },

  // Note
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 6,
  },
  noteText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
    flex: 1,
  },

  // Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 6,
    marginTop: 2,
  },
  footerTimeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerTime: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  footerDot: {
    fontSize: 11,
    color: '#94A3B8',
    marginHorizontal: 5,
  },
  footerHourWindow: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brandGreen,
  },
  footerUserWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerUser: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },

  // ─── Empty State ───
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  clearFilterBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  goToStockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandDarkGreen,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  goToStockBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
