import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { palette, radii, shadows, spacing, statusColors, type } from '../lib/theme';
import type { BillStatus } from '../lib/types';

/** Light haptic tap on primary actions (mobile only, silent on web). */
export function tap() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }
}

/* ------------------------------------------------------------------ */
/* Pressable wrapper: spring scale to ~0.95 with overshoot on press.  */
/* ------------------------------------------------------------------ */

export function SpringPress({
  children,
  onPress,
  disabled,
  style,
  haptic = false,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: object;
  haptic?: boolean;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        if (haptic) tap();
        onPress?.();
      }}
      onPressIn={() => {
        scale.value = withSpring(0.95, { damping: 14, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
      }}
      style={[{ opacity: disabled ? 0.45 : 1 }, style]}
    >
      <Animated.View style={animated}>{children}</Animated.View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  sub,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  sub?: string;
}) {
  return (
    <SpringPress onPress={onPress} disabled={disabled || loading} haptic>
      <LinearGradient
        colors={[palette.amber, palette.amberDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.primary, shadows.amberGlow, (disabled || loading) && styles.primaryDisabled]}
      >
        {loading ? (
          <BouncingDots color="#1B2430" />
        ) : (
          <Text style={styles.primaryLabel}>
            {label}
            {sub ? `  ·  ${sub}` : ''}
          </Text>
        )}
      </LinearGradient>
    </SpringPress>
  );
}

export function GhostButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <SpringPress onPress={onPress} disabled={disabled}>
      <View style={styles.ghost}>
        <Text style={styles.ghostLabel}>{label}</Text>
      </View>
    </SpringPress>
  );
}

/** Circular icon button in a soft circle — used in headers and sheets. */
export function IconButton({
  label,
  onPress,
  active,
  disabled,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <SpringPress onPress={onPress} disabled={disabled} haptic>
      <View style={[styles.iconButton, active && styles.iconButtonActive]}>
        <Text style={[styles.iconButtonLabel, active && styles.iconButtonLabelActive]}>{label}</Text>
      </View>
    </SpringPress>
  );
}

/* ------------------------------------------------------------------ */
/* Chips — pop (scale bounce) when they become selected.               */
/* ------------------------------------------------------------------ */

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const pop = useSharedValue(1);
  useEffect(() => {
    if (selected) {
      pop.value = withSequence(
        withSpring(1.18, { damping: 10, stiffness: 500 }),
        withSpring(1, { damping: 12, stiffness: 400 }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <Animated.View style={[styles.chip, selected && styles.chipSelected, animated]}>
        <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

export function StyledInput(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      {...props}
      style={[styles.input, props.style]}
      placeholderTextColor={palette.muted}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Glass surfaces                                                      */
/* ------------------------------------------------------------------ */

export function GlassCard({
  children,
  style,
  intensity = 18,
  flush = false,
}: {
  children: React.ReactNode;
  style?: object;
  intensity?: number;
  /** Flush removes the inner padding so children can bleed to the card's edges. */
  flush?: boolean;
}) {
  // Two layers on purpose: the outer view carries the background and the
  // shadow (Android elevation needs a real background, and a shadow on a
  // clipped view renders as a hard white plate offset behind the card).
  // The inner view clips the content to the rounded shape. Real backdrop
  // blur is web-only; on native the translucent surface over the paper
  // ground reads as frost.
  return (
    <View style={[styles.glassShadow, style]}>
      <View style={styles.glassClip}>
        {Platform.OS === 'web' ? (
          <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFill} />
        ) : null}
        <View style={[styles.glassInner, flush && styles.glassInnerFlush]}>{children}</View>
      </View>
    </View>
  );
}

/** Alias used across screens for the shared card surface. */
export const Card = GlassCard;

/* ------------------------------------------------------------------ */
/* Loading & empty states                                              */
/* ------------------------------------------------------------------ */

export function BouncingDots({ color = palette.amber }: { color?: string }) {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);
  useEffect(() => {
    const bounce = (sv: SharedValue<number>, delay: number) => {
      sv.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(-6, { duration: 260 }),
            withTiming(0, { duration: 260 }),
          ),
          -1,
          false,
        ),
      );
    };
    bounce(dot1, 0);
    bounce(dot2, 90);
    bounce(dot3, 180);
  }, [dot1, dot2, dot3]);
  const style1 = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }));
  const style2 = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }));
  const style3 = useAnimatedStyle(() => ({ transform: [{ translateY: dot3.value }] }));
  return (
    <View style={styles.dots}>
      <Animated.View style={[styles.dot, { backgroundColor: color }, style1]} />
      <Animated.View style={[styles.dot, { backgroundColor: color }, style2]} />
      <Animated.View style={[styles.dot, { backgroundColor: color }, style3]} />
    </View>
  );
}

export function Skeleton({ width, height, radius = radii.md }: { width: number | string; height: number; radius?: number }) {
  const opacity = useSharedValue(0.45);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.9, { duration: 900 }), -1, true);
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: 'rgba(27,36,48,0.08)' }, animated]} />;
}

export function EmptyState({
  glyph,
  title,
  body,
  actionLabel,
  onAction,
}: {
  glyph: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.empty}>
      <View style={styles.emptyGlyph}>
        <Text style={styles.emptyGlyphText}>{glyph}</Text>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {actionLabel && onAction ? (
        <View style={styles.emptyAction}>
          <GhostButton label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </Animated.View>
  );
}

export function SectionHeader({ kicker, title }: { kicker: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.kicker}>{kicker.toUpperCase()}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

/** Screen header with a back button — used on sub-screens. */
export function Header({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <View style={styles.header}>
      <IconButton label="←" onPress={onBack} />
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Status — dots, pills and the beacon                                 */
/* ------------------------------------------------------------------ */

export function StatusDot({ status, size = 12 }: { status: BillStatus; size?: number }) {
  return (
    <View
      style={[
        styles.statusDot,
        { backgroundColor: statusColors[status].fg, height: size, width: size, borderRadius: size / 2 },
      ]}
    />
  );
}

export function StatusPill({ status, label }: { status: BillStatus; label: string }) {
  const colors = statusColors[status];
  return (
    <View style={[styles.statusPill, { backgroundColor: colors.soft }]}>
      <StatusDot status={status} size={8} />
      <Text style={[styles.statusPillText, { color: colors.fg }]}>{label}</Text>
    </View>
  );
}

/** Pulsing amber beacon dot — the app's signature mark. */
export function BeaconDot({ size = 14 }: { size?: number }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 900 }),
        withTiming(1, { duration: 900 }),
      ),
      -1,
      false,
    );
  }, [pulse]);
  const halo = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 2 - pulse.value,
  }));
  return (
    <View style={[styles.beaconWrap, { height: size * 2, width: size * 2 }]}>
      <Animated.View
        style={[
          styles.beaconHalo,
          { height: size * 2, width: size * 2, borderRadius: size },
          halo,
        ]}
      />
      <View
        style={[
          styles.beaconCore,
          { backgroundColor: palette.amber, height: size, width: size, borderRadius: size / 2 },
        ]}
      />
    </View>
  );
}

export function LiveBadge() {
  return (
    <View style={styles.liveBadge}>
      <Text style={styles.liveBadgeText}>LIVE AI</Text>
    </View>
  );
}

export function DemoBadge() {
  return (
    <View style={styles.demoBadge}>
      <Text style={styles.demoBadgeText}>DEMO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  primary: {
    alignItems: 'center',
    borderRadius: radii.pill,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  primaryDisabled: { opacity: 0.55 },
  primaryLabel: { color: palette.ink, fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  ghost: {
    alignItems: 'center',
    backgroundColor: palette.glassStrong,
    borderColor: palette.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  ghostLabel: { color: palette.primary, fontSize: 16, fontWeight: '800' },
  iconButton: {
    alignItems: 'center',
    backgroundColor: palette.glassStrong,
    borderColor: palette.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  iconButtonActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  iconButtonLabel: { color: palette.ink, fontSize: 18, fontWeight: '700' },
  iconButtonLabelActive: { color: '#FFFFFF' },
  chip: {
    backgroundColor: palette.glassStrong,
    borderColor: palette.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  chipSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
    ...shadows.glow,
  },
  chipLabel: { color: palette.ink, fontSize: 15, fontWeight: '700' },
  chipLabelSelected: { color: '#FFFFFF' },
  input: {
    backgroundColor: palette.primaryPale,
    borderRadius: radii.input,
    color: palette.ink,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 18,
  },
  glassShadow: {
    backgroundColor: palette.glass,
    borderRadius: radii.card,
    ...shadows.card,
  },
  glassClip: {
    backgroundColor: palette.sheet,
    borderColor: 'rgba(255,255,255,0.75)',
    borderRadius: radii.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  glassInner: { padding: spacing.md },
  glassInnerFlush: { padding: 0 },
  dots: { alignItems: 'center', flexDirection: 'row', gap: 6, height: 24, justifyContent: 'center' },
  dot: { borderRadius: 5, height: 10, width: 10 },
  empty: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  emptyGlyph: {
    alignItems: 'center',
    backgroundColor: palette.amberSoft,
    borderRadius: 48,
    height: 96,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 96,
  },
  emptyGlyphText: { fontSize: 44 },
  emptyTitle: { ...type.title, color: palette.ink, marginBottom: spacing.sm, textAlign: 'center' },
  emptyBody: { ...type.body, color: palette.body, textAlign: 'center' },
  emptyAction: { marginTop: spacing.lg },
  sectionHeader: { marginBottom: spacing.md },
  kicker: { ...type.label, color: palette.primary, marginBottom: 4 },
  sectionTitle: { ...type.title, color: palette.ink },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: spacing.md },
  headerTitle: { ...type.title, color: palette.ink, flex: 1 },
  headerSpacer: { width: 44 },
  statusDot: {},
  statusPill: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  beaconWrap: { alignItems: 'center', justifyContent: 'center' },
  beaconHalo: {
    backgroundColor: palette.amber,
    opacity: 0.35,
    position: 'absolute',
  },
  beaconCore: {
    ...shadows.amberGlow,
  },
  liveBadge: {
    backgroundColor: palette.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveBadgeText: { color: palette.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  demoBadge: {
    backgroundColor: palette.warningSoft,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  demoBadgeText: { color: palette.warning, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
});
