import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BottomTabs } from '../components/BottomTabs';
import {
  Chip,
  DemoBadge,
  GlassCard,
  Header,
  LiveBadge,
  PrimaryButton,
  SectionHeader,
  StyledInput,
} from '../components/ui';
import { parseBill } from '../lib/ai';
import type { ParsedBill } from '../lib/billparse';
import { isoDateFromOffset } from '../lib/data';
import { useApp } from '../lib/store';
import { palette, radii, spacing, type, useResponsive } from '../lib/theme';
import { BILL_CATEGORIES, type BillCategory } from '../lib/types';

/**
 * Add bill — manual entry form (payee, amount, due date, category,
 * recurring / one-off, autopay) AND "AI reads a bill": paste bill text,
 * parse it (backend live or the on-device demo parser), review the
 * extracted fields, then save.
 */
export default function NewBillScreen() {
  const router = useRouter();
  const { addBill } = useApp();
  const r = useResponsive();
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(isoDateFromOffset(7));
  const [category, setCategory] = useState<BillCategory>('Other');
  const [recurring, setRecurring] = useState(true);
  const [autopay, setAutopay] = useState(false);
  const [pasted, setPasted] = useState('');
  const [parsed, setParsed] = useState<ParsedBill | null>(null);
  const [parseSource, setParseSource] = useState<'live' | 'demo' | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const runParse = async () => {
    if (!pasted.trim()) return setError('Paste some bill text first.');
    setParsing(true);
    setError(null);
    try {
      const result = await parseBill(pasted);
      setParsed(result.parsed);
      setParseSource(result.source);
      if (result.parsed.payee) setPayee(result.parsed.payee);
      if (result.parsed.amount !== undefined) setAmount(String(result.parsed.amount));
      if (result.parsed.dueDate) setDueDate(result.parsed.dueDate);
      setNotice(
        result.source === 'live'
          ? 'Read by the live service — check the fields below, then save.'
          : 'Read on your device (demo parser) — check the fields below, then save.',
      );
    } finally {
      setParsing(false);
    }
  };

  const save = () => {
    const value = Number(amount);
    if (!payee.trim()) return setError('Add who the bill is to.');
    if (!Number.isFinite(value) || value <= 0) return setError('Add an amount, like 89.99.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return setError('Due date needs to look like 2026-12-03 (year-month-day).');
    }
    const bill = addBill({
      payee,
      amount: Math.round(value * 100) / 100,
      dueDate,
      category,
      recurring,
      autopay,
    });
    router.replace(`/bill/${bill.id}`);
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.ground }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { maxWidth: r.contentMaxWidth, alignSelf: 'center' }]}
      >
        <Header title="Add a bill" onBack={() => router.back()} />

        <Animated.View entering={FadeInDown.springify()}>
          <SectionHeader kicker="New bill" title="What is due?" />
          <GlassCard style={styles.card}>
            <Text style={styles.fieldLabel}>Who is it to?</Text>
            <StyledInput value={payee} onChangeText={setPayee} placeholder="PSE&G Electric" autoCapitalize="words" />
            <Text style={styles.fieldLabel}>Amount ($)</Text>
            <StyledInput
              value={amount}
              onChangeText={setAmount}
              placeholder="128.40"
              keyboardType="decimal-pad"
            />
            <Text style={styles.fieldLabel}>Due date (YYYY-MM-DD)</Text>
            <StyledInput value={dueDate} onChangeText={setDueDate} placeholder="2026-12-03" />
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.chipRow}>
              {BILL_CATEGORIES.map((c) => (
                <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
              ))}
            </View>
            <Text style={styles.fieldLabel}>How often?</Text>
            <View style={styles.chipRow}>
              <Chip label="Recurring" selected={recurring} onPress={() => setRecurring(true)} />
              <Chip label="One-off" selected={!recurring} onPress={() => setRecurring(false)} />
            </View>
            <Text style={styles.fieldLabel}>Autopay</Text>
            <View style={styles.chipRow}>
              <Chip label="Autopay on" selected={autopay} onPress={() => setAutopay(true)} />
              <Chip label="Autopay off" selected={!autopay} onPress={() => setAutopay(false)} />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label="Save bill" onPress={save} />
          </GlassCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <SectionHeader kicker="Faster" title="AI reads a bill" />
          <GlassCard style={styles.card}>
            <Text style={styles.body}>
              Paste the text of a bill or statement — the payee, amount and
              due date are pulled out for you to check before saving.
              Nothing is sent anywhere unless the live service answers.
            </Text>
            <StyledInput
              value={pasted}
              onChangeText={setPasted}
              placeholder={'PSE&G Electric\nAmount due: $128.40\nDue November 28, 2026'}
              multiline
              numberOfLines={5}
              style={styles.pasteBox}
            />
            <PrimaryButton
              label="Read this bill"
              onPress={() => void runParse()}
              loading={parsing}
              disabled={!pasted.trim()}
            />
            {parsed ? (
              <View style={styles.parsed}>
                <View style={styles.parsedBadges}>
                  {parseSource === 'live' ? <LiveBadge /> : <DemoBadge />}
                  <Text style={styles.parsedConfidence}>
                    {Math.round(parsed.confidence * 100)}% of the bill found
                  </Text>
                </View>
                <Text style={styles.parsedRow}>Payee: {parsed.payee ?? 'not found'}</Text>
                <Text style={styles.parsedRow}>
                  Amount: {parsed.amount !== undefined ? `$${parsed.amount.toFixed(2)}` : 'not found'}
                </Text>
                <Text style={styles.parsedRow}>Due: {parsed.dueDate ?? 'not found'}</Text>
                <Text style={styles.parsedHint}>
                  The fields above are filled in for you — fix anything
                  wrong, then tap Save bill.
                </Text>
              </View>
            ) : null}
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          </GlassCard>
        </Animated.View>
      </ScrollView>
      <BottomTabs current="add" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 24, width: '100%' },
  card: { gap: 10, marginBottom: spacing.xl, padding: spacing.lg },
  fieldLabel: { ...type.label, color: palette.muted, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  body: { ...type.body, color: palette.body, fontSize: 16, lineHeight: 25 },
  pasteBox: { minHeight: 120, paddingTop: 14, textAlignVertical: 'top' },
  parsed: { backgroundColor: palette.primaryPale, borderRadius: radii.md, gap: 6, padding: spacing.md },
  parsedBadges: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  parsedConfidence: { ...type.caption, color: palette.muted },
  parsedRow: { ...type.bodyStrong, color: palette.ink },
  parsedHint: { ...type.caption, color: palette.muted },
  error: { ...type.bodyStrong, color: palette.error, textAlign: 'center' },
  notice: { ...type.bodyStrong, color: palette.success, textAlign: 'center' },
});
