package com.aryanmouli.billbeacon;

/** Request/response shapes for the BillBeacon parsing and reminder service. */
public final class BillDtos {
  private BillDtos() {}

  public record ParseRequest(String text) {}

  public record ParseResponse(String payee, java.math.BigDecimal amount,
      java.time.LocalDate dueDate, double confidence, String notes,
      boolean demo, String source) {}

  public record RemindRequest(String payee, java.math.BigDecimal amount,
      Integer daysLeft, Boolean autopay) {}

  public record RemindResponse(String message, boolean demo, String source) {}

  public record HealthResponse(String status, boolean demo) {}
}
