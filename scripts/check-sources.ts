import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Source, SourceStatus, StatusMap } from "../lib/engine/types";
import { KB } from "../lib/kb";
import { missingExcerpts } from "../lib/sources/excerpts";
import { extractHtmlText, extractPdfText } from "../lib/sources/extract";
import { fetchSource } from "../lib/sources/fetch";

const DATA = path.join(__dirname, "..", "data");
const STATUS_FILE = path.join(DATA, "status.json");
const SNAPSHOTS = path.join(DATA, "snapshots");

async function fetchText(source: Source): Promise<string> {
  const res = await fetchSource(source.url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (source.format === "pdf") return extractPdfText(new Uint8Array(await res.arrayBuffer()));
  const body = await res.text();
  if (source.format === "csv") return body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join("\n");
  return extractHtmlText(body, source.selector!);
}

async function main() {
  const only = process.argv[2];
  const status: StatusMap = existsSync(STATUS_FILE) ? JSON.parse(readFileSync(STATUS_FILE, "utf8")) : {};
  mkdirSync(SNAPSHOTS, { recursive: true });
  const now = new Date().toISOString();
  const changed: string[] = [];
  const failed: string[] = [];

  for (const source of KB.sources.filter((s) => !only || s.id === only)) {
    const previous: SourceStatus | undefined = status[source.id];
    try {
      const text = await fetchText(source);
      const hash = createHash("sha256").update(text).digest("hex").slice(0, 16);
      if (hash !== previous?.hash) {
        writeFileSync(path.join(SNAPSHOTS, `${source.id}.txt`), `${text}\n`);
        if (previous?.hash) changed.push(source.id);
      }
      status[source.id] = { lastAttempt: now, lastOk: now, ok: true, hash, missingExcerpts: missingExcerpts(KB, source.id, text) };
    } catch (err) {
      const error = err instanceof Error ? (err.cause instanceof Error ? `${err.message}: ${err.cause.message}` : err.message) : String(err);
      failed.push(source.id);
      status[source.id] = {
        lastAttempt: now,
        lastOk: previous?.lastOk ?? null,
        ok: false,
        error,
        hash: previous?.hash ?? null,
        missingExcerpts: previous?.missingExcerpts ?? [],
      };
    }
    const s = status[source.id];
    console.log(`${s.ok ? "ok  " : "FAIL"} ${source.id}${s.error ? ` — ${s.error}` : ""}${s.missingExcerpts.length ? ` — missing: ${s.missingExcerpts.join(", ")}` : ""}`);
  }

  const sorted = Object.fromEntries(Object.entries(status).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(STATUS_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`\nchanged: ${changed.join(", ") || "none"}\nfailed: ${failed.join(", ") || "none"}`);
}

main();
