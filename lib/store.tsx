import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  auth,
  db,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from './firebase';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from './firebase';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { firebaseConfigured } from './config';
import { seedBills, seedSubscriptions } from './data';
import { signInWithGoogle } from './google';
import type { Bill, BillCategory, HistoryEntry, Subscription } from './types';

const BILLS_KEY = 'billbeacon:bills:v1';
const SUBS_KEY = 'billbeacon:subscriptions:v1';
const HISTORY_KEY = 'billbeacon:history:v1';
const SEEDED_KEY = 'billbeacon:seeded:v1';
const HISTORY_LIMIT = 30;

export interface AuthUser {
  uid: string;
  name: string | null;
  email: string | null;
  photo: string | null;
  /** 'google.com' or 'password' — how this account signs in. */
  provider: string | null;
}

export interface AddBillInput {
  payee: string;
  amount: number;
  dueDate: string;
  category: BillCategory;
  recurring: boolean;
  autopay: boolean;
  isSubscription?: boolean;
  lastUsedDaysAgo?: number;
}

export interface AppState {
  bills: Bill[];
  subscriptions: Subscription[];
  history: HistoryEntry[];
  /** Unpaid bills soonest first. */
  sortedBills: Bill[];
  /** Demo bills/subscriptions hidden (not deleted) while off. */
  showDemoData: boolean;
  setShowDemoData: (show: boolean) => void;
  user: AuthUser | null;
  authReady: boolean;
  guest: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  setAvatarData: (dataUrl: string) => Promise<void>;
  sendPasswordReset: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  addBill: (input: AddBillInput) => Bill;
  updateBill: (id: string, patch: Partial<Bill>) => void;
  deleteBill: (id: string) => void;
  markPaid: (id: string, paid: boolean) => void;
  addSubscription: (input: {
    name: string;
    monthlyCost: number;
    lastUsedDaysAgo: number;
    category: BillCategory;
  }) => Subscription;
  deleteSubscription: (id: string) => void;
  recordHistory: (entry: Omit<HistoryEntry, 'id' | 'at'>) => void;
  applyHistory: (entry: HistoryEntry) => Bill | null;
  clearHistory: () => void;
  clearDemoData: () => void;
  billById: (id: string) => Bill | undefined;
}

const AppContext = createContext<AppState | null>(null);

function loadJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function upsertProfile(u: User): Promise<void> {
  if (!firebaseConfigured) return;
  try {
    const ref = doc(db, 'users', u.uid);
    const snap = await getDoc(ref);
    const base = {
      displayName: u.displayName ?? '',
      email: u.email ?? '',
      photoURL: u.photoURL ?? '',
      lastLoginAt: serverTimestamp(),
    };
    if (!snap.exists()) {
      await setDoc(ref, { ...base, createdAt: serverTimestamp() });
    } else {
      await setDoc(ref, base, { merge: true });
    }
  } catch {
    // Sync is best-effort; the app keeps working offline.
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showDemoData, setShowDemoDataState] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [guest, setGuest] = useState(false);
  const billsRef = useRef<Bill[]>([]);
  const subsRef = useRef<Subscription[]>([]);
  const historyRef = useRef<HistoryEntry[]>([]);
  const historyLoadedRef = useRef(false);
  const unsubsRef = useRef<(() => void)[]>([]);

  // Local data loads once at startup; first launch seeds demo bills.
  useEffect(() => {
    void (async () => {
      const [bRaw, sRaw, hRaw, seeded] = await Promise.all([
        AsyncStorage.getItem(BILLS_KEY),
        AsyncStorage.getItem(SUBS_KEY),
        AsyncStorage.getItem(HISTORY_KEY),
        AsyncStorage.getItem(SEEDED_KEY),
      ]);
      const b = loadJson<Bill[]>(bRaw);
      const s = loadJson<Subscription[]>(sRaw);
      const h = loadJson<HistoryEntry[]>(hRaw);
      if (b && b.length > 0) {
        setBills(b);
        setSubscriptions(s ?? []);
        setHistory(h ?? []);
      } else if (!seeded) {
        setBills(seedBills());
        setSubscriptions(seedSubscriptions());
        setHistory([]);
        await AsyncStorage.setItem(SEEDED_KEY, '1');
      }
      historyLoadedRef.current = true;
    })();
  }, []);

  // Local mirrors.
  useEffect(() => {
    billsRef.current = bills;
    AsyncStorage.setItem(BILLS_KEY, JSON.stringify(bills)).catch(() => undefined);
  }, [bills]);
  useEffect(() => {
    subsRef.current = subscriptions;
    AsyncStorage.setItem(SUBS_KEY, JSON.stringify(subscriptions)).catch(() => undefined);
  }, [subscriptions]);
  useEffect(() => {
    historyRef.current = history;
    if (!historyLoadedRef.current) return;
    AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history)).catch(() => undefined);
  }, [history]);

  // Auth state: profile write, cloud subscriptions.
  // Readiness waits for Firebase to finish restoring any persisted
  // session from storage — the gate must not decide "signed out" (and
  // show Welcome) before the saved session has had its chance to load.
  useEffect(() => {
    let alive = true;
    void auth.authStateReady().then(() => {
      if (alive) setAuthReady(true);
    });
    const unsub = onAuthStateChanged(auth, (u) => {
      for (const fn of unsubsRef.current) fn();
      unsubsRef.current = [];
      if (!u) {
        setUser(null);
        return;
      }
      setUser({
        uid: u.uid,
        name: u.displayName,
        email: u.email,
        photo: u.photoURL,
        provider: u.providerData[0]?.providerId ?? null,
      });
      void upsertProfile(u);
      if (!firebaseConfigured) return;

      const subscribe = <T,>(
        colName: string,
        apply: (items: T[]) => void,
        local: () => T[],
        idOf: (item: T) => string,
      ) => {
        const col = collection(db, 'users', u.uid, colName);
        unsubsRef.current.push(
          onSnapshot(
            col,
            (snap) => {
              apply(snap.docs.map((d) => d.data() as T));
            },
            () => undefined,
          ),
        );
        // One-time merge: anything saved locally before sign-in joins the account.
        void (async () => {
          try {
            const cloud = await getDocs(col);
            const cloudIds = new Set(cloud.docs.map((d) => d.id));
            for (const item of local()) {
              const id = idOf(item);
              if (!cloudIds.has(id)) {
                await setDoc(
                  doc(db, 'users', u.uid, colName, id),
                  item as unknown as Record<string, unknown>,
                );
              }
            }
          } catch {
            // Best-effort merge only.
          }
        })();
      };
      subscribe<Bill>('bills', setBills, () => billsRef.current, (e) => e.id);
      subscribe<Subscription>('subscriptions', setSubscriptions, () => subsRef.current, (e) => e.id);
      subscribe<HistoryEntry>('history', setHistory, () => historyRef.current, (h) => h.id);

      // Profile doc: a custom avatar / edited name stored there overrides
      // the auth copy.
      void (async () => {
        try {
          const snap = await getDoc(doc(db, 'users', u.uid));
          if (snap.exists()) {
            const data = snap.data();
            setUser((prev) =>
              prev && prev.uid === u.uid
                ? {
                    ...prev,
                    name: (data.displayName as string) || prev.name,
                    photo: (data.photoData as string) || prev.photo,
                  }
                : prev,
            );
          }
        } catch {
          // Keep the auth profile.
        }
      })();
    });
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const sortedBills = useMemo(
    () =>
      [...bills]
        .filter((b) => !b.paid)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [bills],
  );

  const signIn = useCallback(async () => {
    await signInWithGoogle();
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signUpWithEmail = useCallback(
    async (name: string, email: string, password: string) => {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const cleanName = name.trim();
      if (cleanName) {
        await updateProfile(cred.user, { displayName: cleanName });
        setUser({
          uid: cred.user.uid,
          name: cleanName,
          email: cred.user.email,
          photo: null,
          provider: 'password',
        });
        void upsertProfile({ ...cred.user, displayName: cleanName } as User);
      }
    },
    [],
  );

  const updateDisplayName = useCallback(async (name: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const clean = name.trim();
    await updateProfile(currentUser, { displayName: clean });
    if (firebaseConfigured) {
      await setDoc(doc(db, 'users', currentUser.uid), { displayName: clean }, { merge: true });
    }
    setUser((prev) => (prev ? { ...prev, name: clean } : prev));
  }, []);

  const setAvatarData = useCallback(async (dataUrl: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    if (firebaseConfigured) {
      await setDoc(doc(db, 'users', currentUser.uid), { photoData: dataUrl }, { merge: true });
    }
    setUser((prev) => (prev ? { ...prev, photo: dataUrl } : prev));
  }, []);

  const sendPasswordReset = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser?.email) return;
    await sendPasswordResetEmail(auth, currentUser.email);
  }, []);

  const resetPasswordForEmail = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    // Back to the welcome screen — the gate routes there as soon as the
    // user is signed out and not a guest.
    setGuest(false);
  }, []);

  const continueAsGuest = useCallback(() => {
    // Deliberately NOT persisted: guest lasts for this visit only, so the
    // next open asks for sign-in again. A signed-in user, by contrast,
    // stays signed in (Firebase Auth persistence).
    setGuest(true);
  }, []);

  const syncDoc = useCallback(
    (colName: string, id: string, data: unknown) => {
      if (!user || !firebaseConfigured) return;
      void setDoc(doc(db, 'users', user.uid, colName, id), data).catch(() => undefined);
    },
    [user],
  );

  const deleteDocCloud = useCallback(
    (colName: string, id: string) => {
      if (!user || !firebaseConfigured) return;
      void deleteDoc(doc(db, 'users', user.uid, colName, id)).catch(() => undefined);
    },
    [user],
  );

  const recordHistory = useCallback(
    (entry: Omit<HistoryEntry, 'id' | 'at'>) => {
      const full: HistoryEntry = { ...entry, id: uid('h'), at: Date.now() };
      setHistory((prev) => [full, ...prev].slice(0, HISTORY_LIMIT));
      syncDoc('history', full.id, full);
    },
    [syncDoc],
  );

  const addBill = useCallback(
    (input: AddBillInput): Bill => {
      const bill: Bill = {
        id: uid('bill'),
        payee: input.payee.trim(),
        amount: input.amount,
        dueDate: input.dueDate,
        dueDay: input.recurring ? Number(input.dueDate.slice(8, 10)) : undefined,
        category: input.category,
        recurring: input.recurring,
        autopay: input.autopay,
        paid: false,
        isSubscription: input.isSubscription ?? false,
        lastUsedDaysAgo: input.lastUsedDaysAgo,
        isDemo: false,
        createdAt: Date.now(),
      };
      setBills((prev) => [bill, ...prev]);
      syncDoc('bills', bill.id, bill);
      return bill;
    },
    [syncDoc],
  );

  const updateBill = useCallback(
    (id: string, patch: Partial<Bill>) => {
      setBills((prev) => {
        const next = prev.map((b) => (b.id === id ? { ...b, ...patch } : b));
        const updated = next.find((b) => b.id === id);
        if (updated) syncDoc('bills', id, updated);
        return next;
      });
    },
    [syncDoc],
  );

  const deleteBill = useCallback(
    (id: string) => {
      setBills((prev) => prev.filter((b) => b.id !== id));
      deleteDocCloud('bills', id);
    },
    [deleteDocCloud],
  );

  /** Mark paid / unpaid; paying records a history entry for one-tap re-use. */
  const markPaid = useCallback(
    (id: string, paid: boolean) => {
      const bill = billsRef.current.find((b) => b.id === id);
      if (!bill) return;
      updateBill(id, { paid });
      if (paid) {
        recordHistory({
          billId: bill.id,
          payee: bill.payee,
          amount: bill.amount,
          dueDate: bill.dueDate,
          title: `${bill.payee} — $${bill.amount.toFixed(2)}`,
          kind: 'paid',
        });
      }
    },
    [updateBill, recordHistory],
  );

  const addSubscription = useCallback(
    (input: {
      name: string;
      monthlyCost: number;
      lastUsedDaysAgo: number;
      category: BillCategory;
    }): Subscription => {
      const sub: Subscription = {
        id: uid('sub'),
        name: input.name.trim(),
        monthlyCost: input.monthlyCost,
        lastUsedDaysAgo: input.lastUsedDaysAgo,
        cancelCandidate: input.lastUsedDaysAgo >= 30,
        category: input.category,
        isDemo: false,
        createdAt: Date.now(),
      };
      setSubscriptions((prev) => [sub, ...prev]);
      syncDoc('subscriptions', sub.id, sub);
      return sub;
    },
    [syncDoc],
  );

  const deleteSubscription = useCallback(
    (id: string) => {
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
      deleteDocCloud('subscriptions', id);
    },
    [deleteDocCloud],
  );

  const applyHistory = useCallback((entry: HistoryEntry): Bill | null => {
    return billsRef.current.find((b) => b.id === entry.billId) ?? null;
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (user && firebaseConfigured) {
      void (async () => {
        try {
          const snap = await getDocs(collection(db, 'users', user.uid, 'history'));
          await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
        } catch {
          // The subscription will reconcile the visible list.
        }
      })();
    }
  }, [user]);

  const clearDemoData = useCallback(() => {
    setBills((prev) => prev.filter((b) => !b.isDemo));
    setSubscriptions((prev) => prev.filter((s) => !s.isDemo));
    setHistory((prev) => {
      const demoBillIds = new Set(billsRef.current.filter((b) => b.isDemo).map((b) => b.id));
      return prev.filter((h) => !demoBillIds.has(h.billId));
    });
    if (user && firebaseConfigured) {
      for (const bill of billsRef.current.filter((b) => b.isDemo)) {
        void deleteDoc(doc(db, 'users', user.uid, 'bills', bill.id)).catch(() => undefined);
      }
      for (const sub of subsRef.current.filter((s) => s.isDemo)) {
        void deleteDoc(doc(db, 'users', user.uid, 'subscriptions', sub.id)).catch(
          () => undefined,
        );
      }
    }
  }, [user]);

  const setShowDemoData = useCallback((show: boolean) => {
    setShowDemoDataState(show);
  }, []);

  const billById = useCallback(
    (id: string) => bills.find((b) => b.id === id),
    [bills],
  );

  const value = useMemo<AppState>(
    () => ({
      bills,
      subscriptions,
      history,
      sortedBills,
      showDemoData,
      setShowDemoData,
      user,
      authReady,
      guest,
      signIn,
      signInWithEmail,
      signUpWithEmail,
      updateDisplayName,
      setAvatarData,
      sendPasswordReset,
      resetPasswordForEmail,
      signOut,
      continueAsGuest,
      addBill,
      updateBill,
      deleteBill,
      markPaid,
      addSubscription,
      deleteSubscription,
      recordHistory,
      applyHistory,
      clearHistory,
      clearDemoData,
      billById,
    }),
    [
      bills,
      subscriptions,
      history,
      sortedBills,
      showDemoData,
      setShowDemoData,
      user,
      authReady,
      guest,
      signIn,
      signInWithEmail,
      signUpWithEmail,
      updateDisplayName,
      setAvatarData,
      sendPasswordReset,
      resetPasswordForEmail,
      signOut,
      continueAsGuest,
      addBill,
      updateBill,
      deleteBill,
      markPaid,
      addSubscription,
      deleteSubscription,
      recordHistory,
      applyHistory,
      clearHistory,
      clearDemoData,
      billById,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
