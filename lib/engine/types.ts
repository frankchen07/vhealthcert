export type Species = "dog" | "cat";
export type Purpose = "personal" | "change_of_ownership" | "other";
export type VaccineType = "inactivated" | "recombinant" | "rna" | "live" | "unknown";
export type LabId = "KSU" | "DOD" | "AU" | "MU" | "other";

export type Category =
  | "identification"
  | "vaccination"
  | "testing"
  | "parasite_treatment"
  | "examination"
  | "certificate"
  | "endorsement"
  | "permit"
  | "notification"
  | "documentation"
  | "entry_condition";

export type Performer = "us_vet" | "usda" | "owner" | "lab" | "foreign_authority" | "foreign_vet";

export interface DurationSpec {
  days?: number;
  months?: number;
  years?: number;
}

// ---------- case input (serializable; dates are ISO yyyy-mm-dd) ----------

export interface LegInput {
  from: string;
  to: string;
  departDate: string;
  arriveDate: string;
  arrivalPort?: string;
}

export interface RabiesVaccinationInput {
  date: string;
  durationYears: 1 | 3;
  vaccineType: VaccineType;
}

export interface TiterTestInput {
  sampleDate: string;
  labReceivedDate?: string;
  resultIUml?: number;
  lab: LabId;
}

export interface AnimalInput {
  species: Species;
  birthDate?: string;
  breed?: string;
  microchip: { status: "iso" | "non_iso" | "none" | "unknown"; implantDate?: string };
  rabiesVaccinations: RabiesVaccinationInput[];
  titerTests: TiterTestInput[];
  otherCountriesLast6Months: string[];
}

export interface CaseInput {
  purpose: Purpose;
  legs: LegInput[];
  animal: AnimalInput;
  completed: Record<string, string>;
}

// ---------- knowledge base ----------

export type SourceKind = "foreign_competent_authority" | "usda_aphis" | "cdc" | "state_authority";

export interface Source {
  id: string;
  authority: string;
  kind: SourceKind;
  title: string;
  url: string;
  format: "html" | "pdf" | "csv";
  selector?: string;
  risk: "high" | "standard";
}

export interface Evidence {
  sourceId: string;
  excerpt: string;
  /** The claim is that this text does NOT appear in the source (e.g. a country missing from a list). */
  absent?: boolean;
}

export interface Review {
  by: string;
  at: string;
  sourceHashes: Record<string, string>;
}

/** A jurisdiction pattern: a country code ("US", "JP") matches its subdivisions ("US-CA"); a subdivision matches itself. */
export interface LegMatch {
  to: string[];
  from?: string[];
  fromNot?: string[];
}

export type Condition =
  | { ageOverAtArrival: DurationSpec }
  | { cdcRabiesRisk: "low" | "high" }
  | { originNotFree: "fmd" | "screwworm" };

export type RequirementSpec =
  | { kind: "microchip"; iso: boolean }
  | {
      kind: "rabies_series";
      count: number;
      minAgeDays?: number;
      minIntervalDays: number;
      afterMicrochip: boolean;
      requireContinuity: boolean;
      minDaysBeforeArrival?: number;
      acceptedTypes?: VaccineType[];
      /** The first dose of the current continuous series is the primary: valid for at most `validFor`, and arrival waits `waitDays` after it. Boosters carry no wait. */
      primary?: { waitDays: number; validFor: DurationSpec };
    }
  | {
      kind: "rabies_titer";
      minIUml: number;
      labs: LabId[];
      sampleOnOrAfterDose: number;
      afterMicrochip?: boolean;
      withinVaccineValidity: boolean;
      waitFrom: "sample" | "day_after_lab_receipt";
      waitDays: number;
      validFor: DurationSpec;
    }
  | { kind: "min_age"; atArrival: DurationSpec }
  | {
      kind: "timed_action";
      anchor: "departure" | "arrival";
      minBefore?: DurationSpec;
      maxBefore?: DurationSpec;
      after?: string[];
      endBy?: "departure";
    }
  | { kind: "breed_restriction"; prohibited: string[]; conditional?: string[]; listIsExhaustive: boolean }
  | { kind: "informational" };

export interface Rule {
  id: string;
  title: string;
  category: Category;
  performedBy: Performer;
  leg: LegMatch;
  species: Species[];
  when?: Condition[];
  requirement: RequirementSpec;
  text: { vet: string; client: string; interpretation: string };
  evidence: Evidence[];
  /** `primaryIndex` points at the rule evidence that the conflicting excerpts disagree with (default 0). */
  conflict?: { evidence: Evidence[]; systemView: string; primaryIndex?: number };
  reviewRecommended?: string;
  manualReview?: string;
  /** When this rule applies, the whole leg is outside coverage and no partial plan is shown. */
  unsupported?: string;
  review: Review | null;
}

export interface CountryStatus {
  name: string;
  cdcRabiesRisk: "low" | "high";
  aphisFmdFree?: boolean;
  aphisScrewwormFree?: boolean;
  evidence: Evidence[];
}

export interface Coverage {
  to: string;
  from: string[];
  fromNot?: string[];
  ports?: string[];
}

export interface SourceStatus {
  lastAttempt: string;
  lastOk: string | null;
  ok: boolean;
  error?: string;
  hash: string | null;
  missingExcerpts: string[];
}

export interface KnowledgeBase {
  sources: Source[];
  rules: Rule[];
  countries: Record<string, CountryStatus>;
  coverage: Coverage[];
}

export type StatusMap = Record<string, SourceStatus>;

// ---------- results ----------

export interface CalcStep {
  label: string;
  expr: string;
  date: string;
}

export interface PlannedAction {
  label: string;
  earliest?: string;
  latest?: string;
  recommended?: { start: string; end: string; reason: string };
  calc: CalcStep[];
}

export type RequirementStatus =
  | "satisfied"
  | "action_required"
  | "not_applicable"
  | "cannot_determine"
  | "not_permitted"
  | "informational";

export type VerificationState = "verified" | "verified_review" | "manual_review";

export interface RequirementResult {
  ruleId: string;
  legIndex: number;
  status: RequirementStatus;
  findings: string[];
  applicability: string[];
  actions: PlannedAction[];
  calc: CalcStep[];
  earliestArrival?: string;
  verification: { state: VerificationState; reasons: string[] };
}

export type Readiness =
  | "unsupported"
  | "not_permitted"
  | "not_achievable"
  | "not_ready"
  | "review_required"
  | "satisfied";

export interface LegResult {
  index: number;
  from: string;
  to: string;
  departDate: string;
  arriveDate: string;
  supported: boolean;
  unsupportedReason?: string;
  earliestCompliantArrival?: string;
  achievable: boolean;
}

export interface CaseResult {
  readiness: Readiness;
  legs: LegResult[];
  requirements: RequirementResult[];
  counts: { applicable: number; satisfied: number; actionRequired: number; manualReview: number };
  unreviewedRules: number;
}
