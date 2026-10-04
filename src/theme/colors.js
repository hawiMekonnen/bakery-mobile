// BakerPro Modern Artisan Theme
export const COLORS = {
  // Brand
  primary: '#D97706',       // Warm artisan amber
  primaryDark: '#B45309',
  primaryLight: '#FEF3C7',   // Creamy warm glow
  secondary: '#EA580C',     // Terracotta accent
  secondaryLight: '#FFEDD5',

  // Surfaces & Backgrounds
  background: '#F8FAFC',    // Slate-50 clean background
  surface: '#FFFFFF',       // Card white
  surfaceSubtle: '#F1F5F9', // Subtle gray card
  surfaceDark: '#0F172A',   // Slate-900

  // Borders
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderFocus: '#D97706',

  // Typography
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',

  // Status & Feedback
  success: '#10B981',
  successLight: '#D1FAE5',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',

  // Payment colors
  cashColor: '#10B981',
  cardColor: '#3B82F6',
  mobileColor: '#8B5CF6',

  // Aliases for compatibility
  bg: '#F8FAFC',
  bgCard: '#FFFFFF',
  text: '#0F172A',
  textSec: '#475569',
};

export const FONTS = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  title: 28,

  regular: { fontWeight: '400' },
  medium: { fontWeight: '500' },
  semibold: { fontWeight: '600' },
  bold: { fontWeight: '700' },
  extrabold: { fontWeight: '800' },
};

export const RADIUS = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const SHADOW = SHADOWS;
