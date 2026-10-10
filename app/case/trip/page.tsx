"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";
import { validateTrip, type TripInput } from "@/lib/case/model";
import { COVERED_DESTINATIONS, HAWAII_PORTS, ORIGINS, OTHER_DESTINATIONS } from "@/lib/case/places";
import { useCase } from "@/lib/case/store";
import type { Purpose } from "@/lib/engine/types";

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-xs text-review">
          {error}
        </p>
      )}
    </div>
  );
}

function DestinationOptions() {
  return (
    <>
      <NativeSelectOption value="">Select…</NativeSelectOption>
      <NativeSelectOptGroup label="Covered">
        {COVERED_DESTINATIONS.map((d) => (
          <NativeSelectOption key={d.code} value={d.code}>
            {d.name}
          </NativeSelectOption>
        ))}
      </NativeSelectOptGroup>
      <NativeSelectOptGroup label="Not yet covered">
        {OTHER_DESTINATIONS.map((d) => (
          <NativeSelectOption key={d.code} value={d.code}>
            {d.name}
          </NativeSelectOption>
        ))}
      </NativeSelectOptGroup>
    </>
  );
}

export default function TripPage() {
  const router = useRouter();
  const { state, loaded, update } = useCase();
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (!loaded) return null;

  const trip = state.trip;
  const set = (patch: Partial<TripInput>) => update((s) => ({ ...s, trip: { ...s.trip, ...patch } }));
  const invalid = (key: string) => (errors[key] ? { "aria-invalid": true, "aria-describedby": `${key}-error` } : {});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateTrip(trip);
    setErrors(found);
    if (Object.keys(found).length === 0) router.push("/case/animal");
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trip</h1>
        <p className="text-sm text-muted-foreground">Each border crossing is evaluated as its own leg.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Itinerary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="from" label="Traveling from">
            <NativeSelect id="from" className="w-full" value={trip.from} onChange={(e) => set({ from: e.target.value })}>
              {ORIGINS.map((o) => (
                <NativeSelectOption key={o.code} value={o.code}>
                  {o.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field id="to" label="Traveling to" error={errors.to}>
            <NativeSelect
              id="to"
              className="w-full"
              value={trip.to}
              onChange={(e) => set({ to: e.target.value, arrivalPort: undefined })}
              {...invalid("to")}
            >
              <DestinationOptions />
            </NativeSelect>
          </Field>
          {trip.to === "US-HI" && (
            <Field id="arrivalPort" label="Arrival airport" error={errors.arrivalPort} hint="Neighbor-island arrivals need a separate permit and are not yet covered.">
              <NativeSelect id="arrivalPort" className="w-full" value={trip.arrivalPort ?? ""} onChange={(e) => set({ arrivalPort: e.target.value || undefined })} {...invalid("arrivalPort")}>
                <NativeSelectOption value="">Select…</NativeSelectOption>
                {HAWAII_PORTS.map((p) => (
                  <NativeSelectOption key={p.code} value={p.code}>
                    {p.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          )}
          <Field id="purpose" label="Purpose of travel">
            <NativeSelect id="purpose" className="w-full" value={trip.purpose} onChange={(e) => set({ purpose: e.target.value as Purpose })}>
              <NativeSelectOption value="personal">Personal pet traveling with or for its owner</NativeSelectOption>
              <NativeSelectOption value="change_of_ownership">Sale, adoption, rescue or other change of ownership</NativeSelectOption>
              <NativeSelectOption value="other">Other (show, research, commercial)</NativeSelectOption>
            </NativeSelect>
          </Field>
          <div className="hidden sm:block" />
          <Field id="departDate" label="Departure date" error={errors.departDate}>
            <Input
              id="departDate"
              type="date"
              value={trip.departDate}
              onChange={(e) => set({ departDate: e.target.value, arriveDate: trip.arriveDate || e.target.value })}
              {...invalid("departDate")}
            />
          </Field>
          <Field id="arriveDate" label="Arrival date (local)" error={errors.arriveDate} hint="Overnight and trans-Pacific flights often land the next day.">
            <Input id="arriveDate" type="date" value={trip.arriveDate} onChange={(e) => set({ arriveDate: e.target.value })} {...invalid("arriveDate")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Onward and return travel</CardTitle>
          <CardDescription>Returning to the U.S. is its own regulatory event (CDC, USDA and the destination state).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <Checkbox id="continuing" checked={trip.continuing} onCheckedChange={(v) => set({ continuing: Boolean(v) })} />
            <Label htmlFor="continuing">Continuing to another destination</Label>
          </div>
          {trip.continuing && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="nextTo" label="Next destination" error={errors.nextTo}>
                <NativeSelect id="nextTo" className="w-full" value={trip.nextTo} onChange={(e) => set({ nextTo: e.target.value })} {...invalid("nextTo")}>
                  <DestinationOptions />
                </NativeSelect>
              </Field>
              <Field id="nextDepartDate" label="Departure" error={errors.nextDates}>
                <Input id="nextDepartDate" type="date" value={trip.nextDepartDate} onChange={(e) => set({ nextDepartDate: e.target.value })} {...invalid("nextDates")} />
              </Field>
              <Field id="nextArriveDate" label="Arrival">
                <Input id="nextArriveDate" type="date" value={trip.nextArriveDate} onChange={(e) => set({ nextArriveDate: e.target.value })} />
              </Field>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Checkbox id="returning" checked={trip.returning} onCheckedChange={(v) => set({ returning: Boolean(v) })} />
            <Label htmlFor="returning">Returning home</Label>
          </div>
          {trip.returning && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="returnDepartDate" label="Return departure" error={errors.returnDates}>
                <Input id="returnDepartDate" type="date" value={trip.returnDepartDate} onChange={(e) => set({ returnDepartDate: e.target.value })} {...invalid("returnDates")} />
              </Field>
              <Field id="returnArriveDate" label="Return arrival (local)">
                <Input id="returnArriveDate" type="date" value={trip.returnArriveDate} onChange={(e) => set({ returnArriveDate: e.target.value })} />
              </Field>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg">
          Next: animal
        </Button>
      </div>
    </form>
  );
}
