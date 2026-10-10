import type { LegMatch, Rule } from "@/lib/engine/types";

const usToJapan: LegMatch = { to: ["JP"], from: ["US"], fromNot: ["US-HI", "US-GU"] };
const AQS = "jp-aqs-nondesignated";
const APHIS = "aphis-us-to-japan";

export const japanRules: Rule[] = [
  {
    id: "jp-microchip",
    title: "Microchip implanted before the first rabies vaccination",
    category: "identification",
    performedBy: "us_vet",
    leg: usToJapan,
    species: ["dog", "cat"],
    requirement: { kind: "microchip", iso: false },
    text: {
      vet: "Implant a microchip on or before the day of the first rabies vaccination. An ISO 11784/11785 chip (15 digits, numbers only) is expected; with a non-ISO chip the owner must bring a reader. Scan and confirm the number at every step.",
      client: "Your pet needs a microchip before its first rabies shot for Japan. Bring your pet's microchip number to every appointment.",
      interpretation: "Any working microchip satisfies the identification requirement; ISO compliance decides whether the owner must also bring a reader. Ordering against the rabies series is enforced by the rabies rule.",
    },
    evidence: [
      { sourceId: AQS, excerpt: "Dogs and cats must be identified by a microchip before the first rabies vaccination." },
      { sourceId: AQS, excerpt: "The microchip should comply with ISO 11784 and 11785 (15 digit microchip code consists only of numbers)." },
      {
        sourceId: APHIS,
        excerpt: "If the animal is not fitted with an ISO compliant (11784 and 11785) microchip, the importer must bring a microchip reader with the pet.",
      },
      { sourceId: AQS, excerpt: 'Microchip numbers starting with "900 202" are currently under investigation for their validity.' },
    ],
    reviewRecommended:
      "Japan currently does not accept microchip numbers starting with 900 202, and warns about other duplicate 900-prefix numbers. Check the chip number; this app does not collect it.",
    review: null,
  },
  {
    id: "jp-rabies-vaccinations",
    title: "Two rabies vaccinations after the microchip",
    category: "vaccination",
    performedBy: "us_vet",
    leg: usToJapan,
    species: ["dog", "cat"],
    requirement: {
      kind: "rabies_series",
      count: 2,
      minAgeDays: 91,
      minIntervalDays: 30,
      afterMicrochip: true,
      requireContinuity: true,
      acceptedTypes: ["inactivated", "recombinant"],
    },
    text: {
      vet: "Give at least two rabies vaccinations (inactivated or recombinant; not RNA or live) after the microchip. First dose at 91+ days of age (birth = day 0). Second dose at least 30 days after the first (first = day 0) and within the first dose's duration of immunity. Keep coverage continuous through arrival.",
      client: "Your pet needs two rabies shots at least a month apart, after the microchip, and must stay up to date on rabies vaccination until it arrives in Japan.",
      interpretation:
        "Doses before 91 days of age, before the microchip, or of an unaccepted type are not counted. If coverage lapses, the series restarts. Planned doses are assumed to be 1-year vaccines.",
    },
    evidence: [
      { sourceId: AQS, excerpt: "Dogs and cats must be vaccinated against rabies twice or more after the microchip implanting." },
      { sourceId: AQS, excerpt: "At least 91days old at the time of vaccination （the date of birth is counted as day 0）" },
      { sourceId: AQS, excerpt: "30 days or more apart from the first vaccination (the date of the first one is counted as day 0)" },
      { sourceId: AQS, excerpt: "Inactivated (killed) virus vaccine or recombinant / modified vaccine" },
      {
        sourceId: AQS,
        excerpt:
          "If the effective period of the rabies vaccination will expire before arrival in Japan, an additional rabies vaccination must be administered within the period.",
      },
      { sourceId: AQS, excerpt: "Within the effective period of the first vaccination" },
    ],
    conflict: {
      primaryIndex: 2,
      evidence: [
        { sourceId: APHIS, excerpt: "More than 30 days apart from the first vaccination (the date of the first one is counted as day 0)" },
      ],
      systemView:
        "Japan's Animal Quarantine Service is the destination authority and its wording allows the second dose on day 30. APHIS's summary says \"more than 30 days\", which would mean day 31. The plan uses day 30. Giving the second dose on day 31 or later satisfies both readings.",
    },
    review: null,
  },
  {
    id: "jp-rabies-titer",
    title: "Rabies antibody test and 180-day wait",
    category: "testing",
    performedBy: "us_vet",
    leg: usToJapan,
    species: ["dog", "cat"],
    requirement: {
      kind: "rabies_titer",
      minIUml: 0.5,
      labs: ["KSU", "DOD"],
      sampleOnOrAfterDose: 2,
      afterMicrochip: true,
      withinVaccineValidity: true,
      waitFrom: "sample",
      waitDays: 180,
      validFor: { years: 2 },
    },
    text: {
      vet: "Draw serum on or after the day of the second rabies vaccination, within the vaccine's period of immunity, and submit to a Japan-designated laboratory (KSU or DOD FADL in the U.S.). Titer must be at least 0.5 IU/ml. Arrival must be 180+ days after the sample date (sample = day 0) and within 2 years of it.",
      client: "Your pet needs a rabies blood test after the second shot, then must wait at least 180 days before arriving in Japan. Arriving early means quarantine in Japan for the remaining days.",
      interpretation:
        "Day 180 after sampling is treated as the first eligible arrival day. The result is valid for 2 years from sampling. Re-testing rules for long stays are not modeled.",
    },
    evidence: [
      { sourceId: AQS, excerpt: "A blood sample for the test must be drawn after the second rabies vaccination." },
      { sourceId: AQS, excerpt: "Antibody titer against rabies must be equal to or greater than 0.5 IU/ml." },
      { sourceId: AQS, excerpt: "The test result is valid for 2 years from the date of blood sampling." },
      { sourceId: AQS, excerpt: "Dogs and cats are required to arrive in Japan after 180 days have passed from the date of blood sampling for the rabies antibody test." },
      { sourceId: AQS, excerpt: "(The date of blood sampling is counted as day 0)." },
      { sourceId: AQS, excerpt: "Step 4 Waiting period (180 days or more)" },
      {
        sourceId: APHIS,
        excerpt:
          "Dogs and cats are required to undergo a wait of at least 180 days between the date the sample is collected for the rabies titer test and the date the animal arrives in Japan.",
      },
      { sourceId: AQS, excerpt: "The blood sample must be drawn within the effective period of the rabies vaccination." },
      { sourceId: APHIS, excerpt: "Approved Laboratories: Kansas State University Rabies Laboratory DOD Veterinary Food Analysis and Diagnostic Laboratory" },
    ],
    review: null,
  },
  {
    id: "jp-advance-notification",
    title: "Advance notification to Japan's Animal Quarantine Service",
    category: "notification",
    performedBy: "owner",
    leg: usToJapan,
    species: ["dog", "cat"],
    requirement: { kind: "timed_action", anchor: "arrival", minBefore: { days: 40 } },
    text: {
      vet: "The importer must notify the Animal Quarantine Service at the port of arrival at least 40 days before arrival (NACCS online or by email), with copies of the titer report.",
      client: "At least 40 days before you land in Japan, you must notify Japan's Animal Quarantine Service at your arrival airport. Notices sent later are generally not accepted.",
      interpretation: "Latest date = arrival minus 40 days.",
    },
    evidence: [
      { sourceId: AQS, excerpt: "Applicants must notify Animal Quarantine Service at the expected port of entry not less than 40 days before arrival in Japan." },
      { sourceId: AQS, excerpt: "In principle, a notification submitted less than 40 days before arrival in Japan is not accepted." },
    ],
    review: null,
  },
  {
    id: "jp-clinical-inspection",
    title: "Pre-export clinical inspection",
    category: "examination",
    performedBy: "us_vet",
    leg: usToJapan,
    species: ["dog", "cat"],
    requirement: { kind: "timed_action", anchor: "departure", maxBefore: { days: 10 } },
    text: {
      vet: "Within 10 days before boarding, examine the animal and confirm it is free of clinical signs of rabies (and leptospirosis for dogs). Scan the microchip.",
      client: "Your vet must examine your pet within the 10 days before your flight.",
      interpretation: "Window = departure minus 10 days through the departure date.",
    },
    evidence: [
      {
        sourceId: AQS,
        excerpt: "Before leaving the exporting country (within 10 days before boarding), dogs and cats must undergo a clinical inspection by a veterinarian.",
      },
      { sourceId: AQS, excerpt: "In case of dogs, also the dogs have been found to be free from any clinical signs of leptospirosis." },
    ],
    review: null,
  },
  {
    id: "jp-health-certificate",
    title: "Export health certificate (Form AC)",
    category: "certificate",
    performedBy: "us_vet",
    leg: usToJapan,
    species: ["dog", "cat"],
    requirement: { kind: "timed_action", anchor: "departure", minBefore: { days: 0 }, after: ["jp-clinical-inspection"] },
    text: {
      vet: "Complete Form AC (or Form A + Form C, or APHIS 7001 + Form A) with microchip, vaccination, titer and inspection details, in permanent ink with no corrections. Submit through VEHCS for APHIS endorsement.",
      client: "Your vet prepares Japan's export health certificate after the final exam. It must be error-free; mistakes can mean quarantine in Japan.",
      interpretation: "Prepared after the clinical inspection and before departure.",
    },
    evidence: [
      {
        sourceId: APHIS,
        excerpt: "Health Certificate for dogs and cats to Japan (Form AC): Form AC contains the information required for both the owner declaration and health certificate.",
      },
      {
        sourceId: AQS,
        excerpt: "If there are any deficiencies in the certificates, the dog or cat will be subject to detention quarantine for up to 180 days or will be shipped back .",
      },
    ],
    review: null,
  },
  {
    id: "jp-usda-endorsement",
    title: "USDA APHIS endorsement",
    category: "endorsement",
    performedBy: "usda",
    leg: usToJapan,
    species: ["dog", "cat"],
    requirement: { kind: "timed_action", anchor: "departure", minBefore: { days: 0 }, after: ["jp-health-certificate"] },
    text: {
      vet: "Submit the certificate through VEHCS for APHIS-VS endorsement. Dog and cat certificates to Japan can be digitally endorsed. A printed endorsed copy must travel with the animal.",
      client: "The USDA must endorse the certificate before you fly. Your vet submits it electronically.",
      interpretation: "Endorsement follows the certificate and must be complete before departure.",
    },
    evidence: [
      { sourceId: APHIS, excerpt: "The exporter will need to have this form endorsed by APHIS-VS." },
      {
        sourceId: AQS,
        excerpt: "Applicants must obtain certificates issued by the government agency (corresponding to Animal Quarantine service in Japan) of the exporting country.",
      },
    ],
    review: null,
  },
  {
    id: "jp-designated-ports",
    title: "Dogs enter only through designated ports",
    category: "entry_condition",
    performedBy: "owner",
    leg: usToJapan,
    species: ["dog"],
    requirement: { kind: "informational" },
    text: {
      vet: "Dogs may enter Japan only through designated airports and seaports (e.g. Narita, Haneda, Kansai, Chubu, Fukuoka).",
      client: "Your dog must fly into one of Japan's designated airports, such as Narita, Haneda or Kansai.",
      interpretation: "The arrival port is not collected; confirm it is on the list.",
    },
    evidence: [{ sourceId: AQS, excerpt: "Dogs can enter Japan only through the designated airports and seaports." }],
    review: null,
  },
];
