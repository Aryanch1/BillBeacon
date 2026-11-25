import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BottomTabs } from '../../components/BottomTabs';
import {
  Chip,
  DemoBadge,
  EmptyState,
  GhostButton,
  GlassCard,
  Header,
  LiveBadge,
  PrimaryButton,
  StatusDot,
  StatusPill,
  StyledInput,
} from '../../components/ui';
import { remindForBill } from '../../lib/ai';
import { daysUntil, formatDueDate, formatMoney, statusLabel } from '../../lib/data';
import { useApp } from '../../lib/store';
import { palette, radii, spacing, statusColors, type, useResponsive } from '../../lib/theme';
import { BILL_CATEGORIES, type BillCategory } from '../../lib/types';

/**
 * Bill detail — full-screen takeover with a big colored verdict banner
 * (amount due, days left), mark-paid toggle, edit, delete, and an AI
 * reminder note (live service, demo text otherwise).
 */
export default function BillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { billById, markPaid, updateBill, deleteBill } = useApp();
  const r = useResponsive();
  const bill = billById(id ?? '');
  const [editing, setEditing] = useState(false);
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState<BillCategory>('Other');
  const [note, setNote] = useState<string | null>(null);
  const [noteSource, setNoteSource] = useState<'live' | 'demo' | null>(null);
  const [noteBusy, setNoteBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!bill) {
    return (
      <View style={[styles.root, { backgroundColor: palette.ground }]}>
        <View style={[styles.scroll, { maxWidth: r.contentMaxWidth, alignSelf: 'center' }]}>
          <Header title="Bill" onBack={() => router.back()} />
          <EmptyState
            glyph="◉"
            title="Bill not found"
            body="This bill may have been deleted."
            actionLabel="Back to Bills"
            onAction={() => router.replace('/')}
          />
        </View>
        <BottomTabs current="bills" />
      </View>
    );
  }

  const status = bill.paid ? 'paid' : daysUntil(bill.dueDate) < 0 ? 'overdue' : daysUntil(bill.dueDate) === 0 ? 'due-today' : daysUntil(bill.dueDate) <= 3 ? 'due-soon' : 'upcoming';
  const banner = statusColors[status];

  const startEdit = () => {
    setPayee(bill.payee);
    setAmount(String(bill.amount));
    setDueDate(bill.dueDate);
    setCategory(bill.category);
    setEditing(true);
  };

  const saveEdit = () => {
    const value = Number(amount);
    if (!payee.trim()) return setError('Add who the bill is to.');
    if (!Number.isFinite(value) || value <= 0) return setError('Add an amount, like 89.99.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return setError('Due date needs to look like 2026-12-03 (year-month-day).');
    }
    updateBill(bill.id, {
      payee: payee.trim(),
      amount: Math.round(value * 100) / 100,
      dueDate,
      category,
    });
    setEditing(false);
    setError(null);
  };

  const getReminder = async () => {
    setNoteBusy(true);
    try {
      const result = await remindForBill(bill);
      setNote(result.note);
      setNoteSource(result.source);
    } finally {
      setNoteBusy(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.ground }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { maxWidth: r.contentMaxWidth, alignSelf: 'center' }]}
      >
        <Header title="Bill" onBack={() => router.back()} />
        <Animated.View entering={FadeInDown.springify()}>
          <View style={[styles.banner, { backgroundColor: banner.fg }]}>
            <View style={styles.bannerRow}>
              <StatusDot status={status} size={12} />
              <Text style={styles.bannerStatus}>{statusLabel(bill).toUpperCase()}</Text>
              <View style={styles.bannerSpacer} />
              <StatusPill status={status} label={statusLabel(bill)} />
            </View>
            <Text style={styles.bannerAmount}>{formatMoney(bill.amount)}</Text>
            <Text style={styles.bannerPayee}>{bill.payee}</Text>
            <Text style={styles.bannerDue}>
              Due {formatDueDate(bill.dueDate)}
              {bill.autopay ? ' · Autopay on' : ' · Autopay off'}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(70).springify()}>
          <GlassCard style={styles.card}>
            <Text style={styles.rowLine}>Category — {bill.category}</Text>
            <Text style={styles.rowLine}>
              {bill.recurring ? `Recurring, day ${bill.dueDay ?? ''} of the month` : 'One-off bill'}
            </Text>
            <Text style={styles.rowLine}>
              {bill.isSubscription ? 'Linked subscription' : 'Not a subscription'}
            </Text>
            {bill.isDemo ? (
              <View style={styles.demoRow}>
                <DemoBadge />
                <Text style={styles.demoText}>Demo bill — clear it in Settings.</Text>
              </View>
            ) : null}
            <PrimaryButton
              label={bill.paid ? 'Mark unpaid' : 'Mark paid'}
              onPress={() => markPaid(bill.id, !bill.paid)}
            />
            <GhostButton label={editing ? 'Cancel editing' : 'Edit this bill'} onPress={() => (editing ? setEditing(false) : startEdit())} />
          </GlassCard>
        </Animated.View>

        {editing ? (
          <Animated.View entering={FadeInDown.springify()}>
            <GlassCard style={styles.card}>
              <Text style={styles.fieldLabel}>Who is it to?</Text>
              <StyledInput value={payee} onChangeText={setPayee} autoCapitalize="words" />
              <Text style={styles.fieldLabel}>Amount ($)</Text>
              <StyledInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
              <Text style={styles.fieldLabel}>Due date (YYYY-MM-DD)</Text>
              <StyledInput value={dueDate} onChangeText={setDueDate} />
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.chipRow}>
                {BILL_CATEGORIES.map((c) => (
                  <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
                ))}
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <PrimaryButton label="Save changes" onPress={saveEdit} />
            </GlassCard>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(120).springify()}>
          <GlassCard style={styles.card}>
            <Text style={styles.cardTitle}>Reminder note</Text>
            <Text style={styles.body}>
              A short note to nudge yourself before the due date — written
              by the live service when it answers, or by the on-device
              demo writer otherwise.
            </Text>
            {note ? (
              <View style={styles.noteBox}>
                <View style={styles.parsedBadges}>
                  {noteSource === 'live' ? <LiveBadge /> : <DemoBadge />}
                </View>
                <Text style={styles.noteText}>{note}</Text>
              </View>
            ) : null}
            <GhostButton
              label={noteBusy ? 'Writing…' : 'Write my reminder'}
              onPress={() => void getReminder()}
              disabled={noteBusy}
            />
          </GlassCard>
        </Animated.View>

        <GhostButton
          label={confirmDelete ? 'Tap again to delete this bill' : 'Delete this bill'}
          onPress={() => {
            if (confirmDelete) {
              deleteBill(bill.id);
              router.replace('/');
            } else {
              setConfirmDelete(true);
            }
          }}
        />
      </ScrollView>
      <BottomTabs current="bills" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 24, width: '100%' },
  banner: {
    borderRadius: radii.card,
    gap: 8,
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  bannerRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  bannerStatus: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  bannerSpacer: { flex: 1 },
  bannerAmount: { color: '#FFFFFF', fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 48, lineHeight: 52 },
  bannerPayee: { ...type.title, color: '#FFFFFF' },
  bannerDue: { ...type.bodyStrong, color: 'rgba(255,255,255,0.85)' },
  card: { gap: 12, marginBottom: spacing.xl, padding: spacing.lg },
  cardTitle: { ...type.subtitle, color: palette.ink },
  rowLine: { ...type.body, color: palette.body, fontSize: 16, lineHeight: 25 },
  demoRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  demoText: { ...type.caption, color: palette.muted },
  body: { ...type.body, color: palette.body, fontSize: 16, lineHeight: 25 },
  fieldLabel: { ...type.label, color: palette.muted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  noteBox: { backgroundColor: palette.primaryPale, borderRadius: radii.md, gap: 8, padding: spacing.md },
  parsedBadges: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  noteText: { ...type.body, color: palette.ink, fontSize: 16, lineHeight: 25 },
  error: { ...type.bodyStrong, color: palette.error, textAlign: 'center' },
});
