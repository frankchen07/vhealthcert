import { daysFrom, pd, type PlainDate } from "./dates";
import type { Evidence, RequirementStatus, Rule, Source, StatusMap, VerificationState } from "./types";

export const MAX_STALE_DAYS: Record<Source["risk"], number> = { high: 3, standard: 14 };

export const sourceAgeDays = (lastOk: string, today: PlainDate) => daysFrom(pd(lastOk.slice(0, 10)), today);

/** Freshness and retrieval problems for the source behind a piece of evidence. */
export function sourceProblems(sourceId: string, sources: Map<string, Source>, status: StatusMap, today: PlainDate): string[] {
  const source = sources.get(sourceId);
  const title = source?.title ?? sourceId;
  const s = status[sourceId];
  if (!source || !s) return [`${title}: has never been verified.`];
  if (!s.ok) return [`${title}: the latest retrieval failed (${s.error ?? "unknown error"}) on ${s.lastAttempt.slice(0, 10)}.`];
  if (!s.lastOk) return [`${title}: has never been verified.`];
  const age = sourceAgeDays(s.lastOk, today);
  const limit = MAX_STALE_DAYS[source.risk];
  return age > limit ? [`${title}: last verified ${age} days ago (limit ${limit} days).`] : [];
}

export function excerptProblem(evidence: Evidence, key: string, sources: Map<string, Source>, status: StatusMap): string | null {
  if (!status[evidence.sourceId]?.missingExcerpts.includes(key)) return null;
  const title = sources.get(evidence.sourceId)?.title ?? evidence.sourceId;
  return evidence.absent
    ? `${title}: now lists "${evidence.excerpt}".`
    : `${title}: the quoted text no longer appears in the current source.`;
}

export function verifyRule(
  rule: Rule,
  sources: Map<string, Source>,
  status: StatusMap,
  today: PlainDate,
  outcome: RequirementStatus,
  reviewNotes: string[] = [],
): { state: VerificationState; reasons: string[] } {
  const manual = new Set<string>();
  const review = new Set<string>();

  if (!rule.review) manual.add("Not yet reviewed by a licensed veterinarian.");
  if (rule.manualReview) manual.add(rule.manualReview);

  rule.evidence.forEach((evidence, i) => {
    sourceProblems(evidence.sourceId, sources, status, today).forEach((p) => manual.add(p));
    const missing = excerptProblem(evidence, `${rule.id}#${i}`, sources, status);
    const reviewedHash = rule.review?.sourceHashes[evidence.sourceId];
    const currentHash = status[evidence.sourceId]?.hash;
    const title = sources.get(evidence.sourceId)?.title ?? evidence.sourceId;
    if (missing) {
      manual.add(missing);
    } else if (rule.review && !reviewedHash) {
      manual.add(`${title}: not part of the veterinary review.`);
    } else if (reviewedHash && currentHash && currentHash !== reviewedHash) {
      review.add(`${title}: changed since the veterinary review; the quoted text is still present.`);
    }
  });

  if (rule.conflict) {
    manual.add("Authoritative sources conflict on this requirement — compare both excerpts.");
    rule.conflict.evidence.forEach((evidence, i) => {
      sourceProblems(evidence.sourceId, sources, status, today).forEach((p) => manual.add(p));
      if (status[evidence.sourceId]?.missingExcerpts.includes(`${rule.id}#conflict-${i}`)) {
        const title = sources.get(evidence.sourceId)?.title ?? evidence.sourceId;
        manual.add(`${title}: the conflicting text no longer appears — the conflict may have been resolved.`);
      }
    });
  }
  if (outcome === "cannot_determine") manual.add("Missing or unclear information prevents an automated determination.");
  if (rule.reviewRecommended) review.add(rule.reviewRecommended);
  reviewNotes.forEach((n) => review.add(n));

  const state: VerificationState = manual.size ? "manual_review" : review.size ? "verified_review" : "verified";
  return { state, reasons: [...manual, ...review] };
}
