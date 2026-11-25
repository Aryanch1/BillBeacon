import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BottomTabs } from '../components/BottomTabs';
import { GlassCard, Header, SectionHeader, SpringPress } from '../components/ui';
import { formatMoney, subscriptionMonthlyTotal } from '../lib/data';
import { useApp } from '../lib/store';
import { palette, radii, spacing, type, useResponsive } from '../lib/theme';

/**
 * Subscriptions — the monthly total as one big number, per-subscription
 * cost rows, and a cancel-candidate flag for anything unused 30+ days,
 * with a plain "consider cancelling" note and what it would save.
 */
export default function SubscriptionsScreen() {
  const router = useRouter();
  const { subscriptions, showDemoData, deleteSubscription } = useApp();
  const r = useResponsive();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const visible = showDemoData ? subscriptions : subscriptions.filter((s) => !s.isDemo);
  const total = subscriptionMonthlyTotal(visible);
  const candidates = visible.filter((s) => s.cancelCandidate);
  const candidateSavings = candidates.reduce((sum, s) => sum + s.monthlyCost, 0);

  return (
    <View style={[styles.root, { backgroundColor: palette.ground }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { maxWidth: r.contentMaxWidth, alignSelf: 'center' }]}
      >
        <Header title="Subscriptions" onBack={() => router.back()} />

        <Animated.View entering={FadeInDown.springify()}>
          <View style={styles.totalPanel}>
            <Text style={styles.totalKicker}>SUBSCRIPTIONS · EVERY MONTH</Text>
            <Text style={styles.totalNumber}>{formatMoney(total)}</Text>
            <Text style={styles.totalLabel}>
              across {visible.length} subscription{visible.length === 1 ? '' : 's'} ·{' '}
              {formatMoney(total * 12)} a year
            </Text>
          </View>
        </Animated.View>

        {candidates.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(70).springify()}>
            <SectionHeader kicker="Worth a look" title="Consider cancelling" />
            <GlassCard style={styles.card}>
              <Text style={styles.body}>
                These have not been used in 30 days or more. Cancelling all
                of them would save {formatMoney(candidateSavings)} a month.
              </Text>
              {candidates.map((s) => (
                <View key={s.id} style={styles.candidateRow}>
                  <View style={styles.candidateMain}>
                    <Text style={styles.candidateName}>{s.name}</Text>
                    <Text style={styles.candidateMeta}>
                      Unused for {s.lastUsedDaysAgo} days · {formatMoney(s.monthlyCost)}/month
                    </Text>
                  </View>
                  <SpringPress
                    onPress={() => {
                      if (confirmId === s.id) {
                        deleteSubscription(s.id);
                        setConfirmId(null);
                      } else {
                        setConfirmId(s.id);
                      }
                    }}
                  >
                    <View style={styles.cancelButton}>
                      <Text style={styles.cancelButtonText}>
                        {confirmId === s.id ? 'Tap again to remove' : 'Remove'}
                      </Text>
                    </View>
                  </SpringPress>
                </View>
              ))}
            </GlassCard>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(120).springify()}>
          <SectionHeader kicker="Every subscription" title="What you pay" />
          {visible.length === 0 ? (
            <GlassCard style={styles.card}>
              <Text style={styles.body}>
                No subscriptions tracked yet. Subscriptions on your bills
                list show up here too — or add one from the detail screen
                of a bill.
              </Text>
            </GlassCard>
          ) : (
            visible.map((s, i) => (
              <Animated.View key={s.id} entering={FadeInDown.delay(140 + i * 40).springify()}>
                <GlassCard style={styles.rowCard}>
                  <View style={styles.row}>
                    <View style={styles.rowMain}>
                      <Text style={styles.rowName}>{s.name}</Text>
                      <Text style={styles.rowMeta}>
                        {s.category} · last used{' '}
                        {s.lastUsedDaysAgo === 0
                          ? 'today'
                          : `${s.lastUsedDaysAgo} day${s.lastUsedDaysAgo === 1 ? '' : 's'} ago`}
                      </Text>
                    </View>
                    <View style={styles.rowRight}>
                      <Text style={styles.rowCost}>{formatMoney(s.monthlyCost)}</Text>
                      <Text style={styles.rowPer}>/month</Text>
                    </View>
                  </View>
                  {s.cancelCandidate ? (
                    <Text style={styles.flag}>Consider cancelling — unused 30+ days</Text>
                  ) : null}
                </GlassCard>
              </Animated.View>
            ))
          )}
        </Animated.View>

        <Text style={styles.footNote}>
          BillBeacon only tracks what a subscription costs and when it was
          last used. It never stores bank details or payment methods.
        </Text>
      </ScrollView>
      <BottomTabs current="subscriptions" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 24, width: '100%' },
  totalPanel: {
    backgroundColor: palette.slate,
    borderRadius: radii.card,
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  totalKicker: { ...type.label, color: 'rgba(255,255,255,0.75)' },
  totalNumber: { color: '#FFFFFF', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 52, lineHeight: 56, marginTop: 8 },
  totalLabel: { ...type.body, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  card: { gap: 12, marginBottom: spacing.xl, padding: spacing.lg },
  body: { ...type.body, color: palette.body, fontSize: 16, lineHeight: 25 },
  candidateRow: {
    alignItems: 'center',
    borderTopColor: palette.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
  },
  candidateMain: { flex: 1, minWidth: 0 },
  candidateName: { ...type.bodyStrong, color: palette.ink },
  candidateMeta: { ...type.caption, color: palette.muted, marginTop: 2 },
  cancelButton: {
    backgroundColor: palette.dueTodaySoft,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelButtonText: { color: palette.dueToday, fontSize: 13, fontWeight: '800' },
  rowCard: { marginBottom: spacing.md, padding: spacing.md },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  rowMain: { flex: 1, minWidth: 0 },
  rowName: { ...type.bodyStrong, color: palette.ink, fontSize: 16 },
  rowMeta: { ...type.caption, color: palette.muted, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  rowCost: { color: palette.ink, fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18 },
  rowPer: { ...type.caption, color: palette.muted },
  flag: { ...type.bodyStrong, color: palette.dueSoon, fontSize: 13, marginTop: 8 },
  footNote: { ...type.caption, color: palette.muted, marginTop: spacing.md, textAlign: 'center' },
});
