import { cmp, describeDuration, minus, pd, plus } from "./dates";
import { countryOf, jurisdictionName } from "./jurisdiction";
import type { LegContext } from "./requirements";
import type { Condition, CountryStatus } from "./types";

export interface Applicability {
  value: boolean | null;
  reasons: string[];
}

function recentCountries(ctx: LegContext): string[] {
  const windowStart = minus(ctx.arrive, { months: 6 });
  const found = new Set<string>([countryOf(ctx.leg.from)]);
  ctx.legs.slice(0, ctx.legIndex).forEach((prior) => {
    if (cmp(pd(prior.arriveDate), windowStart) >= 0) {
      found.add(countryOf(prior.from));
      found.add(countryOf(prior.to));
    }
  });
  ctx.animal.otherCountriesLast6Months.forEach((c) => found.add(c));
  return [...found];
}

export interface CountryData {
  statuses: Record<string, CountryStatus>;
  problems: Map<string, string[]>;
}

function unverified(codes: string[], data: CountryData): Applicability | null {
  const issues = codes.flatMap((c) => (data.problems.get(c) ?? []).map((p) => `${data.statuses[c].name} status could not be re-verified — ${p}`));
  return issues.length ? { value: null, reasons: issues } : null;
}

function evaluateCondition(condition: Condition, ctx: LegContext, data: CountryData): Applicability {
  const countries = data.statuses;
  if ("ageOverAtArrival" in condition) {
    const age = describeDuration(condition.ageOverAtArrival);
    if (!ctx.birth) return { value: null, reasons: [`Date of birth needed to check whether the animal is over ${age} old at arrival.`] };
    const threshold = plus(ctx.birth, condition.ageOverAtArrival);
    return cmp(ctx.arrive, threshold) > 0
      ? { value: true, reasons: [`Over ${age} old at arrival.`] }
      : { value: false, reasons: [`Not over ${age} old at arrival (reaches ${age} on ${threshold}).`] };
  }

  if ("cdcRabiesRisk" in condition) {
    const codes = recentCountries(ctx);
    const unknown = codes.filter((c) => !countries[c]);
    if (unknown.length) {
      return {
        value: null,
        reasons: [`CDC dog-rabies risk status not in the knowledge base for: ${unknown.join(", ")}. Check CDC's high-risk country list.`],
      };
    }
    const stale = unverified(codes, data);
    if (stale) return stale;
    const risk = codes.some((c) => countries[c].cdcRabiesRisk === "high") ? "high" : "low";
    const names = codes.map((c) => countries[c].name).join(", ");
    return {
      value: risk === condition.cdcRabiesRisk,
      reasons: [`Countries in the 6 months before arrival: ${names}. CDC pathway: ${risk === "high" ? "high-risk" : "dog rabies-free or low-risk"}.`],
    };
  }

  const origin = countryOf(ctx.leg.from);
  const status = countries[origin];
  const disease = condition.originNotFree === "fmd" ? "foot-and-mouth disease" : "screwworm";
  const free = condition.originNotFree === "fmd" ? status?.aphisFmdFree : status?.aphisScrewwormFree;
  if (free === undefined) return { value: null, reasons: [`APHIS ${disease} status for ${jurisdictionName(origin)} is not in the knowledge base.`] };
  const stale = unverified([origin], data);
  if (stale) return stale;
  return {
    value: !free,
    reasons: [`APHIS lists ${status!.name} as ${free ? "free of" : "affected by"} ${disease}.`],
  };
}

export function evaluateConditions(
  conditions: Condition[] | undefined,
  ctx: LegContext,
  data: CountryData,
): Applicability {
  const results = (conditions ?? []).map((c) => evaluateCondition(c, ctx, data));
  const reasons = results.flatMap((r) => r.reasons);
  if (results.some((r) => r.value === false)) return { value: false, reasons };
  if (results.some((r) => r.value === null)) return { value: null, reasons };
  return { value: true, reasons };
}
