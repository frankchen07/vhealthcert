"use client";

import { Plus, Trash2 } from "lucide-react";
import { cn } from "cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { buildLegs, factsNeeded } from "@/lib/case/model";
import { RECENT_COUNTRY_CHOICES } from "@/lib/case/places";
import { useCase } from "@/lib/case/store";
import type { AnimalInput, LabId, RabiesVaccinationInput, TiterTestInput, VaccineType } from "@/lib/engine/types";
import { KB } from "@/lib/kb";

const LAB_NAMES: Record<LabId, string> = {
  KSU: "Kansas State University",
  DOD: "DoD Food Analysis & Diagnostic Lab",
  AU: "Auburn University",
  MU: "University of Missouri",
  other: "Other laboratory",
};

const VACCINE_TYPES: { value: VaccineType; label: string }[] = [
  { value: "unknown", label: "Select type…" },
  { value: "inactivated", label: "Inactivated (killed)" },
  { value: "recombinant", label: "Recombinant" },
  { value: "rna", label: "RNA" },
  { value: "live", label: "Live / modified-live" },
];

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function AnimalPage() {
  const router = useRouter();
  const { state, loaded, update } = useCase();
  if (!loaded) return null;

  if (!state.trip.to) {
    return (
      <p className="text-sm">
        Start with the <Link href="/case/trip" className="underline">trip details</Link>.
      </p>
    );
  }

  const animal = state.animal;
  const legs = buildLegs(state.trip);
  const needs = factsNeeded(KB, legs, animal.species);
  const set = (patch: Partial<AnimalInput>) => update((s) => ({ ...s, animal: { ...s.animal, ...patch } }));
  const setVax = (i: number, patch: Partial<RabiesVaccinationInput>) =>
    set({ rabiesVaccinations: animal.rabiesVaccinations.map((v, j) => (j === i ? { ...v, ...patch } : v)) });
  const setTiter = (i: number, patch: Partial<TiterTestInput>) =>
    set({ titerTests: animal.titerTests.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const toggleCountry = (code: string, on: boolean) =>
    set({ otherCountriesLast6Months: on ? [...animal.otherCountriesLast6Months, code] : animal.otherCountriesLast6Months.filter((c) => c !== code) });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push("/case/sources");
      }}
      className="flex flex-col gap-6"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Animal</h1>
        <p className="text-sm text-muted-foreground">
          Only questions the applicable requirements need are shown. Owner details and the microchip number are never requested.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field id="species" label="Species">
            <NativeSelect id="species" className="w-full" value={animal.species} onChange={(e) => set({ species: e.target.value as AnimalInput["species"] })}>
              <NativeSelectOption value="dog">Dog</NativeSelectOption>
              <NativeSelectOption value="cat">Cat</NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field id="birthDate" label="Date of birth" hint={needs.birthDate ? "Used for age thresholds at vaccination and arrival." : undefined}>
            <Input id="birthDate" type="date" value={animal.birthDate ?? ""} onChange={(e) => set({ birthDate: e.target.value })} />
          </Field>
          <Field id="breed" label="Breed" hint={needs.breed ? "Checked against the destination's prohibited breeds and hybrids." : undefined}>
            <Input id="breed" value={animal.breed ?? ""} onChange={(e) => set({ breed: e.target.value })} placeholder="e.g. Labrador Retriever" />
          </Field>
        </CardContent>
      </Card>

      {needs.microchip && (
        <Card>
          <CardHeader>
            <CardTitle>Microchip</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="chipStatus" label="Microchip">
              <NativeSelect
                id="chipStatus"
                className="w-full"
                value={animal.microchip.status}
                onChange={(e) => set({ microchip: { ...animal.microchip, status: e.target.value as AnimalInput["microchip"]["status"] } })}
              >
                <NativeSelectOption value="unknown">Not yet confirmed</NativeSelectOption>
                <NativeSelectOption value="iso">ISO 11784/11785 (15-digit)</NativeSelectOption>
                <NativeSelectOption value="non_iso">Non-ISO microchip</NativeSelectOption>
                <NativeSelectOption value="none">No microchip</NativeSelectOption>
              </NativeSelect>
            </Field>
            {(animal.microchip.status === "iso" || animal.microchip.status === "non_iso") && (
              <Field id="chipDate" label="Implant date" hint="Some destinations require the chip before the first rabies vaccination or the blood test.">
                <Input
                  id="chipDate"
                  type="date"
                  value={animal.microchip.implantDate ?? ""}
                  onChange={(e) => set({ microchip: { ...animal.microchip, implantDate: e.target.value || undefined } })}
                />
              </Field>
            )}
          </CardContent>
        </Card>
      )}

      {needs.rabies && (
        <Card>
          <CardHeader>
            <CardTitle>Rabies vaccinations</CardTitle>
            <CardDescription>Enter every dose from the certificates, including older ones; series rules depend on the full history.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {animal.rabiesVaccinations.map((v, i) => (
              <fieldset key={i} className="grid items-end gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <legend className="sr-only">Rabies vaccination {i + 1}</legend>
                <Field id={`vax-date-${i}`} label="Date given">
                  <Input id={`vax-date-${i}`} type="date" value={v.date} onChange={(e) => setVax(i, { date: e.target.value })} />
                </Field>
                <Field id={`vax-dur-${i}`} label="Duration of immunity">
                  <NativeSelect id={`vax-dur-${i}`} className="w-full" value={String(v.durationYears)} onChange={(e) => setVax(i, { durationYears: Number(e.target.value) as 1 | 3 })}>
                    <NativeSelectOption value="1">1 year</NativeSelectOption>
                    <NativeSelectOption value="3">3 years</NativeSelectOption>
                  </NativeSelect>
                </Field>
                {needs.vaccineType ? (
                  <Field id={`vax-type-${i}`} label="Vaccine type">
                    <NativeSelect id={`vax-type-${i}`} className="w-full" value={v.vaccineType} onChange={(e) => setVax(i, { vaccineType: e.target.value as VaccineType })}>
                      {VACCINE_TYPES.map((t) => (
                        <NativeSelectOption key={t.value} value={t.value}>
                          {t.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                ) : (
                  <div />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove vaccination ${i + 1}`}
                  onClick={() => set({ rabiesVaccinations: animal.rabiesVaccinations.filter((_, j) => j !== i) })}
                >
                  <Trash2 />
                </Button>
              </fieldset>
            ))}
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() => set({ rabiesVaccinations: [...animal.rabiesVaccinations, { date: "", durationYears: 1, vaccineType: "unknown" }] })}
              >
                <Plus /> Add vaccination
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {needs.titer && (
        <Card>
          <CardHeader>
            <CardTitle>Rabies antibody tests (FAVN)</CardTitle>
            <CardDescription>Approved labs for this trip: {needs.labs.map((l) => LAB_NAMES[l]).join(", ")}.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {animal.titerTests.map((t, i) => (
              <fieldset key={i} className="grid items-end gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                <legend className="sr-only">Antibody test {i + 1}</legend>
                <Field id={`titer-sample-${i}`} label="Sample drawn">
                  <Input id={`titer-sample-${i}`} type="date" value={t.sampleDate} onChange={(e) => setTiter(i, { sampleDate: e.target.value })} />
                </Field>
                {needs.labReceipt ? (
                  <Field id={`titer-received-${i}`} label="Lab received">
                    <Input
                      id={`titer-received-${i}`}
                      type="date"
                      value={t.labReceivedDate ?? ""}
                      onChange={(e) => setTiter(i, { labReceivedDate: e.target.value || undefined })}
                    />
                  </Field>
                ) : (
                  <div />
                )}
                <Field id={`titer-lab-${i}`} label="Laboratory">
                  <NativeSelect id={`titer-lab-${i}`} className="w-full" value={t.lab} onChange={(e) => setTiter(i, { lab: e.target.value as LabId })}>
                    {(Object.keys(LAB_NAMES) as LabId[]).map((l) => (
                      <NativeSelectOption key={l} value={l}>
                        {LAB_NAMES[l]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field id={`titer-result-${i}`} label="Result (IU/ml)">
                  <Input
                    id={`titer-result-${i}`}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Pending"
                    value={t.resultIUml ?? ""}
                    onChange={(e) => setTiter(i, { resultIUml: e.target.value === "" ? undefined : Number(e.target.value) })}
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove antibody test ${i + 1}`}
                  onClick={() => set({ titerTests: animal.titerTests.filter((_, j) => j !== i) })}
                >
                  <Trash2 />
                </Button>
              </fieldset>
            ))}
            <div>
              <Button type="button" variant="outline" onClick={() => set({ titerTests: [...animal.titerTests, { sampleDate: "", lab: needs.labs[0] ?? "other" }] })}>
                <Plus /> Add antibody test
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {needs.otherCountries && (
        <Card>
          <CardHeader>
            <CardTitle>Other countries in the last 6 months</CardTitle>
            <CardDescription>Countries on this itinerary are included automatically. CDC re-entry rules depend on every country the dog has been in.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            {RECENT_COUNTRY_CHOICES.filter((c) => !legs.some((l) => l.from.startsWith(c.code) || l.to.startsWith(c.code))).map((c) => (
              <div key={c.code} className="flex items-center gap-2">
                <Checkbox
                  id={`country-${c.code}`}
                  checked={animal.otherCountriesLast6Months.includes(c.code)}
                  onCheckedChange={(v) => toggleCountry(c.code, Boolean(v))}
                />
                <Label htmlFor={`country-${c.code}`}>{c.name}</Label>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Link href="/case/trip" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
          Back
        </Link>
        <Button type="submit" size="lg">
          Next: check sources
        </Button>
      </div>
    </form>
  );
}
