import { describe, expect, it } from "vitest";
import { containsExcerpt, normalizeForMatch } from "@/lib/sources/text";
import { extractHtmlText } from "@/lib/sources/extract";
import { missingExcerpts } from "@/lib/sources/excerpts";
import type { Rule } from "@/lib/engine/types";

describe("normalizeForMatch", () => {
  it("collapses whitespace, unifies quotes and dashes, lowercases", () => {
    expect(normalizeForMatch("  The dog’s   “rabies”\n\tvaccination – 180 days ")).toBe(
      `the dog's "rabies" vaccination - 180 days`,
    );
  });
});

describe("zero-width characters", () => {
  it("are ignored, since some government pages scatter them inside words", () => {
    expect(normalizeForMatch("P\u200b\u200bet dogs\ufeff")).toBe("pet dogs");
  });
});

describe("containsExcerpt", () => {
  const source = "Dogs must be at least 6 months old.\nAll dogs must have a microchip   implanted.";

  it("finds an excerpt across line breaks and spacing differences", () => {
    expect(containsExcerpt(source, "old. All dogs must have a microchip implanted")).toBe(true);
  });

  it("rejects an excerpt whose wording differs", () => {
    expect(containsExcerpt(source, "Dogs must be at least 4 months old")).toBe(false);
  });

  it("rejects an empty excerpt", () => {
    expect(containsExcerpt(source, "   ")).toBe(false);
  });
});

describe("extractHtmlText", () => {
  const html = `<!doctype html><html><head><title>t</title></head><body>
    <nav><a href="/">Home</a> | <a href="/x">Menu item</a></nav>
    <main id="content">
      <h1>Bringing a dog</h1>
      <p>Your dog must have a <strong>microchip</strong>.</p>
      <ul><li>First item</li><li>Second item</li></ul>
    </main>
    <footer>Last updated June 1</footer>
  </body></html>`;

  it("keeps block structure as separate lines within the selected container", () => {
    const text = extractHtmlText(html, "#content");
    expect(text.split("\n")).toEqual([
      "Bringing a dog",
      "Your dog must have a microchip.",
      "First item",
      "Second item",
    ]);
  });

  it("drops zero-width characters from snapshots", () => {
    expect(extractHtmlText("<main><p>P\u200b\u200bet dogs</p></main>", "main")).toBe("Pet dogs");
  });

  it("throws when the selector matches nothing, so a page redesign is never mistaken for empty content", () => {
    expect(() => extractHtmlText(html, "#missing")).toThrow(/#missing/);
  });
});


describe("missingExcerpts", () => {
  const base = { id: "r", evidence: [] } as unknown as Rule;
  const kbWith = (evidence: Rule["evidence"]) => ({ rules: [{ ...base, evidence }], countries: {} });

  it("reports quotes that are not in the source text", () => {
    expect(missingExcerpts(kbWith([{ sourceId: "s", excerpt: "not here" }]), "s", "some text")).toEqual(["r#0"]);
  });

  it("reports absent-checks whose text now appears in the source", () => {
    expect(missingExcerpts(kbWith([{ sourceId: "s", excerpt: "Japan", absent: true }]), "s", "Haiti\nJapan")).toEqual(["r#0"]);
    expect(missingExcerpts(kbWith([{ sourceId: "s", excerpt: "Japan", absent: true }]), "s", "Haiti\nIndia")).toEqual([]);
  });
});
