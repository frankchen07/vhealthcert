import type {
  AnimalInput,
  CaseInput,
  CaseResult,
  KnowledgeBase,
  LegInput,
  RequirementSpec,
  Rule,
  SourceStatus,
  StatusMap,
} from "@/lib/engine/types";

export const TODAY = "2026-10-09";

export function rule(id: string, requirement: RequirementSpec, overrides: Partial<Rule> = {}): Rule {
  return {
    id,
    title: id,
    category: "documentation",
    performedBy: "us_vet",
    leg: { to: ["JP"], from: ["US"] },
    species: ["dog", "cat"],
    requirement,
    text: { vet: `${id} vet text`, client: `${id} client text`, interpretation: `${id} interpretation` },
    evidence: [{ sourceId: "s1", excerpt: `${id} excerpt` }],
    review: { by: "DVM-TEST", at: "2026-10-01", sourceHashes: { s1: "h1" } },
    ...overrides,
  };
}

export function kb(rules: Rule[], overrides: Partial<KnowledgeBase> = {}): KnowledgeBase {
  return {
    sources: [
      { id: "s1", authority: "Test Authority", kind: "foreign_competent_authority", title: "S1", url: "https://example.gov/s1", format: "html", selector: "main", risk: "high" },
      { id: "s2", authority: "Test State", kind: "state_authority", title: "S2", url: "https://example.gov/s2", format: "html", selector: "main", risk: "standard" },
    ],
    rules,
    countries: {
      US: { name: "United States", cdcRabiesRisk: "low", aphisFmdFree: true, aphisScrewwormFree: true, evidence: [] },
      JP: { name: "Japan", cdcRabiesRisk: "low", aphisFmdFree: true, aphisScrewwormFree: true, evidence: [] },
      MX: { name: "Mexico", cdcRabiesRisk: "low", aphisFmdFree: true, aphisScrewwormFree: false, evidence: [] },
      HT: { name: "Haiti", cdcRabiesRisk: "high", aphisFmdFree: true, aphisScrewwormFree: false, evidence: [] },
    },
    coverage: [
      { to: "JP", from: ["US"], fromNot: ["US-HI", "US-GU"] },
      { to: "US-HI", from: ["US"], fromNot: ["US-HI"], ports: ["HNL"] },
      { to: "US", from: ["JP", "MX", "HT"] },
      { to: "US-CA", from: ["JP", "US-HI", "MX", "HT"] },
    ],
    ...overrides,
  };
}

export function sourceStatus(overrides: Partial<SourceStatus> = {}): SourceStatus {
  return { lastAttempt: `${TODAY}T06:00:00Z`, lastOk: `${TODAY}T06:00:00Z`, ok: true, hash: "h1", missingExcerpts: [], ...overrides };
}

export const okStatus = (): StatusMap => ({ s1: sourceStatus(), s2: sourceStatus({ hash: "h2" }) });

export function animal(overrides: Partial<AnimalInput> = {}): AnimalInput {
  return {
    species: "dog",
    birthDate: "2022-01-01",
    breed: "Labrador Retriever",
    microchip: { status: "iso", implantDate: "2022-03-01" },
    rabiesVaccinations: [],
    titerTests: [],
    otherCountriesLast6Months: [],
    ...overrides,
  };
}

export function leg(overrides: Partial<LegInput> = {}): LegInput {
  return { from: "US-CA", to: "JP", departDate: "2027-03-01", arriveDate: "2027-03-02", ...overrides };
}

export function caseInput(overrides: Partial<CaseInput> = {}): CaseInput {
  return { purpose: "personal", legs: [leg()], animal: animal(), completed: {}, ...overrides };
}

export function req(result: CaseResult, ruleId: string, legIndex = 0) {
  const found = result.requirements.find((r) => r.ruleId === ruleId && r.legIndex === legIndex);
  if (!found) throw new Error(`No result for ${ruleId} on leg ${legIndex}`);
  return found;
}
