"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { todayIso } from "@/lib/format";
import type { CaseState } from "./model";

const STORAGE_KEY = "vettravel-case";

export const emptyCase = (): CaseState => ({
  trip: {
    from: "US-CA",
    to: "",
    departDate: "",
    arriveDate: "",
    returning: false,
    returnDepartDate: "",
    returnArriveDate: "",
    continuing: false,
    nextTo: "",
    nextDepartDate: "",
    nextArriveDate: "",
    purpose: "personal",
  },
  animal: {
    species: "dog",
    birthDate: "",
    breed: "",
    microchip: { status: "unknown" },
    rabiesVaccinations: [],
    titerTests: [],
    otherCountriesLast6Months: [],
  },
  completed: {},
});

interface CaseContextValue {
  state: CaseState;
  loaded: boolean;
  today: string;
  update: (fn: (s: CaseState) => CaseState) => void;
  reset: () => void;
}

const CaseContext = createContext<CaseContextValue | null>(null);

function readStored(): CaseState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CaseState) : null;
  } catch {
    return null;
  }
}

export function CaseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CaseState>(emptyCase);
  const [loaded, setLoaded] = useState(false);
  const [today, setToday] = useState("");

  useEffect(() => {
    const stored = readStored();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage and the viewer's clock are only readable after mount
    if (stored) setState(stored);
    setToday(todayIso());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be unavailable (private mode); the case still works for this page view.
    }
  }, [state, loaded]);

  const update = useCallback((fn: (s: CaseState) => CaseState) => setState(fn), []);
  const reset = useCallback(() => setState(emptyCase()), []);

  return <CaseContext.Provider value={{ state, loaded, today, update, reset }}>{children}</CaseContext.Provider>;
}

export function useCase(): CaseContextValue {
  const ctx = useContext(CaseContext);
  if (!ctx) throw new Error("useCase must be used inside CaseProvider");
  return ctx;
}
