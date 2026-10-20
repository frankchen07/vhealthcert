import { describe, expect, it } from "vitest";
import { evaluateCase } from "@/lib/engine/evaluate";
import { TODAY, animal, caseInput, kb, leg, okStatus, req, rule } from "./helpers";

const info = rule("info", { kind: "informational" });
const returnLeg = leg({ from: "JP", to: "US-CA", departDate: "2027-03-20", arriveDate: "2027-03-20" });

describe("itinerary support", () => {
  it("marks a destination without coverage as unsupported instead of returning a partial plan", () => {
    const result = evaluateCase(caseInput({ legs: [leg({ to: "FR" })] }), kb([info]), okStatus(), TODAY);
    expect(result.legs[0].supported).toBe(false);
    expect(result.legs[0].unsupportedReason).toMatch(/France|FR/);
    expect(result.requirements).toHaveLength(0);
    expect(result.readiness).toBe("unsupported");
  });

  it("marks a leg unsupported when an applicable rule describes a pathway this version does not model", () => {
    const highRisk = rule("high-risk", { kind: "informational" }, { leg: { to: ["US"] }, when: [{ cdcRabiesRisk: "high" }], unsupported: "CDC high-risk pathway not modeled." });
    const back = leg({ from: "JP", to: "US", departDate: "2027-03-20", arriveDate: "2027-03-20" });
    const visitedHaiti = evaluateCase(caseInput({ legs: [back], animal: animal({ otherCountriesLast6Months: ["HT"] }) }), kb([highRisk]), okStatus(), TODAY);
    expect(visitedHaiti.legs[0]).toMatchObject({ supported: false, unsupportedReason: "CDC high-risk pathway not modeled." });
    expect(visitedHaiti.requirements).toHaveLength(0);
    expect(visitedHaiti.readiness).toBe("unsupported");

    const lowRisk = evaluateCase(caseInput({ legs: [back] }), kb([highRisk]), okStatus(), TODAY);
    expect(lowRisk.legs[0].supported).toBe(true);
  });

  it("requires a covered arrival port for Hawaii", () => {
    for (const arrivalPort of ["OGG", undefined]) {
      const result = evaluateCase(caseInput({ legs: [leg({ to: "US-HI", arrivalPort })] }), kb([info]), okStatus(), TODAY);
      expect(result.legs[0].supported).toBe(false);
    }
    const hnl = evaluateCase(caseInput({ legs: [leg({ to: "US-HI", arrivalPort: "HNL" })] }), kb([info]), okStatus(), TODAY);
    expect(hnl.legs[0].supported).toBe(true);
  });

  it("excludes origins that the destination treats differently", () => {
    const result = evaluateCase(caseInput({ legs: [leg({ from: "US-HI" })] }), kb([info]), okStatus(), TODAY);
    expect(result.legs[0].supported).toBe(false);
  });

  it("needs both federal and state coverage for an international arrival into a U.S. state", () => {
    const supported = evaluateCase(caseInput({ legs: [returnLeg] }), kb([info]), okStatus(), TODAY);
    expect(supported.legs[0].supported).toBe(true);
    const noState = evaluateCase(caseInput({ legs: [{ ...returnLeg, to: "US-TX" }] }), kb([info]), okStatus(), TODAY);
    expect(noState.legs[0].supported).toBe(false);
  });

  it("treats non-personal moves as unsupported", () => {
    const result = evaluateCase(caseInput({ purpose: "change_of_ownership" }), kb([info]), okStatus(), TODAY);
    expect(result.readiness).toBe("unsupported");
  });
});

describe("rule applicability", () => {
  it("only includes rules for the animal's species", () => {
    const dogOnly = rule("dog-only", { kind: "informational" }, { species: ["dog"] });
    const result = evaluateCase(caseInput({ animal: animal({ species: "cat" }) }), kb([dogOnly, info]), okStatus(), TODAY);
    expect(result.requirements.map((r) => r.ruleId)).toEqual(["info"]);
  });

  it("evaluates an age condition at arrival and explains why it does not apply", () => {
    const over4 = rule("ca-rabies", { kind: "informational" }, { leg: { to: ["US-CA"], fromNot: ["US-CA"] }, when: [{ ageOverAtArrival: { months: 4 } }] });
    const puppy = caseInput({ legs: [returnLeg], animal: animal({ birthDate: "2027-01-01" }) });
    const r = req(evaluateCase(puppy, kb([over4]), okStatus(), TODAY), "ca-rabies");
    expect(r.status).toBe("not_applicable");
    expect(r.applicability.join(" ")).toMatch(/4 months/);

    const unknownAge = caseInput({ legs: [returnLeg], animal: animal({ birthDate: undefined }) });
    expect(req(evaluateCase(unknownAge, kb([over4]), okStatus(), TODAY), "ca-rabies").status).toBe("cannot_determine");
  });

  it("derives the CDC rabies-risk pathway from the itinerary and other recent countries", () => {
    const lowRisk = rule("cdc-low", { kind: "informational" }, { leg: { to: ["US"], fromNot: ["US"] }, when: [{ cdcRabiesRisk: "low" }] });
    const outbound = leg({ from: "US-CA", to: "JP", departDate: "2027-03-01", arriveDate: "2027-03-02" });

    const onlyJapan = evaluateCase(caseInput({ legs: [outbound, returnLeg] }), kb([lowRisk]), okStatus(), TODAY);
    expect(req(onlyJapan, "cdc-low", 1).status).toBe("informational");

    const visitedHaiti = caseInput({ legs: [outbound, returnLeg], animal: animal({ otherCountriesLast6Months: ["HT"] }) });
    expect(req(evaluateCase(visitedHaiti, kb([lowRisk]), okStatus(), TODAY), "cdc-low", 1).status).toBe("not_applicable");

    const visitedUnknown = caseInput({ legs: [outbound, returnLeg], animal: animal({ otherCountriesLast6Months: ["TH"] }) });
    const unknown = req(evaluateCase(visitedUnknown, kb([lowRisk]), okStatus(), TODAY), "cdc-low", 1);
    expect(unknown.status).toBe("cannot_determine");
    expect(unknown.applicability.join(" ")).toMatch(/TH/);
  });

  it("applies APHIS disease rules only to origins that are not free", () => {
    const screwworm = rule("nws", { kind: "informational" }, { leg: { to: ["US"], fromNot: ["US"] }, when: [{ originNotFree: "screwworm" }] });
    const fromJapan = evaluateCase(caseInput({ legs: [returnLeg] }), kb([screwworm]), okStatus(), TODAY);
    expect(req(fromJapan, "nws").status).toBe("not_applicable");
    const fromMexico = evaluateCase(caseInput({ legs: [{ ...returnLeg, from: "MX" }] }), kb([screwworm]), okStatus(), TODAY);
    expect(req(fromMexico, "nws").status).toBe("informational");
  });
});

describe("breed_restriction", () => {
  const hybrids = rule("hybrids", { kind: "breed_restriction", prohibited: ["Bengal", "Savannah", "wolf"], listIsExhaustive: false });

  it("blocks a prohibited breed", () => {
    const result = evaluateCase(caseInput({ animal: animal({ species: "cat", breed: "Bengal cat" }) }), kb([hybrids]), okStatus(), TODAY);
    expect(req(result, "hybrids").status).toBe("not_permitted");
    expect(result.readiness).toBe("not_permitted");
  });

  it("passes other breeds but recommends review when the official list is not exhaustive", () => {
    const r = req(evaluateCase(caseInput(), kb([hybrids]), okStatus(), TODAY), "hybrids");
    expect(r.status).toBe("satisfied");
    expect(r.verification.state).toBe("verified_review");
  });

  it("cannot be determined without a breed", () => {
    expect(req(evaluateCase(caseInput({ animal: animal({ breed: "" }) }), kb([hybrids]), okStatus(), TODAY), "hybrids").status).toBe("cannot_determine");
  });

  it("cannot be determined for a breed that is prohibited only under conditions the case does not record", () => {
    const category1 = rule("cat1", { kind: "breed_restriction", prohibited: ["pit bull"], conditional: ["Tosa"], listIsExhaustive: false });
    const evalBreed = (breed: string) => req(evaluateCase(caseInput({ animal: animal({ breed }) }), kb([category1]), okStatus(), TODAY), "cat1");
    expect(evalBreed("Tosa Inu").status).toBe("cannot_determine");
    expect(evalBreed("Tosa Inu").findings.join(" ")).toMatch(/Tosa/);
    expect(evalBreed("Pit Bull mix").status).toBe("not_permitted");
    expect(evalBreed("Beagle").status).toBe("satisfied");
  });
});

describe("knowledge-base edge cases", () => {
  it("does not treat a word inside a longer breed name as a prohibited match", () => {
    const hybrids = rule("hybrids", { kind: "breed_restriction", prohibited: ["wolf"], listIsExhaustive: true });
    const wolfhound = evaluateCase(caseInput({ animal: animal({ breed: "Irish Wolfhound" }) }), kb([hybrids]), okStatus(), TODAY);
    expect(req(wolfhound, "hybrids").status).toBe("satisfied");
    const wolfCross = evaluateCase(caseInput({ animal: animal({ breed: "wolf-dog cross" }) }), kb([hybrids]), okStatus(), TODAY);
    expect(req(wolfCross, "hybrids").status).toBe("not_permitted");
  });

  it("cannot determine an APHIS disease condition when the origin's status is not recorded", () => {
    const fmd = rule("fmd", { kind: "informational" }, { leg: { to: ["US"], fromNot: ["US"] }, when: [{ originNotFree: "fmd" }] });
    const base = kb([fmd]);
    const countries = { ...base.countries, JP: { name: "Japan", cdcRabiesRisk: "low" as const, evidence: [] } };
    const result = evaluateCase(caseInput({ legs: [returnLeg] }), { ...base, countries }, okStatus(), TODAY);
    expect(req(result, "fmd").status).toBe("cannot_determine");
  });

  it("cannot determine a country-based condition when that country's evidence fails verification", () => {
    const lowRisk = rule("cdc-low", { kind: "informational" }, { leg: { to: ["US"], fromNot: ["US"] }, when: [{ cdcRabiesRisk: "low" }] });
    const base = kb([lowRisk]);
    const countries = { ...base.countries, JP: { ...base.countries.JP, evidence: [{ sourceId: "s2", excerpt: "Japan" }] } };
    const status = { ...okStatus(), s2: { ...okStatus().s2, ok: false, error: "HTTP 500" } };
    const r = req(evaluateCase(caseInput({ legs: [returnLeg] }), { ...base, countries }, status, TODAY), "cdc-low");
    expect(r.status).toBe("cannot_determine");
    expect(r.applicability.join(" ")).toMatch(/Japan.*could not be re-verified/);
  });
});
