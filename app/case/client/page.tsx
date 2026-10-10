"use client";

import { Printer } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { toCaseInput, validateTrip } from "@/lib/case/model";
import { useCase } from "@/lib/case/store";
import { evaluateCase } from "@/lib/engine/evaluate";
import { jurisdictionName } from "@/lib/engine/jurisdiction";
import type { Category, Performer } from "@/lib/engine/types";
import { formatDate } from "@/lib/format";
import { KB } from "@/lib/kb";
import { SOURCE_STATUS } from "@/lib/kb/status";

const ruleById = new Map(KB.rules.map((r) => [r.id, r]));

const WHO: Record<Performer, string> = {
  us_vet: "Your veterinarian",
  usda: "USDA (via your veterinarian)",
  owner: "You",
  lab: "Laboratory",
  foreign_authority: "Official veterinarian abroad",
  foreign_vet: "Veterinarian abroad",
};

const BRING: Partial<Record<Category, string>> = {
  vaccination: "Rabies vaccination certificates (originals, signed)",
  testing: "Rabies antibody (FAVN) test report",
  certificate: "Health certificate (original)",
  endorsement: "USDA-endorsed paperwork",
  documentation: "Receipts and confirmations for forms you submit",
  notification: "Your import approval or notification confirmation",
};

export default function ClientPage() {
  const { state, loaded, today } = useCase();
  const result = useMemo(() => {
    if (!loaded || Object.keys(validateTrip(state.trip)).length) return null;
    return evaluateCase(toCaseInput(state), KB, SOURCE_STATUS, today);
  }, [loaded, state, today]);

  if (!loaded) return null;
  if (!result) {
    return (
      <p className="text-sm">
        Complete the <Link href="/case/trip" className="underline">trip details</Link> first.
      </p>
    );
  }

  const pet = state.animal.species;
  const route = [jurisdictionName(state.trip.from), ...result.legs.map((l) => jurisdictionName(l.to))].join(" → ");
  const applicable = result.requirements.filter((r) => r.status !== "not_applicable");
  const steps = applicable
    .flatMap((r) => r.actions.map((a) => ({ r, a, rule: ruleById.get(r.ruleId)! })))
    .sort((x, y) => (x.a.earliest ?? "").localeCompare(y.a.earliest ?? ""));
  const done = applicable.filter((r) => r.status === "satisfied");
  const info = applicable.filter((r) => r.status === "informational");
  const bring = [...new Set(applicable.flatMap((r) => BRING[ruleById.get(r.ruleId)!.category] ?? []))];
  const infeasible = result.legs.filter((l) => l.supported && !l.achievable);

  let summary: string;
  if (result.readiness === "not_achievable") {
    summary = `With the current dates, your ${pet} can't meet every entry requirement in time. ${infeasible
      .map((l) => `The earliest your ${pet} could arrive in ${jurisdictionName(l.to)} is ${formatDate(l.earliestCompliantArrival!)}.`)
      .join(" ")} Please talk with your veterinarian about your travel dates.`;
  } else if (result.readiness === "unsupported" || result.readiness === "not_permitted") {
    summary = `Your veterinarian will go over options for this trip with you.`;
  } else if (result.readiness === "not_ready") {
    summary = `There ${steps.length === 1 ? "is 1 step" : `are ${steps.length} steps`} to complete before travel. Dates matter: some steps must happen inside a specific window.`;
  } else if (result.readiness === "review_required") {
    summary = `Your veterinarian is confirming some details with the official sources before this plan is final.`;
  } else {
    summary = `Based on the information your veterinarian entered, the listed requirements appear to be met.`;
  }

  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Travel plan for your {pet}: {route}
          </h1>
          <p className="text-sm text-muted-foreground">
            {result.legs.map((l) => `${jurisdictionName(l.to)}: arrive ${formatDate(l.arriveDate)}`).join(" · ")} · prepared {formatDate(today)}
          </p>
        </div>
        <Button variant="outline" className="no-print" onClick={() => window.print()}>
          <Printer /> Print / Save PDF
        </Button>
      </div>

      <p className="rounded-xl border bg-muted p-4 text-base">{summary}</p>
      {result.readiness !== "review_required" && applicable.some((r) => r.verification.state === "manual_review") && (
        <p className="text-sm text-muted-foreground">Your veterinarian is double-checking some details with the official sources.</p>
      )}

      {steps.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">What needs to happen, and when</h2>
          <ol className="flex flex-col gap-3">
            {steps.map(({ r, a, rule }, i) => (
              <li key={i} className="print-avoid-break rounded-lg border p-4">
                <p className="font-medium">
                  {i + 1}. {a.label}
                </p>
                <p className="text-sm">{rule.text.client}</p>
                <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-muted-foreground">Who</dt>
                    <dd>{WHO[rule.performedBy]}</dd>
                  </div>
                  {a.recommended && !(a.earliest && a.latest && a.latest < a.earliest) && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Suggested timing</dt>
                      <dd>
                        {formatDate(a.recommended.start)} – {formatDate(a.recommended.end)}
                      </dd>
                    </div>
                  )}
                  {a.earliest && a.latest && a.latest < a.earliest ? (
                    <div>
                      <dt className="text-xs text-muted-foreground">Timing</dt>
                      <dd className="font-medium">Can&apos;t be completed in time for the current travel dates</dd>
                    </div>
                  ) : a.latest && (
                    <div>
                      <dt className="text-xs text-muted-foreground">{a.earliest && a.calc[0]?.expr !== "Today" ? "Allowed window" : "Deadline"}</dt>
                      <dd>
                        {a.earliest && a.calc[0]?.expr !== "Today" ? `${formatDate(a.earliest)} – ` : "No later than "}
                        {formatDate(a.latest)}
                      </dd>
                    </div>
                  )}
                </dl>
                <p className="sr-only">For leg {r.legIndex + 1}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {done.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Already done</h2>
          <ul className="list-disc pl-5 text-sm">
            {done.map((r) => (
              <li key={`${r.ruleId}@${r.legIndex}`}>{ruleById.get(r.ruleId)!.title}</li>
            ))}
          </ul>
        </section>
      )}

      {info.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Good to know</h2>
          <ul className="list-disc pl-5 text-sm">
            {info.map((r) => (
              <li key={`${r.ruleId}@${r.legIndex}`}>{ruleById.get(r.ruleId)!.text.client}</li>
            ))}
          </ul>
        </section>
      )}

      {bring.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Keep with you while traveling</h2>
          <ul className="list-disc pl-5 text-sm">
            {bring.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="rounded-lg border p-4 text-xs text-muted-foreground">
        Travel rules can change without notice. This plan is based on the information your veterinarian entered and on official sources as last
        checked. It is not an approval from any government. Final clearance depends on the authorities at each destination and on your
        veterinarian&apos;s review. Airlines may have additional requirements.
      </p>
    </article>
  );
}
