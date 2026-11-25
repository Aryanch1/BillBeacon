package com.aryanmouli.billbeacon;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

/**
 * Rule-based bill parser: pulls the payee, the amount owed and the due
 * date out of pasted bill text. Used as the honest demo fallback when no
 * Gemini key is set (source "demo"), and as the safety net when the live
 * call fails. It only reports what the text actually contains — a field
 * it cannot find stays empty and is noted, never guessed.
 */
@Service
public class BillParser {

  private static final Pattern LABELLED_AMOUNT = Pattern.compile(
      "(?i)(total\\s+due|amount\\s+due|balance\\s+due|total\\s+amount\\s+due|amount\\s+owed"
          + "|total\\s+owed|please\\s+pay|payment\\s+due|total\\s+balance|grand\\s+total|total)"
          + "[^\\d$]{0,25}?\\$?\\s*(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})|\\d+\\.\\d{2})");

  private static final Pattern USD_AMOUNT = Pattern.compile(
      "(?i)USD\\s*(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})|\\d+\\.\\d{2})");

  private static final Pattern DOLLAR_AMOUNT = Pattern.compile(
      "\\$(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})?|\\d+\\.\\d{2})");

  private static final Pattern ISO_DATE = Pattern.compile("(\\d{4})-(\\d{2})-(\\d{2})");

  private static final Pattern US_DATE = Pattern.compile("(\\d{1,2})/(\\d{1,2})/(\\d{4})");

  private static final Pattern US_DATE_NO_YEAR = Pattern.compile("(?<!\\d)(\\d{1,2})/(\\d{1,2})(?!\\d|/)");

  private static final Pattern MONTH_NAME_DATE = Pattern.compile(
      "(?i)(january|february|march|april|may|june|july|august|september|october|november|december"
          + "|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?"
          + "(?:,?\\s+(\\d{4}))?");

  private static final Pattern FROM_PAYEE = Pattern.compile("(?im)^.*\\bfrom\\s+([^\\n\\r]{2,80})$");

  private static final Map<String, Integer> MONTHS = Map.ofEntries(
      Map.entry("january", 1), Map.entry("jan", 1),
      Map.entry("february", 2), Map.entry("feb", 2),
      Map.entry("march", 3), Map.entry("mar", 3),
      Map.entry("april", 4), Map.entry("apr", 4),
      Map.entry("may", 5),
      Map.entry("june", 6), Map.entry("jun", 6),
      Map.entry("july", 7), Map.entry("jul", 7),
      Map.entry("august", 8), Map.entry("aug", 8),
      Map.entry("september", 9), Map.entry("sep", 9), Map.entry("sept", 9),
      Map.entry("october", 10), Map.entry("oct", 10),
      Map.entry("november", 11), Map.entry("nov", 11),
      Map.entry("december", 12), Map.entry("dec", 12));

  /** Words that mark a line as a label or a detail, not a payee name. */
  private static final Pattern NON_PAYEE_LINE = Pattern.compile(
      "(?i)\\b(bill|invoice|statement|amount|total|balance|due|payment|account|page|date|reference|\\$|USD)\\b");

  /** One parsed bill. Amount and due date stay null when the text does not contain them. */
  public record ParseResult(String payee, BigDecimal amount, LocalDate dueDate,
      double confidence, String notes) {}

  /** Parses bill text. Throws IllegalArgumentException on null or blank text. */
  public ParseResult parse(String text) {
    if (text == null || text.isBlank()) {
      throw new IllegalArgumentException("Bill text must not be empty");
    }
    List<String> notes = new ArrayList<>();
    double confidence = 0.3;

    BigDecimal amount = extractAmount(text, notes);
    if (amount != null) {
      confidence += 0.25;
    } else {
      notes.add("No amount found in the text");
    }

    LocalDate dueDate = extractDueDate(text, notes);
    if (dueDate != null) {
      confidence += 0.25;
    } else {
      notes.add("No due date found in the text");
    }

    String payee = extractPayee(text, notes);
    if (payee != null) {
      confidence += 0.2;
    } else {
      notes.add("No payee found in the text");
    }

    double rounded = Math.min(1.0, Math.round(confidence * 100.0) / 100.0);
    return new ParseResult(payee, amount, dueDate, rounded, String.join("; ", notes));
  }

  /**
   * Amount rule: a labelled total ("amount due", "total due", "balance
   * due", "total", ...) wins over any other number; when several amounts
   * carry such a label, the largest one wins. With no labelled amount,
   * the largest dollar amount in the text wins.
   */
  private BigDecimal extractAmount(String text, List<String> notes) {
    BigDecimal bestLabelled = null;
    Matcher labelled = LABELLED_AMOUNT.matcher(text);
    while (labelled.find()) {
      BigDecimal value = parseMoney(labelled.group(2));
      if (value != null && (bestLabelled == null || value.compareTo(bestLabelled) > 0)) {
        bestLabelled = value;
      }
    }
    if (bestLabelled != null) {
      notes.add("Amount taken from a labelled total in the text");
      return bestLabelled;
    }
    BigDecimal best = null;
    Matcher usd = USD_AMOUNT.matcher(text);
    while (usd.find()) {
      BigDecimal value = parseMoney(usd.group(1));
      if (value != null && (best == null || value.compareTo(best) > 0)) {
        best = value;
      }
    }
    Matcher dollar = DOLLAR_AMOUNT.matcher(text);
    while (dollar.find()) {
      BigDecimal value = parseMoney(dollar.group(1));
      if (value != null && (best == null || value.compareTo(best) > 0)) {
        best = value;
      }
    }
    if (best != null) {
      notes.add("Amount taken from the largest dollar amount in the text");
    }
    return best;
  }

  private BigDecimal parseMoney(String raw) {
    try {
      BigDecimal value = new BigDecimal(raw.replace(",", ""));
      return value.compareTo(BigDecimal.ZERO) > 0 ? value : null;
    } catch (NumberFormatException e) {
      return null;
    }
  }

  /**
   * Date rule: ISO dates first, then MM/DD/YYYY (US order, noted as
   * such when both parts could be a month), then a month name with an
   * optional year ("Dec 3", "December 3, 2026", "due November 28").
   * A date with no year is read as this year.
   */
  private LocalDate extractDueDate(String text, List<String> notes) {
    Matcher iso = ISO_DATE.matcher(text);
    while (iso.find()) {
      LocalDate date = safeDate(iso.group(1), iso.group(2), iso.group(3));
      if (date != null) {
        return date;
      }
    }
    Matcher us = US_DATE.matcher(text);
    while (us.find()) {
      int first = Integer.parseInt(us.group(1));
      int second = Integer.parseInt(us.group(2));
      int year = Integer.parseInt(us.group(3));
      LocalDate date = safeDate(year, first, second);
      if (date != null) {
        if (first <= 12 && second <= 12) {
          notes.add("Date " + us.group() + " read as month/day/year (US format)");
        }
        return date;
      }
      // 25/12/2026 style: first part cannot be a month, so read it as day/month.
      LocalDate swapped = safeDate(year, second, first);
      if (swapped != null) {
        notes.add("Date " + us.group() + " read as day/month/year");
        return swapped;
      }
    }
    Matcher monthName = MONTH_NAME_DATE.matcher(text);
    while (monthName.find()) {
      Integer month = MONTHS.get(monthName.group(1).toLowerCase());
      if (month == null) {
        continue;
      }
      int day = Integer.parseInt(monthName.group(2));
      int year = monthName.group(3) == null
          ? LocalDate.now().getYear() : Integer.parseInt(monthName.group(3));
      LocalDate date = safeDate(year, month, day);
      if (date != null) {
        if (monthName.group(3) == null) {
          notes.add("Date has no year, read as " + year);
        }
        return date;
      }
    }
    Matcher shortUs = US_DATE_NO_YEAR.matcher(text);
    while (shortUs.find()) {
      int first = Integer.parseInt(shortUs.group(1));
      int second = Integer.parseInt(shortUs.group(2));
      LocalDate date = safeDate(LocalDate.now().getYear(), first, second);
      if (date != null) {
        notes.add("Date " + shortUs.group() + " read as month/day of "
            + LocalDate.now().getYear() + " (US format)");
        return date;
      }
    }
    return null;
  }

  private LocalDate safeDate(int year, int month, int day) {
    try {
      return LocalDate.of(year, month, day);
    } catch (java.time.DateTimeException e) {
      return null;
    }
  }

  private LocalDate safeDate(String year, String month, String day) {
    try {
      return LocalDate.of(Integer.parseInt(year), Integer.parseInt(month), Integer.parseInt(day));
    } catch (NumberFormatException | java.time.DateTimeException e) {
      return null;
    }
  }

  /**
   * Payee rule: "from X" wins; otherwise the first line that looks like
   * a company name (no dollar sign, no date, no label words). For a
   * single-line bill, the text before the first amount, "due" or total
   * label is the payee.
   */
  private String extractPayee(String text, List<String> notes) {
    Matcher from = FROM_PAYEE.matcher(text);
    if (from.find()) {
      String payee = cleanPayee(from.group(1));
      if (payee != null) {
        notes.add("Payee taken from \"from\" in the text");
        return payee;
      }
    }
    String[] lines = text.split("\\R");
    for (String line : lines) {
      String payee = cleanPayee(line);
      if (payee != null && !NON_PAYEE_LINE.matcher(payee).find() && !looksLikeDate(payee)) {
        notes.add("Payee taken from the first line of the text");
        return payee;
      }
    }
    // Single-line bill: everything before the first amount or due label.
    String firstLine = lines[0].trim();
    int cut = firstLine.length();
    for (String marker : new String[]{"$", "USD", "amount due", "total due", "balance due",
        "total", " due ", " due"}) {
      int idx = firstLine.toLowerCase().indexOf(marker);
      if (idx >= 0 && idx < cut) {
        cut = idx;
      }
    }
    String payee = cleanPayee(firstLine.substring(0, cut));
    if (payee != null) {
      notes.add("Payee taken from the start of the text");
      return payee;
    }
    return null;
  }

  private boolean looksLikeDate(String line) {
    return ISO_DATE.matcher(line).find() || US_DATE.matcher(line).find()
        || MONTH_NAME_DATE.matcher(line).find();
  }

  private String cleanPayee(String raw) {
    if (raw == null) {
      return null;
    }
    String cleaned = raw.trim()
        .replaceAll("(?i)^(bill|statement|invoice)\\s+(from\\s+)?", "")
        .replaceAll("[\\-\\u2013\\u2014,:;]+$", "")
        .replaceAll("\\s+", " ")
        .trim();
    if (cleaned.length() < 2 || cleaned.length() > 80) {
      return null;
    }
    if (cleaned.matches("[\\d\\W]+")) {
      return null;
    }
    return cleaned;
  }
}
