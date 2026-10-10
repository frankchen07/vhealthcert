import { US_STATES, jurisdictionName } from "@/lib/engine/jurisdiction";
import { KB } from "@/lib/kb";

export const ORIGINS = Object.keys(US_STATES).map((code) => ({ code, name: US_STATES[code] }));

const OTHER_COUNTRIES = ["CA", "MX", "GB", "FR", "DE", "IE", "IT", "ES", "NL", "AU"];

export const COVERED_DESTINATIONS = [...new Set(KB.coverage.map((c) => c.to))]
  .filter((code) => code !== "US")
  .map((code) => ({ code, name: jurisdictionName(code) }));

export const OTHER_DESTINATIONS = [...OTHER_COUNTRIES, ...Object.keys(US_STATES)]
  .filter((code) => !COVERED_DESTINATIONS.some((d) => d.code === code))
  .map((code) => ({ code, name: jurisdictionName(code) }));

export const HAWAII_PORTS = [
  { code: "HNL", name: "Honolulu (HNL), Oahu" },
  { code: "OGG", name: "Kahului (OGG), Maui" },
  { code: "KOA", name: "Kona (KOA), Hawaii Island" },
  { code: "LIH", name: "Lihue (LIH), Kauai" },
];

export const RECENT_COUNTRY_CHOICES = [
  ...Object.entries(KB.countries)
    .filter(([code]) => code !== "US")
    .map(([code, c]) => ({ code, name: c.name })),
  { code: "OTHER", name: "Another country not listed" },
];
