# BillBeacon backend

Spring Boot 3.3.5 (Java 17) service that parses pasted bill text into
payee, amount and due date, and writes friendly payment reminders.
Endpoints:

- `POST /api/parse` — `{ "text": "City Power & Light — Amount due $142.75 due December 5, 2026" }` →
  `{ "payee": "City Power & Light", "amount": 142.75, "dueDate": "2026-12-05", "confidence": 1.0, "notes": "…", "demo": true, "source": "demo" | "live" }`.
- `POST /api/remind` — `{ "payee": "City Power & Light", "amount": 142.75, "daysLeft": 3, "autopay": false }` →
  `{ "message": "Heads up: your $142.75 bill from City Power & Light is due in 3 days. Autopay is off, so remember to pay it yourself.", "demo": true, "source": "demo" | "live" }`.
  `daysLeft` is positive when the bill is still due, 0 when due today,
  negative when overdue. `autopay` defaults to false when omitted.
- `GET /health` (and `GET /api/health`) — `{ "status": "ok", "demo": true }`.

Empty bill text on `POST /api/parse` returns 400.

## Live vs demo

- **Live** (`source: "live"`, `demo: false`): when `GEMINI_API_KEY` is
  set, the request goes to Google Gemini (`gemini-3.5-flash-lite`)
  through the OpenAI-compatible endpoint
  `https://generativelanguage.googleapis.com/v1beta/openai/`.
  The key comes from the environment only — never from code or the repo.
  Optional overrides: `BILLBEACON_GEMINI_MODEL`,
  `BILLBEACON_GEMINI_BASE_URL` (also see `application.properties`).
- **Demo** (`source: "demo"`, `demo: true`): when no key is set, or the
  AI call fails, the endpoint still answers with the built-in demo
  logic (rule-based bill parser / template reminder writer). The demo
  parser only reports what the text actually contains: a labelled
  total ("amount due", "total due", "balance due") wins over other
  numbers, several labelled totals resolve to the largest one, and a
  missing amount or date stays empty and is noted, never guessed.
  The app always says which mode the answer came from.

## Run

```sh
cd backend
JAVA_HOME=/home/hatch/tools/jdk-17.0.21+9 ./mvnw spring-boot:run   # serves on http://localhost:8080
```

On a normal machine `./mvnw spring-boot:run` just works: the wrapper
downloads Maven 3.9.9 and all dependencies from Maven Central.

Example calls:

```sh
curl -s http://localhost:8080/health
curl -s -X POST http://localhost:8080/api/parse \
  -H 'Content-Type: application/json' \
  -d '{"text":"City Power & Light — Amount due $142.75 due December 5, 2026"}'
curl -s -X POST http://localhost:8080/api/remind \
  -H 'Content-Type: application/json' \
  -d '{"payee":"City Power & Light","amount":142.75,"daysLeft":3,"autopay":false}'
```

## Tests

```sh
JAVA_HOME=/home/hatch/tools/jdk-17.0.21+9 ./mvnw -o -Dmaven.repo.local=/home/hatch/.m2/repository test
# 26 tests: BillParser (14), ReminderWriter (6), BillController (5), context load (1)
```

`BillBeaconApplicationTests` boots the whole context with no API key
set, so a wiring mistake (e.g. an ambiguous `GeminiClient`
constructor) fails the suite instead of failing at first real boot.

## Offline build in this sandbox

This VM blocks all TCP from Java processes, so plain `mvn` cannot reach
Maven Central — even through the egress proxy, and even to localhost.
Dependencies are therefore resolved by a Python helper that downloads
them with `curl` (which does go through the proxy) into the local repo:

```sh
python3 ~/tools/mvn-resolve.py pom.xml \
  commons-io:commons-io:2.15.1 \
  org.apache.maven.surefire:surefire-junit-platform:3.2.5 \
  org.junit.platform:junit-platform-launcher:1.10.5 \
  org.apache.maven.plugins:maven-wrapper-plugin:3.2.0 \
  org.apache.maven.plugins:maven-jar-plugin:3.4.2 \
  org.tomlj:tomlj:1.0.0 \
  org.apache.maven.plugins:maven-shade-plugin:3.5.0
JAVA_HOME=/home/hatch/tools/jdk-17.0.21+9 ./mvnw -o -Dmaven.repo.local=/home/hatch/.m2/repository test
```

The extra roots are artifacts Maven resolves at runtime rather than from
a POM edge: the Surefire JUnit Platform provider + launcher, the
Maven-core 3.9.9 transitive `commons-io`, the wrapper/jar plugins, and
the `repackage` goal's `tomlj` + `maven-shade-plugin`. On a normal
machine none of this is needed.

Three environment notes, all specific to this sandbox:

- The default `java` in this VM is a JRE-only install, so the compiler
  plugin fails with "release version 17 not supported" unless the
  Temurin 17 JDK is used: prefix every `./mvnw` call with
  `JAVA_HOME=/home/hatch/tools/jdk-17.0.21+9` (and run the jar with
  that JDK's `java` too). On a normal machine with a JDK 17 on PATH
  none of this is needed.
- This shell runs as root, so Java's `user.home` is `/root` and the
  wrapper looks for its Maven distribution under
  `/root/.m2/wrapper/dists/`, while the resolved dependency repo lives
  under `/home/hatch/.m2/repository`. Pass the repo explicitly on every
  `./mvnw` call: `-Dmaven.repo.local=/home/hatch/.m2/repository`.
- The wrapper needs its Maven distribution zip pre-seeded, because the
  Java downloader cannot use the network: on this run
  `/root/.m2/wrapper/dists/` did not exist yet, so the already-seeded
  distribution was copied over from the hatch home:
  `cp -r /home/hatch/.m2/wrapper/dists/* /root/.m2/wrapper/dists/`
  (apache-maven-3.9.9-bin, hash dir `33b4b2b4`). On a normal machine the
  wrapper downloads the distribution on first run.
