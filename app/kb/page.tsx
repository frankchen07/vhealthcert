import type { Metadata } from "next";
import { LiveFreshness } from "@/components/live-freshness";
import { Pill } from "@/components/status";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { describeDuration } from "@/lib/engine/dates";
import { jurisdictionName } from "@/lib/engine/jurisdiction";
import type { Evidence, RequirementSpec, Rule } from "@/lib/engine/types";
import { formatDate } from "@/lib/format";
import { KB } from "@/lib/kb";
import { SOURCE_STATUS } from "@/lib/kb/status";

export const metadata: Metadata = { title: "Knowledge base — VetTravel Verify" };

const sourceById = new Map(KB.sources.map((s) => [s.id, s]));

function describeSpec(spec: RequirementSpec): string {
  switch (spec.kind) {
    case "microchip":
      return spec.iso ? "Microchip, ISO 11784/11785" : "Microchip (any readable chip)";
    case "rabies_series":
      return [
        `${spec.count} rabies dose${spec.count > 1 ? "s" : ""}`,
        spec.count > 1 && `≥ ${spec.minIntervalDays} days apart`,
        spec.minAgeDays !== undefined && `first at ≥ ${spec.minAgeDays} days of age`,
        spec.afterMicrochip && "after microchip",
        spec.requireContinuity && "continuous coverage",
        spec.minDaysBeforeArrival && `most recent ≥ ${spec.minDaysBeforeArrival} days before arrival`,
        spec.acceptedTypes && `types: ${spec.acceptedTypes.join(", ")}`,
        "valid at arrival",
      ]
        .filter(Boolean)
        .join("; ");
    case "rabies_titer":
      return `Titer ≥ ${spec.minIUml} IU/ml at ${spec.labs.join("/")}; wait ${spec.waitDays} days from ${
        spec.waitFrom === "sample" ? "sample" : "day after lab receipt"
      }; valid ${describeDuration(spec.validFor)}${spec.sampleOnOrAfterDose ? `; sample on/after dose ${spec.sampleOnOrAfterDose}` : ""}`;
    case "min_age":
      return `At least ${describeDuration(spec.atArrival)} old at arrival`;
    case "timed_action": {
      const anchor = spec.anchor;
      const parts = [
        spec.maxBefore && `no earlier than ${describeDuration(spec.maxBefore)} before ${anchor}`,
        spec.minBefore && `no later than ${describeDuration(spec.minBefore)} before ${anchor}`,
        spec.after && `after ${spec.after.join(", ")}`,
      ].filter(Boolean);
      return `Timed action: ${parts.join("; ") || `before ${anchor}`}`;
    }
    case "breed_restriction":
      return `Prohibited: ${spec.prohibited.join(", ")}${spec.listIsExhaustive ? "" : " (list not exhaustive)"}`;
    case "informational":
      return "Informational";
  }
}

function Quote({ evidence }: { evidence: Evidence }) {
  const source = sourceById.get(evidence.sourceId)!;
  return (
    <figure className="rounded-lg border p-3 text-sm">
      <blockquote>
        {evidence.absent && <span className="text-muted-foreground">Not listed: </span>}“{evidence.excerpt}”
      </blockquote>
      <figcaption className="mt-1 text-xs text-muted-foreground">
        <a href={source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          {source.title}
        </a>
      </figcaption>
    </figure>
  );
}

function RuleCard({ rule }: { rule: Rule }) {
  return (
    <Card id={rule.id}>
      <CardHeader>
        <CardTitle as="h3" className="flex flex-wrap items-center gap-2">
          {rule.title}
          {rule.review ? <Pill tone="ok">Reviewed by {rule.review.by}, {formatDate(rule.review.at)}</Pill> : <Pill tone="review">Awaiting vet review</Pill>}
          {rule.conflict && <Pill tone="review">Source conflict</Pill>}
          {rule.manualReview && <Pill tone="review">Always manual review</Pill>}
        </CardTitle>
        <CardDescription>
          <code className="font-mono text-xs">{rule.id}</code> · {rule.species.join(", ")} · {rule.category.replace("_", " ")} · {describeSpec(rule.requirement)}
          {rule.when && ` · when ${rule.when.map((c) => JSON.stringify(c)).join(", ")}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p>{rule.text.vet}</p>
        <p className="text-muted-foreground">Interpretation: {rule.text.interpretation}</p>
        {rule.reviewRecommended && <p className="text-action">Review note: {rule.reviewRecommended}</p>}
        {rule.manualReview && <p className="text-review">{rule.manualReview}</p>}
        {rule.evidence.map((e, i) => (
          <Quote key={i} evidence={e} />
        ))}
        {rule.conflict && (
          <div className="flex flex-col gap-2 rounded-lg border border-review-border bg-review-bg p-3">
            <p className="font-medium text-review">Conflicting wording</p>
            {rule.conflict.evidence.map((e, i) => (
              <Quote key={i} evidence={e} />
            ))}
            <p>{rule.conflict.systemView}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function KnowledgeBasePage() {
  const groups = [...new Set(KB.rules.map((r) => r.leg.to.join(",")))];
  const unreviewed = KB.rules.filter((r) => !r.review).length;
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge base</h1>
        <p className="text-sm text-muted-foreground">
          {KB.rules.length} rules from {KB.sources.length} official sources. {unreviewed} awaiting veterinary review. Every quote below is checked
          word-for-word against the latest copy of its source.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Sources</h2>
        <ul className="divide-y rounded-xl border">
          {KB.sources.map((s) => {
            const st = SOURCE_STATUS[s.id];
            return (
              <li key={s.id} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <a href={s.url} target="_blank" rel="noreferrer" className="font-medium underline-offset-4 hover:underline">
                    {s.title}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {s.authority} · {s.format.toUpperCase()} · {s.risk} risk · snapshot <code className="font-mono">{st?.hash ?? "none"}</code>
                  </p>
                </div>
                <LiveFreshness source={s} status={st} />
              </li>
            );
          })}
        </ul>
      </section>

      {groups.map((g) => (
        <section key={g} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Into {g.split(",").map(jurisdictionName).join(", ")}</h2>
          {KB.rules
            .filter((r) => r.leg.to.join(",") === g)
            .map((r) => (
              <RuleCard key={r.id} rule={r} />
            ))}
        </section>
      ))}
    </div>
  );
}
