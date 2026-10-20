import type { Coverage } from "@/lib/engine/types";

export const coverage: Coverage[] = [
  { to: "FR", from: ["US"] },
  { to: "JP", from: ["US"], fromNot: ["US-HI", "US-GU"] },
  { to: "US-HI", from: ["US"], fromNot: ["US-HI"], ports: ["HNL"] },
  { to: "US", from: ["FR", "JP"] },
  { to: "US-CA", from: ["FR", "JP", "US-HI"] },
];
