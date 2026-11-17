import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, FONTS } from '../theme/colors';

// ─── Concentric Decorative Rings (Hero & Login Banner) ─────────────────────
export function ConcentricRings({ style, size = 320, color = '#12B76A', opacity = 0.12 }) {
  const rings = [1, 0.76, 0.52, 0.28];
  return (
    <View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {rings.map((scale, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: size * scale,
            height: size * scale,
            borderRadius: (size * scale) / 2,
            borderWidth: 1.5,
            borderColor: color,
            opacity: opacity * (1 - i * 0.15),
          }}
        />
      ))}
    </View>
  );
}

// ─── Hero Card (Radius 26, Dark Green #0B3B2A, Rings Decoration) ───────────
export function HeroCard({ children, style, ringsPosition = { right: -60, top: -60 } }) {
  return (
    <View style={[styles.heroCard, style]}>
      <ConcentricRings style={ringsPosition} size={280} opacity={0.16} />
      {children}
    </View>
  );
}

// ─── Standard Card (Radius 22, White, Soft Shadow) ─────────────────────────
export function Card({ children, style, onPress, noPadding = false }) {
  const content = (
    <View style={[styles.card, noPadding && { padding: 0 }, style]}>
      {children}
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

// ─── 40x40 Soft Green Icon Tile (Radius 13, #E5F6EC) ──────────────────────
export function IconTile({ icon, size = 20, color = COLORS.brandDarkGreen, bg = COLORS.softGreen, style }) {
  return (
    <View style={[styles.iconTile, { backgroundColor: bg }, style]}>
      {typeof icon === 'string' ? (
        <Ionicons name={icon} size={size} color={color} />
      ) : (
        icon
      )}
    </View>
  );
}

// ─── Filter Chip (Radius 12, White or Dark Green Active) ───────────────────
export function FilterChip({ label, selected, onPress, count, icon, style }) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected ? styles.chipSelected : styles.chipUnselected,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={selected ? '#FFFFFF' : COLORS.mutedText}
          style={{ marginRight: 5 }}
        />
      ) : null}
      <Text style={[styles.chipText, selected ? styles.chipTextSelected : styles.chipTextUnselected]}>
        {label}
      </Text>
      {count !== undefined ? (
        <View style={[styles.chipCountBadge, selected && { backgroundColor: '#12B76A33' }]}>
          <Text style={[styles.chipCountText, selected && { color: '#FFFFFF' }]}>{count}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// ─── Status Badge (Radius 8, Soft Tints) ───────────────────────────────────
export function StatusBadge({ status, label, style }) {
  const s = (status || label || '').toLowerCase();
  let bg = COLORS.softGreen;
  let text = COLORS.greenTextLight;
  let display = label || status;

  if (s.includes('not synced') || s.includes('pending') || s.includes('offline')) {
    bg = COLORS.warningBg;
    text = COLORS.warningText;
  } else if (s.includes('fail') || s.includes('suspend') || s.includes('block') || s.includes('danger')) {
    bg = COLORS.dangerBg;
    text = COLORS.dangerText;
  } else if (s.includes('cash') || s.includes('synced') || s.includes('active') || s.includes('online')) {
    bg = COLORS.softGreen;
    text = COLORS.greenTextLight;
  } else if (s.includes('card')) {
    bg = '#EFF6FF';
    text = '#1D4ED8';
  } else if (s.includes('mobile')) {
    bg = '#F5F3FF';
    text = '#6D28D9';
  }

  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }, style]}>
      <Text style={[styles.statusBadgeText, { color: text }]}>{display}</Text>
    </View>
  );
}

// ─── Primary Button (Height 54, Radius 16) ─────────────────────────────────
export function PrimaryButton({
  title,
  onPress,
  disabled,
  icon,
  style,
  textStyle,
  color = COLORS.brandDarkGreen,
  variant = 'dark', // 'dark' (#0B3B2A) | 'green' (#12B76A)
}) {
  const bg = variant === 'green' ? COLORS.brandGreen : color;
  return (
    <TouchableOpacity
      style={[
        styles.primaryBtn,
        { backgroundColor: bg },
        disabled && styles.disabledBtn,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      {icon ? (
        typeof icon === 'string' ? (
          <Ionicons name={icon} size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
        ) : (
          icon
        )
      ) : null}
      <Text style={[styles.primaryBtnText, disabled && styles.disabledBtnText, textStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Secondary Button ──────────────────────────────────────────────────────
export function SecondaryButton({ title, onPress, icon, style, textStyle }) {
  return (
    <TouchableOpacity
      style={[styles.secondaryBtn, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {icon ? (
        typeof icon === 'string' ? (
          <Ionicons name={icon} size={16} color={COLORS.ink} style={{ marginRight: 6 }} />
        ) : (
          icon
        )
      ) : null}
      <Text style={[styles.secondaryBtnText, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}

// ─── Danger Button (Red Style) ─────────────────────────────────────────────
export function DangerButton({ title, onPress, icon, style, textStyle }) {
  return (
    <TouchableOpacity
      style={[styles.dangerBtn, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {icon ? (
        typeof icon === 'string' ? (
          <Ionicons name={icon} size={16} color={COLORS.dangerText} style={{ marginRight: 6 }} />
        ) : (
          icon
        )
      ) : null}
      <Text style={[styles.dangerBtnText, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}

// ─── Input Field (Height 54, Radius 16, Leading Icon) ──────────────────────
export function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  rightElement,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  style,
  inputStyle,
}) {
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <View style={[styles.inputBox, focused && styles.inputBoxFocused]}>
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? COLORS.brandGreen : COLORS.mutedText}
            style={{ marginRight: 10 }}
          />
        ) : null}
        <TextInput
          style={[styles.textInput, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.mutedText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {rightElement}
      </View>
    </View>
  );
}

// ─── List Row Component ───────────────────────────────────────────────────
export function ListRow({
  icon = 'receipt-outline',
  iconBg,
  iconColor,
  title,
  subtitle,
  rightTop,
  rightBottom,
  badge,
  badgeStatus,
  onPress,
  style,
  divider = true,
}) {
  const rowContent = (
    <View style={[styles.listRow, divider && styles.listRowDivider, style]}>
      <IconTile icon={icon} bg={iconBg} color={iconColor} style={{ marginRight: 12 }} />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
        {rightTop ? <Text style={styles.rowRightTop}>{rightTop}</Text> : null}
        {badge ? (
          <StatusBadge label={badge} status={badgeStatus || badge} style={{ marginTop: 2 }} />
        ) : rightBottom ? (
          <Text style={styles.rowRightBottom}>{rightBottom}</Text>
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {rowContent}
      </TouchableOpacity>
    );
  }
  return rowContent;
}

// ─── 3-Segment Collections Bar ─────────────────────────────────────────────
export function SegmentedBar({ cash = 0, card = 0, mobile = 0, style }) {
  const total = cash + card + mobile;
  const cashFlex = total > 0 ? Math.max(0.06, cash / total) : 1;
  const cardFlex = total > 0 ? Math.max(0.06, card / total) : 1;
  const mobileFlex = total > 0 ? Math.max(0.06, mobile / total) : 1;

  return (
    <View style={[{ width: '100%' }, style]}>
      <View style={styles.segmentTrack}>
        <View style={{ flex: cashFlex, backgroundColor: COLORS.cashColor, height: '100%' }} />
        <View style={{ flex: cardFlex, backgroundColor: COLORS.cardColor, height: '100%', marginHorizontal: 2 }} />
        <View style={{ flex: mobileFlex, backgroundColor: COLORS.mobileColor, height: '100%' }} />
      </View>
      <View style={styles.segmentLegendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.cashColor }]} />
          <Text style={styles.legendLabel}>Cash</Text>
          <Text style={styles.legendAmount}>ETB {cash.toFixed(2)}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.cardColor }]} />
          <Text style={styles.legendLabel}>Card</Text>
          <Text style={styles.legendAmount}>ETB {card.toFixed(2)}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.mobileColor }]} />
          <Text style={styles.legendLabel}>Mobile</Text>
          <Text style={styles.legendAmount}>ETB {mobile.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────
export function StatCard({ title, label, value, icon, color = COLORS.brandDarkGreen, bgColor, subtitle, style }) {
  const displayLabel = title || label || '';
  return (
    <View style={[styles.statCard, style]}>
      {icon ? (
        <IconTile icon={icon} color={color} bg={bgColor || COLORS.softGreen} style={{ marginBottom: 8 }} />
      ) : null}
      <Text style={styles.statLabel} numberOfLines={1}>{displayLabel}</Text>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      {subtitle ? <Text style={styles.statSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────
export function EmptyState({ icon = 'cube-outline', title, subtitle, actionLabel, onAction }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name={icon} size={32} color={COLORS.mutedText} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <PrimaryButton
          title={actionLabel}
          onPress={onAction}
          style={{ marginTop: 14, minWidth: 140, height: 46 }}
        />
      ) : null}
    </View>
  );
}

// ─── Skeleton Loader ───────────────────────────────────────────────────────
export function SkeletonLoader({ width = '100%', height = 20, radius = 8, style }) {
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: '#E6ECE8',
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: COLORS.brandDarkGreen,
    borderRadius: RADIUS.hero, // 26
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOWS.md,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card, // 22
    padding: 16,
    ...SHADOWS.card,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.iconTile, // 13
    backgroundColor: COLORS.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 36,
    borderRadius: RADIUS.chip, // 12
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: COLORS.brandDarkGreen,
  },
  chipUnselected: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    ...SHADOWS.sm,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  chipTextUnselected: {
    color: COLORS.ink,
  },
  chipCountBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: COLORS.hairline,
  },
  chipCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.mutedText,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  primaryBtn: {
    height: 54,
    borderRadius: RADIUS.input, // 16
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    ...SHADOWS.soft,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  disabledBtn: {
    backgroundColor: '#E3E8E5',
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledBtnText: {
    color: '#95A39B',
  },
  secondaryBtn: {
    height: 50,
    borderRadius: RADIUS.input,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  secondaryBtnText: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  dangerBtn: {
    height: 50,
    borderRadius: RADIUS.input,
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  dangerBtnText: {
    color: COLORS.dangerText,
    fontSize: 14,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.mutedText,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  inputBox: {
    height: 54,
    borderRadius: RADIUS.input,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  inputBoxFocused: {
    borderColor: COLORS.brandGreen,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.ink,
    fontWeight: '600',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  listRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  rowSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.mutedText,
    marginTop: 2,
  },
  rowRightTop: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
  },
  rowRightBottom: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.greenTextLight,
    marginTop: 2,
  },
  segmentTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: COLORS.hairline,
    marginBottom: 10,
  },
  segmentLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  legendItem: {
    flexDirection: 'column',
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 2,
  },
  legendLabel: {
    fontSize: 11,
    color: COLORS.mutedText,
    fontWeight: '600',
  },
  legendAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.ink,
    marginTop: 1,
  },
  statCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    ...SHADOWS.sm,
  },
  statLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.mutedText,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.ink,
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: 11,
    color: COLORS.mutedText,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.ink,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: COLORS.mutedText,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
