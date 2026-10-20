import type { LegMatch, Rule } from "@/lib/engine/types";

const usToFrance: LegMatch = { to: ["FR"], from: ["US"] };
const EC = "ec-pets-non-eu";
const EC_LIST = "ec-pets-listed-countries";
const APHIS = "aphis-us-to-france";
const SP = "fr-sp-dog-categories";

export const euRules: Rule[] = [
  {
    id: "eu-microchip",
    title: "Microchip implanted and scanned before the rabies vaccination",
    category: "identification",
    performedBy: "us_vet",
    leg: usToFrance,
    species: ["dog", "cat"],
    requirement: { kind: "microchip", iso: false },
    text: {
      vet: "Implant a microchip before the rabies vaccination and scan it before every rabies dose. An ISO 11784/11785 chip is expected; with a non-ISO chip the owner must travel with a reader, or implant a second ISO chip and list both numbers on the certificate.",
      client: "Your pet needs a working microchip before its rabies shot for France. Bring your pet's microchip number to every appointment.",
      interpretation: "Any working microchip satisfies the identification requirement; ISO compliance decides whether the owner must also bring a reader. Ordering against the rabies vaccination is enforced by the rabies rule.",
    },
    evidence: [
      { sourceId: EC, excerpt: "The pet animal (dog, cat or ferret) must be identified by the implantation of a microchip" },
      {
        sourceId: APHIS,
        excerpt: "Your pet must have a working microchip (also called a “transponder”) before getting its rabies vaccination for travel to the EU.",
      },
      {
        sourceId: APHIS,
        excerpt:
          "If your pet has a working microchip that is not ISO‑compliant, you must either travel with a scanner that can read it or have your veterinarian implant a second, ISO‑compliant microchip.",
      },
    ],
    review: null,
  },
  {
    id: "eu-rabies-vaccination",
    title: "Rabies vaccination after the microchip, 21 days before arrival if primary",
    category: "vaccination",
    performedBy: "us_vet",
    leg: usToFrance,
    species: ["dog", "cat"],
    requirement: {
      kind: "rabies_series",
      count: 1,
      minAgeDays: 84,
      minIntervalDays: 0,
      afterMicrochip: true,
      requireContinuity: true,
      primary: { waitDays: 21, validFor: { years: 1 } },
    },
    text: {
      vet: "Vaccinate against rabies at 12+ weeks of age, after scanning the microchip. The first dose after the chip, or after any lapse, is a primary: valid from 21 days after vaccination and for 1 year only, even with a 3-year vaccine. Boosters given before coverage lapses are valid immediately. Record the validity dates on the rabies certificate and send all certificates since the primary.",
      client: "Your pet needs a rabies shot after its microchip. If this is its first shot, or its shots have lapsed, it must wait at least 21 days before arriving in France. A booster given on time has no wait.",
      interpretation:
        "12 weeks is applied as 84 days after birth. The primary is the first qualifying dose of the current unbroken series; doses before the microchip or before 12 weeks are not counted. Planned doses are assumed to be 1-year vaccines.",
    },
    evidence: [
      { sourceId: EC, excerpt: "The pet animal was at least 12 weeks old at the date the vaccine was administered." },
      { sourceId: EC, excerpt: "The date of administration of the vaccine does not precede the date of identification or reading of the microchip." },
      {
        sourceId: EC,
        excerpt:
          "The period of validity of the vaccination starts not less than 21 days from the completion of the vaccination protocol for the primary vaccination, and any subsequent vaccination was carried out within the period of validity of the preceding vaccination.",
      },
      { sourceId: APHIS, excerpt: "A primary rabies vaccination is the first rabies shot your pet receives after microchipping or after any lapse in coverage." },
      { sourceId: APHIS, excerpt: "A primary rabies vaccination is only valid for 1 year—even if your pet is an adult and received a 3-year vaccine." },
      { sourceId: APHIS, excerpt: "Any lapse, even one day, resets the vaccine to “primary” again (valid for only 1 year)." },
      { sourceId: APHIS, excerpt: "Pets may travel immediately after a booster (no 21‑day wait), as long as the primary vaccination is also listed on the health certificate." },
      { sourceId: APHIS, excerpt: "Without the microchip being scanned first." },
    ],
    reviewRecommended:
      "APHIS notes some manufacturers specify a 30-day immunity period instead of 21 days. The plan uses 21 days; check the vaccine label and use the longer period if it applies.",
    review: null,
  },
  {
    id: "eu-no-titer",
    title: "No rabies antibody test from the U.S.",
    category: "testing",
    performedBy: "us_vet",
    leg: usToFrance,
    species: ["dog", "cat"],
    requirement: { kind: "informational" },
    text: {
      vet: "The United States is listed under Article 17(1)(b) of Delegated Regulation (EU) 2026/131 (Annex II to Implementing Regulation (EU) 2026/636), so no rabies titer test is required.",
      client: "Pets traveling from the U.S. to France don't need a rabies blood test.",
      interpretation: "Applies to pets moved from the U.S.; the listing is re-checked with every source check.",
    },
    evidence: [
      {
        sourceId: EC_LIST,
        excerpt:
          "Dogs, cats and ferrets moved into an EU country, or United Kingdom (Northern Ireland), from a non-EU country or territory listed in accordance with Article 17(1), point (a) and Article 17(1), point (b) of Delegated Regulation (EU) 2026/131 do not require a rabies antibody titration test.",
      },
      { sourceId: EC_LIST, excerpt: "Referred to in Article 17(1), point (b) of Delegated Regulation (EU) 2026/131 and Annex II to Implementing Regulation (EU) 2026/636." },
      { sourceId: EC_LIST, excerpt: "US\nUnited States of America\nAS - American Samoa" },
      {
        sourceId: EC,
        excerpt:
          "The test is not required for pet animals (dogs, cats or ferrets) moved into an EU country from a territory or a third country listed in Annex I and Annex II to Commission Implementing Regulation (EU) 2026/636",
      },
    ],
    review: null,
  },
  {
    id: "eu-health-certificate",
    title: "EU non-commercial health certificate",
    category: "certificate",
    performedBy: "us_vet",
    leg: usToFrance,
    species: ["dog", "cat"],
    requirement: { kind: "timed_action", anchor: "arrival", maxBefore: { days: 30 }, endBy: "departure" },
    text: {
      vet: "Examine the animal for fitness to travel and issue the new EU non-commercial health certificate (model in force since October 1, 2026) with the microchip number and rabies details, then submit it through VEHCS. Certificates on the old model are no longer endorsed.",
      client: "Your vet fills out the EU health certificate after a final exam, within 30 days before you land in France.",
      interpretation: "APHIS says the certificate is valid for 30 days after the accredited veterinarian issues it; the plan counts those 30 days to arrival.",
    },
    evidence: [
      { sourceId: APHIS, excerpt: "The non-commercial health certificate is valid for 30 days after the accredited veterinarian issues it." },
      { sourceId: APHIS, excerpt: "The new non-commercial health certificates are effective October 1, 2026." },
      {
        sourceId: APHIS,
        excerpt:
          "A USDA-accredited veterinarian must issue the certificate and submit it through the Veterinary Export Health Certification System (VEHCS) for endorsement by USDA.",
      },
      { sourceId: EC, excerpt: "an animal health certificate - see model in Annex III to Commission Implementing Regulation (EU) 2026/705:" },
      { sourceId: EC, excerpt: "confirming the animal’s fitness to travel" },
    ],
    review: null,
  },
  {
    id: "eu-usda-endorsement",
    title: "USDA APHIS endorsement (original ink) within 10 days of arrival",
    category: "endorsement",
    performedBy: "usda",
    leg: usToFrance,
    species: ["dog", "cat"],
    requirement: { kind: "timed_action", anchor: "arrival", maxBefore: { days: 10 }, endBy: "departure", after: ["eu-health-certificate"] },
    text: {
      vet: "Submit through VEHCS for APHIS endorsement. France certificates need an original ink signature and embossing, not a digital endorsement, so allow time for the endorsed paper to be returned by mail (prepaid label) or picked up. The endorsement date must be within 10 days before arrival.",
      client: "The USDA must sign and emboss the paper certificate within the 10 days before you land in France. The original must travel with your pet.",
      interpretation: "Window = arrival minus 10 days through departure. The EU's 10 days run from endorsement to the entry checks on arrival.",
    },
    evidence: [
      { sourceId: APHIS, excerpt: "Non-commercial health certificate: The endorsement must happen within 10 days of your pet's arrival in the EU." },
      { sourceId: APHIS, excerpt: "For APHIS VMO: Original ink endorsement REQUIRED" },
      { sourceId: APHIS, excerpt: "The endorsed health certificate—ink-signed and embossed—must accompany the animal(s) during shipment or travel." },
      {
        sourceId: EC,
        excerpt:
          "valid for 10 days from the date of issue by the official veterinarian until the date of the documentary and identity checks at the travellers' points of entry designated by each EU country.",
      },
    ],
    review: null,
  },
  {
    id: "eu-owner-declaration",
    title: "Owner travels with the pet and signs the non-commercial declaration",
    category: "documentation",
    performedBy: "owner",
    leg: usToFrance,
    species: ["dog", "cat"],
    requirement: { kind: "informational" },
    text: {
      vet: "Non-commercial movement only: no more than 5 pets, traveling with the owner (or an authorized person within 5 days of the owner). The owner signs the declaration on the certificate's final page.",
      client: "You (or someone you authorize) must travel with your pet, with no more than 5 pets, and sign the declaration on the last page of the certificate.",
      interpretation: "Sales, adoptions and unaccompanied pets need the commercial certificate, which is not covered.",
    },
    evidence: [
      { sourceId: EC, excerpt: "The pet animal (dog, cat or ferret) must travel with its owner and under its owner’s direct responsibility." },
      { sourceId: EC, excerpt: "The maximum number of pet animals (dogs, cats or ferrets) which may be moved for non-commercial purposes is 5 in a single vehicle." },
      {
        sourceId: EC,
        excerpt:
          "a written declaration completed by the owner or an authorised person (see model in Part 2 of Annex V to Commission Implementing Regulation (EU) 2026/705) regarding the non-commercial nature of the movement.",
      },
      { sourceId: APHIS, excerpt: "This Declaration must travel with the pet and the certificate." },
    ],
    review: null,
  },
  {
    id: "eu-point-of-entry",
    title: "Enter through a travellers' point of entry and report for checks",
    category: "entry_condition",
    performedBy: "owner",
    leg: usToFrance,
    species: ["dog", "cat"],
    requirement: { kind: "informational" },
    text: {
      vet: "Pets from the U.S. must enter through a travellers' point of entry designated by France, and the owner must present the pet to the authorities there for document and identity checks.",
      client: "Fly into an airport that handles pet entry checks, and present your pet and its papers to officials when you arrive.",
      interpretation: "The arrival airport is not collected; confirm it is a designated travellers' point of entry.",
    },
    evidence: [
      { sourceId: EC, excerpt: "The pet animal (dog, cat or ferret) must pass through a travellers' point of entry designated by each EU country." },
      {
        sourceId: EC,
        excerpt: "The owner must, at the time of entry, contact the competent authority present at the point of entry for the purposes of the documentary and identity checks.",
      },
    ],
    review: null,
  },
  {
    id: "eu-tapeworm",
    title: "Tapeworm treatment not required for France",
    category: "parasite_treatment",
    performedBy: "foreign_vet",
    leg: usToFrance,
    species: ["dog"],
    requirement: { kind: "informational" },
    text: {
      vet: "Echinococcus treatment is required only for dogs entering Finland, Ireland, Malta, Northern Ireland or Norway (praziquantel, 24–120 hours before entry). France is not on the list.",
      client: "France doesn't require a tapeworm treatment. If you continue to Finland, Ireland, Malta, Northern Ireland or Norway, your dog will need one there.",
      interpretation: "Onward travel within the EU is not covered.",
    },
    evidence: [
      { sourceId: EC, excerpt: "Pet dogs (not pet cats or pet ferrets) must be treated against the parasite Echinococcus multilocularis prior to entering:" },
      { sourceId: EC, excerpt: "(Finland, Ireland, Malta and United Kingdom (Northern Ireland))." },
      { sourceId: EC, excerpt: "Be administered by a veterinarian within a period of not more than 120 hours and not less than 24 hours before the time of scheduled entry." },
    ],
    review: null,
  },
  {
    id: "fr-category-1-dogs",
    title: "Category 1 (attack-type) dogs may not enter France",
    category: "entry_condition",
    performedBy: "owner",
    leg: usToFrance,
    species: ["dog"],
    requirement: {
      kind: "breed_restriction",
      prohibited: ["pit bull", "pit-bull", "pitbull", "boerbull", "boerboel"],
      conditional: ["American Staffordshire", "AmStaff", "Mastiff", "Tosa"],
      listIsExhaustive: false,
    },
    text: {
      vet: "France bans bringing in Category 1 dogs: dogs without a recognized pedigree that resemble an American Staffordshire Terrier (pit bull), Mastiff (boerbull) or Tosa. Pedigreed dogs of those breeds are Category 2 and may enter, with restrictions.",
      client: "France does not allow pit bull–type and similar dogs without a recognized pedigree. Your vet will check whether this affects your dog.",
      interpretation:
        "Pit bull and boerbull names are blocked. American Staffordshire, Mastiff and Tosa breeds need manual review because their status depends on pedigree, which is not collected.",
    },
    evidence: [
      {
        sourceId: SP,
        excerpt:
          "Les chiens d'attaque, dits de 1re catégorie, sont des chiens issus de croisements assimilables par leurs caractéristiques morphologiques à des chiens des races suivantes :",
      },
      { sourceId: SP, excerpt: "American Staffordshire terrier (communément appelés pit-bulls)" },
      { sourceId: SP, excerpt: "Mastiff (communément appelés boerbulls)" },
      { sourceId: SP, excerpt: "Les chiens de 1re catégorie n’ont pas de pedigree." },
      { sourceId: SP, excerpt: "Le fait d'acheter, de vendre ou de donner, d'importer ou d'introduire sur le territoire métropolitain" },
      { sourceId: SP, excerpt: "un chien de 1re catégorie est une infraction punie de 6 mois d'emprisonnement et de 15 000 € d'amende." },
      { sourceId: SP, excerpt: "Ces chiens de 2e catégorie ont un pedigree." },
    ],
    reviewRecommended:
      "American Staffordshire Terriers, Mastiffs and Tosas without a pedigree recognized by the Société Centrale Canine count as Category 1 and are banned. With a pedigree they are Category 2. This app does not collect pedigree status.",
    review: null,
  },
];
