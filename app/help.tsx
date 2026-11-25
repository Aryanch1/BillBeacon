import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomTabs } from '../components/BottomTabs';
import { GhostButton, GlassCard, Header, SectionHeader } from '../components/ui';
import { palette, spacing, type, useResponsive } from '../lib/theme';

/** Help & about — how the beacon board works, late fees, and the disclaimer. */
export default function HelpScreen() {
  const router = useRouter();
  const r = useResponsive();
  return (
    <View style={[styles.root, { backgroundColor: palette.ground }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { maxWidth: r.contentMaxWidth, alignSelf: 'center' }]}
      >
        <Header title="Help & about" onBack={() => router.back()} />

        <SectionHeader kicker="Help" title="How BillBeacon works" />
        <GlassCard style={styles.card}>
          <Text style={styles.body}>
            1. The board shows everything due this month as one big number,
            with the next bill up and how many days are left. The 14-day
            strip shows which days have bills due.
          </Text>
          <Text style={styles.body}>
            2. Tap any bill to see how much is due and when, mark it paid,
            edit it, or ask for a reminder note. Paid bills move to
            History, where one tap adds them again for next month.
          </Text>
          <Text style={styles.body}>
            3. Tap Add to enter a bill by hand — or paste the bill text and
            let the app read the payee, amount and due date for you. Check
            the fields before you save.
          </Text>
          <Text style={styles.body}>
            4. Subscriptions shows what every subscription costs each month,
            and flags the ones you have not used in 30 days or more so you
            can consider cancelling them.
          </Text>
        </GlassCard>

        <SectionHeader kicker="FAQ" title="Questions, answered" />
        <GlassCard style={styles.card}>
          <Text style={styles.body}>
            Why is a bill red? Red means due today or overdue. Amber means
            due within 3 days. Slate blue means it is further out, and green
            means paid.
          </Text>
          <Text style={styles.body}>
            What counts as a late fee? Every biller sets its own fee and
            grace period — BillBeacon shows the due date so you can pay
            before it, but it cannot know the exact fee a biller charges.
          </Text>
          <Text style={styles.body}>
            Does the app move money? No. BillBeacon never stores bank
            details, card numbers or login details for your bills. It only
            tracks the payee, amount and due date you enter.
          </Text>
          <Text style={styles.body}>
            Is the bill reader always right? No — the demo parser reads
            with simple patterns, and even the live service can misread a
            messy statement. Always check the payee, amount and due date
            before saving.
          </Text>
          <Text style={styles.body}>
            Where do my bills live? On this device, and in your account when
            you sign in. Guest mode lasts for this visit only.
          </Text>
        </GlassCard>

        <SectionHeader kicker="Late fees" title="The enemy, in plain words" />
        <GlassCard style={styles.card}>
          <Text style={styles.body}>
            A missed due date usually means a late fee, and sometimes a mark
            on your credit. The beacon turns amber three days out and red on
            the day — pay before red and the fee never gets a chance.
          </Text>
        </GlassCard>

        <SectionHeader kicker="About" title="BillBeacon" />
        <GlassCard style={styles.card}>
          <Text style={styles.body}>
            A household bill tracker by Aryanmouli Cherupalli — never miss a
            bill again. Built with React Native + Expo + TypeScript, a Java
            Spring Boot service, Gemini AI and Firebase.
          </Text>
          <Text style={styles.body}>
            BillBeacon is a reminder tool, not financial advice. Due dates
            and amounts are only as good as what was entered — when in
            doubt, check the bill itself.
          </Text>
        </GlassCard>

        <GhostButton label="Back to the board" onPress={() => router.replace('/')} />
      </ScrollView>
      <BottomTabs current="bills" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 24, width: '100%' },
  card: { gap: 12, marginBottom: spacing.xl, padding: spacing.lg },
  body: { ...type.body, color: palette.body, fontSize: 16, lineHeight: 25 },
});
