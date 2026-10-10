import { legMatches } from "@/lib/engine/jurisdiction";
import type { AnimalInput, CaseInput, KnowledgeBase, LabId, LegInput, Purpose, Species } from "@/lib/engine/types";

export interface TripInput {
  from: string;
  to: string;
  arrivalPort?: string;
  departDate: string;
  arriveDate: string;
  returning: boolean;
  returnDepartDate: string;
  returnArriveDate: string;
  continuing: boolean;
  nextTo: string;
  nextDepartDate: string;
  nextArriveDate: string;
  purpose: Purpose;
}

export interface CaseState {
  trip: TripInput;
  animal: AnimalInput;
  completed: Record<string, string>;
}

export function validateTrip(trip: TripInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!trip.to) errors.to = "Choose a destination.";
  if (trip.to === trip.from) errors.to = "Destination must differ from origin.";
  if (trip.to === "US-HI" && !trip.arrivalPort) errors.arrivalPort = "Choose the arrival airport.";
  if (!trip.departDate) errors.departDate = "Enter the departure date.";
  if (!trip.arriveDate) errors.arriveDate = "Enter the arrival date.";
  else if (trip.departDate && trip.arriveDate < trip.departDate) errors.arriveDate = "Arrival can't be before departure.";
  const lastArrival = trip.continuing ? trip.nextArriveDate : trip.arriveDate;
  if (trip.continuing) {
    if (!trip.nextTo) errors.nextTo = "Choose the next destination.";
    if (!trip.nextDepartDate || !trip.nextArriveDate) errors.nextDates = "Enter both dates for the onward leg.";
    else if (trip.nextDepartDate < trip.arriveDate || trip.nextArriveDate < trip.nextDepartDate) errors.nextDates = "Onward dates must follow the first arrival.";
  }
  if (trip.returning) {
    if (!trip.returnDepartDate || !trip.returnArriveDate) errors.returnDates = "Enter both return dates.";
    else if (trip.returnDepartDate < (lastArrival || "") || trip.returnArriveDate < trip.returnDepartDate) errors.returnDates = "Return dates must follow the outbound arrival.";
  }
  return errors;
}

export function buildLegs(trip: TripInput): LegInput[] {
  const legs: LegInput[] = [
    {
      from: trip.from,
      to: trip.to,
      departDate: trip.departDate,
      arriveDate: trip.arriveDate,
      ...(trip.arrivalPort ? { arrivalPort: trip.arrivalPort } : {}),
    },
  ];
  if (trip.continuing && trip.nextTo) {
    legs.push({ from: trip.to, to: trip.nextTo, departDate: trip.nextDepartDate, arriveDate: trip.nextArriveDate });
  }
  if (trip.returning) {
    legs.push({ from: legs.at(-1)!.to, to: trip.from, departDate: trip.returnDepartDate, arriveDate: trip.returnArriveDate });
  }
  return legs;
}

export function toCaseInput(state: CaseState): CaseInput {
  const { animal } = state;
  return {
    purpose: state.trip.purpose,
    legs: buildLegs(state.trip),
    animal: {
      ...animal,
      birthDate: animal.birthDate || undefined,
      rabiesVaccinations: animal.rabiesVaccinations.filter((v) => v.date),
      titerTests: animal.titerTests.filter((t) => t.sampleDate),
    },
    completed: state.completed,
  };
}

export interface FactsNeeded {
  birthDate: boolean;
  breed: boolean;
  microchip: boolean;
  rabies: boolean;
  vaccineType: boolean;
  titer: boolean;
  labReceipt: boolean;
  labs: LabId[];
  otherCountries: boolean;
}

export function factsNeeded(kb: KnowledgeBase, legs: LegInput[], species: Species): FactsNeeded {
  const rules = kb.rules.filter((r) => r.species.includes(species) && legs.some((leg) => legMatches(r.leg, leg)));
  const specs = rules.map((r) => r.requirement);
  const titers = specs.flatMap((s) => (s.kind === "rabies_titer" ? [s] : []));
  return {
    birthDate: rules.some(
      (r) =>
        r.requirement.kind === "min_age" ||
        (r.requirement.kind === "rabies_series" && r.requirement.minAgeDays !== undefined) ||
        r.when?.some((c) => "ageOverAtArrival" in c),
    ),
    breed: specs.some((s) => s.kind === "breed_restriction"),
    microchip: specs.some((s) => s.kind === "microchip"),
    rabies: specs.some((s) => s.kind === "rabies_series" || s.kind === "rabies_titer"),
    vaccineType: specs.some((s) => s.kind === "rabies_series" && s.acceptedTypes !== undefined),
    titer: titers.length > 0,
    labReceipt: titers.some((s) => s.waitFrom === "day_after_lab_receipt"),
    labs: [...new Set(titers.flatMap((s) => s.labs))],
    otherCountries: rules.some((r) => r.when?.some((c) => "cdcRabiesRisk" in c)),
  };
}
