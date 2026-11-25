import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BottomTabs } from '../components/BottomTabs';
import { EmptyState, GhostButton, GlassCard, Header, SectionHeader } from '../components/ui';
import { formatMoney } from '../lib/data';
import { useApp } from '../lib/store';
import { palette, spacing, type, useResponsive } from '../lib/theme';

/**
 * History — paid bills with one-tap re-use (tap a paid bill to open it
 * and add it again as next month's bill), plus a clear-history control.
 */
export default function HistoryScreen() {
  const router = useRouter();
  const { history, applyHistory, addBill, clearHistory } = useApp();
  const r = useResponsive();

  const reuse = (entryId: string) => {
    const entry = history.find((h) => h.id === entryId);
    if (!entry) return;
    const bill = applyHistory(entry);
    if (!bill) return;
    const next = addBill({
      payee: bill.payee,
      amount: bill.amount,
      dueDate: bill.dueDate,
      category: bill.category,
      recurring: bill.recurring,
      autopay: bill.autopay,
      isSubscription: bill.isSubscription,
      lastUsedDaysAgo: bill.lastUsedDaysAgo,
    });
    router.push(`/bill/${next.id}`);
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.ground }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { maxWidth: r.contentMaxWidth, alignSelf: 'center' }]}
      >
        <Header title="History" onBack={() => router.back()} />
        <SectionHeader kicker="History" title="Paid bills" />
        {history.length === 0 ? (
          <EmptyState
            glyph="✓"
            title="Nothing paid yet"
            body="Bills you mark paid show up here, ready to be added again next month with one tap."
            actionLabel="Back to Bills"
            onAction={() => router.replace('/')}
          />
        ) : (
          history.map((entry, i) => (
            <Animated.View key={entry.id} entering={FadeInDown.delay(i * 40).springify()}>
              <GlassCard style={styles.rowCard}>
                <View style={styles.row}>
                  <View style={styles.rowMain}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {entry.title}
                    </Text>
                    <Text style={styles.rowMeta}>
                      Paid {new Date(entry.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}
                      {formatMoney(entry.amount)}
                    </Text>
                  </View>
                  <GhostButton label="Use again" onPress={() => reuse(entry.id)} />
                </View>
              </GlassCard>
            </Animated.View>
          ))
        )}
        {history.length > 0 ? (
          <View style={styles.clearWrap}>
            <GhostButton label="Clear history" onPress={clearHistory} />
          </View>
        ) : null}
      </ScrollView>
      <BottomTabs current="bills" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 24, width: '100%' },
  rowCard: { marginBottom: spacing.md, padding: spacing.md },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { ...type.bodyStrong, color: palette.ink },
  rowMeta: { ...type.caption, color: palette.muted, marginTop: 2 },
  clearWrap: { marginTop: spacing.md },
});
