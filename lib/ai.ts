import { API_BASE } from './config';
import { parseBillText, type ParsedBill } from './billparse';
import type { Bill } from './types';

/**
 * Client for the BillBeacon backend (Java Spring Boot): POST /api/parse
 * (read a pasted bill) and POST /api/remind (draft a reminder note).
 * Every call is labelled honestly: 'live' when the backend answers,
 * 'demo' when the on-device fallback does the work instead.
 */

async function postJson(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Backend answered ${res.status}`);
  return res.json() as Promise<unknown>;
}

export interface ParseResult {
  parsed: ParsedBill;
  /** 'live' when the backend parsed it, 'demo' for the on-device parser. */
  source: 'live' | 'demo';
}

export async function parseBill(text: string): Promise<ParseResult> {
  try {
    const data = (await postJson('/api/parse', { text })) as {
      payee?: string;
      amount?: number;
      dueDate?: string;
      confidence?: number;
    };
    return {
      parsed: {
        payee: data.payee,
        amount: data.amount,
        dueDate: data.dueDate,
        confidence: data.confidence ?? 0.8,
        demo: true,
      },
      source: 'live',
    };
  } catch {
    return { parsed: parseBillText(text), source: 'demo' };
  }
}

export interface RemindResult {
  note: string;
  source: 'live' | 'demo';
}

/** Draft a short reminder note for a bill — live service, demo text otherwise. */
export async function remindForBill(bill: Bill): Promise<RemindResult> {
  try {
    const data = (await postJson('/api/remind', {
      payee: bill.payee,
      amount: bill.amount,
      dueDate: bill.dueDate,
      autopay: bill.autopay,
    })) as { note?: string };
    if (data.note) return { note: data.note, source: 'live' };
    throw new Error('Empty reminder');
  } catch {
    const when = bill.dueDate;
    const note = bill.autopay
      ? `${bill.payee} ($${bill.amount.toFixed(2)}) is due ${when} and is set to autopay — no action needed, just make sure the balance covers it.`
      : `${bill.payee} ($${bill.amount.toFixed(2)}) is due ${when}. Pay it before the due date to dodge the late fee.`;
    return { note, source: 'demo' };
  }
}
