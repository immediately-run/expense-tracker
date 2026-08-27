# Expense tracker

A household budget for [immediately.run](https://immediately.run): every expense
is a file, and you split bills with the people you share the space with.

**Try it:** <https://immediately.run/present/github/immediately-run/expense-tracker/main/files/src/App.tsx>

## What it does

- **Ledger** — month picker, transactions grouped by day, and a one-thumb
  quick-add bar (amount → category chip → note → add). Tap a row to edit
  everything in a sheet: amount, currency, date, category, note, who paid,
  who it is split with.
- **Overview** — month total, count, daily average, change versus last month;
  per-category bars with budget markers (over budget is highlighted); a
  six-month sparkline; top payees.
- **Balances** — for shared households: what each person paid, their equal-split
  share, the net, and a simplified "who pays whom" settle-up list.
- **Export** — CSV of the month: download (when the sandbox allows it), copy to
  clipboard, or select the text and copy by hand.
- **Budgets** — a monthly budget per category, edited in settings, shown as
  progress on the Overview.
- **Settings** — default currency, categories, household members, budgets,
  create/open/leave a shared household, clear or restore the sample data.

A fresh private ledger is seeded with ~25 sample transactions over the last
two months so every screen has something to show; *Settings → Clear sample
data* removes them.

## How data is stored

Everything is plain JSON on the immediately.run filesystem (the `fs` module —
no browser storage, no server of our own):

```
<store>/tx/<YYYY-MM>/<txId>.json   one transaction per file
<store>/categories.json            the category list (rarely edited, last-write-wins)
<store>/members.json               household member names for split chips
<private>/config.json              default currency + the remembered household space
<private>/budgets.json             your budgets, kept per store
```

`<private>` is your per-user, per-app settings folder; in private mode it is
also `<store>`. Money is always an integer in minor units plus an ISO 4217 code.

The one-record-per-file layout is what makes sharing safe: two people adding
expenses at the same time write two different files, so nothing is clobbered.

## Sharing a household

*Settings → Household → Create* makes a new immediately.run space (the host asks
you to confirm); *Open* lets you pick a space you already have access to. The
space id is remembered in your private config and re-opened at boot with no
prompt. Invite people from the platform's Spaces UI — the app cannot invite
anyone itself. Members' changes show up within about three seconds (the app
polls the current month's folder). If you were granted read-only access the
app shows a `ro` badge and refuses edits gracefully.

Private mode never prompts for anything.

## Local development

```bash
npm install
npm run dev      # http://localhost:5173 — data lands in ./devfs-playground (git-ignored)
npm run build
npm run lint
```

Under `vite dev` there is no host, so `fs` is bridged to disk by
`@immediately-run/dev-fs`, "who paid" falls back to `me`, and the household
buttons just switch to a second local folder.

## Layout

- `src/App.tsx` — entry (immediately.run renders its default export)
- `src/hooks/useLedger.ts` — all state and actions
- `src/lib/store.ts` — the filesystem / spaces wrapper shared by the example apps
- `src/lib/ledger.ts` — file layout, `money.ts`, `dates.ts`, `stats.ts`,
  `balances.ts`, `csv.ts`, `seed.ts` — pure logic
- `src/components/` — one component per file
