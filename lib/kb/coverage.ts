import type { Coverage } from "@/lib/engine/types";

export const coverage: Coverage[] = [
  { to: "JP", from: ["US"], fromNot: ["US-HI", "US-GU"] },
  { to: "US-HI", from: ["US"], fromNot: ["US-HI"], ports: ["HNL"] },
  { to: "US", from: ["JP"] },
  { to: "US-CA", from: ["JP", "US-HI"] },
];
