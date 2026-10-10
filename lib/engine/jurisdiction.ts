import type { Coverage, LegInput, LegMatch } from "./types";

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  JP: "Japan",
  CA: "Canada",
  MX: "Mexico",
  GB: "United Kingdom",
  AU: "Australia",
  FR: "France",
  DE: "Germany",
  IE: "Ireland",
  IT: "Italy",
  ES: "Spain",
  NL: "Netherlands",
  HT: "Haiti",
  TH: "Thailand",
};

export const US_STATES: Record<string, string> = {
  "US-AL": "Alabama", "US-AK": "Alaska", "US-AZ": "Arizona", "US-AR": "Arkansas", "US-CA": "California",
  "US-CO": "Colorado", "US-CT": "Connecticut", "US-DE": "Delaware", "US-DC": "District of Columbia",
  "US-FL": "Florida", "US-GA": "Georgia", "US-GU": "Guam", "US-HI": "Hawaii", "US-ID": "Idaho",
  "US-IL": "Illinois", "US-IN": "Indiana", "US-IA": "Iowa", "US-KS": "Kansas", "US-KY": "Kentucky",
  "US-LA": "Louisiana", "US-ME": "Maine", "US-MD": "Maryland", "US-MA": "Massachusetts", "US-MI": "Michigan",
  "US-MN": "Minnesota", "US-MS": "Mississippi", "US-MO": "Missouri", "US-MT": "Montana", "US-NE": "Nebraska",
  "US-NV": "Nevada", "US-NH": "New Hampshire", "US-NJ": "New Jersey", "US-NM": "New Mexico", "US-NY": "New York",
  "US-NC": "North Carolina", "US-ND": "North Dakota", "US-OH": "Ohio", "US-OK": "Oklahoma", "US-OR": "Oregon",
  "US-PA": "Pennsylvania", "US-PR": "Puerto Rico", "US-RI": "Rhode Island", "US-SC": "South Carolina",
  "US-SD": "South Dakota", "US-TN": "Tennessee", "US-TX": "Texas", "US-UT": "Utah", "US-VT": "Vermont",
  "US-VA": "Virginia", "US-WA": "Washington", "US-WV": "West Virginia", "US-WI": "Wisconsin", "US-WY": "Wyoming",
};

export const countryOf = (code: string): string => code.split("-")[0];

export const jurisdictionName = (code: string): string => US_STATES[code] ?? COUNTRY_NAMES[code] ?? code;

function matches(pattern: string, code: string): boolean {
  return pattern.includes("-") ? pattern === code : countryOf(code) === pattern;
}

const matchesAny = (patterns: string[] | undefined, code: string): boolean =>
  (patterns ?? []).some((p) => matches(p, code));

export function legMatches(match: LegMatch, leg: LegInput): boolean {
  return (
    matchesAny(match.to, leg.to) &&
    (match.from === undefined || matchesAny(match.from, leg.from)) &&
    !matchesAny(match.fromNot, leg.from)
  );
}

/**
 * A leg is supported only when every authority layer it crosses is covered: the destination
 * country for international legs, and the destination state when arriving in a U.S. state.
 */
export function legSupport(leg: LegInput, coverage: Coverage[]): { supported: boolean; reason?: string } {
  const layers: string[] = [];
  if (countryOf(leg.from) !== countryOf(leg.to)) layers.push(countryOf(leg.to));
  if (leg.to.includes("-")) layers.push(leg.to);

  for (const layer of layers) {
    const entry = coverage.find((c) => c.to === layer && matchesAny(c.from, leg.from) && !matchesAny(c.fromNot, leg.from));
    if (!entry) {
      return {
        supported: false,
        reason: `Travel from ${jurisdictionName(leg.from)} to ${jurisdictionName(layer)} is not covered yet.`,
      };
    }
    if (entry.ports && !(leg.arrivalPort && entry.ports.includes(leg.arrivalPort))) {
      return {
        supported: false,
        reason: leg.arrivalPort
          ? `Arrival at ${leg.arrivalPort} is not covered yet (covered: ${entry.ports.join(", ")}).`
          : `Select the arrival airport for ${jurisdictionName(layer)}.`,
      };
    }
  }
  return { supported: true };
}
