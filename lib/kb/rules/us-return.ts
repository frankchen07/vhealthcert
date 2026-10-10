import type { LegMatch, Rule } from "@/lib/engine/types";

const intoUS: LegMatch = { to: ["US"], fromNot: ["US"] };
const CDC_LOW = "cdc-dogs-low-risk";
const CDC_HIGH = "cdc-dogs-high-risk-list";
const APHIS_DOGS = "aphis-dog-import";

export const usReturnRules: Rule[] = [
  {
    id: "us-cdc-dog-import-form",
    title: "CDC Dog Import Form receipt",
    category: "documentation",
    performedBy: "owner",
    leg: intoUS,
    species: ["dog"],
    when: [{ cdcRabiesRisk: "low" }],
    requirement: { kind: "timed_action", anchor: "arrival", maxBefore: { months: 6 } },
    text: {
      vet: "For dogs that have been only in dog rabies-free or low-risk countries in the 6 months before entry, the CDC Dog Import Form receipt is the only required document. One form per dog; the departure country on the receipt must match.",
      client: "Before flying back to the U.S., fill out the free CDC Dog Import Form online for each dog and keep the emailed receipt. It can be done up to 6 months ahead or on the day of travel.",
      interpretation: "Receipt must be issued within the 6 months before re-entry and list the country the dog departs from.",
    },
    evidence: [
      {
        sourceId: CDC_LOW,
        excerpt:
          "Starting on August 1, 2024, the only required documentation for dogs entering or returning to the United States that have been only in dog rabies-free or low-risk countries in the past 6 months is the CDC Dog Import Form.",
      },
      { sourceId: CDC_LOW, excerpt: "The receipt is valid for 6 months from when it’s issued" },
      { sourceId: CDC_LOW, excerpt: "You can fill out the form on the day of travel." },
    ],
    review: null,
  },
  {
    id: "us-cdc-dog-age",
    title: "Dog at least 6 months old at U.S. entry",
    category: "entry_condition",
    performedBy: "owner",
    leg: intoUS,
    species: ["dog"],
    when: [{ cdcRabiesRisk: "low" }],
    requirement: { kind: "min_age", atArrival: { months: 6 } },
    text: {
      vet: "Dogs must be at least 6 months old when they enter or return to the U.S.",
      client: "Your dog must be at least 6 months old when it returns to the U.S.",
      interpretation: "Birth date + 6 months must fall on or before the U.S. arrival date.",
    },
    evidence: [{ sourceId: CDC_LOW, excerpt: "Dogs must be at least 6 months old at time of entry or return to the U.S." }],
    review: null,
  },
  {
    id: "us-cdc-dog-microchip",
    title: "Microchip readable by a universal scanner",
    category: "identification",
    performedBy: "us_vet",
    leg: intoUS,
    species: ["dog"],
    when: [{ cdcRabiesRisk: "low" }],
    requirement: { kind: "microchip", iso: false },
    text: {
      vet: "Dogs must have a microchip detectable with a universal scanner.",
      client: "Your dog needs a working microchip to re-enter the U.S.",
      interpretation: "Any microchip readable by a universal scanner satisfies this requirement.",
    },
    evidence: [{ sourceId: CDC_LOW, excerpt: "Dogs must have a microchip that can be detected with a universal scanner to identify them." }],
    review: null,
  },
  {
    id: "us-cdc-dog-healthy",
    title: "Dog appears healthy on arrival",
    category: "entry_condition",
    performedBy: "owner",
    leg: intoUS,
    species: ["dog"],
    when: [{ cdcRabiesRisk: "low" }],
    requirement: { kind: "informational" },
    text: {
      vet: "Dogs must appear healthy upon arrival.",
      client: "Your dog must look healthy when it arrives back in the U.S.",
      interpretation: "Assessed by officials at the port of entry.",
    },
    evidence: [{ sourceId: CDC_LOW, excerpt: "Dogs must appear healthy upon arrival." }],
    review: null,
  },
  {
    id: "us-cdc-dog-high-risk",
    title: "Dog has been in a CDC high-risk country",
    category: "entry_condition",
    performedBy: "us_vet",
    leg: intoUS,
    species: ["dog"],
    when: [{ cdcRabiesRisk: "high" }],
    requirement: { kind: "informational" },
    text: {
      vet: "Dogs that have been in a CDC high-risk country in the past 6 months must meet CDC's high-risk requirements, including forms a USDA-accredited veterinarian must submit before the dog leaves the U.S.",
      client: "Because of the countries your dog has visited, extra U.S. re-entry steps apply. Your vet will review them with you.",
      interpretation: "The high-risk pathway is outside this prototype's coverage.",
    },
    evidence: [
      { sourceId: CDC_HIGH, excerpt: "Dogs that have been in any of these countries within the past 6 months are required to be vaccinated against rabies in order to enter the U.S." },
    ],
    unsupported: "The dog has been in a CDC high-risk country in the past 6 months. CDC's high-risk pathway is not covered in this version.",
    review: null,
  },
  {
    id: "us-cdc-cat-healthy",
    title: "Cat appears healthy on arrival",
    category: "entry_condition",
    performedBy: "owner",
    leg: intoUS,
    species: ["cat"],
    requirement: { kind: "informational" },
    text: {
      vet: "CDC requires cats to appear healthy on arrival; proof of rabies vaccination is not federally required. The U.S. destination may have its own rules.",
      client: "Your cat must look healthy when it arrives back in the U.S.",
      interpretation: "No federal document is required for pet cats.",
    },
    evidence: [
      { sourceId: "cdc-bringing-animals", excerpt: "CDC requires that cats appear healthy upon arrival to the United States." },
      { sourceId: "cdc-bringing-animals", excerpt: "Cats are not required to have proof of rabies vaccination for importation into the United States." },
    ],
    review: null,
  },
  {
    id: "us-aphis-dog-screwworm",
    title: "Screwworm inspection certificate",
    category: "certificate",
    performedBy: "foreign_authority",
    leg: intoUS,
    species: ["dog"],
    when: [{ originNotFree: "screwworm" }],
    requirement: { kind: "timed_action", anchor: "departure", maxBefore: { days: 5 } },
    text: {
      vet: "Dogs from screwworm-affected regions need a certificate from an official government veterinarian of the region of origin stating the dog was inspected for screwworm within 5 days before shipment and found free (or treated until free).",
      client: "Your dog needs a screwworm inspection certificate from an official veterinarian in the country you are leaving, within 5 days before your flight.",
      interpretation: "Issued abroad; window = departure minus 5 days through departure.",
    },
    evidence: [
      {
        sourceId: APHIS_DOGS,
        excerpt:
          "If your pet dog is coming from a country or region where screwworm is known to exist, it may enter the United States only if it is accompanied by a certificate signed by a full-time salaried veterinary official (official government veterinarian) of the region of origin stating that the dog:",
      },
      { sourceId: APHIS_DOGS, excerpt: "Has been inspected for screwworm within 5 days before shipment to the United States, and" },
    ],
    review: null,
  },
  {
    id: "us-aphis-dog-fmd",
    title: "Foot-and-mouth disease precautions",
    category: "entry_condition",
    performedBy: "owner",
    leg: intoUS,
    species: ["dog"],
    when: [{ originNotFree: "fmd" }],
    requirement: { kind: "informational" },
    text: {
      vet: "Dogs from FMD-affected regions: fur and bedding free of excessive dirt, hay or straw; bathe on arrival and keep away from livestock for 5 days. No documents required.",
      client: "Keep your dog's coat and bedding clean for the trip home, bathe your dog when you arrive, and keep it away from livestock for 5 days.",
      interpretation: "No documentation is required.",
    },
    evidence: [
      { sourceId: APHIS_DOGS, excerpt: "Their fur and bedding must be free of excessive dirt, hay, or straw." },
      {
        sourceId: APHIS_DOGS,
        excerpt: "The dog should be bathed as soon as it reaches its destination and kept separate from all livestock for 5 days after entering the United States.",
      },
    ],
    review: null,
  },
];
