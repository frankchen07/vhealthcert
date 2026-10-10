export function normalizeForMatch(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function containsExcerpt(text: string, excerpt: string): boolean {
  const needle = normalizeForMatch(excerpt);
  return needle.length > 0 && normalizeForMatch(text).includes(needle);
}
