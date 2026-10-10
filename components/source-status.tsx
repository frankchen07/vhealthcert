import { Pill } from "@/components/status";
import type { Source, SourceStatus } from "@/lib/engine/types";
import { pd } from "@/lib/engine/dates";
import { MAX_STALE_DAYS, sourceAgeDays } from "@/lib/engine/verification";
import { formatDate, localDateOf } from "@/lib/format";

export function freshness(source: Source, status: SourceStatus | undefined, today: string) {
  if (!status?.lastOk) return { tone: "review" as const, label: "Never verified" };
  if (!status.ok) return { tone: "review" as const, label: `Retrieval failed ${formatDate(localDateOf(status.lastAttempt))}` };
  const verified = localDateOf(status.lastOk);
  if (sourceAgeDays(status.lastOk, pd(today)) > MAX_STALE_DAYS[source.risk]) return { tone: "review" as const, label: `Stale — verified ${formatDate(verified)}` };
  if (status.missingExcerpts.length) return { tone: "review" as const, label: "Quoted text changed" };
  return { tone: "ok" as const, label: `Verified ${formatDate(verified)}` };
}

export function SourceFreshness({ source, status, today }: { source: Source; status: SourceStatus | undefined; today: string }) {
  const f = freshness(source, status, today);
  return <Pill tone={f.tone}>{f.label}</Pill>;
}
