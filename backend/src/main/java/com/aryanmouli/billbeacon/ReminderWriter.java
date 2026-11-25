package com.aryanmouli.billbeacon;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;
import org.springframework.stereotype.Service;

/**
 * Rule-based reminder writer: builds a short friendly reminder from
 * exactly the bill facts given — payee, amount, days until due and
 * whether autopay is on. Nothing is invented: when a fact is missing
 * the message says so instead of guessing it. Used as the honest demo
 * fallback when no Gemini key is set (source "demo"), and as the safety
 * net when the live call fails.
 */
@Service
public class ReminderWriter {

  /** Builds the reminder. Days left: positive = due in the future, 0 = today, negative = overdue. */
  public String write(String payee, BigDecimal amount, Integer daysLeft, boolean autopay) {
    String who = payee == null || payee.isBlank() ? "your bill" : payee.trim();
    String what = amount == null ? "the amount shown on your bill"
        : NumberFormat.getCurrencyInstance(Locale.US).format(amount);

    String timing;
    if (daysLeft == null) {
      timing = "is coming up soon";
    } else if (daysLeft == 0) {
      timing = "is due today";
    } else if (daysLeft == 1) {
      timing = "is due tomorrow";
    } else if (daysLeft > 1) {
      timing = "is due in " + daysLeft + " days";
    } else if (daysLeft == -1) {
      timing = "was due yesterday, so it is now 1 day overdue";
    } else {
      timing = "is " + Math.abs(daysLeft) + " days overdue";
    }

    StringBuilder message = new StringBuilder();
    message.append("Heads up: your ").append(what).append(" bill from ").append(who)
        .append(" ").append(timing).append(".");
    if (daysLeft != null && daysLeft < 0) {
      message.append(" Worth paying as soon as you can.");
    }
    if (autopay) {
      message.append(" Autopay is on, so it should pay itself — just check the account has enough in it.");
    } else {
      message.append(" Autopay is off, so remember to pay it yourself.");
    }
    return message.toString();
  }
}
