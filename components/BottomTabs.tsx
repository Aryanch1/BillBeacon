import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SpringPress } from './ui';
import { palette } from '../lib/theme';

/**
 * Flat white bottom tab bar: Bills / Subscriptions / Add / Settings,
 * four labeled tabs in a row. This is the one navigation chrome for
 * BillBeacon — deliberately not a floating glass pill tab bar, and
 * with no raised center button (Add is a plain labeled tab).
 */
export type TabKey = 'bills' | 'subscriptions' | 'add' | 'settings';

const TABS: { key: TabKey; label: string; glyph: string; route: string }[] = [
  { key: 'bills', label: 'Bills', glyph: '◉', route: '/' },
  { key: 'subscriptions', label: 'Subscriptions', glyph: '↻', route: '/subscriptions' },
  { key: 'add', label: 'Add', glyph: '+', route: '/new' },
  { key: 'settings', label: 'Settings', glyph: '⚙', route: '/settings' },
];

export function BottomTabs({ current }: { current: TabKey }) {
  const router = useRouter();
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => (
        <SpringPress
          key={tab.key}
          onPress={() => {
            if (current !== tab.key) router.replace(tab.route as never);
          }}
          style={styles.tab}
        >
          <View style={styles.tabInner}>
            <Text style={[styles.tabGlyph, current === tab.key && styles.tabGlyphActive]}>
              {tab.glyph}
            </Text>
            <Text style={[styles.tabLabel, current === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </View>
        </SpringPress>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderTopColor: palette.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 14,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  tab: { alignItems: 'center', flex: 1, minHeight: 48 },
  tabInner: { alignItems: 'center', gap: 2 },
  tabGlyph: { color: palette.ink, fontSize: 20, opacity: 0.55 },
  tabGlyphActive: { color: palette.amberDeep, opacity: 1 },
  tabLabel: { color: palette.muted, fontSize: 11, fontWeight: '700' },
  tabLabelActive: { color: palette.primary },
});
