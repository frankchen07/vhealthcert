import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { jurisdictionName } from "@/lib/engine/jurisdiction";
import { KB } from "@/lib/kb";

export default function Home() {
  const unreviewed = KB.rules.filter((r) => !r.review).length;
  const destinations = [...new Set(KB.coverage.map((c) => c.to))].filter((code) => code !== "US");

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4 pt-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Source-backed travel planning for veterinarians.</h1>
        <p className="max-w-2xl text-muted-foreground">
          Enter the itinerary and the animal&apos;s history. Get a dated plan where every requirement links to the official source behind it, and
          anything uncertain is flagged for your review instead of hidden.
        </p>
        <div>
          <Link href="/case/trip" className={buttonVariants({ size: "lg" })}>
            Check Travel Requirements
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">No account needed. Cases are temporary and never leave your browser.</p>
      </section>

      {unreviewed > 0 && (
        <p role="note" className="rounded-lg border border-review-border bg-review-bg px-4 py-3 text-sm text-review">
          Prototype knowledge base: {unreviewed} of {KB.rules.length} rules are awaiting review by a licensed veterinarian and will show as
          Manual Review Required.
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Covered now</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Dogs and cats, personal travel: {destinations.map(jurisdictionName).join(", ")}, plus re-entry to the U.S. Other destinations are
            clearly marked as not yet covered.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Evidence, not confidence</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Every requirement shows the authority, the exact quoted text, a link, and when the source was last verified.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Dates you can act on</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Windows and deadlines are calculated deterministically, with the arithmetic shown, and impossible timelines are called out.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
