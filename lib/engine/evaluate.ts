import { evaluateConditions } from "./conditions";
import { cmp, daysFrom, maxDate, pd, plus, type PlainDate } from "./dates";
import { legMatches, legSupport } from "./jurisdiction";
import { EVALUATION_ORDER, evaluateRequirement, type Evaluated, type LegContext } from "./requirements";
import type { CaseInput, CaseResult, KnowledgeBase, LegResult, PlannedAction, Readiness, RequirementResult, StatusMap } from "./types";
import { excerptProblem, sourceProblems, verifyRule } from "./verification";

function withRecommendation(action: PlannedAction): PlannedAction {
  if (!action.earliest || !action.latest) return action;
  const start = pd(action.earliest);
  const end = pd(action.latest);
  const span = daysFrom(start, end);
  if (span < 0) return action;
  const recEnd = span <= 2 ? end : plus(start, { days: Math.min(7, Math.floor(span / 2)) });
  return {
    ...action,
    recommended: {
      start: start.toString(),
      end: recEnd.toString(),
      reason: "Early in the allowed window, leaving margin before the regulatory deadline.",
    },
  };
}

function readinessOf(input: CaseInput, legs: LegResult[], reqs: RequirementResult[]): Readiness {
  const counted = reqs.filter((r) => r.status !== "not_applicable");
  if (input.purpose !== "personal" || legs.some((l) => !l.supported)) return "unsupported";
  if (counted.some((r) => r.status === "not_permitted")) return "not_permitted";
  if (legs.some((l) => !l.achievable)) return "not_achievable";
  if (counted.some((r) => r.status === "action_required")) return "not_ready";
  if (counted.some((r) => r.status === "cannot_determine" || r.verification.state === "manual_review")) return "review_required";
  return "satisfied";
}

export function evaluateCase(input: CaseInput, kb: KnowledgeBase, status: StatusMap, todayIso: string): CaseResult {
  const today = pd(todayIso);
  const sources = new Map(kb.sources.map((s) => [s.id, s]));
  const requirements: RequirementResult[] = [];
  const legs: LegResult[] = [];
  const { animal } = input;
  const countryData = {
    statuses: kb.countries,
    problems: new Map(
      Object.entries(kb.countries).map(([code, c]) => [
        code,
        c.evidence.flatMap((ev, i) => {
          const missing = excerptProblem(ev, `country-${code}#${i}`, sources, status);
          return [...sourceProblems(ev.sourceId, sources, status, today), ...(missing ? [missing] : [])];
        }),
      ]),
    ),
  };

  input.legs.forEach((leg, index) => {
    const base = { index, from: leg.from, to: leg.to, departDate: leg.departDate, arriveDate: leg.arriveDate };
    const support =
      input.purpose === "personal"
        ? legSupport(leg, kb.coverage)
        : {
            supported: false,
            reason: "Only personal pet travel is supported. Moves for sale, adoption or change of ownership have additional requirements.",
          };
    if (!support.supported) {
      legs.push({ ...base, supported: false, unsupportedReason: support.reason, achievable: false });
      return;
    }

    const ctx: LegContext = {
      today,
      leg,
      legIndex: index,
      legs: input.legs,
      depart: pd(leg.departDate),
      arrive: pd(leg.arriveDate),
      animal,
      completed: input.completed,
      birth: animal.birthDate ? pd(animal.birthDate) : null,
      chip:
        animal.microchip.implantDate && (animal.microchip.status === "iso" || animal.microchip.status === "non_iso")
          ? { date: pd(animal.microchip.implantDate), projected: false }
          : null,
      actionDates: new Map(),
    };

    const rules = kb.rules
      .filter((r) => r.species.includes(animal.species) && legMatches(r.leg, leg))
      .sort((a, b) => EVALUATION_ORDER.indexOf(a.requirement.kind) - EVALUATION_ORDER.indexOf(b.requirement.kind));

    const bounds: PlainDate[] = [];
    const results: RequirementResult[] = [];
    let outOfScope: string | undefined;
    for (const rule of rules) {
      const applicability = evaluateConditions(rule.when, ctx, countryData);
      if (applicability.value && rule.unsupported) outOfScope ??= rule.unsupported;
      let evaluated: Evaluated;
      if (applicability.value === false) {
        evaluated = { status: "not_applicable", findings: [], actions: [], calc: [] };
      } else if (applicability.value === null) {
        evaluated = { status: "cannot_determine", findings: [], actions: [], calc: [] };
      } else {
        evaluated = evaluateRequirement(rule.id, rule.title, rule.requirement, ctx);
      }
      if (evaluated.earliestArrival && evaluated.status !== "not_applicable") bounds.push(evaluated.earliestArrival);

      results.push({
        ruleId: rule.id,
        legIndex: index,
        status: evaluated.status,
        findings: evaluated.findings,
        applicability: applicability.reasons,
        actions: evaluated.actions.map(withRecommendation),
        calc: evaluated.calc,
        earliestArrival: evaluated.earliestArrival?.toString(),
        verification: verifyRule(rule, sources, status, today, evaluated.status, evaluated.reviewNotes),
      });
    }
    if (outOfScope) {
      legs.push({ ...base, supported: false, unsupportedReason: outOfScope, achievable: false });
      return;
    }
    requirements.push(...results);

    const earliest = bounds.length ? maxDate(bounds[0], ...bounds.slice(1)) : null;
    const achievable = !earliest || cmp(earliest, ctx.arrive) <= 0;
    legs.push({
      ...base,
      supported: true,
      achievable,
      earliestCompliantArrival: achievable ? undefined : earliest!.toString(),
    });
  });

  const counted = requirements.filter((r) => r.status !== "not_applicable");
  const checkable = counted.filter((r) => r.status !== "informational");
  return {
    readiness: readinessOf(input, legs, requirements),
    legs,
    requirements,
    counts: {
      applicable: counted.length,
      satisfied: checkable.filter((r) => r.status === "satisfied").length,
      actionRequired: checkable.filter((r) => r.status === "action_required").length,
      manualReview: counted.filter((r) => r.verification.state === "manual_review").length,
    },
    unreviewedRules: new Set(kb.rules.filter((r) => !r.review).map((r) => r.id)).size,
  };
}
