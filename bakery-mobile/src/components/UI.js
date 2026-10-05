import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, FONTS } from '../theme/colors';

export function Card({ children, style, onPress }) {
  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.card, style]}
        onPress={onPress}
        activeOpacity={0.75}
      >
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatCard({ title, label, value, icon, color = COLORS.primary, bgColor, subtitle, style }) {
  const displayLabel = title || label || '';
  const iconBg = bgColor || color + '18';

  return (
    <View style={[styles.statCard, style]}>
      <View style={styles.statTopRow}>
        <View style={[styles.statIconBadge, { backgroundColor: iconBg }]}>
          {icon ? (
            <Ionicons name={icon} size={18} color={color} />
          ) : (
            <View style={[styles.statDot, { backgroundColor: color }]} />
          )}
        </View>
        {subtitle ? <Text style={styles.statSubtitle}>{subtitle}</Text> : null}
      </View>
      <Text style={styles.statLabel} numberOfLines={1}>
        {displayLabel}
      </Text>
      <Text style={[styles.statValue, { color: COLORS.textPrimary }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function Badge({ label, color = COLORS.primary, bg, style, icon }) {
  const badgeBg = bg || color + '1A';
  return (
    <View style={[styles.badge, { backgroundColor: badgeBg }, style]}>
      {icon ? <Ionicons name={icon} size={12} color={color} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({ title, onPress, disabled, icon, style, variant = 'primary' }) {
  let btnBg = COLORS.primary;
  let textColor = '#FFFFFF';

  if (variant === 'secondary') {
    btnBg = COLORS.surfaceSubtle;
    textColor = COLORS.textPrimary;
  } else if (variant === 'danger') {
    btnBg = COLORS.danger;
    textColor = '#FFFFFF';
  } else if (variant === 'success') {
    btnBg = COLORS.success;
    textColor = '#FFFFFF';

  }

  return (
    <TouchableOpacity
      style={[
        styles.primaryBtn,
        { backgroundColor: btnBg },
        disabled && styles.disabledBtn,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      {icon ? (
        typeof icon === 'string' ? (
          <Ionicons name={icon} size={18} color={textColor} style={{ marginRight: 8 }} />
        ) : (
          icon
        )
      ) : null}
      <Text style={[styles.primaryBtnText, { color: textColor }]}>{title}</Text>
    </TouchableOpacity>
  );
}

export function SecondaryButton({ title, onPress, icon, style }) {
  return (
    <TouchableOpacity
      style={[styles.secondaryBtn, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {icon ? (
        typeof icon === 'string' ? (
          <Ionicons name={icon} size={16} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
        ) : (
          icon
        )
      ) : null}
      <Text style={styles.secondaryBtnText}>{title}</Text>
    </TouchableOpacity>
  );
}

export function SectionHeader({ title, subtitle, action, actionLabel, style }) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action ? (
        <TouchableOpacity onPress={action} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.actionLabel}>{actionLabel || 'See All'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function EmptyState({ icon = 'cube-outline', emoji, title, subtitle, actionLabel, onAction }) {
  return (
    <View style={styles.emptyState}>
      {emoji ? (
        <Text style={{ fontSize: 44, marginBottom: 12 }}>{emoji}</Text>
      ) : (
        <View style={styles.emptyIconCircle}>
          <Ionicons name={icon} size={36} color={COLORS.textMuted} />
        </View>
      )}
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <PrimaryButton
          title={actionLabel}
          onPress={onAction}
          style={{ marginTop: 16, minWidth: 140 }}
        />
      ) : null}
    </View>
  );
}

export function NumberStepper({ value, onChange, onMinus, onPlus, style }) {
  return (
    <View style={[styles.stepperContainer, style]}>
      <TouchableOpacity
        style={styles.stepperBtn}
        onPress={onMinus}
        activeOpacity={0.7}
      >
        <Ionicons name="remove" size={16} color={COLORS.primary} />
      </TouchableOpacity>
      <TextInput
        style={styles.stepperInput}
        keyboardType="number-pad"
        value={String(value)}
        onChangeText={onChange}
        selectTextOnFocus
      />
      <TouchableOpacity
        style={styles.stepperBtn}
        onPress={onPlus}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={16} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  statTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIconBadge: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statSubtitle: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  statLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  statValue: {
    fontSize: FONTS.xl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  badge: {
    borderRadius: RADIUS.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  primaryBtn: {
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  primaryBtnText: {
    fontSize: FONTS.md,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryBtnText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sm,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: FONTS.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  actionLabel: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: FONTS.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: FONTS.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  stepperInput: {
    width: 44,
    textAlign: 'center',
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingVertical: 4,
  },
});
