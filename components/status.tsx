import { cn } from "cn";
import type { Readiness, RequirementStatus, VerificationState } from "@/lib/engine/types";

type Tone = "review" | "action" | "ok" | "info" | "muted";

const TONE_CLASSES: Record<Tone, string> = {
  review: "bg-review-bg text-review border-review-border",
  action: "bg-action-bg text-action border-action-border",
  ok: "bg-ok-bg text-ok border-ok-border",
  info: "bg-info-bg text-info border-info-border",
  muted: "bg-muted text-muted-foreground border-border",
};

export const toneClasses = (tone: Tone) => TONE_CLASSES[tone];

export const READINESS: Record<Readiness, { label: string; tone: Tone; detail: string }> = {
  unsupported: { label: "Unsupported itinerary", tone: "review", detail: "Part of this trip is outside current coverage, so no plan is shown for it." },
  not_permitted: { label: "Not permitted", tone: "review", detail: "A requirement indicates this animal cannot make this trip." },
  not_achievable: { label: "Not achievable by planned date", tone: "review", detail: "Required waiting periods or deadlines cannot be met before the planned arrival." },
  not_ready: { label: "Not ready", tone: "action", detail: "Requirements remain to be completed." },
  review_required: { label: "Potentially ready — review required", tone: "review", detail: "Entered information meets the requirements, but some items need manual review." },
  satisfied: { label: "Requirements satisfied based on entered information", tone: "ok", detail: "This is not a government approval." },
};

export const STATUS: Record<RequirementStatus, { label: string; tone: Tone }> = {
  action_required: { label: "Action required", tone: "action" },
  cannot_determine: { label: "Cannot determine", tone: "review" },
  not_permitted: { label: "Not permitted", tone: "review" },
  satisfied: { label: "Satisfied", tone: "ok" },
  informational: { label: "Information", tone: "info" },
  not_applicable: { label: "Not applicable", tone: "muted" },
};

export const VERIFICATION: Record<VerificationState, { label: string; tone: Tone }> = {
  manual_review: { label: "Manual review required", tone: "review" },
  verified_review: { label: "Verified — review recommended", tone: "action" },
  verified: { label: "Verified", tone: "ok" },
};

export function Pill({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", TONE_CLASSES[tone], className)}>
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: RequirementStatus }) {
  return <Pill tone={STATUS[status].tone}>{STATUS[status].label}</Pill>;
}

export function VerificationPill({ state }: { state: VerificationState }) {
  return <Pill tone={VERIFICATION[state].tone}>{VERIFICATION[state].label}</Pill>;
}
