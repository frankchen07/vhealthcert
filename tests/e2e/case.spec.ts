import { expect, test, type Page } from "@playwright/test";
import { Temporal } from "temporal-polyfill";

const today = Temporal.Now.plainDateISO();
const iso = (d: Temporal.PlainDate) => d.toString();
const pretty = (d: Temporal.PlainDate) => d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" });

async function enterTrip(page: Page, to: string, depart: Temporal.PlainDate, arrive: Temporal.PlainDate, extra?: (page: Page) => Promise<void>) {
  await page.goto("/");
  await page.getByRole("link", { name: "Check Travel Requirements" }).click();
  await page.getByLabel("Traveling from").selectOption("US-CA");
  await page.getByLabel("Traveling to").selectOption(to);
  await page.getByLabel("Departure date").fill(iso(depart));
  await page.getByLabel("Arrival date (local)").fill(iso(arrive));
  if (extra) await extra(page);
  await page.getByRole("button", { name: "Next: animal" }).click();
  await expect(page.getByRole("heading", { name: "Animal" })).toBeVisible();
}

async function enterVaccinatedDog(page: Page) {
  await page.getByLabel("Date of birth").fill("2020-05-01");
  await page.getByLabel("Breed").fill("Labrador Retriever");
  await page.getByLabel("Microchip", { exact: true }).selectOption("iso");
  await page.getByLabel("Implant date").fill("2020-06-01");
  for (const [date, years] of [
    ["2025-03-01", "1"],
    ["2025-12-20", "3"],
  ]) {
    await page.getByRole("button", { name: "Add vaccination" }).click();
    const row = page.locator("fieldset").last();
    await row.getByLabel("Date given").fill(date);
    await row.getByLabel("Duration of immunity").selectOption(years);
    const type = row.getByLabel("Vaccine type");
    if (await type.count()) await type.selectOption("inactivated");
  }
}

async function toPlan(page: Page) {
  await page.getByRole("button", { name: "Next: check sources" }).click();
  await expect(page.getByRole("heading", { name: "Authoritative sources for this trip" })).toBeVisible();
  await page.getByRole("link", { name: "View travel plan" }).click();
  await expect(page.getByRole("heading", { name: "Travel plan — veterinarian view" })).toBeVisible();
}

test("France is the first covered destination and a boosted dog's round trip needs no titer", async ({ page }) => {
  await page.goto("/case/trip");
  await expect(page.locator('#to optgroup[label="Covered"] option').first()).toHaveText("France");

  const depart = today.add({ days: 30 });
  await enterTrip(page, "FR", depart, depart.add({ days: 1 }), async (p) => {
    await p.getByRole("checkbox", { name: "Returning home" }).click();
    await p.getByLabel("Return departure").fill(iso(depart.add({ days: 21 })));
    await p.getByLabel("Return arrival (local)").fill(iso(depart.add({ days: 21 })));
  });
  await enterVaccinatedDog(page);
  await expect(page.getByRole("heading", { name: "Rabies antibody tests (FAVN)" })).toHaveCount(0);
  await toPlan(page);

  await expect(page.getByRole("region", { name: "Readiness" })).toContainText("Not ready");
  await expect(page.getByRole("button", { name: /USDA APHIS endorsement \(original ink\)/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /CDC Dog Import Form receipt/ }).first()).toBeVisible();
});

test("PRD §27: California → Japan in six weeks without a titer is not achievable, with the earliest compliant arrival", async ({ page }) => {
  const depart = today.add({ days: 41 });
  await enterTrip(page, "JP", depart, depart.add({ days: 1 }));
  await enterVaccinatedDog(page);
  await expect(page.getByRole("heading", { name: "Rabies antibody tests (FAVN)" })).toBeVisible();
  await toPlan(page);

  const readiness = page.getByRole("region", { name: "Readiness" });
  await expect(readiness).toContainText("Not achievable by planned date");
  await expect(readiness).toContainText(`earliest compliant arrival ${pretty(today.add({ days: 180 }))}`);
});

test("manual review sits above the timeline and the source conflict is shown side by side", async ({ page }) => {
  const depart = today.add({ days: 60 });
  await enterTrip(page, "JP", depart, depart.add({ days: 1 }));
  await enterVaccinatedDog(page);
  await toPlan(page);

  const manual = page.getByText(/^Manual review required \(\d+\)$/);
  const timeline = page.getByText("Timeline", { exact: true });
  await expect(manual).toBeVisible();
  const [manualBox, timelineBox] = [await manual.boundingBox(), await timeline.boundingBox()];
  expect(manualBox!.y).toBeLessThan(timelineBox!.y);

  await page.getByRole("button", { name: /Two rabies vaccinations after the microchip/ }).first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Source A")).toBeVisible();
  await expect(sheet.getByText("Source B")).toBeVisible();
  await expect(sheet.getByText("30 days or more apart from the first vaccination", { exact: false }).first()).toBeVisible();
  await expect(sheet.getByText("More than 30 days apart from the first vaccination", { exact: false })).toBeVisible();
  await expect(sheet.getByText("System interpretation")).toBeVisible();
});

test("a destination outside coverage is refused instead of returning a partial plan", async ({ page }) => {
  const depart = today.add({ days: 30 });
  await enterTrip(page, "MX", depart, depart);
  await toPlan(page);
  await expect(page.getByRole("region", { name: "Readiness" })).toContainText("Unsupported itinerary");
  await expect(page.getByText("Not covered — no requirements shown for these legs")).toBeVisible();
  await expect(page.getByText("Timeline", { exact: true })).toHaveCount(0);
});

test("Hawaii asks for the lab receipt date and the client view stays in plain language", async ({ page }) => {
  const depart = today.add({ days: 50 });
  await enterTrip(page, "US-HI", depart, depart, async (p) => {
    await p.getByLabel("Arrival airport").selectOption("HNL");
  });
  await enterVaccinatedDog(page);
  await page.getByRole("button", { name: "Add antibody test" }).click();
  await expect(page.getByLabel("Lab received")).toBeVisible();
  await page.getByLabel("Sample drawn").fill(iso(today.subtract({ days: 60 })));
  await page.getByLabel("Lab received").fill(iso(today.subtract({ days: 57 })));
  await page.getByLabel("Result (IU/ml)").fill("1.1");
  await toPlan(page);
  await expect(page.getByRole("region", { name: "Readiness" })).toContainText("Not ready");

  await page.getByRole("link", { name: "Client view" }).first().click();
  await expect(page.getByRole("heading", { name: /Travel plan for your dog/ })).toBeVisible();
  await expect(page.getByText("What needs to happen, and when")).toBeVisible();
  await expect(page.getByText(/System interpretation|conflict/i).filter({ visible: true })).toHaveCount(0);
  await expect(page.getByText("It is not an approval from any government.", { exact: false })).toBeVisible();
});

test("the sources step lists the country data that decides which rules apply", async ({ page }) => {
  const depart = today.add({ days: 60 });
  await enterTrip(page, "JP", depart, depart.add({ days: 1 }));
  await enterVaccinatedDog(page);
  await page.getByRole("button", { name: "Next: check sources" }).click();
  await expect(page.getByText("Dog Imports: Country Disease Status (data file)").filter({ visible: true })).toBeVisible();
});

test("a fully prepared case still waits on veterinary review, and the client view says so", async ({ page }) => {
  const arrive = iso(today.add({ days: 12 }));
  const state = {
    trip: {
      from: "US-CA", to: "US-HI", arrivalPort: "HNL", departDate: arrive, arriveDate: arrive, purpose: "personal",
      returning: false, returnDepartDate: "", returnArriveDate: "", continuing: false, nextTo: "", nextDepartDate: "", nextArriveDate: "",
    },
    animal: {
      species: "dog",
      birthDate: "2020-05-01",
      breed: "Labrador Retriever",
      microchip: { status: "iso", implantDate: "2020-06-01" },
      rabiesVaccinations: [
        { date: "2025-03-01", durationYears: 1, vaccineType: "inactivated" },
        { date: "2025-12-20", durationYears: 3, vaccineType: "inactivated" },
      ],
      titerTests: [{ sampleDate: iso(today.subtract({ days: 60 })), labReceivedDate: iso(today.subtract({ days: 57 })), resultIUml: 1.1, lab: "KSU" }],
      otherCountriesLast6Months: [],
    },
    completed: { "hi-documents@0": iso(today.subtract({ days: 1 })), "hi-health-certificate@0": iso(today), "hi-tick-treatment@0": iso(today) },
  };
  await page.addInitScript((s) => sessionStorage.setItem("vettravel-case", s), JSON.stringify(state));

  await page.goto("/case/plan");
  await expect(page.getByRole("region", { name: "Readiness" })).toContainText("Potentially ready — review required");
  await page.goto("/case/client");
  await expect(page.getByText("Your veterinarian is confirming some details with the official sources before this plan is final.")).toBeVisible();
  await expect(page.getByText("appear to be met", { exact: false })).toHaveCount(0);
});

test("the printed veterinarian report includes the evidence appendix with citations", async ({ page }) => {
  const depart = today.add({ days: 60 });
  await enterTrip(page, "JP", depart, depart.add({ days: 1 }));
  await enterVaccinatedDog(page);
  await toPlan(page);
  await expect(page.getByText("Evidence appendix")).toBeHidden();
  await page.emulateMedia({ media: "print" });
  await expect(page.getByText("Evidence appendix")).toBeVisible();
  await expect(page.getByText("Dogs and cats are required to arrive in Japan after 180 days have passed", { exact: false }).first()).toBeVisible();
});

test("case data never leaves the browser", async ({ page }) => {
  const outbound: string[] = [];
  page.on("request", (req) => outbound.push(`${req.method()} ${req.url()} ${req.postData() ?? ""}`));
  const depart = today.add({ days: 60 });
  await enterTrip(page, "JP", depart, depart.add({ days: 1 }));
  await enterVaccinatedDog(page);
  await toPlan(page);
  await page.getByRole("link", { name: "Client view" }).first().click();
  await expect(page.getByRole("heading", { name: /Travel plan for your dog/ })).toBeVisible();

  const leaks = outbound.filter((r) => /2020-05-01|2025-12-20|Labrador/.test(r) || r.startsWith("POST"));
  expect(leaks).toEqual([]);
});
