"use server";

// Prototype: no auth yet. The persona switcher picks who acts, so these trust
// the founderId in the action. Phase 2 must derive it from the session instead.
import { loadState, resetDatabase, updateState } from "./db";
import { reducer, type Action, type PinboardState } from "./state";

export async function applyAction(action: Action): Promise<PinboardState> {
  if (action.type === "reset") return resetDatabase();
  // Server clock wins over whatever the browser sent.
  const stamped = { ...action, now: new Date().toISOString() };
  return updateState((state) => reducer(state, stamped));
}

export async function reloadState(): Promise<PinboardState> {
  return loadState();
}
