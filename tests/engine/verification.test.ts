import { describe, expect, it } from "vitest";
import { evaluateCase } from "@/lib/engine/evaluate";
import type { Rule, StatusMap } from "@/lib/engine/types";
import { TODAY, caseInput, kb, okStatus, req, rule, sourceStatus } from "./helpers";

const chip = rule("chip", { kind: "microchip", iso: true }, { category: "identification" });

function verify(r: Rule, status: StatusMap = okStatus()) {
  return req(evaluateCase(caseInput(), kb([r]), status, TODAY), r.id).verification;
}

describe("verification state", () => {
  it("is verified when vet-reviewed, fresh, unchanged and every quote is present", () => {
    expect(verify(chip)).toEqual({ state: "verified", reasons: [] });
  });

  it("requires manual review for a rule no veterinarian has reviewed", () => {
    const v = verify({ ...chip, review: null });
    expect(v.state).toBe("manual_review");
    expect(v.reasons.join(" ")).toMatch(/not yet reviewed by a licensed veterinarian/i);
  });

  it("recommends review when the source changed but the quoted text is still present", () => {
    const v = verify(chip, { ...okStatus(), s1: sourceStatus({ hash: "h1-changed" }) });
    expect(v.state).toBe("verified_review");
    expect(v.reasons.join(" ")).toMatch(/changed since.*review/i);
  });

  it("requires manual review when the veterinary review recorded no hash for a cited source", () => {
    const v = verify({ ...chip, evidence: [...chip.evidence, { sourceId: "s2", excerpt: "chip excerpt 2" }] });
    expect(v.state).toBe("manual_review");
    expect(v.reasons.join(" ")).toMatch(/S2.*not part of the veterinary review/i);
  });

  it("requires manual review when a quoted excerpt is no longer in the source", () => {
    const v = verify(chip, { ...okStatus(), s1: sourceStatus({ hash: "h1-changed", missingExcerpts: ["chip#0"] }) });
    expect(v.state).toBe("manual_review");
    expect(v.reasons.join(" ")).toMatch(/no longer appears/i);
  });

  it("requires manual review when the source has not been verified within its freshness limit", () => {
    const v = verify(chip, { ...okStatus(), s1: sourceStatus({ lastAttempt: "2026-10-01T06:00:00Z", lastOk: "2026-10-01T06:00:00Z" }) });
    expect(v.state).toBe("manual_review");
    expect(v.reasons.join(" ")).toMatch(/8 days ago.*3 days/);
  });

  it("requires manual review when the latest retrieval failed, even if an older copy exists", () => {
    const v = verify(chip, { ...okStatus(), s1: sourceStatus({ ok: false, error: "HTTP 503", lastOk: "2026-10-08T06:00:00Z" }) });
    expect(v.state).toBe("manual_review");
    expect(v.reasons.join(" ")).toMatch(/HTTP 503/);
  });

  it("requires manual review when the source has never been checked", () => {
    expect(verify(chip, { s2: sourceStatus() }).state).toBe("manual_review");
  });

  it("requires manual review for a documented conflict between authoritative sources", () => {
    const conflicted: Rule = { ...chip, conflict: { evidence: [{ sourceId: "s2", excerpt: "other wording" }], systemView: "S1 governs." } };
    const v = verify(conflicted);
    expect(v.state).toBe("manual_review");
    expect(v.reasons.join(" ")).toMatch(/conflict/i);
  });

  it("recommends review for rules flagged as complex", () => {
    expect(verify({ ...chip, reviewRecommended: "Exceptions exist." }).state).toBe("verified_review");
  });
});

describe("readiness and counts", () => {
  const exam = rule("exam", { kind: "timed_action", anchor: "departure", maxBefore: { days: 10 } });

  it("is satisfied only when every applicable requirement is met and verified", () => {
    const result = evaluateCase(caseInput(), kb([chip]), okStatus(), TODAY);
    expect(result.readiness).toBe("satisfied");
    expect(result.counts).toEqual({ applicable: 1, satisfied: 1, actionRequired: 0, manualReview: 0 });
  });

  it("is review_required when everything is met but something needs manual review", () => {
    const result = evaluateCase(caseInput(), kb([{ ...chip, review: null }]), okStatus(), TODAY);
    expect(result.readiness).toBe("review_required");
    expect(result.counts.manualReview).toBe(1);
    expect(result.unreviewedRules).toBe(1);
  });

  it("is not_ready while actions remain, and still counts manual reviews separately", () => {
    const result = evaluateCase(caseInput(), kb([{ ...chip, review: null }, exam]), okStatus(), TODAY);
    expect(result.readiness).toBe("not_ready");
    expect(result.counts).toEqual({ applicable: 2, satisfied: 1, actionRequired: 1, manualReview: 1 });
  });
});

describe("verification of supporting material", () => {
  it("requires manual review for a rule that marks a pathway V1 does not model", () => {
    const v = verify({ ...chip, manualReview: "High-risk pathway is not modeled in V1." });
    expect(v.state).toBe("manual_review");
    expect(v.reasons).toContain("High-risk pathway is not modeled in V1.");
  });

  it("flags when the conflicting source's text disappears, since the conflict may have been resolved", () => {
    const conflicted: Rule = { ...chip, conflict: { evidence: [{ sourceId: "s2", excerpt: "other wording" }], systemView: "S1 governs." } };
    const v = verify(conflicted, { ...okStatus(), s2: sourceStatus({ hash: "h2", missingExcerpts: ["chip#conflict-0"] }) });
    expect(v.reasons.join(" ")).toMatch(/conflicting text.*no longer appears/i);
  });

  it("explains an 'absent' check that now fails as the source listing the item", () => {
    const absent: Rule = { ...chip, evidence: [{ sourceId: "s1", excerpt: "Japan", absent: true }] };
    const v = verify(absent, { ...okStatus(), s1: sourceStatus({ missingExcerpts: ["chip#0"] }) });
    expect(v.state).toBe("manual_review");
    expect(v.reasons.join(" ")).toMatch(/now lists "Japan"/);
  });
});
