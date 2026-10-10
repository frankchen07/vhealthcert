import { Temporal } from "temporal-polyfill";

export function formatDate(iso: string): string {
  return Temporal.PlainDate.from(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function localDateOf(instant: string): string {
  return Temporal.Instant.from(instant).toZonedDateTimeISO(Temporal.Now.timeZoneId()).toPlainDate().toString();
}

export function todayIso(): string {
  return Temporal.Now.plainDateISO().toString();
}
