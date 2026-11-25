package com.aryanmouli.billbeacon;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class ReminderWriterTest {

  private final ReminderWriter writer = new ReminderWriter();

  @Test
  void dueSoonWithoutAutopay() {
    String message = writer.write("City Power & Light", new BigDecimal("142.75"), 5, false);
    assertTrue(message.contains("City Power & Light"));
    assertTrue(message.contains("$142.75"));
    assertTrue(message.contains("due in 5 days"));
    assertTrue(message.contains("Autopay is off"));
  }

  @Test
  void dueTomorrow() {
    String message = writer.write("Acme Water", new BigDecimal("42.10"), 1, false);
    assertTrue(message.contains("due tomorrow"));
  }

  @Test
  void dueToday() {
    String message = writer.write("Acme Water", new BigDecimal("42.10"), 0, false);
    assertTrue(message.contains("due today"));
  }

  @Test
  void overdue() {
    String message = writer.write("Acme Water", new BigDecimal("42.10"), -3, false);
    assertTrue(message.contains("3 days overdue"));
    assertTrue(message.contains("as soon as you can"));
  }

  @Test
  void autopayOn() {
    String message = writer.write("Acme Water", new BigDecimal("42.10"), 4, true);
    assertTrue(message.contains("Autopay is on"));
    assertTrue(message.contains("due in 4 days"));
  }

  @Test
  void missingFactsAreNotInvented() {
    String message = writer.write(null, null, null, false);
    assertTrue(message.contains("your bill"));
    assertTrue(message.contains("the amount shown on your bill"));
    assertTrue(message.contains("coming up soon"));
  }
}
