import { describe, expect, it } from "vitest";
import { evaluateCase } from "@/lib/engine/evaluate";
import type { RabiesVaccinationInput, RequirementSpec } from "@/lib/engine/types";
import { TODAY, animal, caseInput, kb, leg, okStatus, req, rule } from "./helpers";

const vax = (date: string, durationYears: 1 | 3 = 1): RabiesVaccinationInput => ({ date, durationYears, vaccineType: "inactivated" });

const chip = rule("chip", { kind: "microchip", iso: true }, { category: "identification" });
const japanSeries: RequirementSpec = {
  kind: "rabies_series",
  count: 2,
  minAgeDays: 91,
  minIntervalDays: 30,
  afterMicrochip: true,
  requireContinuity: true,
  acceptedTypes: ["inactivated", "recombinant"],
};
const series = rule("rabies", japanSeries, { category: "vaccination" });
const titer = rule(
  "titer",
  {
    kind: "rabies_titer",
    minIUml: 0.5,
    labs: ["KSU", "DOD"],
    sampleOnOrAfterDose: 2,
    withinVaccineValidity: true,
    waitFrom: "sample",
    waitDays: 180,
    validFor: { years: 2 },
  },
  { category: "testing" },
);
const japanKb = kb([chip, series, titer]);

describe("microchip", () => {
  it("is satisfied by an ISO chip", () => {
    expect(req(evaluateCase(caseInput(), japanKb, okStatus(), TODAY), "chip").status).toBe("satisfied");
  });

  it("requires implanting when there is no chip", () => {
    const r = req(evaluateCase(caseInput({ animal: animal({ microchip: { status: "none" } }) }), japanKb, okStatus(), TODAY), "chip");
    expect(r.status).toBe("action_required");
    expect(r.actions[0].earliest).toBe(TODAY);
  });

  it("requires an ISO chip when only a non-ISO chip is present", () => {
    const input = caseInput({ animal: animal({ microchip: { status: "non_iso", implantDate: "2022-03-01" } }) });
    expect(req(evaluateCase(input, japanKb, okStatus(), TODAY), "chip").status).toBe("action_required");
  });

  it("cannot be determined when chip status is unknown", () => {
    const input = caseInput({ animal: animal({ microchip: { status: "unknown" } }) });
    expect(req(evaluateCase(input, japanKb, okStatus(), TODAY), "chip").status).toBe("cannot_determine");
  });
});

describe("rabies_series", () => {
  it("is satisfied by two vaccinations 30 days apart after the chip, valid at arrival", () => {
    const input = caseInput({ animal: animal({ rabiesVaccinations: [vax("2026-01-10"), vax("2026-02-09", 3)] }) });
    const r = req(evaluateCase(input, japanKb, okStatus(), TODAY), "rabies");
    expect(r.status).toBe("satisfied");
  });

  it("does not count a second dose given fewer than 30 days after the first", () => {
    const input = caseInput({ animal: animal({ rabiesVaccinations: [vax("2026-01-10"), vax("2026-02-08")] }) });
    const r = req(evaluateCase(input, japanKb, okStatus(), TODAY), "rabies");
    expect(r.status).toBe("action_required");
    expect(r.actions[0].earliest).toBe(TODAY);
    expect(r.actions[0].latest).toBe("2027-02-08");
  });

  it("ignores a dose given before 91 days of age", () => {
    const input = caseInput({
      legs: [leg({ departDate: "2027-06-01", arriveDate: "2027-06-02" })],
      animal: animal({ birthDate: "2026-01-01", microchip: { status: "iso", implantDate: "2026-02-01" }, rabiesVaccinations: [vax("2026-03-15"), vax("2026-04-20")] }),
    });
    const r = req(evaluateCase(input, japanKb, okStatus(), TODAY), "rabies");
    expect(r.status).toBe("action_required");
    expect(r.findings.join(" ")).toMatch(/2026-03-15.*91 days/);
  });

  it("ignores a dose given before the microchip", () => {
    const input = caseInput({ animal: animal({ microchip: { status: "iso", implantDate: "2026-01-20" }, rabiesVaccinations: [vax("2026-01-10"), vax("2026-02-09", 3)] }) });
    const r = req(evaluateCase(input, japanKb, okStatus(), TODAY), "rabies");
    expect(r.status).toBe("action_required");
    expect(r.findings.join(" ")).toMatch(/2026-01-10.*before the microchip/);
  });

  it("restarts the series when continuity was broken and the last dose has expired", () => {
    const input = caseInput({ animal: animal({ rabiesVaccinations: [vax("2023-01-01"), vax("2024-06-01")] }) });
    const r = req(evaluateCase(input, japanKb, okStatus(), TODAY), "rabies");
    expect(r.status).toBe("action_required");
    expect(r.actions.map((a) => a.earliest)).toEqual([TODAY, "2026-11-08"]);
  });

  it("asks for a booster inside the current validity when the series would lapse before arrival", () => {
    const input = caseInput({ animal: animal({ rabiesVaccinations: [vax("2025-11-01"), vax("2025-12-15")] }) });
    const r = req(evaluateCase(input, japanKb, okStatus(), TODAY), "rabies");
    expect(r.status).toBe("action_required");
    expect(r.actions[0].label).toMatch(/booster/i);
    expect(r.actions[0].latest).toBe("2026-12-15");
  });

  it("enforces a minimum gap between the most recent dose and arrival (Hawaii-style)", () => {
    const hawaiiSeries = rule(
      "hi-rabies",
      { kind: "rabies_series", count: 2, minIntervalDays: 31, afterMicrochip: false, requireContinuity: false, minDaysBeforeArrival: 31 },
      { leg: { to: ["US-HI"], from: ["US"] } },
    );
    const hiLeg = leg({ to: "US-HI", departDate: "2026-11-15", arriveDate: "2026-11-15", arrivalPort: "HNL" });
    const ok = caseInput({ legs: [hiLeg], animal: animal({ rabiesVaccinations: [vax("2024-01-01", 3), vax("2024-03-01", 3)] }) });
    expect(req(evaluateCase(ok, kb([hawaiiSeries]), okStatus(), TODAY), "hi-rabies").status).toBe("satisfied");

    const soonLeg = { ...hiLeg, departDate: "2026-10-20", arriveDate: "2026-10-20" };
    const recent = caseInput({ legs: [soonLeg], animal: animal({ rabiesVaccinations: [vax("2024-01-01", 3), vax("2024-03-01", 3), vax("2026-10-01")] }) });
    const result = evaluateCase(recent, kb([hawaiiSeries]), okStatus(), TODAY);
    expect(req(result, "hi-rabies").earliestArrival).toBe("2026-11-01");
    expect(result.legs[0].achievable).toBe(false);
  });
});

describe("rabies_titer", () => {
  const vaccinated = [vax("2026-01-10"), vax("2026-02-09", 3)];

  it("is satisfied by a passing sample after the second dose with the wait complete", () => {
    const input = caseInput({ animal: animal({ rabiesVaccinations: vaccinated, titerTests: [{ sampleDate: "2026-02-09", resultIUml: 0.9, lab: "KSU" }] }) });
    expect(req(evaluateCase(input, japanKb, okStatus(), TODAY), "titer").status).toBe("satisfied");
  });

  it("makes a six-weeks-out trip not achievable and reports the earliest compliant arrival", () => {
    const input = caseInput({
      legs: [leg({ departDate: "2026-11-19", arriveDate: "2026-11-20" })],
      animal: animal({ rabiesVaccinations: vaccinated }),
    });
    const result = evaluateCase(input, japanKb, okStatus(), TODAY);
    const r = req(result, "titer");
    expect(r.status).toBe("action_required");
    expect(r.earliestArrival).toBe("2027-04-07");
    expect(r.calc).toContainEqual({ label: "Earliest arrival", expr: "Sample 2026-10-09 + 180 days", date: "2027-04-07" });
    expect(result.legs[0].earliestCompliantArrival).toBe("2027-04-07");
    expect(result.readiness).toBe("not_achievable");
  });

  it("rejects a result below 0.5 IU/ml or from an unapproved lab", () => {
    for (const test of [
      { sampleDate: "2026-02-09", resultIUml: 0.3, lab: "KSU" as const },
      { sampleDate: "2026-02-09", resultIUml: 0.9, lab: "other" as const },
    ]) {
      const input = caseInput({ animal: animal({ rabiesVaccinations: vaccinated, titerTests: [test] }) });
      expect(req(evaluateCase(input, japanKb, okStatus(), TODAY), "titer").status).toBe("action_required");
    }
  });

  it("rejects a sample drawn before the second dose", () => {
    const input = caseInput({ animal: animal({ rabiesVaccinations: vaccinated, titerTests: [{ sampleDate: "2026-02-01", resultIUml: 0.9, lab: "KSU" }] }) });
    const r = req(evaluateCase(input, japanKb, okStatus(), TODAY), "titer");
    expect(r.status).toBe("action_required");
    expect(r.findings.join(" ")).toMatch(/2026-02-01.*before dose 2/);
  });

  it("cannot check a sample against the microchip without an implant date", () => {
    const favn = rule("favn", { kind: "rabies_titer", minIUml: 0.5, labs: ["KSU"], sampleOnOrAfterDose: 0, afterMicrochip: true, withinVaccineValidity: false, waitFrom: "sample", waitDays: 30, validFor: { months: 36 } });
    const input = caseInput({ animal: animal({ microchip: { status: "iso" }, titerTests: [{ sampleDate: "2026-06-01", resultIUml: 0.9, lab: "KSU" }] }) });
    const r = req(evaluateCase(input, kb([chip, favn]), okStatus(), TODAY), "favn");
    expect(r.status).toBe("cannot_determine");
    expect(r.findings.join(" ")).toMatch(/implant date/i);
  });

  it("does not fall back to raw vaccination dates when the series could not be evaluated", () => {
    const input = caseInput({ animal: animal({ birthDate: undefined, rabiesVaccinations: vaccinated, titerTests: [{ sampleDate: "2026-02-09", resultIUml: 0.9, lab: "KSU" }] }) });
    const result = evaluateCase(input, japanKb, okStatus(), TODAY);
    expect(req(result, "rabies").status).toBe("cannot_determine");
    expect(req(result, "titer").status).toBe("cannot_determine");
  });

  it("chains projected dates when nothing has been done yet", () => {
    const input = caseInput({ animal: animal({ microchip: { status: "none" } }) });
    const result = evaluateCase(input, japanKb, okStatus(), TODAY);
    expect(req(result, "titer").actions[0].earliest).toBe("2026-11-08");
    expect(req(result, "titer").earliestArrival).toBe("2027-05-07");
  });

  it("measures the Hawaii wait from the day after the lab received the sample", () => {
    const hiTiter = rule(
      "hi-titer",
      { kind: "rabies_titer", minIUml: 0.5, labs: ["AU", "KSU", "MU", "DOD"], sampleOnOrAfterDose: 0, withinVaccineValidity: false, waitFrom: "day_after_lab_receipt", waitDays: 30, validFor: { months: 36 } },
      { leg: { to: ["US-HI"], from: ["US"] } },
    );
    const hiLeg = leg({ to: "US-HI", departDate: "2026-10-30", arriveDate: "2026-10-30", arrivalPort: "HNL" });
    const base = { rabiesVaccinations: [vax("2024-01-01", 3), vax("2024-03-01", 3)] };
    const received = caseInput({ legs: [hiLeg], animal: animal({ ...base, titerTests: [{ sampleDate: "2026-09-25", labReceivedDate: "2026-09-29", resultIUml: 1.2, lab: "KSU" }] }) });
    const r = req(evaluateCase(received, kb([hiTiter]), okStatus(), TODAY), "hi-titer");
    expect(r.status).toBe("satisfied");
    expect(r.calc).toContainEqual({ label: "Earliest arrival", expr: "Lab receipt 2026-09-29 + 1 day + 30 days", date: "2026-10-30" });

    const noReceipt = caseInput({ legs: [hiLeg], animal: animal({ ...base, titerTests: [{ sampleDate: "2026-09-25", resultIUml: 1.2, lab: "KSU" }] }) });
    expect(req(evaluateCase(noReceipt, kb([hiTiter]), okStatus(), TODAY), "hi-titer").status).toBe("cannot_determine");
  });
});

describe("rabies_titer without a dose-order constraint", () => {
  it("accepts a sample regardless of vaccination order when the source sets none", () => {
    const anyOrder = rule(
      "favn",
      { kind: "rabies_titer", minIUml: 0.5, labs: ["KSU"], sampleOnOrAfterDose: 0, withinVaccineValidity: false, waitFrom: "sample", waitDays: 30, validFor: { months: 36 } },
      {},
    );
    const input = caseInput({ animal: animal({ rabiesVaccinations: [vax("2026-05-01", 3)], titerTests: [{ sampleDate: "2026-04-01", resultIUml: 0.8, lab: "KSU" }] }) });
    expect(req(evaluateCase(input, kb([anyOrder]), okStatus(), TODAY), "favn").status).toBe("satisfied");
  });
});
