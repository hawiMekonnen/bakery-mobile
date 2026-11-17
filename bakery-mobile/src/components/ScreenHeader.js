import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SHADOWS } from '../theme/colors';

export default function ScreenHeader({
  title,
  subtitle,
  icon,
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
  const topPadding = Math.max(insets.top, 10) + 8;

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
              activeOpacity={0.75}
            >
              <Ionicons name="chevron-back" size={20} color={COLORS.brandDarkGreen} />
            </TouchableOpacity>
          ) : null}

          {icon ? (
            <View style={[styles.iconBadge, { backgroundColor: iconBg || COLORS.softGreen }]}>
              <Ionicons name={icon} size={18} color={iconColor || COLORS.brandDarkGreen} />
            </View>
          ) : null}

          <View style={styles.titleColumn}>
            <View style={styles.titleBadgeRow}>
              <Text style={styles.titleText} numberOfLines={1}>
                {title}
              </Text>
              {badge ? (
                <View style={[styles.inlineBadge, { backgroundColor: badgeColor ? badgeColor + '1A' : COLORS.softGreen }]}>
                  <Text style={[styles.inlineBadgeText, { color: badgeColor || COLORS.greenTextLight }]}>
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

        {/* Right Section */}
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
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
    paddingHorizontal: 20,
    paddingBottom: 14,
    zIndex: 10,
    ...SHADOWS.card,
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
    width: 38,
    height: 38,
    borderRadius: RADIUS.iconTile, // 13
    backgroundColor: COLORS.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.iconTile, // 13
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
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
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.ink,
    letterSpacing: -0.4,
  },
  inlineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  inlineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.mutedText,
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
