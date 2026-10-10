"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { CaseProvider } from "@/lib/case/store";

const STEPS = [
  { href: "/case/trip", label: "Trip" },
  { href: "/case/animal", label: "Animal" },
  { href: "/case/sources", label: "Sources" },
  { href: "/case/plan", label: "Travel plan" },
  { href: "/case/client", label: "Client view" },
];

export default function CaseLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <CaseProvider>
      <div className="no-print mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ol className="flex flex-wrap gap-1 text-sm" aria-label="Case steps">
          {STEPS.map((step, i) => (
            <li key={step.href}>
              <Link
                href={step.href}
                aria-current={pathname === step.href ? "step" : undefined}
                className={cn(
                  "rounded-md px-2 py-1 text-muted-foreground hover:text-foreground",
                  pathname === step.href && "bg-muted font-medium text-foreground",
                )}
              >
                {i + 1}. {step.label}
              </Link>
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted-foreground">Temporary case — stored only in this browser tab and cleared when it closes.</p>
      </div>
      {children}
    </CaseProvider>
  );
}
