import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function CalendarModal({
  visible,
  onClose,
  selectedDate, // 'YYYY-MM-DD' or 'All'
  onSelectDate, // (dateStr: 'YYYY-MM-DD') => void
  onClearDate, // () => void
  markedDates = [], // array of dates 'YYYY-MM-DD' with sales
}) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const initialYear =
    selectedDate && selectedDate !== 'All'
      ? parseInt(selectedDate.split('-')[0], 10)
      : today.getFullYear();

  const initialMonth =
    selectedDate && selectedDate !== 'All'
      ? parseInt(selectedDate.split('-')[1], 10) - 1
      : today.getMonth();

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  useEffect(() => {
    if (selectedDate && selectedDate !== 'All' && visible) {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        setViewYear(parseInt(parts[0], 10));
        setViewMonth(parseInt(parts[1], 10) - 1);
      }
    }
  }, [selectedDate, visible]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const daysGrid = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysGrid.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysGrid.push(d);
  }

  const handleSelectDay = (dayNum) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');
    const fullDate = `${viewYear}-${mm}-${dd}`;
    onSelectDate(fullDate);
    onClose();
  };

  const markedSet = new Set(markedDates);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.calendarCard}>
          {/* Header with Month Navigation */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={18} color={COLORS.ink} />
            </TouchableOpacity>

            <View style={{ alignItems: 'center' }}>
              <Text style={styles.monthTitle}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
              <Text style={styles.monthSub}>Tap any day to inspect sales</Text>
            </View>

            <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={18} color={COLORS.ink} />
            </TouchableOpacity>
          </View>

          {/* Weekday Row */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((wd, idx) => (
              <Text key={idx} style={[styles.weekdayText, idx === 0 && { color: COLORS.dangerText }]}>
                {wd}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {daysGrid.map((dayNum, index) => {
              if (dayNum === null) {
                return <View key={`empty-${index}`} style={styles.dayCellEmpty} />;
              }

              const mm = String(viewMonth + 1).padStart(2, '0');
              const dd = String(dayNum).padStart(2, '0');
              const cellDate = `${viewYear}-${mm}-${dd}`;

              const isSelected = selectedDate === cellDate;
              const isToday = cellDate === todayStr;
              const hasSales = markedSet.has(cellDate);

              return (
                <TouchableOpacity
                  key={`day-${cellDate}`}
                  style={[
                    styles.dayCell,
                    isToday && styles.dayCellToday,
                    isSelected && styles.dayCellSelected,
                  ]}
                  onPress={() => handleSelectDay(dayNum)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isToday && styles.dayTextToday,
                      isSelected && styles.dayTextSelected,
                    ]}
                  >
                    {dayNum}
                  </Text>
                  {hasSales && (
                    <View
                      style={[
                        styles.salesDot,
                        isSelected && { backgroundColor: '#FFFFFF' },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Quick Shortcuts & Close */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.todayShortcutBtn}
              onPress={() => {
                onSelectDate(todayStr);
                onClose();
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="today-outline" size={14} color={COLORS.brandDarkGreen} style={{ marginRight: 4 }} />
              <Text style={styles.todayShortcutText}>Today</Text>
            </TouchableOpacity>

            {onClearDate && (
              <TouchableOpacity
                style={styles.allDatesBtn}
                onPress={() => {
                  onClearDate();
                  onClose();
                }}
                activeOpacity={0.75}
              >
                <Text style={styles.allDatesText}>All Dates</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.75}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(14, 31, 23, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: 20,
    ...SHADOWS.hero,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.appBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: FONTS.h3,
    fontFamily: FONTS.extraBold,
    color: COLORS.ink,
  },
  monthSub: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.muted,
    marginTop: 2,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    paddingVertical: 4,
  },
  weekdayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.muted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCellEmpty: {
    width: '14.28%',
    height: 42,
  },
  dayCell: {
    width: '14.28%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.chip,
    marginVertical: 1,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: COLORS.brandGreen,
  },
  dayCellSelected: {
    backgroundColor: COLORS.brandDarkGreen,
  },
  dayText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
  },
  dayTextToday: {
    color: COLORS.brandGreenText,
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontFamily: FONTS.extraBold,
  },
  salesDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.brandGreen,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
  },
  todayShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.softGreen,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.chip,
  },
  todayShortcutText: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: COLORS.brandDarkGreen,
  },
  allDatesBtn: {
    backgroundColor: COLORS.appBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.chip,
  },
  allDatesText: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
  },
  closeBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.chip,
    backgroundColor: COLORS.appBg,
  },
  closeBtnText: {
    fontSize: FONTS.caption,
    fontFamily: FONTS.bold,
    color: COLORS.ink,
  },
});
