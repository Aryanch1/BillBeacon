package com.aryanmouli.billbeacon;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Bill endpoints. Each answers with a live Gemini result when
 * GEMINI_API_KEY is set, and with the honest rule-based demo result
 * otherwise — the app always says which mode answered.
 */
@RestController
public class BillController {

  private final BillService service;

  public BillController(BillService service) {
    this.service = service;
  }

  @GetMapping("/api/health")
  public BillDtos.HealthResponse health() {
    return new BillDtos.HealthResponse("ok", service.isDemoMode());
  }

  @GetMapping("/health")
  public BillDtos.HealthResponse healthShort() {
    return health();
  }

  @PostMapping(value = "/api/parse", consumes = MediaType.APPLICATION_JSON_VALUE)
  public BillDtos.ParseResponse parse(@RequestBody BillDtos.ParseRequest request) {
    if (request == null || request.text() == null || request.text().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bill text must not be empty");
    }
    return service.parse(request.text());
  }

  @PostMapping(value = "/api/remind", consumes = MediaType.APPLICATION_JSON_VALUE)
  public BillDtos.RemindResponse remind(@RequestBody BillDtos.RemindRequest request) {
    if (request == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reminder details must not be empty");
    }
    return service.remind(request);
  }
}
