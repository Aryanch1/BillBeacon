package com.aryanmouli.billbeacon;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.stereotype.Service;

/**
 * Orchestrates parse + remind. Each one tries the live Gemini call
 * first when a key is configured, and falls back to the honest
 * rule-based demo logic on any failure — the request never fails, and
 * the response always says which mode answered.
 */
@Service
public class BillService {

  private static final String PARSE_SYSTEM =
      "You parse a pasted bill or statement into its key facts. "
          + "Reply with ONLY a JSON object, no markdown fences, no extra text, with exactly these fields: "
          + "payee (the company or person the bill is from, or null if it is not in the text), "
          + "amount (the total amount due as a number, or null if it is not in the text), "
          + "dueDate (the due date as YYYY-MM-DD, or null if it is not in the text), "
          + "confidence (a number 0-1 for how sure you are), "
          + "notes (one short sentence saying what was found or what was missing). "
          + "Use ONLY what the text says: when several amounts appear, pick the labelled total or amount due, "
          + "never a previous balance or a minimum payment. Never invent a payee, amount, or date.";

  private static final String REMIND_SYSTEM =
      "You write a short friendly payment reminder for one bill. "
          + "Reply with ONLY a JSON object, no markdown fences, no extra text, with exactly this field: "
          + "message (2-3 short sentences). Use ONLY the details given: the payee, the amount, "
          + "how many days are left until the due date (negative means overdue), and whether autopay is on. "
          + "Never invent a date, an amount, or a fact. Warm and plain, never pushy.";

  private final GeminiClient gemini;
  private final BillParser parser;
  private final ReminderWriter writer;

  public BillService(GeminiClient gemini, BillParser parser, ReminderWriter writer) {
    this.gemini = gemini;
    this.parser = parser;
    this.writer = writer;
  }

  /** True when no Gemini key is configured, so answers come from the demo logic. */
  public boolean isDemoMode() {
    return !gemini.isConfigured();
  }

  public BillDtos.ParseResponse parse(String text) {
    BillParser.ParseResult demo = parser.parse(text);
    if (gemini.isConfigured()) {
      try {
        JsonNode data = gemini.chatJson(PARSE_SYSTEM, "Bill text:\n" + text);
        String payee = textOrNull(data.path("payee"));
        BigDecimal amount = numberOrNull(data.path("amount"));
        LocalDate dueDate = dateOrNull(data.path("dueDate"));
        double confidence = data.path("confidence").asDouble(-1);
        String notes = data.path("notes").asText("");
        if (amount != null && amount.compareTo(BigDecimal.ZERO) <= 0) {
          amount = null;
        }
        if (confidence < 0 || confidence > 1) {
          confidence = 0.5;
        }
        if (amount != null || payee != null || dueDate != null) {
          return new BillDtos.ParseResponse(payee, amount, dueDate, confidence,
              notes.isBlank() ? "Parsed by Gemini from the bill text" : notes, false, "live");
        }
      } catch (Exception e) {
        // Live failed — fall through to the demo parser.
      }
    }
    return new BillDtos.ParseResponse(demo.payee(), demo.amount(), demo.dueDate(),
        demo.confidence(), demo.notes(), true, "demo");
  }

  public BillDtos.RemindResponse remind(BillDtos.RemindRequest req) {
    String payee = req.payee() == null ? "" : req.payee();
    boolean autopay = req.autopay() != null && req.autopay();
    String demo = writer.write(payee, req.amount(), req.daysLeft(), autopay);
    if (gemini.isConfigured()) {
      try {
        String userText = "Payee: " + (payee.isBlank() ? "(not given)" : payee)
            + "\nAmount: " + (req.amount() == null ? "(not given)" : "$" + req.amount())
            + "\nDays left until due: " + (req.daysLeft() == null ? "(not given)" : req.daysLeft())
            + "\nAutopay: " + (autopay ? "on" : "off");
        JsonNode data = gemini.chatJson(REMIND_SYSTEM, userText);
        String message = data.path("message").asText("");
        if (!message.isBlank()) {
          return new BillDtos.RemindResponse(message, false, "live");
        }
      } catch (Exception e) {
        // Live failed — fall through to the demo writer.
      }
    }
    return new BillDtos.RemindResponse(demo, true, "demo");
  }

  private static String textOrNull(JsonNode node) {
    return node.isTextual() && !node.asText().isBlank() ? node.asText().trim() : null;
  }

  private static BigDecimal numberOrNull(JsonNode node) {
    if (node.isNumber()) {
      try {
        return new BigDecimal(node.asText());
      } catch (NumberFormatException e) {
        return null;
      }
    }
    return null;
  }

  private static LocalDate dateOrNull(JsonNode node) {
    if (!node.isTextual() || node.asText().isBlank()) {
      return null;
    }
    try {
      return LocalDate.parse(node.asText().trim());
    } catch (java.time.format.DateTimeParseException e) {
      return null;
    }
  }
}
