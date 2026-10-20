import { cmp, daysFrom, describeDuration, maxDate, minus, pd, plus, type PlainDate } from "./dates";
import type { AnimalInput, CalcStep, DurationSpec, LegInput, PlannedAction, RequirementSpec, RequirementStatus } from "./types";

export interface Dose {
  date: PlainDate;
  validUntil: PlainDate;
  projected: boolean;
}

export interface LegContext {
  today: PlainDate;
  leg: LegInput;
  legIndex: number;
  legs: LegInput[];
  depart: PlainDate;
  arrive: PlainDate;
  animal: AnimalInput;
  completed: Record<string, string>;
  birth: PlainDate | null;
  chip: { date: PlainDate; projected: boolean } | null;
  series?: { doses: Dose[]; planned: Dose[] };
  actionDates: Map<string, { date: PlainDate; done: boolean }>;
}

export interface Evaluated {
  status: RequirementStatus;
  findings: string[];
  actions: PlannedAction[];
  calc: CalcStep[];
  earliestArrival?: PlainDate;
  reviewNotes?: string[];
}

type Bound = [PlainDate, string];

export const completionKey = (ruleId: string, legIndex: number) => `${ruleId}@${legIndex}`;

const step = (label: string, expr: string, date: PlainDate): CalcStep => ({ label, expr, date: date.toString() });
const latestOf = (bounds: Bound[]): Bound => bounds.reduce((a, b) => (cmp(b[0], a[0]) > 0 ? b : a));
const earliestOf = (bounds: Bound[]): Bound => bounds.reduce((a, b) => (cmp(b[0], a[0]) < 0 ? b : a));
const planned = (d: PlainDate, projected: boolean) => `${d}${projected ? " (planned)" : ""}`;
const coverageEnd = (doses: Dose[]): PlainDate => doses.reduce((end, d) => maxDate(end, d.validUntil), doses[0].validUntil);
const asPrimary = (dose: Dose, validFor: DurationSpec): Dose => {
  const cap = plus(dose.date, validFor);
  return cmp(cap, dose.validUntil) < 0 ? { ...dose, validUntil: cap } : dose;
};

const cannot = (finding: string, calc: CalcStep[] = []): Evaluated => ({
  status: "cannot_determine",
  findings: [finding],
  actions: [],
  calc,
});

function action(label: string, earliest: Bound, latest: Bound): PlannedAction {
  return {
    label,
    earliest: earliest[0].toString(),
    latest: latest[0].toString(),
    calc: [step("Earliest", earliest[1], earliest[0]), step("Latest", latest[1], latest[0])],
  };
}

function microchip(spec: Extract<RequirementSpec, { kind: "microchip" }>, ctx: LegContext): Evaluated {
  const { status, implantDate } = ctx.animal.microchip;
  if (status === "unknown") return cannot("Microchip status not entered.");
  if (status === "iso" || (!spec.iso && status === "non_iso")) {
    const kind = status === "iso" ? "ISO 11784/11785 microchip" : "Microchip (non-ISO)";
    return { status: "satisfied", findings: [`${kind}${implantDate ? ` implanted ${implantDate}` : ""}.`], actions: [], calc: [] };
  }
  ctx.chip = { date: ctx.today, projected: true };
  return {
    status: "action_required",
    findings: [status === "non_iso" ? "The current microchip is not ISO 11784/11785 compliant." : "No microchip recorded."],
    actions: [action(spec.iso ? "Implant an ISO 11784/11785 microchip" : "Implant a microchip", [ctx.today, "Today"], [ctx.depart, `Departure ${ctx.depart}`])],
    calc: [],
  };
}

function rabiesSeries(spec: Extract<RequirementSpec, { kind: "rabies_series" }>, ctx: LegContext): Evaluated {
  const findings: string[] = [];
  const calc: CalcStep[] = [];
  if (spec.minAgeDays !== undefined && !ctx.birth) return cannot("Date of birth needed to check age at vaccination.");
  if (spec.afterMicrochip && !ctx.chip) return cannot("Microchip implant date needed to check that vaccinations followed the microchip.");

  const minAgeDate = spec.minAgeDays !== undefined && ctx.birth ? plus(ctx.birth, { days: spec.minAgeDays }) : null;
  if (minAgeDate) calc.push(step("Old enough to vaccinate", `Birth ${ctx.birth} + ${spec.minAgeDays} days`, minAgeDate));

  let typeMissing = false;
  const qualifying: Dose[] = [];
  for (const v of [...ctx.animal.rabiesVaccinations].sort((a, b) => a.date.localeCompare(b.date))) {
    const date = pd(v.date);
    if (minAgeDate && cmp(date, minAgeDate) < 0) {
      findings.push(`Dose on ${v.date} not counted: given before ${spec.minAgeDays} days of age (eligible from ${minAgeDate}).`);
      continue;
    }
    if (spec.afterMicrochip && ctx.chip && cmp(date, ctx.chip.date) < 0) {
      findings.push(`Dose on ${v.date} not counted: given before the microchip (${planned(ctx.chip.date, ctx.chip.projected)}).`);
      continue;
    }
    if (spec.acceptedTypes && !spec.acceptedTypes.includes(v.vaccineType)) {
      if (v.vaccineType === "unknown") {
        typeMissing = true;
        findings.push(`Vaccine type needed for the dose on ${v.date} (accepted: ${spec.acceptedTypes.join(", ")}).`);
      } else {
        findings.push(`Dose on ${v.date} not counted: ${v.vaccineType} vaccines are not accepted.`);
      }
      continue;
    }
    qualifying.push({ date, validUntil: plus(date, { years: v.durationYears }), projected: false });
  }
  if (typeMissing) return { status: "cannot_determine", findings, actions: [], calc };

  let chain: Dose[] = qualifying;
  if (spec.requireContinuity) {
    const chains: Dose[][] = [];
    for (const dose of qualifying) {
      const current = chains.at(-1);
      if (current && cmp(dose.date, coverageEnd(current)) <= 0) {
        current.push(dose);
      } else {
        if (current) findings.push(`Coverage lapsed on ${coverageEnd(current)} before the dose on ${dose.date}, so the series restarted.`);
        chains.push([spec.primary ? asPrimary(dose, spec.primary.validFor) : dose]);
      }
    }
    chain = chains.at(-1) ?? [];
    if (chain.length && cmp(coverageEnd(chain), ctx.today) < 0) {
      findings.push(`Rabies coverage lapsed on ${coverageEnd(chain)}; the vaccination series must restart.`);
      chain = [];
    }
  }

  const series: Dose[] = [];
  for (const dose of chain) {
    if (!series.length || cmp(dose.date, plus(series.at(-1)!.date, { days: spec.minIntervalDays })) >= 0) series.push(dose);
  }
  if (series.length) findings.push(`Qualifying doses: ${series.map((d) => d.date.toString()).join(", ")}.`);

  const doses = [...chain];
  const actions: PlannedAction[] = [];
  const deadline: Bound[] = [[ctx.depart, `Departure ${ctx.depart}`]];
  if (spec.minDaysBeforeArrival) {
    deadline.push([minus(ctx.arrive, { days: spec.minDaysBeforeArrival }), `Arrival ${ctx.arrive} − ${spec.minDaysBeforeArrival} days`]);
  }

  while (series.length < spec.count) {
    const prev = series.at(-1);
    const lower: Bound[] = [[ctx.today, "Today"]];
    if (prev) {
      lower.push([plus(prev.date, { days: spec.minIntervalDays }), `Dose ${series.length} ${planned(prev.date, prev.projected)} + ${spec.minIntervalDays} days`]);
    }
    if (minAgeDate) lower.push([minAgeDate, `Birth ${ctx.birth} + ${spec.minAgeDays} days`]);
    if (spec.afterMicrochip && ctx.chip) lower.push([ctx.chip.date, `Microchip ${planned(ctx.chip.date, ctx.chip.projected)}`]);
    const upper = [...deadline];
    if (spec.requireContinuity && doses.length) upper.push([coverageEnd(doses), `Current coverage ends ${coverageEnd(doses)}`]);
    if (spec.primary && !doses.length) {
      upper.push([minus(ctx.arrive, { days: spec.primary.waitDays }), `Arrival ${ctx.arrive} − ${spec.primary.waitDays} days (primary)`]);
    }

    const earliest = latestOf(lower);
    actions.push(action(`Rabies vaccination — dose ${series.length + 1} of ${spec.count}`, earliest, earliestOf(upper)));
    const dose = { date: earliest[0], validUntil: plus(earliest[0], { years: 1 }), projected: true };
    series.push(dose);
    doses.push(dose);
  }

  const validThrough = spec.requireContinuity ? coverageEnd(doses) : doses.at(-1)!.validUntil;
  if (cmp(validThrough, ctx.arrive) < 0) {
    findings.push(`Vaccination is valid through ${validThrough}, before arrival on ${ctx.arrive}.`);
    const upper = [...deadline];
    if (spec.requireContinuity) upper.push([validThrough, `Current coverage ends ${validThrough}`]);
    actions.push(action("Rabies booster — keeps vaccination current through arrival", [ctx.today, "Today"], earliestOf(upper)));
    doses.push({ date: ctx.today, validUntil: plus(ctx.today, { years: 1 }), projected: true });
  } else {
    calc.push(step("Valid through", `Most recent coverage${doses.some((d) => d.projected) ? " (assuming 1-year vaccines for planned doses)" : ""}`, validThrough));
  }

  const last = doses.at(-1)!;
  let earliestArrival = last.date;
  if (spec.minDaysBeforeArrival) {
    earliestArrival = plus(last.date, { days: spec.minDaysBeforeArrival });
    calc.push(step("Earliest arrival", `Most recent dose ${planned(last.date, last.projected)} + ${spec.minDaysBeforeArrival} days`, earliestArrival));
    if (!actions.length && cmp(earliestArrival, ctx.arrive) > 0) {
      findings.push(`The most recent dose (${last.date}) is less than ${spec.minDaysBeforeArrival} days before arrival.`);
    }
  }
  if (spec.primary) {
    const primary = doses[0];
    const validFrom = plus(primary.date, { days: spec.primary.waitDays });
    calc.push(step("Primary vaccination valid from", `Primary ${planned(primary.date, primary.projected)} + ${spec.primary.waitDays} days`, validFrom));
    if (!actions.length && cmp(validFrom, ctx.arrive) > 0) {
      findings.push(`The primary vaccination (${primary.date}) is not valid until ${validFrom}, after arrival.`);
    }
    earliestArrival = maxDate(earliestArrival, validFrom);
  }

  ctx.series = { doses: series, planned: doses };
  const met = !actions.length && cmp(earliestArrival, ctx.arrive) <= 0;
  return { status: met ? "satisfied" : "action_required", findings, actions, calc, earliestArrival };
}

function rabiesTiter(spec: Extract<RequirementSpec, { kind: "rabies_titer" }>, ctx: LegContext): Evaluated {
  if (spec.afterMicrochip && !ctx.chip) return cannot("Microchip implant date needed to check that antibody samples followed the microchip.");
  if ((spec.sampleOnOrAfterDose > 0 || spec.withinVaccineValidity) && !ctx.series) {
    return cannot("The rabies vaccination series must be determined before antibody samples can be checked against it.");
  }
  const findings: string[] = [];
  const doses = ctx.series?.planned ?? [];
  const dose = ctx.series?.doses[spec.sampleOnOrAfterDose - 1];
  const wait = `${spec.waitDays} days`;

  let missing = false;
  const candidates: { start: PlainDate; startExpr: string; ready: PlainDate; validUntil: PlainDate }[] = [];
  for (const t of [...ctx.animal.titerTests].sort((a, b) => a.sampleDate.localeCompare(b.sampleDate))) {
    const sample = pd(t.sampleDate);
    if (t.resultIUml === undefined) {
      missing = true;
      findings.push(`Result not entered for the sample drawn ${t.sampleDate}.`);
      continue;
    }
    if (t.resultIUml < spec.minIUml) {
      findings.push(`Sample ${t.sampleDate}: ${t.resultIUml} IU/ml is below ${spec.minIUml} IU/ml.`);
      continue;
    }
    if (!spec.labs.includes(t.lab)) {
      findings.push(`Sample ${t.sampleDate}: laboratory is not on the approved list (${spec.labs.join(", ")}).`);
      continue;
    }
    if (spec.sampleOnOrAfterDose > 0 && (!dose || dose.projected || cmp(sample, dose.date) < 0)) {
      findings.push(`Sample on ${t.sampleDate} not counted: drawn before dose ${spec.sampleOnOrAfterDose} of the rabies series${dose && !dose.projected ? ` (${dose.date})` : ""}.`);
      continue;
    }
    if (spec.afterMicrochip && ctx.chip && (ctx.chip.projected || cmp(sample, ctx.chip.date) < 0)) {
      findings.push(`Sample on ${t.sampleDate} not counted: drawn before the microchip was implanted.`);
      continue;
    }
    if (spec.withinVaccineValidity && !doses.some((d) => !d.projected && cmp(d.date, sample) <= 0 && cmp(sample, d.validUntil) <= 0)) {
      findings.push(`Sample on ${t.sampleDate} not counted: drawn outside the vaccine's period of immunity.`);
      continue;
    }
    if (spec.waitFrom === "sample") {
      candidates.push({ start: sample, startExpr: `Sample ${sample}`, ready: plus(sample, { days: spec.waitDays }), validUntil: plus(sample, spec.validFor) });
    } else if (!t.labReceivedDate) {
      missing = true;
      findings.push(`Date the laboratory received the sample drawn ${t.sampleDate} is needed.`);
    } else {
      const start = plus(pd(t.labReceivedDate), { days: 1 });
      candidates.push({
        start,
        startExpr: `Lab receipt ${t.labReceivedDate} + 1 day`,
        ready: plus(start, { days: spec.waitDays }),
        validUntil: plus(start, spec.validFor),
      });
    }
  }

  const timing = (c: (typeof candidates)[number]) => [
    step("Earliest arrival", `${c.startExpr} + ${wait}`, c.ready),
    step("Valid through", `${c.startExpr} + ${describeDuration(spec.validFor)}`, c.validUntil),
  ];
  const valid = candidates.filter((c) => cmp(ctx.arrive, c.validUntil) <= 0);
  const passing = valid.find((c) => cmp(c.ready, ctx.arrive) <= 0);
  if (passing) return { status: "satisfied", findings, actions: [], calc: timing(passing), earliestArrival: passing.ready };
  if (valid.length) {
    const soonest = valid.reduce((a, b) => (cmp(b.ready, a.ready) < 0 ? b : a));
    findings.push(`The waiting period ends ${soonest.ready}; the planned arrival is ${ctx.arrive}.`);
    return { status: "action_required", findings, actions: [], calc: timing(soonest), earliestArrival: soonest.ready };
  }
  if (missing) return { status: "cannot_determine", findings, actions: [], calc: [] };

  const lower: Bound[] = [[ctx.today, "Today"]];
  if (dose) lower.push([dose.date, `Dose ${spec.sampleOnOrAfterDose} ${planned(dose.date, dose.projected)}`]);
  if (spec.afterMicrochip && ctx.chip) lower.push([ctx.chip.date, `Microchip ${planned(ctx.chip.date, ctx.chip.projected)}`]);
  const earliest = latestOf(lower);
  const receiptDay = spec.waitFrom === "sample" ? 0 : 1;
  const startExpr = spec.waitFrom === "sample" ? `Sample ${earliest[0]}` : `Lab receipt ${earliest[0]} + 1 day`;
  const ready = plus(earliest[0], { days: spec.waitDays + receiptDay });
  const latest: Bound = [
    minus(ctx.arrive, { days: spec.waitDays + receiptDay }),
    `Arrival ${ctx.arrive} − ${wait}${receiptDay ? " − 1 day" : ""}`,
  ];
  if (spec.waitFrom === "day_after_lab_receipt") findings.push("Assumes the laboratory receives the sample the day it is drawn; allow for shipping.");
  return {
    status: "action_required",
    findings,
    actions: [action(`Rabies antibody blood sample — approved lab (${spec.labs.join(", ")}), at least ${spec.minIUml} IU/ml`, earliest, latest)],
    calc: [step("Earliest arrival", `${startExpr} + ${wait}`, ready)],
    earliestArrival: ready,
  };
}

function minAge(spec: Extract<RequirementSpec, { kind: "min_age" }>, ctx: LegContext): Evaluated {
  if (!ctx.birth) return cannot("Date of birth needed.");
  const age = describeDuration(spec.atArrival);
  const oldEnough = plus(ctx.birth, spec.atArrival);
  const calc = [step("Old enough on", `Birth ${ctx.birth} + ${age}`, oldEnough)];
  if (cmp(oldEnough, ctx.arrive) <= 0) {
    return { status: "satisfied", findings: [`At least ${age} old at arrival.`], actions: [], calc, earliestArrival: oldEnough };
  }
  return {
    status: "action_required",
    findings: [`Reaches ${age} on ${oldEnough}, after the planned arrival.`],
    actions: [],
    calc,
    earliestArrival: oldEnough,
  };
}

function timedAction(ruleId: string, title: string, spec: Extract<RequirementSpec, { kind: "timed_action" }>, ctx: LegContext): Evaluated {
  const anchor = spec.anchor === "departure" ? ctx.depart : ctx.arrive;
  const anchorLabel = `${spec.anchor === "departure" ? "Departure" : "Arrival"} ${anchor}`;
  const windowStart = spec.maxBefore ? minus(anchor, spec.maxBefore) : null;
  const anchorEnd = spec.minBefore ? minus(anchor, spec.minBefore) : anchor;
  const byDeparture = spec.endBy === "departure" && cmp(ctx.depart, anchorEnd) < 0;
  const windowEnd = byDeparture ? ctx.depart : anchorEnd;
  const endExpr = byDeparture ? `Departure ${ctx.depart}` : spec.minBefore ? `${anchorLabel} − ${describeDuration(spec.minBefore)}` : anchorLabel;
  const deps = (spec.after ?? []).flatMap((id) => {
    const d = ctx.actionDates.get(id);
    return d ? [{ id, ...d }] : [];
  });

  const done = ctx.completed[completionKey(ruleId, ctx.legIndex)];
  const findings: string[] = [];
  if (done) {
    const d = pd(done);
    const pending = deps.find((dep) => !dep.done || cmp(dep.date, d) > 0);
    if (cmp(d, ctx.today) > 0) {
      findings.push(`Completion date ${done} is in the future.`);
    } else if ((windowStart && cmp(d, windowStart) < 0) || cmp(d, windowEnd) > 0) {
      findings.push(`Completed on ${done}, outside the allowed window (${windowStart ?? "—"} to ${windowEnd}).`);
    } else if (pending) {
      findings.push(`Completed on ${done}, but ${pending.id} ${pending.done ? `was completed later (${pending.date})` : "has not been recorded as completed"}.`);
    } else {
      ctx.actionDates.set(ruleId, { date: d, done: true });
      return { status: "satisfied", findings: [`Completed on ${done}.`], actions: [], calc: [] };
    }
  }

  const lower: Bound[] = [[ctx.today, "Today"], ...deps.map((dep): Bound => [dep.date, `After ${dep.id} (${dep.date})`])];
  const notBefore = latestOf(lower);
  if (windowStart) lower.push([windowStart, `${anchorLabel} − ${describeDuration(spec.maxBefore!)}`]);
  const earliest = latestOf(lower);
  ctx.actionDates.set(ruleId, { date: earliest[0], done: false });

  let earliestArrival = plus(notBefore[0], spec.minBefore ?? { days: 0 });
  if (spec.anchor === "departure") earliestArrival = plus(earliestArrival, { days: daysFrom(ctx.depart, ctx.arrive) });
  if (spec.endBy === "departure") earliestArrival = maxDate(earliestArrival, plus(notBefore[0], { days: daysFrom(ctx.depart, ctx.arrive) }));
  const calc: CalcStep[] = [];
  if (cmp(earliestArrival, ctx.arrive) > 0) {
    findings.push(`The deadline (${windowEnd}) has already passed.`);
    calc.push(step("Earliest arrival", `${notBefore[1]} ${notBefore[0]}${spec.minBefore ? ` + ${describeDuration(spec.minBefore)}` : ""}`, earliestArrival));
  }
  return { status: "action_required", findings, actions: [action(title, earliest, [windowEnd, endExpr])], calc, earliestArrival };
}

const wholeWord = (word: string) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");

function breedRestriction(spec: Extract<RequirementSpec, { kind: "breed_restriction" }>, ctx: LegContext): Evaluated {
  const breed = ctx.animal.breed?.trim();
  if (!breed) return cannot("Breed not entered.");
  const hit = spec.prohibited.find((p) => wholeWord(p).test(breed));
  if (hit) return { status: "not_permitted", findings: [`"${breed}" matches the prohibited type "${hit}".`], actions: [], calc: [] };
  const conditional = spec.conditional?.find((p) => wholeWord(p).test(breed));
  if (conditional) return cannot(`"${breed}" matches "${conditional}", which is prohibited only in some cases; see the rule.`);
  return {
    status: "satisfied",
    findings: [`"${breed}" does not match the listed prohibited types (${spec.prohibited.join(", ")}).`],
    actions: [],
    calc: [],
    reviewNotes: spec.listIsExhaustive ? [] : ["The official list of prohibited types is not exhaustive; confirm this breed is permitted."],
  };
}

export function evaluateRequirement(ruleId: string, title: string, spec: RequirementSpec, ctx: LegContext): Evaluated {
  switch (spec.kind) {
    case "microchip":
      return microchip(spec, ctx);
    case "rabies_series":
      return rabiesSeries(spec, ctx);
    case "rabies_titer":
      return rabiesTiter(spec, ctx);
    case "min_age":
      return minAge(spec, ctx);
    case "timed_action":
      return timedAction(ruleId, title, spec, ctx);
    case "breed_restriction":
      return breedRestriction(spec, ctx);
    case "informational":
      return { status: "informational", findings: [], actions: [], calc: [] };
  }
}

export const EVALUATION_ORDER: RequirementSpec["kind"][] = [
  "microchip",
  "rabies_series",
  "rabies_titer",
  "min_age",
  "timed_action",
  "breed_restriction",
  "informational",
];
