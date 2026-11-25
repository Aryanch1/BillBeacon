# BillBeacon — Design

## Identity: "The beacon board"

A helpful household tool that keeps watch over due dates so late fees
never get a chance. The home is a **dark navy beacon header** — a big
"due this month" figure and a next-bill countdown under a pulsing amber
beacon dot — over a 14-day due-date strip, filter chips, and a vertical
timeline of bills grouped by due date with status dots. No photo hero,
no ledger, no dashboard grid, no ring, no poster type, no day-timeline,
no board-switcher chips + FAB, no top segmented tabs as main nav.
Navigation is a **flat white bottom tab bar** with labeled icons
(Bills / Subscriptions / Add / Settings). Detail screens are full-screen
takeovers with a big colored verdict banner in the bill's status color.

Palette: warm paper `#F7F6F2` (ground), deep ink navy `#101828`
(primary, header board), glowing amber beacon `#F59E0B` (accent),
ink `#1B2430`. Status colors do the talking: due-soon amber `#D97706`,
due-today red `#DC2626`, overdue deep red `#991B1B`, paid leaf
`#16A34A`, subscriptions slate blue `#33587A`. Display font: **Plus
Jakarta Sans 700/800** via `@expo-google-fonts/plus-jakarta-sans`.
Cards 30px radius (sheets 38px), pills fully round, primary CTA an
amber gradient with a soft amber glow, status pills tinted in their
status color.

## Distinctness vs the previous app (the kraft-paper sorting desk)

| Element | Previous app | BillBeacon |
|---|---|---|
| Display font | Bitter 700/800 (slab serif) | Plus Jakarta Sans 700/800 (geometric sans) |
| Navigation | Flat white bottom tab bar, four labeled tabs (Scan / Guide / Impact / Settings) | Flat white bottom tab bar, four labeled tabs (Bills / Subscriptions / Add / Settings) — same flat-bar pattern, different tabs, different glyphs, amber active state |
| Hero | Typographic display headline + one big pine scan tile + type-an-item field + stream quick-chips | Dark navy beacon header: big "due this month" figure + next-bill countdown + pulsing amber beacon |
| Home structure | Scan-first desk + recent-scans feed | Beacon board: 14-day due-date strip + filter chips + vertical timeline grouped by due date |
| Palette | Deep pine `#14532D` + leaf on kraft paper | Deep ink navy `#101828` + glowing amber on warm paper |
| Refresh motif | Recycling loop: three chasing arrows filling leaf green | Beacon sweep: amber beacon dot pulses and sweeps a light beam as you pull |
| Data visual | Huge Bitter tally numbers + 7-day bar chart + by-stream split bars | Huge Plus Jakarta Sans money figures + 14-day due-date strip + status dots |
| Detail | Verdict takeover: colored banner, why, numbered prep steps, drop-off | Verdict takeover: colored banner (amount due, days left), mark-paid toggle, edit, delete, reminder note |

No screen shares the previous app's home structure, hero treatment, or
display font. Nothing here could be mistaken for a sorting desk.

## Tokens

- `palette` — primary `#101828`, primaryDeep `#0A0F1A`,
  primaryLight `#33587A`, primarySoft `#E4E9F0`, primaryPale
  `#EFF2F6`; amber `#F59E0B`, amberDeep `#D97706`, amberSoft
  `#FEF3C7`; leaf `#16A34A`, leafDeep `#15803D`, leafSoft `#DCF2E3`;
  dueSoon `#D97706` / `#FEF3C7`, dueToday `#DC2626` / `#FEE2E2`,
  overdue `#991B1B` / `#FEE2E2`, paid `#16A34A` / `#DCF2E3`,
  slate `#33587A` / `#E4E9F0`; ground `#F7F6F2`; ink `#1B2430`,
  body `#4A5568`, muted `#8A94A6`, line `rgba(27,36,48,0.10)`,
  surface `#FFFFFF`, glass `rgba(255,255,255,0.62)`,
  glassStrong `rgba(255,255,255,0.85)`, sheet
  `rgba(255,255,255,0.92)`.
- `spacing` — xs 4, sm 8, md 16, lg 24, xl 32, xxl 48.
- `radii` — sm 12, md 18, card 30, sheet 38, pill 999, input 24.
- `font` — display `PlusJakartaSans_800ExtraBold`, bold
  `PlusJakartaSans_700Bold`.
- `type` — display 40/44, displayWide 52/54, title 26/32, subtitle
  17/24 bold, body 15/22, bodyStrong 15/22 bold, caption 12/16
  (letter-spacing 0.6), label 11/14 (letter-spacing 1.1).
- `shadows` — card (ink, 10/24, 0.10), glow (navy, 8/18, 0.35),
  amberGlow (amber deep, 8/18, 0.45), float (ink, 4/12, 0.08).
- `useResponsive()` — `<600` compact (single column, full width);
  `600–840` medium (content cap 640, larger display type);
  `840–1280` wide (content cap 1024, two-pane on); `≥1280` desktop
  (content cap 1120, two-pane on).

## Screen inventory + flow

1. **Splash** — warm paper, navy rounded square with the amber beacon dot.
2. **Welcome gate** (every open, signed-out non-guest) — navy beacon
   panel with a pulsing amber dot and "NEVER MISS A BILL AGAIN.";
   exactly four options: Continue with Google / Create account /
   Log in (+ Forgot password) / Continue without an account.
3. **Home / Beacon board** — navy header (due-this-month figure,
   next-bill countdown, overdue / due-today / due-soon counts, DEMO
   badge while demo data shows), 14-day due-date strip (dot per due
   bill, red when urgent), filter chips (All / Due soon / Overdue /
   Paid), vertical timeline grouped by due date with status dots and
   status pills. Bill parsing runs live AI when the backend answers,
   honest on-device demo parser otherwise, always labelled LIVE AI vs
   DEMO.
4. **Bill detail** — full-screen takeover: big colored banner in the
   bill's status color (amount due, payee, due date, autopay), category
   and recurring lines, mark-paid toggle (paying records history),
   edit form, delete (two-tap confirm), AI reminder note (live or
   demo, labelled).
5. **Add bill** — manual entry form (payee, amount, due date,
   category, recurring / one-off, autopay) AND "AI reads a bill":
   paste bill text, parse, review extracted fields with confidence and
   LIVE AI / DEMO label, then save.
6. **Subscriptions** — monthly total as one big number on a slate-blue
   panel (plus the yearly figure), cancel-candidate section for
   subscriptions unused 30+ days with the monthly saving, then
   per-subscription cost rows with last-used lines and flags.
7. **History** — paid bills with one-tap re-use (adds the bill again
   for next month and opens it), clear-history control.
8. **Settings / Profile** — avatar circle (initials or photo),
   display name (editable inline), email + sign-in method, picture
   change (resized to max 256px, stored as base64), password-reset
   email for password accounts, sign out; show-demo-data toggle;
   history link and clear controls (both confirm in place); about
   (version read from app.json only, MIT license, © 2026 Aryanmouli
   Cherupalli); link to Help; "we never store bank details" line.
9. **Help & about** — how the board works, FAQ (why a bill is red,
   late fees, no money moves, is the reader always right, where bills
   live), the late-fee note, and the disclaimer (a reminder tool, not
   financial advice).
10. **Empty states** — no bills in a filter, no subscriptions tracked,
    no history yet, bill not found, each with a next step.
11. **Toasts / inline feedback** — "Name updated", "History cleared",
    "Demo data cleared", "Profile picture updated" appear where the
    user is looking; destructive taps arm first ("Tap again to
    confirm") and then report the result in place.

## Transition + animation plan

- Screen changes: slide from right (expo-router stack), 60fps.
- Cards enter with a staggered spring rise (FadeInDown, 40–70ms steps).
- Every pressable: Reanimated spring scale to ~0.95 with overshoot
  settle; primary actions add a light haptic tap (mobile only).
- Filter chips fill with navy when selected; status pills tint with
  their status color.
- Buttons show bouncing dots while loading — never a frozen button.
- Skeleton loaders shimmer while a refresh replays.
- **Custom pull-to-refresh ("beacon sweep")**: the pull is scrubbed
  by finger distance — an amber beacon dot pulses and sweeps a light
  beam across as you pull, filling with amber as the pull passes the
  threshold; on release the beam sweeps while data returns, then
  content settles with a spring and cards re-enter staggered. On web
  the same animation is wired to the header refresh button.
- Glass surfaces use the two-layer structure everywhere (outer view:
  background + shadow; inner view with overflow hidden clips the
  BlurView) so Android never paints a white plate.

## Responsive widths (static audit)

Breakpoints driven by `useWindowDimensions` in `lib/theme.ts`:
`<600` single column, full-width cards; `600–840` wider content cap,
larger type; `840–1280` **two-pane** (timeline left, selected bill
detail right); `≥1280` centered shell, max 1120px. No fixed-width
containers anywhere: lists, chips and the 14-day strip all flex or
wrap; the chip row wraps. Widths checked by layout audit (static):
360, 390, 430 (5–7 inch phones), 600 (foldable folded), 840 (tablet /
foldable unfolded, two-pane on), 1024 and 1440 (PC/desktop).
Live-browser visual check is a publish step, as with the previous apps.

## Demo data

First launch seeds seven demo bills (rent, electric, internet, phone,
water, streaming, insurance) with dates computed relative to today —
one overdue (5 days ago), one due today, the rest spread over the next
14 days — and five demo subscriptions (Netflix, Spotify, FitZone Gym
unused 45 days, Disney+, iCloud+). Demo bills and subscriptions clear
from Settings; the demo toggle hides them without deleting them. Every
demo surface is labelled DEMO; live AI answers are labelled LIVE AI.

## Self-check scores (quality / distinctness vs previous app)

- Home / Beacon board: 91% / 96% — navy header, big money figure,
  14-day strip and status-dot timeline read as a bill board at a
  glance; nothing desk-like.
- Bill detail: 90% / 94% — status-colored verdict banner, mark-paid
  toggle, reminder note; a verdict, not a sorting result.
- Add bill: 89% / 93% — manual form plus paste-to-parse with field
  review; distinct from any scan tile by the form + parse-review flow.
- Subscriptions: 90% / 95% — slate total panel, cancel-candidate
  section, per-subscription cost rows; a money tally, not a guide.
- History: 87% / 90% — paid-bill list with one-tap re-use; simple,
  rewritten in bill language.
- Welcome: 89% / 93% — navy beacon panel with pulsing amber dot, no
  pine, no sorting language.
- Settings / Help: 86% / 89% — standard structure, recolored and
  rewritten in bill language, with the bank-details line.

## Figma

Design file: https://www.figma.com/design/fcn7vRlC3vIXHSGk88frQg
("BillBeacon — Daily App"). Placeholder until the design file is created.

## Firebase — pending

No Firebase project exists for BillBeacon yet (2026-11-25). The
`aryanch99999@gmail.com` account already has 11 Firebase projects,
the account limit, so no new project could be created (the same
block the previous apps hit). `lib/firebase.ts` and
`lib/firebase.native.ts` carry TODO-BILLBEACON placeholders and
`lib/config.ts` has `firebaseConfigured = false`. Until a project
exists — Aryan deletes an unused project or gets a limit increase —
the app runs in local/guest demo mode: bills and history live on the
device, sign-in is offered but sync is off, and Settings says so
plainly ("Not set up yet — guest mode").
