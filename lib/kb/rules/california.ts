import type { LegMatch, Rule } from "@/lib/engine/types";

const intoCalifornia: LegMatch = { to: ["US-CA"], fromNot: ["US-CA"] };
const CDPH = "cdph-pet-import";
const CDFA_NONE = { sourceId: "cdfa-entry", excerpt: "CDFA does not have any additional import requirements for cats or dogs not changing ownership." };

export const californiaRules: Rule[] = [
  {
    id: "ca-dog-rabies",
    title: "Current rabies vaccination certificate (dogs over 4 months)",
    category: "vaccination",
    performedBy: "us_vet",
    leg: intoCalifornia,
    species: ["dog"],
    when: [{ ageOverAtArrival: { months: 4 } }],
    requirement: { kind: "rabies_series", count: 1, minIntervalDays: 0, afterMicrochip: false, requireContinuity: false },
    text: {
      vet: "Dogs over 4 months entering California need a signed, dated certificate of current rabies vaccination showing vaccine type, manufacturer lot number and date. California sets no waiting period after vaccination.",
      client: "Bring your dog's signed rabies certificate. The vaccination must be current when you arrive in California.",
      interpretation: "Applies when the dog is over 4 months old on arrival; the most recent vaccination must still be valid on arrival.",
    },
    evidence: [
      { sourceId: CDPH, excerpt: "Signed and dated rabies vaccination certificate for any dog over four (4) months of age" },
      {
        sourceId: CDPH,
        excerpt: "The State of California does not require a waiting period after a dog is vaccinated for rabies before it can be brought into California,",
      },
      {
        sourceId: "cdfa-transport-guide",
        excerpt:
          "Dogs - All dogs over 4 months old must have a certificate of current rabies vaccination stating the type, manufacturer lot number of the rabies vaccine used, and the date of administration.",
      },
      CDFA_NONE,
    ],
    reviewRecommended: "Counties and cities in California may set their own waiting periods or requirements, which are not covered here.",
    review: null,
  },
  {
    id: "ca-cat-entry",
    title: "No state documents for pet cats",
    category: "entry_condition",
    performedBy: "owner",
    leg: intoCalifornia,
    species: ["cat"],
    requirement: { kind: "informational" },
    text: {
      vet: "California requires no documents for pet cats; some counties or cities require rabies vaccination.",
      client: "California has no state paperwork for pet cats, but your city or county may require a rabies vaccination.",
      interpretation: "Local requirements are not covered.",
    },
    evidence: [
      { sourceId: CDPH, excerpt: "No documents are required for pet/domestic cats entering California." },
      { sourceId: CDPH, excerpt: "Some counties or cities in California require cats to be vaccinated for rabies." },
      CDFA_NONE,
    ],
    review: null,
  },
];
