export const PILOT_COOKIE = "vtv-pilot";

/** `PILOT_CODES` is a comma-separated list of `code:vetId` pairs; malformed entries are dropped. */
export function parsePilotCodes(raw: string | undefined): Map<string, string> | null {
  const pairs = (raw ?? "")
    .split(",")
    .map((p) => p.split(":").map((s) => s.trim()))
    .filter((p): p is [string, string] => p.length === 2 && p.every(Boolean));
  return pairs.length ? new Map(pairs) : null;
}
