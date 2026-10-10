import { describe, expect, it } from "vitest";
import { evaluateCase } from "@/lib/engine/evaluate";
import { TODAY, animal, caseInput, kb, leg, okStatus, req, rule } from "./helpers";

const notification = rule("notify", { kind: "timed_action", anchor: "arrival", minBefore: { days: 40 } }, { performedBy: "owner" });
const exam = rule("exam", { kind: "timed_action", anchor: "departure", maxBefore: { days: 10 } }, { category: "examination" });
const endorsement = rule("endorse", { kind: "timed_action", anchor: "departure", minBefore: { days: 0 }, after: ["exam"] }, { performedBy: "usda" });

describe("timed_action", () => {
  it("computes the latest date from the arrival anchor and shows the arithmetic", () => {
    const r = req(evaluateCase(caseInput(), kb([notification]), okStatus(), TODAY), "notify");
    expect(r.status).toBe("action_required");
    expect(r.actions[0].earliest).toBe(TODAY);
    expect(r.actions[0].latest).toBe("2027-01-21");
    expect(r.actions[0].calc).toContainEqual({ label: "Latest", expr: "Arrival 2027-03-02 − 40 days", date: "2027-01-21" });
  });

  it("is satisfied when the vet marked it completed inside the window", () => {
    const r = req(evaluateCase(caseInput({ completed: { "notify@0": "2026-10-01" } }), kb([notification]), okStatus(), TODAY), "notify");
    expect(r.status).toBe("satisfied");
  });

  it("is not satisfied when the completed date falls outside the window", () => {
    const input = caseInput({ completed: { "exam@0": "2026-10-01" } });
    const r = req(evaluateCase(input, kb([exam]), okStatus(), TODAY), "exam");
    expect(r.status).toBe("action_required");
    expect(r.findings.join(" ")).toMatch(/2026-10-01.*outside/);
  });

  it("ignores a completion date that is still in the future", () => {
    const r = req(evaluateCase(caseInput({ completed: { "notify@0": "2026-10-10" } }), kb([notification]), okStatus(), TODAY), "notify");
    expect(r.status).toBe("action_required");
    expect(r.findings.join(" ")).toMatch(/2026-10-10.*future/);
  });

  it("windows an exam to the 10 days before departure", () => {
    const r = req(evaluateCase(caseInput(), kb([exam]), okStatus(), TODAY), "exam");
    expect(r.actions[0].earliest).toBe("2027-02-19");
    expect(r.actions[0].latest).toBe("2027-03-01");
    expect(r.actions[0].recommended).toBeDefined();
  });

  it("flags a trip as not achievable when the window has already closed, with the earliest compliant arrival", () => {
    const input = caseInput({ legs: [leg({ departDate: "2026-11-01", arriveDate: "2026-11-01" })] });
    const result = evaluateCase(input, kb([notification]), okStatus(), TODAY);
    expect(req(result, "notify").earliestArrival).toBe("2026-11-18");
    expect(result.legs[0].achievable).toBe(false);
    expect(result.legs[0].earliestCompliantArrival).toBe("2026-11-18");
    expect(result.readiness).toBe("not_achievable");
  });

  it("starts a dependent action no earlier than the action it follows", () => {
    const result = evaluateCase(caseInput(), kb([exam, endorsement]), okStatus(), TODAY);
    expect(req(result, "endorse").actions[0].earliest).toBe("2027-02-19");
    expect(req(result, "endorse").actions[0].latest).toBe("2027-03-01");
  });

  it("accepts a dependent step as completed only on or after its completed prerequisite", () => {
    const legs = [leg({ departDate: "2026-10-15", arriveDate: "2026-10-16" })];
    const endorse = (completed: Record<string, string>) =>
      req(evaluateCase(caseInput({ legs, completed }), kb([exam, endorsement]), okStatus(), TODAY), "endorse").status;
    expect(endorse({ "exam@0": "2026-10-07", "endorse@0": "2026-10-08" })).toBe("satisfied");
    expect(endorse({ "exam@0": "2026-10-07", "endorse@0": "2026-10-06" })).toBe("action_required");
    expect(endorse({ "endorse@0": TODAY })).toBe("action_required");
  });
});

describe("min_age", () => {
  const sixMonths = rule("age", { kind: "min_age", atArrival: { months: 6 } }, { leg: { to: ["US"], fromNot: ["US"] }, category: "entry_condition" });
  const returnLeg = leg({ from: "JP", to: "US-CA", departDate: "2026-11-14", arriveDate: "2026-11-15" });

  it("is satisfied when the animal is old enough at arrival", () => {
    const r = req(evaluateCase(caseInput({ legs: [returnLeg] }), kb([sixMonths]), okStatus(), TODAY), "age");
    expect(r.status).toBe("satisfied");
  });

  it("pushes the earliest compliant arrival out to the age threshold", () => {
    const input = caseInput({ legs: [returnLeg], animal: animal({ birthDate: "2026-06-01" }) });
    const result = evaluateCase(input, kb([sixMonths]), okStatus(), TODAY);
    expect(req(result, "age").status).toBe("action_required");
    expect(req(result, "age").earliestArrival).toBe("2026-12-01");
    expect(result.legs[0].achievable).toBe(false);
  });

  it("cannot be determined without a date of birth", () => {
    const input = caseInput({ legs: [returnLeg], animal: animal({ birthDate: undefined }) });
    const r = req(evaluateCase(input, kb([sixMonths]), okStatus(), TODAY), "age");
    expect(r.status).toBe("cannot_determine");
    expect(r.verification.state).toBe("manual_review");
  });
});
