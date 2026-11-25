import Constants from 'expo-constants';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { BottomTabs } from '../components/BottomTabs';
import { GhostButton, GlassCard, Header, PrimaryButton, SectionHeader, StyledInput } from '../components/ui';
import { appVersion, firebaseConfigured } from '../lib/config';
import { firebaseStatusMessage } from '../lib/firebase';
import { useApp } from '../lib/store';
import { palette, spacing, type, useResponsive } from '../lib/theme';

/** Settings & profile — name, photo, sign-in method, demo data, history. */
export default function SettingsScreen() {
  const router = useRouter();
  const {
    user,
    guest,
    bills,
    subscriptions,
    history,
    showDemoData,
    setShowDemoData,
    updateDisplayName,
    setAvatarData,
    sendPasswordReset,
    signOut,
    clearHistory,
    clearDemoData,
  } = useApp();
  const r = useResponsive();
  const [name, setName] = useState(user?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmClearDemo, setConfirmClearDemo] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

  // The version label reads the single version source (app.json) —
  // never a hand-typed string.
  const version = Constants.expoConfig?.version ?? appVersion;
  const hasDemo = bills.some((b) => b.isDemo) || subscriptions.some((s) => s.isDemo);

  const pickPhoto = async () => {
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled || !result.assets[0]) return;
      // Client-side resize before storing — no Firebase Storage needed.
      const resized = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 256 } }],
        { base64: true, format: ImageManipulator.SaveFormat.JPEG },
      );
      if (resized.base64) {
        await setAvatarData(`data:image/jpeg;base64,${resized.base64}`);
        setNotice('Profile picture updated.');
      }
    } catch {
      setError('Could not update the picture. Try again.');
    }
  };

  const saveName = async () => {
    if (!name.trim()) return setError('Please type a name first.');
    setBusy(true);
    setError(null);
    try {
      await updateDisplayName(name);
      setNotice('Name updated.');
    } catch {
      setError('Could not save the name. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    setBusy(true);
    setError(null);
    try {
      await sendPasswordReset();
      setNotice('Password reset email sent — check your inbox.');
    } catch {
      setError('Could not send the reset email. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.ground }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { maxWidth: r.contentMaxWidth, alignSelf: 'center' }]}
      >
        <Header title="Settings" onBack={() => router.back()} />

        <SectionHeader kicker="Settings" title="Profile & account" />
        {user ? (
          <GlassCard style={styles.card}>
            <View style={styles.profileRow}>
              {user.photo ? (
                <Image source={{ uri: user.photo }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>
                    {(user.name ?? user.email ?? '?').slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.profileText}>
                <Text style={styles.profileName}>{user.name ?? 'Your profile'}</Text>
                <Text style={styles.profileEmail}>{user.email ?? ''}</Text>
                <Text style={styles.profileProvider}>
                  Signed in with {user.provider === 'google.com' ? 'Google' : 'email & password'}
                </Text>
              </View>
            </View>
            <GhostButton label="Change picture" onPress={() => void pickPhoto()} />
            <StyledInput
              value={name}
              onChangeText={setName}
              placeholder="Display name"
              autoCapitalize="words"
            />
            <PrimaryButton label="Save name" onPress={() => void saveName()} loading={busy} />
            {user.provider === 'password' ? (
              <GhostButton label="Send password-reset email" onPress={() => void resetPassword()} />
            ) : null}
            <GhostButton
              label="Sign out"
              onPress={() =>
                void signOut().then(() => router.replace('/welcome'))
              }
            />
          </GlassCard>
        ) : (
          <GlassCard style={styles.card}>
            <Text style={styles.guestTitle}>
              {guest ? 'You are browsing as a guest' : 'You are signed out'}
            </Text>
            <Text style={styles.guestBody}>
              Sign in to keep your bills and history in sync across
              devices. Guest mode lasts for this visit only.
            </Text>
            <PrimaryButton label="Go to sign-in" onPress={() => router.push('/welcome')} />
          </GlassCard>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <SectionHeader kicker="Demo data" title="Sample bills" />
        <GlassCard style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text style={styles.toggleTitle}>Show demo data</Text>
              <Text style={styles.toggleBody}>
                Sample household bills and subscriptions, so the board is
                never empty on first open.
              </Text>
            </View>
            <Switch value={showDemoData} onValueChange={setShowDemoData} />
          </View>
          {hasDemo ? (
            <GhostButton
              label={confirmClearDemo ? 'Tap again to clear demo data' : 'Clear demo data'}
              onPress={() => {
                if (confirmClearDemo) {
                  clearDemoData();
                  setConfirmClearDemo(false);
                  setNotice('Demo data cleared.');
                } else {
                  setConfirmClearDemo(true);
                }
              }}
            />
          ) : null}
        </GlassCard>

        <SectionHeader kicker="History" title="Paid bills" />
        <GlassCard style={styles.card}>
          <Text style={styles.dataBody}>
            {history.length === 0
              ? 'No history yet — bills you mark paid show up here for one-tap re-use.'
              : `${history.length} paid bill${history.length === 1 ? '' : 's'} saved.`}
          </Text>
          <GhostButton label="See history" onPress={() => router.push('/history')} />
          {history.length > 0 ? (
            <GhostButton
              label={confirmClearHistory ? 'Tap again to clear history' : 'Clear history'}
              onPress={() => {
                if (confirmClearHistory) {
                  clearHistory();
                  setConfirmClearHistory(false);
                  setNotice('History cleared.');
                } else {
                  setConfirmClearHistory(true);
                }
              }}
            />
          ) : null}
        </GlassCard>

        <SectionHeader kicker="Status" title="Services" />
        <GlassCard style={styles.card}>
          <Text style={styles.statusRow}>
            Bill reading: live service when the Java backend is deployed — on-device demo parser until then.
          </Text>
          <Text style={styles.statusRow}>
            Accounts & sync: {firebaseConfigured ? 'Firebase connected' : firebaseStatusMessage()}
          </Text>
          <Text style={styles.statusRow}>
            Bills: {bills.length} saved · Subscriptions: {subscriptions.length} tracked
          </Text>
          <Text style={styles.statusRow}>BillBeacon version {version}</Text>
        </GlassCard>

        <SectionHeader kicker="Your data" title="Privacy" />
        <GlassCard style={styles.card}>
          <Text style={styles.dataBody}>
            Bills and history live on this device, and in your account when
            signed in. Nothing is shared with anyone else. BillBeacon never
            stores bank details — only the payee, amount and due date you
            enter.
          </Text>
        </GlassCard>

        <GhostButton label="Help & about" onPress={() => router.push('/help')} />
      </ScrollView>
      <BottomTabs current="settings" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 24, width: '100%' },
  card: { gap: 12, marginBottom: spacing.xl, padding: spacing.md },
  profileRow: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  avatar: { borderRadius: 40, height: 80, width: 80 },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: palette.amberSoft,
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  avatarFallbackText: { color: palette.amberDeep, fontSize: 32, fontWeight: '800' },
  profileText: { flex: 1 },
  profileName: { ...type.subtitle, color: palette.ink },
  profileEmail: { ...type.body, color: palette.body },
  profileProvider: { ...type.caption, color: palette.muted, marginTop: 2 },
  guestTitle: { ...type.subtitle, color: palette.ink },
  guestBody: { ...type.body, color: palette.body },
  error: { ...type.bodyStrong, color: palette.error, marginBottom: spacing.md, textAlign: 'center' },
  notice: { ...type.bodyStrong, color: palette.success, marginBottom: spacing.md, textAlign: 'center' },
  toggleRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  toggleText: { flex: 1 },
  toggleTitle: { ...type.bodyStrong, color: palette.ink },
  toggleBody: { ...type.body, color: palette.body, marginTop: 2 },
  statusRow: { ...type.body, color: palette.body },
  dataBody: { ...type.body, color: palette.body },
});
