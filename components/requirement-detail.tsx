"use client";

import { useState } from "react";
import { SourceFreshness } from "@/components/source-status";
import { Pill, StatusPill, VerificationPill } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { jurisdictionName } from "@/lib/engine/jurisdiction";
import type { Evidence, LegResult, PlannedAction, RequirementResult, Rule } from "@/lib/engine/types";
import { formatDate } from "@/lib/format";
import { KB } from "@/lib/kb";
import { SOURCE_STATUS } from "@/lib/kb/status";

const sourceById = new Map(KB.sources.map((s) => [s.id, s]));

export function windowText(action: PlannedAction): string {
  const { earliest, latest } = action;
  if (earliest && latest && latest < earliest) return `Window closed — deadline was ${formatDate(latest)}`;
  const openStart = action.calc[0]?.expr === "Today";
  if (earliest && latest && !openStart) return `Complete between ${formatDate(earliest)} – ${formatDate(latest)}`;
  if (latest) return `Complete no later than ${formatDate(latest)}`;
  return earliest ? `Earliest valid date ${formatDate(earliest)}` : "";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

export function EvidenceQuote({ evidence, today }: { evidence: Evidence; today: string }) {
  const source = sourceById.get(evidence.sourceId)!;
  return (
    <figure className="print-avoid-break flex flex-col gap-1.5 rounded-lg border p-3">
      <blockquote className="text-sm">
        {evidence.absent ? (
          <>
            <span className="text-muted-foreground">Not listed on this source: </span>“{evidence.excerpt}”
          </>
        ) : (
          <>“{evidence.excerpt}”</>
        )}
      </blockquote>
      <figcaption className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{source.authority} —</span>
        <a href={source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          {source.title}
        </a>
        <SourceFreshness source={source} status={SOURCE_STATUS[source.id]} today={today} />
      </figcaption>
    </figure>
  );
}

function CalcTable({ steps }: { steps: { label: string; expr: string; date: string }[] }) {
  if (!steps.length) return null;
  return (
    <table className="w-full text-xs">
      <tbody>
        {steps.map((s, i) => (
          <tr key={i} className="border-t first:border-t-0">
            <td className="py-1 pr-2 text-muted-foreground">{s.label}</td>
            <td className="py-1 pr-2 font-mono">{s.expr}</td>
            <td className="py-1 text-right font-mono whitespace-nowrap">{s.date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function RequirementDetail({
  rule,
  result,
  leg,
  today,
  completedOn,
  onComplete,
}: {
  rule: Rule;
  result: RequirementResult;
  leg: LegResult;
  today: string;
  completedOn?: string;
  onComplete: (date: string | null) => void;
}) {
  const [doneDate, setDoneDate] = useState(completedOn ?? "");
  const authorities = [...new Set(rule.evidence.map((e) => sourceById.get(e.sourceId)!.authority))];

  return (
    <div className="flex min-w-0 flex-col gap-5 overflow-y-auto px-4 pb-8 break-words">
      <div className="flex flex-wrap gap-2">
        <StatusPill status={result.status} />
        <VerificationPill state={result.verification.state} />
        <Pill tone="muted">
          {jurisdictionName(leg.from)} → {jurisdictionName(leg.to)}
        </Pill>
      </div>

      {result.verification.state !== "verified" && (
        <div
          role={result.verification.state === "manual_review" ? "alert" : undefined}
          className={
            result.verification.state === "manual_review"
              ? "rounded-lg border border-review-border bg-review-bg p-3 text-sm text-review"
              : "rounded-lg border border-action-border bg-action-bg p-3 text-sm text-action"
          }
        >
          <p className="font-medium">{result.verification.state === "manual_review" ? "Manual review required" : "Review recommended"}</p>
          <ul className="mt-1 list-disc pl-5">
            {result.verification.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <Section title="Requirement">
        <p className="text-sm">{rule.text.vet}</p>
        {result.findings.length > 0 && (
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            {result.findings.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Applicability">
        <ul className="list-disc pl-5 text-sm">
          <li>
            Applies to {rule.species.map((s) => `${s}s`).join(" and ")} traveling to {rule.leg.to.map(jurisdictionName).join(", ")}
            {rule.leg.from ? ` from ${rule.leg.from.map(jurisdictionName).join(", ")}` : ""}
            {rule.leg.fromNot ? ` (not from ${rule.leg.fromNot.map(jurisdictionName).join(", ")})` : ""}.
          </li>
          {result.applicability.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </Section>

      {(result.actions.length > 0 || result.calc.length > 0) && (
        <Section title="Timing">
          {result.actions.map((a, i) => (
            <div key={i} className="flex flex-col gap-1 rounded-lg border p-3">
              <p className="text-sm font-medium">{a.label}</p>
              <p className="text-sm">{windowText(a)}</p>
              {a.recommended && (
                <p className="text-xs text-muted-foreground">
                  Recommended scheduling window (not a regulatory requirement): {formatDate(a.recommended.start)} – {formatDate(a.recommended.end)}.{" "}
                  {a.recommended.reason}
                </p>
              )}
              <CalcTable steps={a.calc} />
            </div>
          ))}
          <CalcTable steps={result.calc} />
        </Section>
      )}

      {rule.requirement.kind === "timed_action" && (
        <Section title="Record completion">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`done-${rule.id}`}>Completed on</Label>
              <Input id={`done-${rule.id}`} type="date" max={today} value={doneDate} onChange={(e) => setDoneDate(e.target.value)} />
            </div>
            <Button type="button" variant="outline" disabled={!doneDate} onClick={() => onComplete(doneDate)}>
              Save
            </Button>
            {completedOn && (
              <Button type="button" variant="ghost" onClick={() => (setDoneDate(""), onComplete(null))}>
                Clear
              </Button>
            )}
          </div>
        </Section>
      )}

      <Separator />

      <Section title="Authority">
        <p className="text-sm">{authorities.join("; ")}</p>
      </Section>

      <Section title="Evidence">
        {rule.evidence.map((e, i) => (
          <EvidenceQuote key={i} evidence={e} today={today} />
        ))}
      </Section>

      {rule.conflict && (
        <Section title="Conflicting sources">
          <div className="grid gap-3">
            <div>
              <p className="mb-1 text-xs font-medium">Source A</p>
              <EvidenceQuote evidence={rule.evidence[rule.conflict.primaryIndex ?? 0]} today={today} />
            </div>
            {rule.conflict.evidence.map((e, i) => (
              <div key={i}>
                <p className="mb-1 text-xs font-medium">Source B</p>
                <EvidenceQuote evidence={e} today={today} />
              </div>
            ))}
            <div className="rounded-lg border border-review-border bg-review-bg p-3 text-sm">
              <p className="font-medium text-review">System interpretation</p>
              <p>{rule.conflict.systemView}</p>
              <p className="mt-2 font-medium text-review">Required action: manual review. You make the final determination.</p>
            </div>
          </div>
        </Section>
      )}

      <Section title="Interpretation">
        <p className="text-sm">{rule.text.interpretation}</p>
        {rule.reviewRecommended && <p className="text-sm text-muted-foreground">{rule.reviewRecommended}</p>}
      </Section>

      <Section title="Rule review">
        <p className="text-sm">
          {rule.review ? `Reviewed by ${rule.review.by} on ${formatDate(rule.review.at)}.` : "Not yet reviewed by a licensed veterinarian."}
        </p>
      </Section>
    </div>
  );
}
