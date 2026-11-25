package com.aryanmouli.billbeacon;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class BillParserTest {

  private final BillParser parser = new BillParser();

  @Test
  void extractsDollarAmountWithCommas() {
    BillParser.ParseResult result = parser.parse("City Power & Light\nTotal due: $1,234.56");
    assertEquals(new BigDecimal("1234.56"), result.amount());
    assertEquals("City Power & Light", result.payee());
  }

  @Test
  void extractsUsdAmount() {
    BillParser.ParseResult result = parser.parse("Acme Water Co.\nAmount due: USD 123.45");
    assertEquals(new BigDecimal("123.45"), result.amount());
  }

  @Test
  void labelledTotalBeatsLargerUnlabelledAmount() {
    BillParser.ParseResult result = parser.parse(
        "City Power & Light\nPrevious balance $500.00\nAmount due $89.99");
    assertEquals(new BigDecimal("89.99"), result.amount());
  }

  @Test
  void largestLabelledTotalWinsWhenSeveralAreLabelled() {
    BillParser.ParseResult result = parser.parse(
        "City Power & Light\nTotal due $50.00\nGrand total $75.25");
    assertEquals(new BigDecimal("75.25"), result.amount());
  }

  @Test
  void parsesUsNumericDate() {
    BillParser.ParseResult result = parser.parse(
        "City Power & Light\nAmount due $42.10\nDue 12/05/2026");
    assertEquals(LocalDate.of(2026, 12, 5), result.dueDate());
    assertTrue(result.notes().contains("month/day/year"));
  }

  @Test
  void parsesAmbiguousDateAsMonthFirst() {
    BillParser.ParseResult result = parser.parse(
        "City Power & Light\nAmount due $42.10\nDue 03/04/2026");
    assertEquals(LocalDate.of(2026, 3, 4), result.dueDate());
  }

  @Test
  void parsesMonthNameDateWithoutYearAsThisYear() {
    BillParser.ParseResult result = parser.parse(
        "Water Dept\nTotal due $12.00\nDue Dec 3");
    assertEquals(LocalDate.of(LocalDate.now().getYear(), 12, 3), result.dueDate());
  }

  @Test
  void parsesMonthNameDateWithYear() {
    BillParser.ParseResult result = parser.parse(
        "City Power & Light\nAmount due $142.75 due December 5, 2026");
    assertEquals(LocalDate.of(2026, 12, 5), result.dueDate());
    assertEquals("City Power & Light", result.payee());
    assertEquals(new BigDecimal("142.75"), result.amount());
  }

  @Test
  void parsesIsoDate() {
    BillParser.ParseResult result = parser.parse(
        "City Power & Light\nAmount due $42.10\nDue 2026-11-28");
    assertEquals(LocalDate.of(2026, 11, 28), result.dueDate());
  }

  @Test
  void parsesDueMonthNamePhrase() {
    BillParser.ParseResult result = parser.parse(
        "City Power & Light\nAmount due $42.10\ndue November 28");
    assertEquals(LocalDate.of(LocalDate.now().getYear(), 11, 28), result.dueDate());
  }

  @Test
  void noDateLeavesDueDateNullAndNotesIt() {
    BillParser.ParseResult result = parser.parse(
        "City Power & Light\nAmount due $42.10");
    assertNull(result.dueDate());
    assertTrue(result.notes().contains("No due date"));
    assertTrue(result.confidence() < 1.0);
  }

  @Test
  void noAmountLeavesAmountNullAndNotesIt() {
    BillParser.ParseResult result = parser.parse(
        "City Power & Light\nDue December 5, 2026");
    assertNull(result.amount());
    assertTrue(result.notes().contains("No amount"));
  }

  @Test
  void payeeFromFromPhrase() {
    BillParser.ParseResult result = parser.parse(
        "Your bill from Acme Water Co.\nTotal due $42.10");
    assertEquals("Acme Water Co.", result.payee());
  }

  @Test
  void emptyTextThrows() {
    assertThrows(IllegalArgumentException.class, () -> parser.parse("   "));
    assertThrows(IllegalArgumentException.class, () -> parser.parse(null));
  }
}
