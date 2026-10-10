import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { StatusMap } from "@/lib/engine/types";
import { KB } from "@/lib/kb";
import { excerptRefs, missingExcerpts } from "@/lib/sources/excerpts";

const status: StatusMap = JSON.parse(readFileSync(path.join(__dirname, "../../data/status.json"), "utf8"));
const snapshot = (id: string) => readFileSync(path.join(__dirname, `../../data/snapshots/${id}.txt`), "utf8");
const sourceIds = new Set(KB.sources.map((s) => s.id));

describe("knowledge base integrity", () => {
  it("has unique rule ids", () => {
    const ids = KB.rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cites only registered sources, and every rule cites at least one", () => {
    for (const rule of KB.rules) expect(rule.evidence.length, rule.id).toBeGreaterThan(0);
    for (const ref of excerptRefs(KB)) expect(sourceIds.has(ref.sourceId), ref.key).toBe(true);
  });

  it("has a snapshot and a status entry for every source", () => {
    for (const source of KB.sources) {
      expect(status[source.id], source.id).toBeDefined();
      expect(snapshot(source.id).length, source.id).toBeGreaterThan(0);
    }
  });

  it("matches every quote against its committed snapshot, except mismatches already recorded in status", () => {
    for (const source of KB.sources) {
      expect(missingExcerpts(KB, source.id, snapshot(source.id)), source.id).toEqual(status[source.id].missingExcerpts);
    }
  });

  it("only sequences timed actions after other timed actions on the same route", () => {
    for (const rule of KB.rules) {
      if (rule.requirement.kind !== "timed_action") continue;
      for (const dep of rule.requirement.after ?? []) {
        const target = KB.rules.find((r) => r.id === dep);
        expect(target?.requirement.kind, `${rule.id} -> ${dep}`).toBe("timed_action");
        expect(target?.leg, `${rule.id} -> ${dep}`).toEqual(rule.leg);
      }
    }
  });

  it("records review hashes only for sources the rule cites", () => {
    for (const rule of KB.rules) {
      const cited = new Set(rule.evidence.map((e) => e.sourceId));
      for (const id of Object.keys(rule.review?.sourceHashes ?? {})) expect(cited.has(id), `${rule.id}: ${id}`).toBe(true);
      if (rule.review) for (const id of cited) expect(rule.review.sourceHashes[id], `${rule.id}: ${id} reviewed without a hash`).toBeDefined();
    }
  });

  it("has rules for both dogs and cats at every covered destination", () => {
    for (const c of KB.coverage) {
      for (const species of ["dog", "cat"] as const) {
        const any = KB.rules.some((r) => r.species.includes(species) && r.leg.to.includes(c.to));
        expect(any, `${c.to} ${species}`).toBe(true);
      }
    }
  });
});
