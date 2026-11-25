import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BeaconDot, GhostButton, GlassCard, PrimaryButton, StyledInput } from '../components/ui';
import { firebaseConfigured } from '../lib/config';
import { useApp } from '../lib/store';
import { palette, radii, spacing, type } from '../lib/theme';

type Mode = 'main' | 'signup' | 'login';

/**
 * Welcome gate — shown on every open to a signed-out, non-guest user.
 * Exactly four options: Continue with Google; Create account; Log in
 * (with Forgot password); Continue without an account.
 *
 * No photo hero here: BillBeacon is a household tool, so the welcome
 * visual is a designed navy beacon panel — a deep ink board with a
 * pulsing amber beacon dot and the words "NEVER MISS A BILL AGAIN.",
 * in the app's beacon-board identity.
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const {
    signIn,
    signInWithEmail,
    signUpWithEmail,
    resetPasswordForEmail,
    continueAsGuest,
  } = useApp();
  const [mode, setMode] = useState<Mode>('main');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const friendly = (e: unknown): string => {
    if (!firebaseConfigured) {
      return 'Accounts are not set up for this app yet — please continue as a guest for now.';
    }
    const message = e instanceof Error ? e.message : 'Something went wrong. Try again.';
    if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password')) {
      return 'That email and password do not match. Try again or reset your password.';
    }
    if (message.includes('auth/email-already-in-use')) {
      return 'An account with this email already exists — try logging in instead.';
    }
    if (message.includes('auth/invalid-email')) return 'That email address does not look right.';
    if (message.includes('auth/weak-password')) {
      return 'Choose a password of at least 6 characters.';
    }
    return message;
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };

  const submitSignup = () => {
    if (!name.trim()) return setError('Please add your name.');
    if (password !== confirm) return setError('The two passwords do not match.');
    if (password.length < 6) return setError('Choose a password of at least 6 characters.');
    void run(() => signUpWithEmail(name, email, password));
  };

  const submitLogin = () => {
    void run(() => signInWithEmail(email, password));
  };

  const forgot = () => {
    if (!email.trim()) return setError('Type your email above first, then tap Forgot password.');
    void run(async () => {
      await resetPasswordForEmail(email);
      setNotice('Password reset email sent — check your inbox.');
    });
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify()}>
          <View style={styles.beaconPanel}>
            <BeaconDot size={22} />
            <Text style={styles.panelKicker}>BILLBEACON</Text>
            <Text style={styles.panelTitle}>Never miss a bill again.</Text>
            <Text style={styles.panelBody}>
              Every household bill and subscription on one due-date
              timeline, with a beacon that lights up before a late fee can.
            </Text>
          </View>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <GlassCard style={styles.card}>
            <Text style={styles.kicker}>BILLBEACON</Text>
            <Text style={styles.title}>Your bills, on watch.</Text>
            <Text style={styles.body}>
              Add a bill in seconds, or paste the bill text and let the app
              read the payee, amount and due date for you.
            </Text>

            {mode === 'main' ? (
              <View style={styles.actions}>
                <PrimaryButton label="Continue with Google" onPress={() => void run(signIn)} loading={busy} />
                <GhostButton label="Create account" onPress={() => setMode('signup')} />
                <GhostButton label="Log in" onPress={() => setMode('login')} />
                <GhostButton
                  label="Continue without an account"
                  onPress={() => {
                    continueAsGuest();
                    router.replace('/');
                  }}
                />
              </View>
            ) : (
              <View style={styles.actions}>
                {mode === 'signup' ? (
                  <StyledInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Your name"
                    autoCapitalize="words"
                  />
                ) : null}
                <StyledInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <StyledInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  secureTextEntry
                />
                {mode === 'signup' ? (
                  <StyledInput
                    value={confirm}
                    onChangeText={setConfirm}
                    placeholder="Confirm password"
                    secureTextEntry
                  />
                ) : null}
                {mode === 'signup' ? (
                  <PrimaryButton label="Create my account" onPress={submitSignup} loading={busy} />
                ) : (
                  <PrimaryButton label="Log in" onPress={submitLogin} loading={busy} />
                )}
                {mode === 'login' ? (
                  <GhostButton label="Forgot password?" onPress={forgot} />
                ) : null}
                <GhostButton label="← Back" onPress={() => { setMode('main'); setError(null); setNotice(null); }} />
              </View>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
            {!firebaseConfigured ? (
              <Text style={styles.hint}>
                Sign-in is being set up — guest mode works fully until then.
              </Text>
            ) : null}
          </GlassCard>
        </Animated.View>
        <Text style={styles.disclaimer}>
          BillBeacon never stores bank details — it only keeps the payee,
          amount and due date you type or paste in. Guest mode lasts for
          this visit only; sign in to keep your bills across devices.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: palette.ground, flex: 1 },
  scroll: { padding: 20, paddingBottom: 48 },
  beaconPanel: {
    backgroundColor: palette.primary,
    borderRadius: radii.card,
    gap: 10,
    marginBottom: spacing.md,
    minHeight: 220,
    padding: spacing.lg,
  },
  panelKicker: { ...type.label, color: palette.amber },
  panelTitle: { ...type.display, color: '#FFFFFF' },
  panelBody: { ...type.body, color: 'rgba(255,255,255,0.75)', fontSize: 16, lineHeight: 25 },
  card: { padding: spacing.lg },
  kicker: { ...type.label, color: palette.amberDeep, marginBottom: 6 },
  title: { ...type.display, color: palette.ink, marginBottom: 10 },
  body: { ...type.body, color: palette.body, marginBottom: spacing.lg },
  actions: { gap: 12 },
  error: { ...type.bodyStrong, color: palette.error, marginTop: spacing.md, textAlign: 'center' },
  notice: { ...type.bodyStrong, color: palette.success, marginTop: spacing.md, textAlign: 'center' },
  hint: { ...type.caption, color: palette.muted, marginTop: spacing.md, textAlign: 'center' },
  disclaimer: { ...type.caption, color: palette.muted, marginTop: spacing.lg, textAlign: 'center' },
});
