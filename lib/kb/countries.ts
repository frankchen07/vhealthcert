import type { CountryStatus } from "@/lib/engine/types";

export const countries: Record<string, CountryStatus> = {
  US: { name: "United States", cdcRabiesRisk: "low", evidence: [] },
  FR: {
    name: "France",
    cdcRabiesRisk: "low",
    aphisFmdFree: true,
    aphisScrewwormFree: true,
    evidence: [
      { sourceId: "cdc-dogs-high-risk-list", excerpt: "If a country or political unit is not listed below, it is not considered high risk for importing dog rabies into the United States." },
      { sourceId: "cdc-dogs-high-risk-list", excerpt: "France", absent: true },
      { sourceId: "cdc-dogs-high-risk-list", excerpt: "Haiti" },
      { sourceId: "aphis-dog-disease-status", excerpt: "France (EU),free,free,free" },
    ],
  },
  JP: {
    name: "Japan",
    cdcRabiesRisk: "low",
    aphisFmdFree: true,
    aphisScrewwormFree: true,
    evidence: [
      { sourceId: "cdc-dogs-high-risk-list", excerpt: "If a country or political unit is not listed below, it is not considered high risk for importing dog rabies into the United States." },
      { sourceId: "cdc-dogs-high-risk-list", excerpt: "Japan", absent: true },
      { sourceId: "cdc-dogs-high-risk-list", excerpt: "Haiti" },
      { sourceId: "aphis-dog-disease-status", excerpt: "Japan,free,free,free" },
    ],
  },
};
