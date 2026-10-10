import { Temporal } from "temporal-polyfill";
import type { DurationSpec } from "./types";

export type PlainDate = Temporal.PlainDate;

export const pd = (iso: string): PlainDate => Temporal.PlainDate.from(iso);
export const cmp = (a: PlainDate, b: PlainDate): number => Temporal.PlainDate.compare(a, b);
export const maxDate = (first: PlainDate, ...rest: PlainDate[]): PlainDate =>
  rest.reduce((a, b) => (cmp(a, b) >= 0 ? a : b), first);
export const minDate = (first: PlainDate, ...rest: PlainDate[]): PlainDate =>
  rest.reduce((a, b) => (cmp(a, b) <= 0 ? a : b), first);
export const plus = (d: PlainDate, dur: DurationSpec): PlainDate => d.add(dur);
export const minus = (d: PlainDate, dur: DurationSpec): PlainDate => d.subtract(dur);
export const daysFrom = (from: PlainDate, to: PlainDate): number => from.until(to, { largestUnit: "days" }).days;

export function describeDuration(dur: DurationSpec): string {
  const parts: string[] = [];
  if (dur.years) parts.push(`${dur.years} year${dur.years === 1 ? "" : "s"}`);
  if (dur.months) parts.push(`${dur.months} month${dur.months === 1 ? "" : "s"}`);
  if (dur.days !== undefined && (dur.days || parts.length === 0)) parts.push(`${dur.days} day${dur.days === 1 ? "" : "s"}`);
  return parts.join(" ");
}
