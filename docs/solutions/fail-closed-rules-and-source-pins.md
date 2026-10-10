# Fail closed: silent-pass paths in the engine and source checks

**Date**: 2026-10-09

## The problem

The product promise is "uncertainty is surfaced, not hidden." Each of these paths passed review and tests, but a requirement could still read "satisfied", or a source "OK", when the underlying fact was missing:

- `rabiesTiter` skipped its "sample after microchip" check when there was no implant date (`spec.afterMicrochip && ctx.chip && …`).
- When the rabies-series evaluator bailed early, the titer evaluator fell back to the raw vaccination list. That list included doses the series had rejected (given before the chip, too young, wrong type).
- A timed step recorded as completed was accepted against the *projected* date of a prerequisite that hadn't happened yet. Future completion dates were accepted too.
- The "Japan is absent from the CDC high-risk list" check passes on its own if the list ever moves or empties.
- Hawaii's Checklist 1 is a dated PDF URL. A new checklist would be published at a new URL, so the pinned PDF's hash never changes.
- An unmodeled pathway (CDC high-risk dogs) showed as a manual-review item, so readiness topped out at "Potentially ready" instead of "Unsupported".

All rules were `review: null`, which put every case into manual review and hid these problems.

## The solution / decision

- A dependent evaluator returns `cannot_determine` when its upstream input is missing; it never falls back. See the guards at the top of `rabiesTiter` in `lib/engine/requirements.ts`.
- `actionDates` entries carry `done: boolean`. A completion counts only if it's ≤ today, inside the window, and every `after` prerequisite is also *done* on or before it.
- An absent-check needs a **positive control** from the same source: `"Haiti"` sits next to `"Japan", absent: true` in `lib/kb/countries.ts`.
- To pin a dated document, quote its URL as evidence from the page that links to it (the `CHECKLIST_URL` evidence in `lib/kb/rules/hawaii.ts`). If the agency links a new version, the quote goes missing and every rule citing the checklist drops to manual review.
- `Rule.unsupported` turns an out-of-coverage pathway into an unsupported leg, with no partial plan.
- A reviewed rule needs a hash for every source it cites. This is enforced in `verifyRule` and in the KB integrity test.

## Why it wasn't obvious

Every individual check looked correct. The bugs live in what happens when a check *can't run*: an `&&` short-circuit, a `??` fallback, an absence that is also true when nothing was parsed. Tests built from complete fixtures never take those paths. To find these, ask of each guard: "what does this return when its input is null?"

## Pointers

- `lib/engine/requirements.ts`: `rabiesTiter` guards, `timedAction` completion checks
- `lib/engine/evaluate.ts`: `outOfScope` handling
- Tests: `tests/engine/{rabies,timing,applicability,verification}.test.ts`, plus the e2e "fully prepared case still waits on veterinary review"
- `npm run sources:check` validates new quotes against the live pages; `tests/kb/integrity.test.ts` validates them against the committed snapshots
