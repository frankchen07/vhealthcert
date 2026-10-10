"use client";

import { Printer } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EvidenceQuote, RequirementDetail, windowText } from "@/components/requirement-detail";
import { Pill, READINESS, StatusPill, VerificationPill, toneClasses } from "@/components/status";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toCaseInput, validateTrip } from "@/lib/case/model";
import { useCase } from "@/lib/case/store";
import { evaluateCase } from "@/lib/engine/evaluate";
import { jurisdictionName } from "@/lib/engine/jurisdiction";
import { completionKey } from "@/lib/engine/requirements";
import type { LegResult, RequirementResult, RequirementStatus, Rule } from "@/lib/engine/types";
import { formatDate } from "@/lib/format";
import { KB } from "@/lib/kb";
import { SOURCE_STATUS } from "@/lib/kb/status";

const ruleById = new Map(KB.rules.map((r) => [r.id, r]));
const legLabel = (leg: LegResult) => `${jurisdictionName(leg.from)} → ${jurisdictionName(leg.to)}`;

const GROUPS: { title: string; statuses: RequirementStatus[] }[] = [
  { title: "Action required", statuses: ["action_required"] },
  { title: "Cannot be determined / not permitted", statuses: ["cannot_determine", "not_permitted"] },
  { title: "Already satisfied", statuses: ["satisfied"] },
  { title: "Information", statuses: ["informational"] },
];

function RequirementRow({ result, onOpen }: { result: RequirementResult; onOpen: () => void }) {
  const rule = ruleById.get(result.ruleId)!;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col gap-2 rounded-lg px-2 py-3 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:flex-row sm:items-center sm:justify-between"
      >
        <span className="flex flex-col">
          <span className="font-medium">{rule.title}</span>
          {result.actions[0] && <span className="text-sm text-muted-foreground">{windowText(result.actions[0])}</span>}
        </span>
        <span className="flex flex-wrap gap-1.5">
          <StatusPill status={result.status} />
          <VerificationPill state={result.verification.state} />
        </span>
      </button>
    </li>
  );
}

export default function PlanPage() {
  const { state, loaded, today, update } = useCase();
  const [open, setOpen] = useState<RequirementResult | null>(null);

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

  const readiness = READINESS[result.readiness];
  const applicable = result.requirements.filter((r) => r.status !== "not_applicable");
  const manual = applicable.filter((r) => r.verification.state === "manual_review");
  const unsupported = result.legs.filter((l) => !l.supported);
  const infeasible = result.legs.filter((l) => l.supported && !l.achievable);
  const timeline = applicable
    .flatMap((r) => r.actions.map((a) => ({ r, a, leg: result.legs[r.legIndex] })))
    .sort((x, y) => (x.a.earliest ?? "").localeCompare(y.a.earliest ?? "") || (x.a.latest ?? "").localeCompare(y.a.latest ?? ""));
  const openRule: Rule | undefined = open ? ruleById.get(open.ruleId) : undefined;
  const openKey = open ? completionKey(open.ruleId, open.legIndex) : "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Travel plan — veterinarian view</h1>
          <p className="text-sm text-muted-foreground">
            {result.legs.map((l) => `${legLabel(l)} (${formatDate(l.arriveDate)})`).join(" · ")} · {state.animal.species} · prepared{" "}
            {formatDate(today)}
          </p>
        </div>
        <div className="no-print flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> Print / Save PDF
          </Button>
          <Link href="/case/client" className={buttonVariants()}>
            Client view
          </Link>
        </div>
      </div>

      <section aria-label="Readiness" className={`print-avoid-break rounded-xl border p-5 ${toneClasses(readiness.tone)}`}>
        <p className="text-xs font-semibold tracking-wide uppercase">Readiness</p>
        <p className="text-2xl font-semibold">{readiness.label}</p>
        <p className="text-sm">{readiness.detail}</p>
        {infeasible.map((l) => (
          <p key={l.index} className="mt-2 text-sm font-medium">
            {legLabel(l)}: earliest compliant arrival {formatDate(l.earliestCompliantArrival!)} (planned {formatDate(l.arriveDate)}).
          </p>
        ))}
      </section>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Requirements", value: result.counts.applicable, tone: "muted" as const },
          { label: "Completed", value: result.counts.satisfied, tone: "ok" as const },
          { label: "Outstanding", value: result.counts.actionRequired, tone: "action" as const },
          { label: "Manual review", value: result.counts.manualReview, tone: result.counts.manualReview ? ("review" as const) : ("muted" as const) },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl border p-4 ${toneClasses(c.tone)}`}>
            <dt className="text-xs font-medium">{c.label}</dt>
            <dd className="text-2xl font-semibold">{c.value}</dd>
          </div>
        ))}
      </dl>

      {result.unreviewedRules > 0 && (
        <p role="note" className="rounded-lg border border-review-border bg-review-bg px-4 py-3 text-sm text-review">
          Prototype knowledge base: {result.unreviewedRules} of {KB.rules.length} rules have not yet been reviewed by a licensed veterinarian, so
          they are marked Manual Review Required.
        </p>
      )}

      {unsupported.length > 0 && (
        <Card className="border-review-border">
          <CardHeader>
            <CardTitle className="text-review">Not covered — no requirements shown for these legs</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 text-sm">
              {unsupported.map((l) => (
                <li key={l.index}>
                  <span className="font-medium">{legLabel(l)}:</span> {l.unsupportedReason}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {manual.length > 0 && (
        <Card className="border-review-border">
          <CardHeader>
            <CardTitle className="text-review">Manual review required ({manual.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {manual.map((r) => (
                <li key={`${r.ruleId}@${r.legIndex}`}>
                  <button
                    type="button"
                    onClick={() => setOpen(r)}
                    className="flex w-full flex-col gap-0.5 rounded-lg px-2 py-2.5 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="font-medium">
                      {ruleById.get(r.ruleId)!.title} <span className="text-xs font-normal text-muted-foreground">· {legLabel(result.legs[r.legIndex])}</span>
                    </span>
                    <span className="text-sm text-review">{r.verification.reasons.find((x) => !x.startsWith("Not yet reviewed")) ?? r.verification.reasons[0]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {timeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-3">
              {timeline.map(({ r, a, leg }, i) => (
                <li key={i} className="print-avoid-break grid gap-1 border-l-2 pl-3 sm:grid-cols-[14rem_1fr]">
                  <span className="font-mono text-sm">
                    {a.earliest && a.latest && a.latest < a.earliest ? (
                      <span className="text-review">Too late for this trip</span>
                    ) : (
                      <>
                        {a.earliest ? formatDate(a.earliest) : "—"} → {a.latest ? formatDate(a.latest) : "—"}
                      </>
                    )}
                  </span>
                  <span className="flex flex-col">
                    <button type="button" onClick={() => setOpen(r)} className="text-left font-medium hover:underline">
                      {a.label}
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {legLabel(leg)} · {windowText(a)}
                      {a.recommended && ` · Suggested appointment: ${formatDate(a.recommended.start)} – ${formatDate(a.recommended.end)}`}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {result.legs
        .filter((l) => l.supported)
        .map((leg) => {
          const legReqs = result.requirements.filter((r) => r.legIndex === leg.index);
          const notApplicable = legReqs.filter((r) => r.status === "not_applicable");
          return (
            <Card key={leg.index}>
              <CardHeader>
                <CardTitle>
                  Leg {leg.index + 1}: {legLabel(leg)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    depart {formatDate(leg.departDate)}, arrive {formatDate(leg.arriveDate)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {GROUPS.map((g) => {
                  const items = legReqs.filter((r) => g.statuses.includes(r.status));
                  if (!items.length) return null;
                  return (
                    <section key={g.title}>
                      <h3 className="mb-1 text-sm font-semibold">{g.title}</h3>
                      <ul className="divide-y">
                        {items.map((r) => (
                          <RequirementRow key={r.ruleId} result={r} onOpen={() => setOpen(r)} />
                        ))}
                      </ul>
                    </section>
                  );
                })}
                {notApplicable.length > 0 && (
                  <details className="no-print text-sm">
                    <summary className="cursor-pointer text-muted-foreground">Not applicable to this animal and itinerary ({notApplicable.length})</summary>
                    <ul className="divide-y">
                      {notApplicable.map((r) => (
                        <RequirementRow key={r.ruleId} result={r} onOpen={() => setOpen(r)} />
                      ))}
                    </ul>
                  </details>
                )}
              </CardContent>
            </Card>
          );
        })}

      <section className="print-only flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Evidence appendix</h2>
        {applicable.map((r) => {
          const rule = ruleById.get(r.ruleId)!;
          return (
            <div key={`${r.ruleId}@${r.legIndex}`} className="print-avoid-break flex flex-col gap-2 border-t pt-3">
              <p className="font-medium">
                {rule.title} · {legLabel(result.legs[r.legIndex])}
              </p>
              <div className="flex gap-2">
                <StatusPill status={r.status} />
                <VerificationPill state={r.verification.state} />
              </div>
              {r.verification.reasons.length > 0 && <p className="text-xs">{r.verification.reasons.join(" ")}</p>}
              <p className="text-xs">Interpretation: {rule.text.interpretation}</p>
              {rule.evidence.map((e, i) => (
                <EvidenceQuote key={i} evidence={e} today={today} />
              ))}
            </div>
          );
        })}
      </section>

      <Sheet open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent side="right" className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
          {open && openRule && (
            <>
              <SheetHeader>
                <SheetTitle>{openRule.title}</SheetTitle>
                <SheetDescription>Why the plan shows this requirement.</SheetDescription>
              </SheetHeader>
              <RequirementDetail
                key={openKey}
                rule={openRule}
                result={result.requirements.find((r) => r.ruleId === open.ruleId && r.legIndex === open.legIndex) ?? open}
                leg={result.legs[open.legIndex]}
                today={today}
                completedOn={state.completed[openKey]}
                onComplete={(date) =>
                  update((s) => {
                    const completed = { ...s.completed };
                    if (date) completed[openKey] = date;
                    else delete completed[openKey];
                    return { ...s, completed };
                  })
                }
              />
            </>
          )}
        </SheetContent>
      </Sheet>

      <p className="text-xs text-muted-foreground">
        <Pill tone="muted">Disclaimer</Pill> Decision support based on the information entered and official sources as last verified. It is not a
        government approval or a veterinary attestation. Confirm flagged items with the relevant authority.
      </p>
    </div>
  );
}
