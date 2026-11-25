import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { palette } from '../lib/theme';

/**
 * BillBeacon's custom pull-to-refresh: the beacon sweep.
 *
 * The pull is scrubbed by finger distance — an amber beacon dot
 * pulses and sweeps a light beam across as you pull, filling with
 * amber as the pull passes the threshold; on release the beam sweeps
 * while data returns, then content settles with a spring. Never the
 * stock spinner. On web, where native pull-to-refresh doesn't exist,
 * the same animation is wired to the header refresh button (see
 * `BeaconRefreshButton`).
 */

const THRESHOLD = 90;

function BeaconVisual({
  fill,
  refreshing,
}: {
  /** 0–1 fill level while pulling; ignored while `refreshing` loops. */
  fill: SharedValue<number>;
  refreshing: boolean;
}) {
  const sweep = useSharedValue(0);
  useEffect(() => {
    if (refreshing) {
      sweep.value = withRepeat(withTiming(360, { duration: 1100 }), -1, false);
    } else {
      sweep.value = withTiming(0, { duration: 200 });
    }
  }, [refreshing, sweep]);
  const beamStyle = useAnimatedStyle(() => ({
    opacity: refreshing ? 1 : Math.max(0, fill.value),
    transform: [
      { translateY: refreshing ? 0 : (1 - fill.value) * 34 },
      { scale: refreshing ? 1 : 0.82 + fill.value * 0.18 },
      { rotate: `${refreshing ? sweep.value % 360 : fill.value * 180}deg` },
    ],
  }));
  const fillStyle = useAnimatedStyle(() => ({
    height: `${Math.round((refreshing ? 1 : fill.value) * 100)}%`,
    opacity: refreshing ? 0.9 : fill.value * 0.85,
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: refreshing ? 1 : fill.value > 0.85 ? 1 : 0,
  }));
  return (
    <View style={styles.beaconWrap}>
      <Animated.View style={[styles.beacon, beamStyle]}>
        <Animated.View style={[styles.beaconFill, fillStyle]} />
        <Text style={styles.beaconGlyph}>◉</Text>
      </Animated.View>
      <Animated.Text style={[styles.beaconMark, labelStyle]}>
        {refreshing ? 'SCANNING' : 'RELEASE TO SCAN'}
      </Animated.Text>
    </View>
  );
}

/** The header refresh visual on web — same beacon sweep, same motion. Wrap it
 *  in the parent's own pressable; this component is visual only. */
export function BeaconRefreshButton({ refreshing }: { refreshing: boolean }) {
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withSpring(refreshing ? 1 : 0, { damping: 14, stiffness: 200 });
  }, [refreshing, fill]);
  return <BeaconVisual fill={fill} refreshing={refreshing} />;
}

export function PullToRefresh({
  refreshing,
  onRefresh,
  children,
}: {
  refreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
}) {
  // 0–1 pull progress; the beacon sweep reads it directly.
  const pull = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      pull.value = Math.min(1, Math.max(0, -event.contentOffset.y / THRESHOLD));
    },
    onEndDrag: (event) => {
      if (event.contentOffset.y < -THRESHOLD) {
        runOnJS(onRefresh)();
      }
    },
  });

  const indicatorStyle = useAnimatedStyle(() => ({
    height: refreshing ? 96 : pull.value * 96,
    opacity: refreshing || pull.value > 0.08 ? 1 : 0,
  }));

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.indicator, indicatorStyle]}>
        <BeaconVisual fill={pull} refreshing={refreshing} />
      </Animated.View>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {children}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  indicator: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  scrollContent: { flexGrow: 1 },
  beaconWrap: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  beacon: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 56,
  },
  beaconFill: {
    backgroundColor: palette.amber,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  beaconGlyph: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  beaconMark: {
    color: palette.amberDeep,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
});
