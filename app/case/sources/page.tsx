"use client";

import { cn } from "cn";
import Link from "next/link";
import { SourceFreshness } from "@/components/source-status";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildLegs, validateTrip } from "@/lib/case/model";
import { useCase } from "@/lib/case/store";
import { countryOf, jurisdictionName, legMatches } from "@/lib/engine/jurisdiction";
import { MAX_STALE_DAYS } from "@/lib/engine/verification";
import { KB } from "@/lib/kb";
import { SOURCE_STATUS } from "@/lib/kb/status";

export default function SourcesPage() {
  const { state, loaded, today } = useCase();
  if (!loaded) return null;
  if (Object.keys(validateTrip(state.trip)).length) {
    return (
      <p className="text-sm">
        Complete the <Link href="/case/trip" className="underline">trip details</Link> first.
      </p>
    );
  }

  const legs = buildLegs(state.trip);
  const rules = KB.rules.filter((r) => r.species.includes(state.animal.species) && legs.some((leg) => legMatches(r.leg, leg)));
  const countries = [...legs.flatMap((l) => [countryOf(l.from), countryOf(l.to)]), ...state.animal.otherCountriesLast6Months];
  const ids = new Set([
    ...rules.flatMap((r) => [...r.evidence, ...(r.conflict?.evidence ?? [])].map((e) => e.sourceId)),
    ...countries.flatMap((c) => KB.countries[c]?.evidence.map((e) => e.sourceId) ?? []),
  ]);
  const sources = KB.sources.filter((s) => ids.has(s.id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Authoritative sources for this trip</h1>
        <p className="text-sm text-muted-foreground">
          {legs.map((l) => `${jurisdictionName(l.from)} → ${jurisdictionName(l.to)}`).join(" · ")}. {rules.length} structured rules apply, drawn
          from {sources.length} official sources. High-risk sources must have been re-verified within {MAX_STALE_DAYS.high} days, others within{" "}
          {MAX_STALE_DAYS.standard}; anything older is flagged for manual review.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {sources.map((s) => (
              <li key={s.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <a href={s.url} target="_blank" rel="noreferrer" className="font-medium underline-offset-4 hover:underline">
                    {s.title}
                  </a>
                  <p className="text-xs text-muted-foreground">{s.authority}</p>
                </div>
                <SourceFreshness source={s} status={SOURCE_STATUS[s.id]} today={today} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <div className="flex justify-between">
        <Link href="/case/animal" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
          Back
        </Link>
        <Link href="/case/plan" className={buttonVariants({ size: "lg" })}>
          View travel plan
        </Link>
      </div>
    </div>
  );
}
