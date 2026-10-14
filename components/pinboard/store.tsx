"use client";

import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { applyAction, reloadState } from "@/lib/pinboard/actions";
import type { Action, PinboardState } from "@/lib/pinboard/state";

interface Store {
  state: PinboardState;
  /** Runs the action on the server (Postgres) and resolves with the new state. */
  dispatch: (action: Action) => Promise<PinboardState | null>;
  reload: () => void;
  pending: boolean;
  error: string | null;
  clearError: () => void;
}

const StoreContext = createContext<Store | null>(null);

export function PinboardProvider({ initialState, children }: { initialState: PinboardState; children: ReactNode }) {
  const [state, setState] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function run(fn: () => Promise<PinboardState>): Promise<PinboardState | null> {
    try {
      const next = await fn();
      setState(next);
      setError(null);
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong talking to the database.");
      return null;
    }
  }

  const store: Store = {
    state,
    pending,
    error,
    clearError: () => setError(null),
    dispatch: (action) =>
      new Promise((resolve) => startTransition(async () => resolve(await run(() => applyAction(action))))),
    reload: () => startTransition(async () => void (await run(reloadState))),
  };

  return <StoreContext value={store}>{children}</StoreContext>;
}

export function usePinboard() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("usePinboard must be used inside PinboardProvider");
  return ctx;
}

// The server stamps the real time; this only satisfies the Action type.
export const nowIso = () => new Date().toISOString();
