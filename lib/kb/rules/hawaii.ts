import type { LegMatch, Rule } from "@/lib/engine/types";

const intoHawaii: LegMatch = { to: ["US-HI"], from: ["US"], fromNot: ["US-HI"] };
const CHECKLIST = "hdoa-checklist-1";
const INFO = "hdoa-aqs-info";
const CHECKLIST_URL = "https://dab.hawaii.gov/ai/files/2023/06/Checklist-1-06.13.2023.pdf";

export const hawaiiRules: Rule[] = [
  {
    id: "hi-microchip",
    title: "Working microchip implanted before the FAVN blood draw",
    category: "identification",
    performedBy: "us_vet",
    leg: intoHawaii,
    species: ["dog", "cat"],
    requirement: { kind: "microchip", iso: false },
    text: {
      vet: "Implant a microchip before the FAVN blood sample and scan it to confirm it reads and matches the paperwork.",
      client: "Your pet needs a working microchip before its rabies blood test. Pets that can't be identified by scan go into 120-day quarantine.",
      interpretation: "Ordering against the blood sample is enforced by the FAVN rule.",
    },
    evidence: [
      { sourceId: CHECKLIST, excerpt: "Your dog or cat must have an electronic microchip implanted before the FAVN rabies antibody blood test is performed)." },
      {
        sourceId: CHECKLIST,
        excerpt:
          "Any pet that cannot be identified by scanning the microchip will not qualify for either Direct Airport Release or the 5 Day Or Less quarantine and will be assigned to 120 days quarantine.",
      },
      { sourceId: INFO, excerpt: CHECKLIST_URL },
    ],
    review: null,
  },
  {
    id: "hi-rabies-vaccinations",
    title: "Two lifetime rabies vaccinations, most recent more than 30 days before arrival",
    category: "vaccination",
    performedBy: "us_vet",
    leg: intoHawaii,
    species: ["dog", "cat"],
    requirement: {
      kind: "rabies_series",
      count: 2,
      minIntervalDays: 31,
      afterMicrochip: false,
      requireContinuity: false,
      minDaysBeforeArrival: 31,
    },
    text: {
      vet: "At least two rabies vaccinations in the animal's lifetime, given more than 30 days apart. The most recent must be more than 30 days before arrival and not expired (within the label booster interval). Certificates must show vaccine name, lot/serial, booster interval, date and lot expiry.",
      client: "Your pet needs at least two rabies shots in its lifetime, more than a month apart. The latest one must be at least 31 days before you land and still current.",
      interpretation: "\"More than 30 days\" is applied as at least 31 days, both between doses and between the most recent dose and arrival.",
    },
    evidence: [
      { sourceId: CHECKLIST, excerpt: "Your dog or cat must have been vaccinated at least twice for rabies in its lifetime." },
      { sourceId: CHECKLIST, excerpt: "The rabies vaccines must have been administered more than 30 days apart." },
      { sourceId: CHECKLIST, excerpt: "More than 30 days before the pet’s date of arrival in Hawaii ; and" },
      { sourceId: CHECKLIST, excerpt: "Not more than the vaccine’s licensed booster interval listed on the manufacturer’s label" },
      { sourceId: INFO, excerpt: CHECKLIST_URL },
    ],
    reviewRecommended:
      "Hawaii's information page lists a 30-day minimum wait after the most recent vaccination; the checklist says \"more than 30 days\". The plan uses 31 days.",
    review: null,
  },
  {
    id: "hi-favn",
    title: "FAVN rabies antibody test and 30-day wait",
    category: "testing",
    performedBy: "us_vet",
    leg: intoHawaii,
    species: ["dog", "cat"],
    requirement: {
      kind: "rabies_titer",
      minIUml: 0.5,
      labs: ["AU", "KSU", "MU", "DOD"],
      sampleOnOrAfterDose: 0,
      afterMicrochip: true,
      withinVaccineValidity: false,
      waitFrom: "day_after_lab_receipt",
      waitDays: 30,
      validFor: { months: 36 },
    },
    text: {
      vet: "OIE-FAVN (not RFFIT) at Auburn, Kansas State, Missouri or DoD FADL, with HAWAII as the destination on the submission form; result of at least 0.5 IU/ml. The waiting period starts the day after the lab receives the sample: arrival must be at least 30 days and no more than 36 months later.",
      client: "Your pet needs a rabies blood test at an approved lab. You can arrive no sooner than 30 days after the lab receives the sample. Arriving early means quarantine.",
      interpretation: "Wait start = lab receipt date + 1 day. Intermediate labs (Antech, IDEXX) can delay receipt.",
    },
    evidence: [
      {
        sourceId: CHECKLIST,
        excerpt:
          "The day after AU, KSU, MU or DOD received your pet’s blood sample must not be more than 36 months and not less than 30 days before the date of arrival in Hawaii.",
      },
      { sourceId: CHECKLIST, excerpt: "The result of the dog’s or cat’s blood test must be greater than or equal to 0.5 IU/ml." },
      { sourceId: INFO, excerpt: CHECKLIST_URL },
    ],
    review: null,
  },
  {
    id: "hi-documents",
    title: "Documents received by Hawaii's Animal Quarantine Station before arrival",
    category: "documentation",
    performedBy: "owner",
    leg: intoHawaii,
    species: ["dog", "cat"],
    requirement: { kind: "timed_action", anchor: "arrival", minBefore: { days: 11 } },
    text: {
      vet: "AQS-279 import form, original certificates for the 2 most recent rabies vaccinations and the fee must reach the Animal Quarantine Station before arrival (online via HIPOP or by tracked mail) for Direct Airport Release in Honolulu.",
      client: "Send Hawaii's import form, your pet's two rabies certificates and the fee so they arrive well before your flight — the plan uses at least 11 days.",
      interpretation: "Uses the stricter reading (more than 10 days, so at least 11) of the checklist's two statements.",
    },
    evidence: [
      {
        sourceId: CHECKLIST,
        excerpt: "Send documents in as a set so they are received more than 10 days before arrival in Honolulu, to:",
      },
      { sourceId: INFO, excerpt: CHECKLIST_URL },
    ],
    conflict: {
      evidence: [
        {
          sourceId: CHECKLIST,
          excerpt:
            "all required documents must be received by the Animal Quarantine Station (AQS) 10 days or more before the intended date of arrival for Direct Airport Release (DAR) in Honolulu.",
        },
      ],
      systemView:
        "Both statements come from the same Hawaii checklist: \"10 days or more\" and \"more than 10 days\". The plan uses the stricter reading (at least 11 days before arrival) so either interpretation is met.",
    },
    review: null,
  },
  {
    id: "hi-health-certificate",
    title: "Health certificate within 14 days of arrival (with screwworm statement)",
    category: "certificate",
    performedBy: "us_vet",
    leg: intoHawaii,
    species: ["dog", "cat"],
    requirement: { kind: "timed_action", anchor: "arrival", maxBefore: { days: 14 } },
    text: {
      vet: "Original health certificate in English within 14 days of arrival, listing rabies vaccine name, lot/serial, booster interval, vaccination and expiry dates, plus the tick treatment. It must include: \"All animals were inspected and found free of evidence of New World Screwworm infestation.\"",
      client: "Your vet completes a health certificate within the 14 days before you land in Hawaii. Bring the original; copies are not accepted.",
      interpretation: "Window = arrival minus 14 days through arrival.",
    },
    evidence: [
      { sourceId: CHECKLIST, excerpt: "An original health certificate in English, done within 14 days of arrival in Hawaii including rabies" },
      {
        sourceId: INFO,
        excerpt:
          "All animals requiring a CVI for importation into Hawaii must have a certifying statement: “All animals were inspected and found free of evidence of New World Screwworm infestation.”",
      },
      { sourceId: INFO, excerpt: CHECKLIST_URL },
    ],
    reviewRecommended: "The screwworm certification statement was added in 2026 after detections in Texas and New Mexico; confirm current wording.",
    review: null,
  },
  {
    id: "hi-tick-treatment",
    title: "Tick treatment within 14 days of arrival",
    category: "parasite_treatment",
    performedBy: "us_vet",
    leg: intoHawaii,
    species: ["dog", "cat"],
    requirement: { kind: "timed_action", anchor: "arrival", maxBefore: { days: 14 } },
    text: {
      vet: "Treat with a long-acting product labeled to kill ticks (Revolution is not acceptable) within 14 days of arrival; record product and date on the health certificate.",
      client: "Your vet gives a tick treatment within the 14 days before you land in Hawaii.",
      interpretation: "Window = arrival minus 14 days through arrival.",
    },
    evidence: [
      {
        sourceId: CHECKLIST,
        excerpt: "to kill ticks (Revolution® is not acceptable) within 14 days of arrival and the product name and",
      },
      { sourceId: INFO, excerpt: CHECKLIST_URL },
    ],
    review: null,
  },
  {
    id: "hi-prohibited-hybrids",
    title: "Prohibited hybrids and non-domestic breeds",
    category: "entry_condition",
    performedBy: "owner",
    leg: intoHawaii,
    species: ["dog", "cat"],
    requirement: { kind: "breed_restriction", prohibited: ["wolf", "wolf cross", "dingo", "Bengal", "Savannah"], listIsExhaustive: false },
    text: {
      vet: "Non-domestic dogs and cats and hybrids (wolf, wolf cross, dingo, Bengal, Savannah, etc.) are prohibited by Hawaii's Plant Quarantine Branch.",
      client: "Some hybrid breeds (for example wolf hybrids, Bengal and Savannah cats) can't be brought into Hawaii.",
      interpretation: "Matches the entered breed against the listed examples; the official list ends in \"etc.\".",
    },
    evidence: [
      {
        sourceId: INFO,
        excerpt: "Non-domestic dogs and cats and hybrids such as wolf, wolf cross, Dingo, Bengal, Savannah, etc. are prohibited under Plant Quarantine (PQ) law.",
      },
    ],
    review: null,
  },
  {
    id: "hi-arrival-time",
    title: "Arrive in Honolulu by 3:30 p.m.",
    category: "entry_condition",
    performedBy: "owner",
    leg: intoHawaii,
    species: ["dog", "cat"],
    requirement: { kind: "informational" },
    text: {
      vet: "Airport inspections run 8:30 a.m.–4:30 p.m.; late arrivals are held overnight.",
      client: "Book a flight that lands in Honolulu by 3:30 p.m. so your pet can be released the same day.",
      interpretation: "Scheduling guidance from Hawaii's Animal Quarantine Branch.",
    },
    evidence: [
      {
        sourceId: INFO,
        excerpt: "Pet owners should be sure to arrange for their flights to arrive by 3:30 p.m. because it may take up to one hour for the airlines to transport a pet to the Airport Animal Quarantine Holding Facility",
      },
    ],
    review: null,
  },
];
