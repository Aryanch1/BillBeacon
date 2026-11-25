import type { Bill, BillCategory, BillStatus, Subscription } from './types';

/** Shift today by `days` and return an ISO date (YYYY-MM-DD). */
export function isoDateFromOffset(days: number, now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayOfMonth(iso: string): number {
  return Number(iso.slice(8, 10));
}

/**
 * Seeded DEMO bills — dates are computed relative to today, so the demo
 * always makes sense: one overdue (5 days ago), one due today, the rest
 * spread over the next 14 days. Clearable from Settings.
 */
export function seedBills(now: Date = new Date()): Bill[] {
  const created = now.getTime();
  const mk = (
    id: string,
    payee: string,
    amount: number,
    offset: number,
    category: BillCategory,
    recurring: boolean,
    autopay: boolean,
    isSubscription = false,
    lastUsedDaysAgo?: number,
  ): Bill => {
    const dueDate = isoDateFromOffset(offset, now);
    return {
      id,
      payee,
      amount,
      dueDate,
      dueDay: recurring ? dayOfMonth(dueDate) : undefined,
      category,
      recurring,
      autopay,
      paid: false,
      isSubscription,
      lastUsedDaysAgo,
      isDemo: true,
      createdAt: created,
    };
  };
  return [
    mk('demo-rent', 'Maple Court Apartments', 1450, -5, 'Housing', true, true),
    mk('demo-electric', 'PSE&G Electric', 128.4, 0, 'Utilities', true, false),
    mk('demo-internet', 'Xfinity Internet', 89.99, 2, 'Internet', true, true),
    mk('demo-phone', 'T-Mobile', 74.5, 4, 'Phone', true, true),
    mk('demo-water', 'Glassboro Water Utility', 52.3, 7, 'Water', true, false),
    mk('demo-streaming', 'Netflix', 15.49, 10, 'Streaming', true, true, true, 2),
    mk('demo-insurance', 'State Farm Auto', 112.75, 14, 'Insurance', true, false),
  ];
}

/** Seeded DEMO subscriptions — one unused 30+ days is a cancel candidate. */
export function seedSubscriptions(now: Date = new Date()): Subscription[] {
  const created = now.getTime();
  const mk = (
    id: string,
    name: string,
    monthlyCost: number,
    lastUsedDaysAgo: number,
    category: BillCategory,
  ): Subscription => ({
    id,
    name,
    monthlyCost,
    lastUsedDaysAgo,
    cancelCandidate: lastUsedDaysAgo >= 30,
    category,
    isDemo: true,
    createdAt: created,
  });
  return [
    mk('demo-sub-netflix', 'Netflix', 15.49, 2, 'Streaming'),
    mk('demo-sub-spotify', 'Spotify', 11.99, 1, 'Streaming'),
    mk('demo-sub-gym', 'FitZone Gym', 29.99, 45, 'Other'),
    mk('demo-sub-disney', 'Disney+', 13.99, 12, 'Streaming'),
    mk('demo-sub-icloud', 'iCloud+', 2.99, 0, 'Other'),
  ];
}

/** Whole days from today until the due date (negative = overdue). */
export function daysUntil(dueDate: string, now: Date = new Date()): number {
  const [y, m, d] = dueDate.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

/** Derived status: paid wins, then overdue / today / soon (≤3 days) / upcoming. */
export function billStatus(bill: Bill, now: Date = new Date()): BillStatus {
  if (bill.paid) return 'paid';
  const days = daysUntil(bill.dueDate, now);
  if (days < 0) return 'overdue';
  if (days === 0) return 'due-today';
  if (days <= 3) return 'due-soon';
  return 'upcoming';
}

/** Short human label for a bill's status. */
export function statusLabel(bill: Bill, now: Date = new Date()): string {
  const status = billStatus(bill, now);
  if (status === 'paid') return 'Paid';
  const days = daysUntil(bill.dueDate, now);
  if (status === 'overdue') return `${-days} day${-days === 1 ? '' : 's'} overdue`;
  if (status === 'due-today') return 'Due today';
  if (status === 'due-soon') return `Due in ${days} day${days === 1 ? '' : 's'}`;
  return `Due in ${days} days`;
}

/** Total unpaid amount due in the bill's due month (the current month for seeded data). */
export function monthTotalDue(bills: Bill[], now: Date = new Date()): number {
  const month = now.getMonth();
  const year = now.getFullYear();
  return bills
    .filter((b) => {
      if (b.paid) return false;
      const [y, m] = b.dueDate.split('-').map(Number);
      return y === year && m - 1 === month;
    })
    .reduce((sum, b) => sum + b.amount, 0);
}

/** The next unpaid bill by due date, or null when everything is paid. */
export function nextBill(bills: Bill[], now: Date = new Date()): Bill | null {
  const unpaid = bills
    .filter((b) => !b.paid)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  void now;
  return unpaid[0] ?? null;
}

/** Bills grouped by derived status, each group sorted by due date. */
export function billsByStatus(
  bills: Bill[],
  now: Date = new Date(),
): Record<BillStatus, Bill[]> {
  const groups: Record<BillStatus, Bill[]> = {
    overdue: [],
    'due-today': [],
    'due-soon': [],
    upcoming: [],
    paid: [],
  };
  for (const bill of bills) groups[billStatus(bill, now)].push(bill);
  for (const key of Object.keys(groups) as BillStatus[]) {
    groups[key].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }
  return groups;
}

/** Total monthly cost of all subscriptions. */
export function subscriptionMonthlyTotal(subs: Subscription[]): number {
  return subs.reduce((sum, s) => sum + s.monthlyCost, 0);
}

/** Subscriptions unused 30+ days — worth considering cancelling. */
export function cancelCandidates(subs: Subscription[]): Subscription[] {
  return subs.filter((s) => s.cancelCandidate);
}

export function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** "Dec 3" style short date for timeline group headers. */
export function formatDueDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
