import type { KnowledgeBase } from "@/lib/engine/types";
import { containsExcerpt } from "./text";

export interface ExcerptRef {
  key: string;
  sourceId: string;
  excerpt: string;
  absent?: boolean;
}

export function excerptRefs(kb: Pick<KnowledgeBase, "rules" | "countries">): ExcerptRef[] {
  return [
    ...kb.rules.flatMap((r) => [
      ...r.evidence.map((e, i) => ({ key: `${r.id}#${i}`, ...e })),
      ...(r.conflict?.evidence ?? []).map((e, i) => ({ key: `${r.id}#conflict-${i}`, ...e })),
    ]),
    ...Object.entries(kb.countries).flatMap(([code, c]) => c.evidence.map((e, i) => ({ key: `country-${code}#${i}`, ...e }))),
  ];
}

export function missingExcerpts(kb: Pick<KnowledgeBase, "rules" | "countries">, sourceId: string, text: string): string[] {
  return excerptRefs(kb)
    .filter((ref) => ref.sourceId === sourceId && containsExcerpt(text, ref.excerpt) === Boolean(ref.absent))
    .map((ref) => ref.key);
}
