import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateCase } from "@/lib/engine/evaluate";
import type { AnimalInput, CaseInput, RabiesVaccinationInput, StatusMap } from "@/lib/engine/types";
import { KB } from "@/lib/kb";

const TODAY = "2026-10-09";
const committed: StatusMap = JSON.parse(readFileSync(path.join(__dirname, "../../data/status.json"), "utf8"));
const fresh: StatusMap = Object.fromEntries(
  Object.entries(committed).map(([id, s]) => [id, { ...s, ok: true, lastOk: `${TODAY}T06:00:00Z`, lastAttempt: `${TODAY}T06:00:00Z` }]),
);

const vax = (date: string, durationYears: 1 | 3): RabiesVaccinationInput => ({ date, durationYears, vaccineType: "inactivated" });
const dog = (overrides: Partial<AnimalInput> = {}): AnimalInput => ({
  species: "dog",
  birthDate: "2020-05-01",
  breed: "Labrador Retriever",
  microchip: { status: "iso", implantDate: "2020-06-01" },
  rabiesVaccinations: [vax("2025-03-01", 1), vax("2025-12-20", 3)],
  titerTests: [],
  otherCountriesLast6Months: [],
  ...overrides,
});
const evaluate = (input: Partial<CaseInput>) =>
  evaluateCase({ purpose: "personal", legs: [], animal: dog(), completed: {}, ...input }, KB, fresh, TODAY);
const find = (result: ReturnType<typeof evaluate>, id: string, leg = 0) => result.requirements.find((r) => r.ruleId === id && r.legIndex === leg)!;

describe("PRD §27: California to Japan in six weeks without a titer", () => {
  const result = evaluate({ legs: [{ from: "US-CA", to: "JP", departDate: "2026-11-19", arriveDate: "2026-11-20" }] });

  it("is not achievable and gives the earliest compliant arrival", () => {
    expect(result.readiness).toBe("not_achievable");
    expect(result.legs[0].earliestCompliantArrival).toBe("2027-04-07");
  });

  it("counts the existing vaccinations and surfaces the APHIS/AQS interval conflict", () => {
    const rabies = find(result, "jp-rabies-vaccinations");
    expect(rabies.status).toBe("satisfied");
    expect(rabies.verification.state).toBe("manual_review");
    expect(rabies.verification.reasons.join(" ")).toMatch(/conflict/i);
  });

  it("schedules the titer sample now", () => {
    const titer = find(result, "jp-rabies-titer");
    expect(titer.actions[0].earliest).toBe(TODAY);
    expect(titer.earliestArrival).toBe("2027-04-07");
  });

  it("marks every rule as awaiting veterinary review while the knowledge base is a draft", () => {
    expect(result.unreviewedRules).toBe(KB.rules.length);
  });
});

describe("prepared dog: California → Japan → California", () => {
  const result = evaluate({
    legs: [
      { from: "US-CA", to: "JP", departDate: "2026-12-01", arriveDate: "2026-12-02" },
      { from: "JP", to: "US-CA", departDate: "2027-01-15", arriveDate: "2027-01-15" },
    ],
    animal: dog({ titerTests: [{ sampleDate: "2026-01-05", resultIUml: 1.4, lab: "KSU" }] }),
  });

  it("is achievable with the remaining actions scheduled", () => {
    expect(result.legs.map((l) => l.achievable)).toEqual([true, true]);
    expect(result.readiness).toBe("not_ready");
    expect(find(result, "jp-rabies-titer").status).toBe("satisfied");
    expect(find(result, "jp-advance-notification").actions[0].latest).toBe("2026-10-23");
    expect(find(result, "jp-clinical-inspection").actions[0]).toMatchObject({ earliest: "2026-11-21", latest: "2026-12-01" });
    expect(find(result, "jp-usda-endorsement").actions[0].earliest).toBe("2026-11-21");
  });

  it("applies the CDC low-risk pathway and California rules on the way home", () => {
    expect(find(result, "us-cdc-dog-import-form", 1).actions[0]).toMatchObject({ earliest: TODAY, latest: "2027-01-15" });
    expect(find(result, "us-cdc-dog-age", 1).status).toBe("satisfied");
    expect(find(result, "us-cdc-dog-high-risk", 1).status).toBe("not_applicable");
    expect(find(result, "us-aphis-dog-screwworm", 1).status).toBe("not_applicable");
    expect(find(result, "ca-dog-rabies", 1).status).toBe("satisfied");
  });
});

describe("California → Hawaii (Honolulu)", () => {
  const prepared = dog({
    birthDate: "2021-02-01",
    microchip: { status: "iso", implantDate: "2021-03-01" },
    rabiesVaccinations: [vax("2024-01-01", 3), vax("2025-12-01", 3)],
    titerTests: [{ sampleDate: "2026-08-01", labReceivedDate: "2026-08-04", resultIUml: 0.9, lab: "KSU" }],
  });

  it("is achievable for a prepared dog, with document and certificate windows", () => {
    const result = evaluate({
      legs: [
        { from: "US-CA", to: "US-HI", departDate: "2026-11-15", arriveDate: "2026-11-15", arrivalPort: "HNL" },
        { from: "US-HI", to: "US-CA", departDate: "2026-11-29", arriveDate: "2026-11-29" },
      ],
      animal: prepared,
    });
    expect(result.readiness).toBe("not_ready");
    expect(find(result, "hi-favn").status).toBe("satisfied");
    expect(find(result, "hi-rabies-vaccinations").status).toBe("satisfied");
    expect(find(result, "hi-documents").actions[0].latest).toBe("2026-11-04");
    expect(find(result, "hi-health-certificate").actions[0]).toMatchObject({ earliest: "2026-11-01", latest: "2026-11-15" });
    expect(find(result, "ca-dog-rabies", 1).status).toBe("satisfied");
  });

  it("is not achievable in three weeks without a FAVN result", () => {
    const result = evaluate({
      legs: [{ from: "US-CA", to: "US-HI", departDate: "2026-10-30", arriveDate: "2026-10-30", arrivalPort: "HNL" }],
      animal: { ...prepared, titerTests: [] },
    });
    expect(result.readiness).toBe("not_achievable");
    expect(result.legs[0].earliestCompliantArrival).toBe("2026-11-09");
  });

  it("blocks a prohibited hybrid", () => {
    const result = evaluate({
      legs: [{ from: "US-CA", to: "US-HI", departDate: "2026-11-15", arriveDate: "2026-11-15", arrivalPort: "HNL" }],
      animal: { ...prepared, species: "cat", breed: "Bengal" },
    });
    expect(result.readiness).toBe("not_permitted");
  });
});

describe("California → France → California", () => {
  const roundTrip = [
    { from: "US-CA", to: "FR", departDate: "2026-11-10", arriveDate: "2026-11-11" },
    { from: "FR", to: "US-CA", departDate: "2026-12-01", arriveDate: "2026-12-01" },
  ];

  it("is achievable for a dog with a current booster, with certificate and endorsement windows", () => {
    const result = evaluate({ legs: roundTrip });
    expect(result.legs.map((l) => l.achievable)).toEqual([true, true]);
    expect(result.readiness).toBe("not_ready");
    expect(find(result, "eu-rabies-vaccination").status).toBe("satisfied");
    expect(find(result, "eu-health-certificate").actions[0]).toMatchObject({ earliest: "2026-10-12", latest: "2026-11-10" });
    expect(find(result, "eu-usda-endorsement").actions[0]).toMatchObject({ earliest: "2026-11-01", latest: "2026-11-10" });
    expect(find(result, "fr-category-1-dogs").status).toBe("satisfied");
    expect(find(result, "us-cdc-dog-import-form", 1).status).toBe("action_required");
    expect(find(result, "us-aphis-dog-screwworm", 1).status).toBe("not_applicable");
    expect(find(result, "ca-dog-rabies", 1).status).toBe("satisfied");
  });

  it("is not achievable two weeks after a puppy's primary vaccination", () => {
    const result = evaluate({
      legs: [{ from: "US-CA", to: "FR", departDate: "2026-10-16", arriveDate: "2026-10-17" }],
      animal: dog({ birthDate: "2026-06-01", microchip: { status: "iso", implantDate: "2026-08-01" }, rabiesVaccinations: [vax("2026-10-02", 1)] }),
    });
    expect(result.readiness).toBe("not_achievable");
    expect(result.legs[0].earliestCompliantArrival).toBe("2026-10-23");
  });

  it("blocks a pit bull", () => {
    const result = evaluate({ legs: roundTrip, animal: dog({ breed: "Pit Bull mix" }) });
    expect(result.readiness).toBe("not_permitted");
  });

  it("sends pedigree-dependent breeds to manual review instead of passing them", () => {
    for (const breed of ["American Staffordshire Terrier", "Tosa Inu", "English Mastiff"]) {
      const r = find(evaluate({ legs: roundTrip, animal: dog({ breed }) }), "fr-category-1-dogs");
      expect(r.status, breed).toBe("cannot_determine");
      expect(r.verification.state, breed).toBe("manual_review");
    }
    expect(find(evaluate({ legs: roundTrip, animal: dog({ breed: "Staffordshire Bull Terrier" }) }), "fr-category-1-dogs").status).toBe("satisfied");
  });

  it("applies only cat rules to a cat", () => {
    const result = evaluate({ legs: roundTrip, animal: dog({ species: "cat" }) });
    const ids = result.requirements.map((r) => r.ruleId);
    expect(ids).not.toContain("eu-tapeworm");
    expect(ids).not.toContain("fr-category-1-dogs");
    expect(ids.filter((id) => !id.startsWith("eu-")).sort()).toEqual(["ca-cat-entry", "us-cdc-cat-healthy"]);
  });
});

describe("cats and unsupported routes", () => {
  it("applies only cat rules on a cat's return from Japan", () => {
    const result = evaluate({
      legs: [{ from: "JP", to: "US-CA", departDate: "2027-01-15", arriveDate: "2027-01-15" }],
      animal: dog({ species: "cat" }),
    });
    expect(result.requirements.map((r) => r.ruleId).sort()).toEqual(["ca-cat-entry", "us-cdc-cat-healthy"]);
  });

  it("refuses routes outside coverage instead of giving a partial answer", () => {
    for (const leg of [
      { from: "US-CA", to: "MX", departDate: "2026-12-01", arriveDate: "2026-12-01" },
      { from: "US-HI", to: "JP", departDate: "2026-12-01", arriveDate: "2026-12-02" },
    ]) {
      const result = evaluate({ legs: [leg] });
      expect(result.readiness).toBe("unsupported");
      expect(result.requirements).toHaveLength(0);
    }
  });
});
