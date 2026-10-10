import { describe, expect, it } from "vitest";
import { buildLegs, factsNeeded, toCaseInput, validateTrip, type TripInput } from "@/lib/case/model";
import { KB } from "@/lib/kb";

const trip = (overrides: Partial<TripInput> = {}): TripInput => ({
  from: "US-CA",
  to: "JP",
  departDate: "2027-03-01",
  arriveDate: "2027-03-02",
  returning: false,
  returnDepartDate: "",
  returnArriveDate: "",
  continuing: false,
  nextTo: "",
  nextDepartDate: "",
  nextArriveDate: "",
  purpose: "personal",
  ...overrides,
});

describe("buildLegs", () => {
  it("builds a single outbound leg", () => {
    expect(buildLegs(trip())).toEqual([{ from: "US-CA", to: "JP", departDate: "2027-03-01", arriveDate: "2027-03-02" }]);
  });

  it("adds a return leg back to the origin", () => {
    const legs = buildLegs(trip({ returning: true, returnDepartDate: "2027-04-01", returnArriveDate: "2027-04-01" }));
    expect(legs[1]).toEqual({ from: "JP", to: "US-CA", departDate: "2027-04-01", arriveDate: "2027-04-01" });
  });

  it("routes the return through the continuing destination", () => {
    const legs = buildLegs(
      trip({
        to: "GB",
        continuing: true,
        nextTo: "FR",
        nextDepartDate: "2027-03-10",
        nextArriveDate: "2027-03-10",
        returning: true,
        returnDepartDate: "2027-04-01",
        returnArriveDate: "2027-04-01",
      }),
    );
    expect(legs.map((l) => `${l.from}>${l.to}`)).toEqual(["US-CA>GB", "GB>FR", "FR>US-CA"]);
  });

  it("carries the arrival port onto the leg that needs it", () => {
    expect(buildLegs(trip({ to: "US-HI", arrivalPort: "HNL" }))[0].arrivalPort).toBe("HNL");
  });
});

describe("factsNeeded", () => {
  it("asks for titer details and vaccine type for Japan", () => {
    const needs = factsNeeded(KB, buildLegs(trip()), "dog");
    expect(needs).toMatchObject({ birthDate: true, rabies: true, vaccineType: true, titer: true, labReceipt: false });
    expect(needs.labs).toEqual(["KSU", "DOD"]);
  });

  it("asks for the lab receipt date for Hawaii and the breed for its prohibited list", () => {
    const needs = factsNeeded(KB, buildLegs(trip({ to: "US-HI", arrivalPort: "HNL" })), "cat");
    expect(needs).toMatchObject({ titer: true, labReceipt: true, breed: true, vaccineType: false });
  });

  it("asks about other recent countries only for a dog re-entering the U.S.", () => {
    const roundTrip = buildLegs(trip({ returning: true, returnDepartDate: "2027-04-01", returnArriveDate: "2027-04-01" }));
    expect(factsNeeded(KB, roundTrip, "dog").otherCountries).toBe(true);
    expect(factsNeeded(KB, roundTrip, "cat").otherCountries).toBe(false);
    expect(factsNeeded(KB, buildLegs(trip()), "dog").otherCountries).toBe(false);
  });
});

describe("toCaseInput", () => {
  it("drops half-entered rows so the engine only sees complete facts", () => {
    const input = toCaseInput({
      trip: trip(),
      animal: {
        species: "dog",
        birthDate: "",
        breed: "",
        microchip: { status: "iso", implantDate: "2022-01-01" },
        rabiesVaccinations: [
          { date: "", durationYears: 1, vaccineType: "unknown" },
          { date: "2026-01-01", durationYears: 3, vaccineType: "inactivated" },
        ],
        titerTests: [{ sampleDate: "", lab: "KSU" }],
        otherCountriesLast6Months: [],
      },
      completed: { "jp-clinical-inspection@0": "2027-02-25" },
    });
    expect(input.animal.rabiesVaccinations).toHaveLength(1);
    expect(input.animal.titerTests).toHaveLength(0);
    expect(input.animal.birthDate).toBeUndefined();
    expect(input.legs).toHaveLength(1);
    expect(input.completed).toEqual({ "jp-clinical-inspection@0": "2027-02-25" });
  });
});

describe("validateTrip", () => {
  it("accepts a complete trip", () => {
    expect(validateTrip(trip())).toEqual({});
  });

  it("flags missing return dates so no leg reaches the engine with an empty date", () => {
    expect(validateTrip(trip({ returning: true }))).toHaveProperty("returnDates");
  });

  it("requires a Hawaii arrival airport", () => {
    expect(validateTrip(trip({ to: "US-HI" }))).toHaveProperty("arrivalPort");
  });
});
