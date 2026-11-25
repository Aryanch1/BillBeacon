import Constants from 'expo-constants';

/**
 * BillBeacon runtime config.
 *
 * The bill parser / reminder writer is a Java Spring Boot service
 * (backend/): POST /api/parse and /api/remind. On native,
 * EXPO_PUBLIC_API_URL is the deployed backend origin; on web the app
 * calls the same-origin /api path. When no endpoint answers, the app
 * falls back to its on-device demo parser (lib/billparse.ts) and says
 * so honestly — bills are always saved and visible either way.
 *
 * No Gemini key ever lives in this file or in app code; the key is
 * server-side only in the Java backend (GEMINI_API_KEY env var).
 * BillBeacon never stores bank details — it only tracks payee, amount
 * and due date, which the user types or pastes in.
 */

/** Deployed backend origin for native, or '' to use same-origin /api on web. */
export const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/$/, '');

/**
 * Set to true once the Firebase project for BillBeacon exists and the
 * values in lib/firebase.ts / lib/firebase.native.ts are the real web
 * config. No project exists yet (2026-11-25) — TODO-BILLBEACON
 * placeholders in both files; wiring is a publish step. The account
 * already has 11 Firebase projects, the account limit, so no new
 * project could be created. Until then the app runs in local/guest mode.
 */
export const firebaseConfigured = false;

/** 'live' when the backend answers, 'demo' while the on-device parser is used. */
export const geminiMode: 'live' | 'demo' = 'demo';

/** App name and version — read from app.json, the single version source. */
export const appName: string = Constants.expoConfig?.name ?? 'BillBeacon';
export const appVersion: string = Constants.expoConfig?.version ?? '1.0.0';
