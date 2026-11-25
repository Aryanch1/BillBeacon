# BillBeacon

**Never miss a bill again.**

BillBeacon keeps every household bill and subscription on one due-date
timeline, with a beacon that lights up before a late fee can. Add a bill
in seconds, or paste the bill text and let the app read the payee,
amount and due date for you. Mark bills paid, re-use them next month
with one tap, and spot the subscriptions you stopped using but are
still paying for.

BillBeacon never stores bank details — it only keeps the payee, amount
and due date you type or paste in.

## Who it helps

Anyone with a household full of due dates: rent, electric, internet,
phone, water, insurance, streaming — and anyone who has ever paid a
late fee for a bill they simply forgot.

## Features

- **Beacon board** — due-this-month total, next-bill countdown, and a
  14-day due-date strip on the home screen.
- **Status at a glance** — overdue (deep red), due today (red), due
  soon (amber), upcoming (slate), paid (green).
- **Add a bill** — manual entry, or paste bill text and let the app
  read it (live service when the backend answers, on-device demo
  parser otherwise, always labelled).
- **Bill detail** — amount due and days left in a big colored banner,
  mark-paid toggle, edit, delete, and a reminder note.
- **Subscriptions** — monthly and yearly totals, and cancel candidates
  for anything unused 30+ days, with the saving shown.
- **History** — paid bills with one-tap re-use for next month.
- **Accounts** — Google or email sign-in, guest mode per visit,
  profile with photo and display name.
- **Demo data** — sample household bills on first launch, clearable
  from Settings.

## Live link

Live link coming soon.

## Figma

Design file: https://www.figma.com/design/fcn7vRlC3vIXHSGk88frQg

## Run it

```bash
npm install
npm start        # Expo dev server — Android, iOS, or web
npm run android  # Android
npm run ios      # iOS
npm run web      # Web
npm run typecheck
npm run lint
npm run export:web
```

## Tech stack

- React Native + Expo + TypeScript (Expo Router)
- Java Spring Boot backend (`backend/`) — POST `/api/parse` and
  `/api/remind`, Gemini AI server-side
- Firebase Auth + Firestore (owner-only rules under `users/{uid}`)
- Plus Jakarta Sans display type, Reanimated spring motion,
  expo-blur frosted glass

## License

MIT — see [LICENSE](LICENSE).

© 2026 Aryanmouli Cherupalli
