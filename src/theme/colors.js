// Skyservice Artisan Bakery Theme Design Tokens
import { Platform } from 'react-native';

export const COLORS = {
  // Brand Colors
  ink: '#0E1F17',
  mutedText: '#5E6E65',
  brandDarkGreen: '#0B3B2A',
  brandGreen: '#12B76A',
  greenTextLight: '#0A7A47',
  softGreen: '#E5F6EC',
  appBackground: '#F2F4F0',
  card: '#FFFFFF',
  hairline: '#EEF2EF',
  inputBorder: '#DDE5DF',

  // Status & Feedback
  warningBg: '#FFF3DC',
  warningText: '#8A5200',
  dangerBg: '#FDECEC',
  dangerText: '#B42318',
  dangerBorder: '#F4C7C3',

  // Payment Colors
  cashColor: '#12B76A',
  cardColor: '#3B82F6',
  mobileColor: '#8B5CF6',

  // Compatibility Mappings
  primary: '#0B3B2A',
  primaryDark: '#08281D',
  primaryLight: '#E5F6EC',
  accent: '#12B76A',
  secondary: '#12B76A',
  secondaryLight: '#E5F6EC',
  background: '#F2F4F0',
  surface: '#FFFFFF',
  surfaceSubtle: '#F8FAF7',
  surfaceDark: '#0B3B2A',
  border: '#DDE5DF',
  borderLight: '#EEF2EF',
  borderFocus: '#12B76A',
  textPrimary: '#0E1F17',
  textSecondary: '#5E6E65',
  textMuted: '#5E6E65',
  textDisabled: '#9AA8A0',
  success: '#12B76A',
  successLight: '#E5F6EC',
  danger: '#B42318',
  dangerLight: '#FDECEC',
  warning: '#8A5200',
  warningLight: '#FFF3DC',
  info: '#3B82F6',
  infoLight: '#EFF6FF',

  // Quick aliases
  bg: '#F2F4F0',
  bgCard: '#FFFFFF',
  text: '#0E1F17',
  textSec: '#5E6E65',
};

export const FONTS = {
  fontFamily: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    web: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    default: 'sans-serif',
  }),
  fontFamilyBold: Platform.select({
    ios: 'System',
    android: 'sans-serif-medium',
    web: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    default: 'sans-serif-medium',
  }),

  // Font weights mapped safely for Android, iOS, and Web
  extraBold: Platform.select({
    ios: 'System',
    android: 'sans-serif-black',
    default: 'sans-serif',
  }),
  bold: Platform.select({
    ios: 'System',
    android: 'sans-serif-medium',
    default: 'sans-serif',
  }),
  semiBold: Platform.select({
    ios: 'System',
    android: 'sans-serif-medium',
    default: 'sans-serif',
  }),
  medium: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'sans-serif',
  }),
  regular: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'sans-serif',
  }),

  // Font sizes
  h1: 28,
  h2: 22,
  h3: 18,
  title: 20,
  body: 14,
  caption: 12,
  overline: 11,
  xs: 11,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  hero: 38,

  // Weights & Styles
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0E1F17',
    letterSpacing: -0.5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0E1F17',
    letterSpacing: -0.3,
  },
  bodyNameAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0E1F17',
  },
  bodyCaption: {
    fontSize: 12,
    fontWeight: '500',
    color: '#5E6E65',
  },
  heroNumber: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
};

export const RADIUS = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  card: 22,
  hero: 26,
  input: 16,
  chip: 12,
  iconTile: 13,
  sheet: 28,
  bottomBar: 24,
  full: 9999,
};

export const SHADOWS = {
  soft: {
    shadowColor: '#0A281C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  card: {
    shadowColor: '#0A281C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  floatingBar: {
    shadowColor: '#0A281C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  sm: {
    shadowColor: '#0A281C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#0A281C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0A281C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 24,
    elevation: 6,
  },
};

export const SHADOW = SHADOWS;
export const CURRENCY = 'ETB ';
