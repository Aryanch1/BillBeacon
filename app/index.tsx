import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BeaconRefreshButton, PullToRefresh } from '../components/BeaconRefresh';
import { BottomTabs } from '../components/BottomTabs';
import {
  BeaconDot,
  Chip,
  DemoBadge,
  EmptyState,
  GlassCard,
  SpringPress,
  StatusDot,
  StatusPill,
} from '../components/ui';
import { billsByStatus, billStatus, daysUntil, formatDueDate, formatMoney, monthTotalDue, nextBill, statusLabel } from '../lib/data';
import { useApp } from '../lib/store';
import { palette, radii, spacing, type, useResponsive } from '../lib/theme';
import type { Bill } from '../lib/types';

type Filter = 'all' | 'due-soon' | 'overdue' | 'paid';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'due-soon', label: 'Due soon' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'paid', label: 'Paid' },
];

/**
 * Home — the beacon board. A dark navy beacon header with the big
 * "due this month" figure and a next-bill countdown under a pulsing
 * amber beacon, a 14-day due-date strip, filter chips, then a vertical
 * timeline of bills grouped by due date with status dots. On ≥840dp
 * the screen splits: timeline left, selected bill on the right. No
 * photo hero, no ledger, no grid home, no ring, no poster type.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { bills, showDemoData } = useApp();
  const r = useResponsive();
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const visibleBills = useMemo(
    () => (showDemoData ? bills : bills.filter((b) => !b.isDemo)),
    [bills, showDemoData],
  );
  const hasDemo = bills.some((b) => b.isDemo);
  const total = monthTotalDue(visibleBills);
  const next = nextBill(visibleBills);
  const groups = billsByStatus(visibleBills);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // The board is local; refresh re-reads state and replays the beacon sweep.
    setTimeout(() => setRefreshing(false), 900);
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') {
      return [...visibleBills].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }
    if (filter === 'due-soon') {
      return visibleBills
        .filter((b) => {
          const s = billStatus(b);
          return s === 'due-soon' || s === 'due-today';
        })
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }
    if (filter === 'overdue') return groups.overdue;
    return visibleBills.filter((b) => b.paid).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [filter, visibleBills, groups]);

  // 14-day strip: today + the next 13 days, with a dot per due bill.
  const strip = useMemo(() => {
    const days: { iso: string; label: string; dow: string; count: number; urgent: boolean }[] = [];
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const due = visibleBills.filter((b) => b.dueDate === iso && !b.paid);
      days.push({
        iso,
        label: String(d.getDate()),
        dow: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        count: due.length,
        urgent: due.some((b) => billStatus(b) === 'overdue' || billStatus(b) === 'due-today'),
      });
    }
    return days;
  }, [visibleBills]);

  const selected =
    visibleBills.find((b) => b.id === selectedId) ?? next ?? visibleBills[0] ?? null;

  const openBill = (id: string) => {
    setSelectedId(id);
    if (!r.twoPane) router.push(`/bill/${id}`);
  };

  const header = (
    <Animated.View entering={FadeInDown.springify()}>
      <View style={styles.beaconHeader}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleRow}>
            <BeaconDot size={16} />
            <Text style={styles.headerKicker}>BILLBEACON · THIS MONTH</Text>
          </View>
          {Platform.OS === 'web' ? (
            <SpringPress onPress={onRefresh} haptic>
              <View style={styles.refreshWrap}>
                <BeaconRefreshButton refreshing={refreshing} />
              </View>
            </SpringPress>
          ) : null}
        </View>
        <Text style={styles.headerTotal}>{formatMoney(total)}</Text>
        <Text style={styles.headerTotalLabel}>due this month</Text>
        {next ? (
          <Text style={styles.headerNext}>
            Next up: {next.payee} — {formatMoney(next.amount)} ·{' '}
            {daysUntil(next.dueDate) === 0
              ? 'due today'
              : daysUntil(next.dueDate) < 0
                ? `${-daysUntil(next.dueDate)} days overdue`
                : `in ${daysUntil(next.dueDate)} days`}
          </Text>
        ) : (
          <Text style={styles.headerNext}>Everything is paid — nothing due.</Text>
        )}
        <View style={styles.headerCounts}>
          <Text style={styles.headerCount}>
            {groups.overdue.length} overdue · {groups['due-today'].length} due today ·{' '}
            {groups['due-soon'].length} due soon
          </Text>
          {hasDemo && showDemoData ? <DemoBadge /> : null}
        </View>
      </View>
    </Animated.View>
  );

  const stripView = (
    <Animated.View entering={FadeInDown.delay(70).springify()}>
      <Text style={styles.sectionTitle}>Next 14 days</Text>
      <View style={styles.strip}>
        {strip.map((d) => (
          <View key={d.iso} style={styles.stripDay}>
            <Text style={[styles.stripDow, d.urgent && styles.stripDowUrgent]}>{d.dow}</Text>
            <View
              style={[
                styles.stripDate,
                d.count > 0 && styles.stripDateDue,
                d.urgent && styles.stripDateUrgent,
              ]}
            >
              <Text style={[styles.stripDateText, d.count > 0 && styles.stripDateTextDue]}>
                {d.label}
              </Text>
            </View>
            <View style={styles.stripDots}>
              {Array.from({ length: Math.min(d.count, 3) }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.stripDot, d.urgent && styles.stripDotUrgent]}
                />
              ))}
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );

  const timeline = (
    <View>
      <View style={styles.chipRow}>
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            label={f.label}
            selected={filter === f.key}
            onPress={() => setFilter(f.key)}
          />
        ))}
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          glyph="◉"
          title={filter === 'paid' ? 'Nothing paid yet' : 'No bills here'}
          body={
            filter === 'paid'
              ? 'Mark a bill paid and it will show up here, with its history ready to re-use.'
              : 'Add your first bill and the beacon will keep watch over its due date.'
          }
          actionLabel="Add a bill"
          onAction={() => router.push('/new')}
        />
      ) : (
        <TimelineList bills={filtered} onOpen={openBill} />
      )}

      {hasDemo && showDemoData ? (
        <Text style={styles.demoNote}>
          Demo bills — sample household bills so you can see how the
          timeline works. Clear them any time in Settings.
        </Text>
      ) : null}
    </View>
  );

  // Two-pane (≥840dp): timeline left, selected bill right.
  if (r.twoPane) {
    return (
      <View style={[styles.root, { backgroundColor: palette.ground }]}>
        <View style={[styles.twoPane, { maxWidth: r.contentMaxWidth, alignSelf: 'center' }]}>
          <View style={styles.paneLeft}>
            <PullToRefresh refreshing={refreshing} onRefresh={onRefresh}>
              <View style={[styles.scrollPad, { paddingHorizontal: r.pad }]}>
                {header}
                {stripView}
                {timeline}
              </View>
            </PullToRefresh>
          </View>
          <View style={styles.paneRight}>
            {selected ? (
              <BillDetailCard bill={selected} />
            ) : (
              <EmptyState glyph="◉" title="Pick a bill" body="Tap any bill on the timeline to see it here." />
            )}
          </View>
        </View>
        <BottomTabs current="bills" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: palette.ground }]}>
      <PullToRefresh refreshing={refreshing} onRefresh={onRefresh}>
        <View style={[styles.scrollPad, { paddingHorizontal: r.pad }]}>
          {header}
          {stripView}
          {timeline}
        </View>
      </PullToRefresh>
      <BottomTabs current="bills" />
    </View>
  );
}

function TimelineList({
  bills,
  onOpen,
}: {
  bills: Bill[];
  onOpen: (id: string) => void;
}) {
  // Group by due date, soonest first.
  const grouped = useMemo(() => {
    const map = new Map<string, Bill[]>();
    for (const bill of bills) {
      const list = map.get(bill.dueDate) ?? [];
      list.push(bill);
      map.set(bill.dueDate, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [bills]);
  return (
    <View>
      {grouped.map(([date, dayBills], gi) => (
        <View key={date}>
          <Text style={styles.groupLabel}>{formatDueDate(date)}</Text>
          {dayBills.map((bill, i) => (
            <BillRow key={bill.id} bill={bill} index={gi * 3 + i} onOpen={onOpen} />
          ))}
        </View>
      ))}
    </View>
  );
}

function BillRow({
  bill,
  index,
  onOpen,
}: {
  bill: Bill;
  index: number;
  onOpen: (id: string) => void;
}) {
  const status = billStatus(bill);
  return (
    <Animated.View entering={FadeInDown.delay(40 + index * 40).springify()}>
      <Pressable onPress={() => onOpen(bill.id)}>
        <GlassCard style={styles.rowCard}>
          <View style={styles.row}>
            <StatusDot status={status} size={12} />
            <View style={styles.rowMain}>
              <Text style={[styles.rowPayee, bill.paid && styles.rowPayeePaid]} numberOfLines={1}>
                {bill.payee}
              </Text>
              <Text style={styles.rowMeta}>
                {bill.category}
                {bill.recurring ? ' · Recurring' : ' · One-off'}
                {bill.autopay ? ' · Autopay' : ''}
              </Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowAmount, bill.paid && styles.rowPayeePaid]}>
                {formatMoney(bill.amount)}
              </Text>
              <StatusPill status={status} label={statusLabel(bill)} />
            </View>
          </View>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

function BillDetailCard({ bill }: { bill: Bill }) {
  const router = useRouter();
  const { markPaid } = useApp();
  const status = billStatus(bill);
  return (
    <GlassCard style={styles.detailCard}>
      <View style={styles.detailTop}>
        <StatusDot status={status} size={14} />
        <Text style={styles.detailCategory}>{bill.category.toUpperCase()}</Text>
      </View>
      <Text style={styles.detailPayee}>{bill.payee}</Text>
      <Text style={styles.detailAmount}>{formatMoney(bill.amount)}</Text>
      <Text style={styles.detailDue}>
        Due {formatDueDate(bill.dueDate)} · {statusLabel(bill)}
      </Text>
      <Text style={styles.detailMeta}>
        {bill.recurring ? 'Recurring' : 'One-off'}
        {bill.autopay ? ' · Autopay on' : ' · Autopay off'}
        {bill.isSubscription ? ' · Subscription' : ''}
      </Text>
      <SpringPress
        onPress={() => markPaid(bill.id, !bill.paid)}
        haptic
      >
        <View style={[styles.detailCta, bill.paid && styles.detailCtaPaid]}>
          <Text style={styles.detailCtaText}>
            {bill.paid ? 'Mark unpaid' : 'Mark paid'}
          </Text>
        </View>
      </SpringPress>
      <SpringPress onPress={() => router.push(`/bill/${bill.id}`)} haptic>
        <View style={styles.detailLinkWrap}>
          <Text style={styles.detailLink}>Open the bill →</Text>
        </View>
      </SpringPress>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollPad: { paddingBottom: 24, paddingTop: 20, width: '100%' },
  beaconHeader: {
    backgroundColor: palette.primary,
    borderRadius: radii.card,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    ...{ shadowColor: '#101828', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 8 },
  },
  headerTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  headerTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  headerKicker: { ...type.label, color: palette.amber },
  refreshWrap: { alignItems: 'center', justifyContent: 'center', padding: 4 },
  headerTotal: { color: '#FFFFFF', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 52, lineHeight: 56, marginTop: 12 },
  headerTotalLabel: { ...type.body, color: 'rgba(255,255,255,0.7)' },
  headerNext: { ...type.bodyStrong, color: '#FFFFFF', marginTop: 12 },
  headerCounts: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 12 },
  headerCount: { ...type.caption, color: 'rgba(255,255,255,0.7)' },
  sectionTitle: { ...type.title, color: palette.ink, marginBottom: spacing.md },
  strip: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
  stripDay: { alignItems: 'center', flex: 1, gap: 4 },
  stripDow: { ...type.caption, color: palette.muted, fontSize: 10 },
  stripDowUrgent: { color: palette.dueToday },
  stripDate: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  stripDateDue: { backgroundColor: palette.amberSoft },
  stripDateUrgent: { backgroundColor: palette.dueTodaySoft },
  stripDateText: { color: palette.body, fontSize: 15, fontWeight: '700' },
  stripDateTextDue: { color: palette.ink },
  stripDots: { flexDirection: 'row', gap: 2, height: 6 },
  stripDot: { backgroundColor: palette.amber, borderRadius: 3, height: 6, width: 6 },
  stripDotUrgent: { backgroundColor: palette.dueToday },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  groupLabel: { ...type.label, color: palette.muted, marginBottom: 8, marginTop: 12 },
  rowCard: { marginBottom: spacing.md, padding: spacing.md },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  rowMain: { flex: 1, minWidth: 0 },
  rowPayee: { ...type.bodyStrong, color: palette.ink, fontSize: 16 },
  rowPayeePaid: { color: palette.muted, textDecorationLine: 'line-through' },
  rowMeta: { ...type.caption, color: palette.muted, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  rowAmount: { color: palette.ink, fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18 },
  demoNote: { ...type.caption, color: palette.muted, marginTop: spacing.md, textAlign: 'center' },
  twoPane: { flex: 1, flexDirection: 'row', width: '100%' },
  paneLeft: { flex: 1.15, minWidth: 0 },
  paneRight: { flex: 1, minWidth: 0, padding: 20 },
  detailCard: { gap: 10, padding: spacing.lg },
  detailTop: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  detailCategory: { ...type.label, color: palette.muted },
  detailPayee: { ...type.title, color: palette.ink },
  detailAmount: { color: palette.ink, fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 36, lineHeight: 40 },
  detailDue: { ...type.bodyStrong, color: palette.body },
  detailMeta: { ...type.caption, color: palette.muted },
  detailCta: {
    alignItems: 'center',
    backgroundColor: palette.amber,
    borderRadius: radii.pill,
    justifyContent: 'center',
    minHeight: 52,
  },
  detailCtaPaid: { backgroundColor: palette.leafSoft },
  detailCtaText: { color: palette.ink, fontSize: 16, fontWeight: '800' },
  detailLinkWrap: { alignItems: 'center', paddingVertical: 6 },
  detailLink: { ...type.bodyStrong, color: palette.slate },
});
