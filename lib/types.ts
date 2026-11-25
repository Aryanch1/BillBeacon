/** BillBeacon types — bills, subscriptions, history, profile. */

export type BillStatus = 'overdue' | 'due-today' | 'due-soon' | 'upcoming' | 'paid';

export type BillCategory =
  | 'Housing'
  | 'Utilities'
  | 'Internet'
  | 'Phone'
  | 'Water'
  | 'Streaming'
  | 'Insurance'
  | 'Other';

export const BILL_CATEGORIES: BillCategory[] = [
  'Housing',
  'Utilities',
  'Internet',
  'Phone',
  'Water',
  'Streaming',
  'Insurance',
  'Other',
];

export interface Bill {
  id: string;
  payee: string;
  amount: number;
  /** ISO date string (YYYY-MM-DD) the bill is due. */
  dueDate: string;
  /** Day of the month the bill recurs on (1–31), when recurring. */
  dueDay?: number;
  category: BillCategory;
  recurring: boolean;
  autopay: boolean;
  paid: boolean;
  isSubscription: boolean;
  /** Last time the linked subscription was used, in days ago. */
  lastUsedDaysAgo?: number;
  isDemo: boolean;
  createdAt: number;
}

export interface Subscription {
  id: string;
  name: string;
  monthlyCost: number;
  /** Days since the subscription was last used. */
  lastUsedDaysAgo: number;
  /** True when unused for 30+ days — a cancel candidate. */
  cancelCandidate: boolean;
  category: BillCategory;
  isDemo: boolean;
  createdAt: number;
}

export interface HistoryEntry {
  id: string;
  at: number;
  billId: string;
  payee: string;
  amount: number;
  dueDate: string;
  title: string;
  kind: 'paid';
}

export interface UserProfile {
  uid: string;
  name: string | null;
  email: string | null;
  photo: string | null;
  provider: string | null;
}
