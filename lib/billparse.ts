/**
 * On-device DEMO bill parser — extracts payee, amount and due date from
 * pasted bill text with plain regexes. No data leaves the device.
 * The backend (/api/parse) is tried first when it answers; this parser
 * is the honest fallback, always labelled DEMO.
 */

export interface ParsedBill {
  payee?: string;
  amount?: number;
  /** ISO date (YYYY-MM-DD) when a due date could be read. */
  dueDate?: string;
  /** 0–1: how much of the bill was actually found. */
  confidence: number;
  demo: true;
}

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseAmount(text: string): number | undefined {
  // Prefer an amount labelled total / amount due / balance, else the
  // largest dollar figure on the page (bills rarely list a bigger one).
  const labelled =
    /(?:total\s*(?:amount\s*)?due|amount\s*due|balance\s*due|total\s*due|please\s*pay|amount\s*owed)\s*[:\-]?\s*\$?\s*([\d,]+\.\d{2})/i.exec(
      text,
    );
  if (labelled) return Number(labelled[1].replace(/,/g, ''));
  const all = [...text.matchAll(/\$([\d,]+\.\d{2})/g)].map((m) =>
    Number(m[1].replace(/,/g, '')),
  );
  if (all.length === 0) return undefined;
  return Math.max(...all);
}

function parseDueDate(text: string, now: Date): string | undefined {
  // "due November 28" / "due Dec 3" / "due date: 12/03/2026".
  const dueLabelled =
    /due(?:\s*date)?\s*[:\-]?\s*([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i.exec(text);
  if (dueLabelled) {
    const month = MONTHS[dueLabelled[1].toLowerCase()];
    if (month !== undefined) {
      const day = Number(dueLabelled[2]);
      let year = dueLabelled[3] ? Number(dueLabelled[3]) : now.getFullYear();
      let date = new Date(year, month, day);
      // No year given and the date already passed: it must be next year.
      if (!dueLabelled[3] && date < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        date = new Date(year + 1, month, day);
      }
      return toIso(date);
    }
  }
  const numeric =
    /due(?:\s*date)?\s*[:\-]?\s*(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/i.exec(text);
  if (numeric) {
    const month = Number(numeric[1]) - 1;
    const day = Number(numeric[2]);
    let year = numeric[3] ? Number(numeric[3]) : now.getFullYear();
    if (year < 100) year += 2000;
    let date = new Date(year, month, day);
    if (!numeric[3] && date < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      date = new Date(year + 1, month, day);
    }
    return toIso(date);
  }
  // Bare "November 28" anywhere in the text.
  const bare = /([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/.exec(text);
  if (bare) {
    const month = MONTHS[bare[1].toLowerCase()];
    if (month !== undefined) {
      const day = Number(bare[2]);
      const year = bare[3] ? Number(bare[3]) : now.getFullYear();
      return toIso(new Date(year, month, day));
    }
  }
  return undefined;
}

function parsePayee(text: string): string | undefined {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  // Prefer a "from / biller / pay to" line; else the first line that
  // looks like a company name (letters, no dollar sign, no "due").
  for (const line of lines) {
    const m = /(?:from|biller|pay\s*to|bill\s*from)\s*[:\-]?\s*(.+)/i.exec(line);
    if (m) return m[1].replace(/\s+/g, ' ').trim();
  }
  for (const line of lines) {
    if (/\$/.test(line)) continue;
    if (/due|total|amount|balance|account/i.test(line)) continue;
    if (/^[A-Za-z][A-Za-z0-9 .&'-]{2,60}$/.test(line)) return line;
  }
  return undefined;
}

export function parseBillText(text: string, now: Date = new Date()): ParsedBill {
  const payee = parsePayee(text);
  const amount = parseAmount(text);
  const dueDate = parseDueDate(text, now);
  const found = [payee, amount, dueDate].filter((v) => v !== undefined).length;
  return {
    payee,
    amount,
    dueDate,
    confidence: found / 3,
    demo: true,
  };
}
