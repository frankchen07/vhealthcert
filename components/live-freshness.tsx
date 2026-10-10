"use client";

import { useEffect, useState } from "react";
import { SourceFreshness } from "@/components/source-status";
import type { Source, SourceStatus } from "@/lib/engine/types";
import { todayIso } from "@/lib/format";

export function LiveFreshness({ source, status }: { source: Source; status: SourceStatus | undefined }) {
  const [today, setToday] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the current date must come from the viewer's clock, not the build
  useEffect(() => setToday(todayIso()), []);
  return today ? <SourceFreshness source={source} status={status} today={today} /> : null;
}
