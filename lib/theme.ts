import { useWindowDimensions } from 'react-native';

/**
 * BillBeacon design tokens — one consistent system for the whole app.
 *
 * Identity: "the beacon board". A deep ink navy (#101828) header board
 * with one glowing amber beacon (#F59E0B) that watches the household's
 * due dates, on warm paper (#F7F6F2). Late fees are the enemy, so
 * status colors do the talking: due-soon amber (#D97706), due-today
 * red (#DC2626), overdue deep red (#991B1B), paid leaf (#16A34A),
 * subscriptions slate blue (#33587A). Plus Jakarta Sans (700/800) is
 * the display face — deliberately different from Bitter (RecycleRight),
 * Outfit (SkillSwapLocal), Sora, Fraunces, and every earlier app.
 * The home is a dark navy beacon header with a big "due this month"
 * figure and a next-bill countdown, a 14-day due-date strip, filter
 * chips, and a vertical timeline of bills grouped by due date.
 * Navigation is a flat white bottom tab bar (Bills / Subscriptions /
 * Add / Settings) with labeled tabs and no center button. No floating
 * glass pill tab bar, no photo hero, no ledger, no grid home, no ring,
 * no poster type, no day-timeline, no board-switcher chips + FAB, no
 * top segmented tabs as main nav.
 */

export const palette = {
  // Brand — deep ink navy, the beacon board header.
  primary: '#101828',
  primaryDeep: '#0A0F1A',
  primaryLight: '#33587A',
  primarySoft: '#E4E9F0',
  primaryPale: '#EFF2F6',
  // Glowing amber beacon — the one accent, for the beacon and key CTAs.
  amber: '#F59E0B',
  amberDeep: '#D97706',
  amberSoft: '#FEF3C7',
  // Leaf green — paid states.
  leaf: '#16A34A',
  leafDeep: '#15803D',
  leafSoft: '#DCF2E3',
  // Status colors.
  dueSoon: '#D97706',
  dueSoonSoft: '#FEF3C7',
  dueToday: '#DC2626',
  dueTodaySoft: '#FEE2E2',
  overdue: '#991B1B',
  overdueSoft: '#FEE2E2',
  paid: '#16A34A',
  paidSoft: '#DCF2E3',
  // Slate blue — subscriptions.
  slate: '#33587A',
  slateSoft: '#E4E9F0',
  // Ground — warm paper.
  ground: '#F7F6F2',
  // Neutrals (warm tinted so the whole UI feels one family).
  ink: '#1B2430',
  body: '#4A5568',
  muted: '#8A94A6',
  line: 'rgba(27, 36, 48, 0.10)',
  surface: '#FFFFFF',
  glass: 'rgba(255, 255, 255, 0.62)',
  glassStrong: 'rgba(255, 255, 255, 0.85)',
  sheet: 'rgba(255, 255, 255, 0.92)',
  // Beacon board background stops — paper, navy tint, amber tint.
  aurora: ['#F7F6F2', '#E4E9F0', '#FEF3C7'] as const,
  // Status aliases used by shared UI components.
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  error: '#DC2626',
  errorSoft: '#FEE2E2',
  success: '#16A34A',
  successSoft: '#DCF2E3',
} as const;

/** Status color per bill status, for dots, pills and banners. */
export const statusColors = {
  overdue: { fg: palette.overdue, soft: palette.overdueSoft },
  'due-today': { fg: palette.dueToday, soft: palette.dueTodaySoft },
  'due-soon': { fg: palette.dueSoon, soft: palette.dueSoonSoft },
  upcoming: { fg: palette.slate, soft: palette.slateSoft },
  paid: { fg: palette.paid, soft: palette.paidSoft },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 12,
  md: 18,
  card: 30,
  sheet: 38,
  pill: 999,
  input: 24,
} as const;

/**
 * Display typeface — Plus Jakarta Sans (bundled via
 * @expo-google-fonts/plus-jakarta-sans, loaded in app/_layout.tsx).
 * Used for headlines, screen titles and big numbers; body text stays
 * on the system font.
 */
export const font = {
  display: 'PlusJakartaSans_800ExtraBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

export const type = {
  display: { fontFamily: font.display, fontSize: 40, lineHeight: 44, letterSpacing: -0.3 },
  displayWide: { fontFamily: font.display, fontSize: 52, lineHeight: 54, letterSpacing: -0.3 },
  title: { fontFamily: font.display, fontSize: 26, lineHeight: 32, letterSpacing: -0.2 },
  subtitle: { fontSize: 17, lineHeight: 24, fontWeight: '700' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '700' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.6 },
  label: { fontSize: 11, lineHeight: 14, fontWeight: '700' as const, letterSpacing: 1.1 },
} as const;

export const shadows = {
  card: {
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },
  glow: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  amberGlow: {
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },
  float: {
    shadowColor: '#1B2430',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
} as const;

export type Breakpoint = 'compact' | 'medium' | 'wide' | 'desktop';

export interface Responsive {
  breakpoint: Breakpoint;
  width: number;
  /** Max width for the centered content column. */
  contentMaxWidth: number;
  /** Horizontal page padding. */
  pad: number;
  /** Columns for card grids. */
  columns: number;
  /** Two-pane list + detail layout (foldable unfolded / tablet / desktop). */
  twoPane: boolean;
  display: typeof type.display | typeof type.displayWide;
}

export function useResponsive(): Responsive {
  const { width } = useWindowDimensions();
  if (width < 600) {
    return {
      breakpoint: 'compact',
      width,
      contentMaxWidth: width,
      pad: 20,
      columns: 1,
      twoPane: false,
      display: type.display,
    };
  }
  if (width < 840) {
    return {
      breakpoint: 'medium',
      width,
      contentMaxWidth: 640,
      pad: 28,
      columns: 1,
      twoPane: false,
      display: type.displayWide,
    };
  }
  if (width < 1280) {
    return {
      breakpoint: 'wide',
      width,
      contentMaxWidth: 1024,
      pad: 32,
      columns: 2,
      twoPane: true,
      display: type.displayWide,
    };
  }
  return {
    breakpoint: 'desktop',
    width,
    contentMaxWidth: 1120,
    pad: 40,
    columns: 3,
    twoPane: true,
    display: type.displayWide,
  };
}
