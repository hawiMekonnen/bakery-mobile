import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';

export default function ScreenHeader({
  title,
  subtitle,
  icon,
  emoji,
  iconBg,
  iconColor,
  canGoBack = false,
  onBack,
  rightAction,
  badge,
  badgeColor,
  style,
}) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, 10) + 6;

  return (
    <View style={[styles.headerContainer, { paddingTop: topPadding }, style]}>
      <View style={styles.headerContent}>
        {/* Left Section: Back button and/or Icon badge and Title */}
        <View style={styles.leftRow}>
          {canGoBack && onBack ? (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={onBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
          ) : null}

          {(emoji || icon) ? (
            <View style={[styles.iconBadge, { backgroundColor: iconBg || COLORS.primaryLight }]}>
              {emoji ? (
                <Text style={styles.emojiText}>{emoji}</Text>
              ) : (
                <Ionicons name={icon} size={20} color={iconColor || COLORS.primary} />
              )}
            </View>
          ) : null}

          <View style={styles.titleColumn}>
            <View style={styles.titleBadgeRow}>
              <Text style={styles.titleText} numberOfLines={1}>
                {title}
              </Text>
              {badge ? (
                <View style={[styles.inlineBadge, { backgroundColor: (badgeColor || COLORS.primary) + '1A' }]}>
                  <Text style={[styles.inlineBadgeText, { color: badgeColor || COLORS.primary }]}>
                    {badge}
                  </Text>
                </View>
              ) : null}
            </View>
            {subtitle ? (
              <Text style={styles.subtitleText} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Right Section: Interactive action */}
        {rightAction ? (
          <View style={styles.rightSection}>
            {rightAction}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
    ...SHADOWS.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 42,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  emojiText: {
    fontSize: 20,
  },
  titleColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    fontSize: FONTS.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  inlineBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginLeft: 6,
  },
  inlineBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  subtitleText: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
