# CRMPLE — Claude Code Quick-Start

**Read order before touching code:**
1. `SHARED.md` — file schemas, Firestore model, build plan
2. `src/types.ts` — TypeScript types
3. `src/lib/parsers.ts` — client-side parsers (CSV + both TXT formats)
4. `src/lib/firebase.ts` — Firestore read/write helpers

## Ground Rules

- All file parsing runs **client-side only**. No server endpoints. No cloud LLMs on user data.
- Firestore writes must be **idempotent** — re-upload same file = no duplicates.
- Small, single-purpose components. One view = one folder under `src/views/` or `src/components/`.
- TypeScript strict. No `any`. No `@ts-ignore`.
- Mobile-first layout. Test at 375px. Tailwind breakpoints `sm:md:lg`.
- Don't push without Benni's explicit OK.

## Current Phase

**Phase 1 — Customer CSV Upload + Account Table**

Commit history tells you what's done. `git log --oneline` is your progress bar.

## Project Structure (as it grows)

```
src/
  App.tsx           — top-level layout + tab navigation
  main.tsx          — React entry
  index.css         — Tailwind v4 import + theme customisation
  vite-env.d.ts
  types.ts          — shared TS types
  lib/
    firebase.ts     — Firestore init + CRUD helpers
    parsers.ts      — parseCustomerCSV / parseALM / parseOnTap
  components/
    UploadZone/     — drag-and-drop + preview + errors
    ColumnMapper/   — dropdown mapping when headers don't match
    AccountTable/   — sortable / filterable customer list
  views/
    TerritoryOverview/
    DelistImpact/
    ScanVelocity/
    AccountDetail/
```

## Data Reference (see SHARED.md for full schemas)

| Collection | Key field | Populated by |
|---|---|---|
| `customers` | `account_id` (doc id) | Customer CSV upload |
| `delist_events` | `sku_code + effective_date` | ALM TXT upload |
| `delist_impacts` | auto-id | Cross-ref on ALM upload |
| `scan_data` | auto-id | OnTap TXT upload |
| `upload_log` | auto-id | Every upload |

## Build

```bash
npm run dev     # Vite dev server, localhost:5173
npm run build   # tsc + vite build
```
