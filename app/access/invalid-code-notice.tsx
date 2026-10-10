"use client";

import { useEffect, useState } from "react";

export function InvalidCodeNotice() {
  const [invalid, setInvalid] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the query string is read on the client so the page can stay static
  useEffect(() => setInvalid(new URLSearchParams(window.location.search).has("invalid")), []);
  if (!invalid) return null;
  return (
    <p role="alert" className="rounded-lg border border-review-border bg-review-bg px-3 py-2 text-sm text-review">
      That code wasn&apos;t recognized. Check it and try again.
    </p>
  );
}
