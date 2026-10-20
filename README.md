# VetTravel Verify

Decision support for veterinarians preparing dogs and cats for travel. Each requirement in a plan is traceable to a quoted, re-verified official source, and anything uncertain is flagged for manual review instead of hidden.

Prototype scope: personal pets, California → France (EU) → California, California → Japan → California, California → Hawaii (Honolulu) → California, and U.S. re-entry from France and Japan.

## Run

```bash
npm install
npm run dev            # http://localhost:3000
npm test               # engine, knowledge-base integrity, golden cases
npm run test:e2e       # Playwright (builds and serves on :3100)
npm run sources:check  # re-fetch every source, update snapshots + data/status.json
```

## How it fits together

- `lib/engine/` — deterministic evaluation: applicability, date windows (Temporal `PlainDate`, calculations shown), earliest compliant arrival, verification state. No AI at runtime.
- `lib/kb/` — the knowledge base: `sources.ts`, `rules/*.ts`, `countries.ts`, `coverage.ts`. Rules are typed data with verbatim evidence excerpts.
- `data/snapshots/` + `data/status.json` — extracted text of each source and its latest check (hash, retrieval result, quotes no longer found).
- `app/` — case flow (`/case/*`, state kept in `sessionStorage` only) and the rule browser at `/kb`.
- `proxy.ts` — pilot gate. Set `PILOT_CODES=code:vetId,code:vetId` (see `.env.example`) and every page redirects to `/access` until a valid code is entered. Unset, the app is open locally and refuses all requests on Vercel.

Verification states per requirement:

- **Manual review required** — rule not yet vet-reviewed, source unreachable or past its freshness limit (3 days high-risk, 14 standard), a quoted excerpt no longer present, a documented conflict, or missing case information.
- **Verified — review recommended** — source changed since review but quotes intact, or the rule carries a review note.
- **Verified** — otherwise.

## Curating rules

1. Add or update the source in `lib/kb/sources.ts`, run `npm run source:dump -- <url>` to pick a stable selector, then `npm run sources:check -- <source-id>`.
2. Write the rule with excerpts copied from `data/snapshots/<source-id>.txt`. `npm test` fails if any quote is not in the snapshot.
3. A licensed veterinarian reviews the rule at `/kb`. Record sign-off in the rule's `review` field (`by`, `at`, and the current `sourceHashes` from `data/status.json`).
4. Add or update a golden case in `tests/cases/golden.test.ts`.

`.github/workflows/check-sources.yml` runs the source check daily, commits new snapshots, and opens an issue when a source changes or fails. Affected rules downgrade automatically until re-reviewed.
