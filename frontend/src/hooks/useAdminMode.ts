/**
 * Reviewer ↔ CA mode toggle for the new admin nav (Saral Admin Prototype.dc.html).
 *
 * PLACEHOLDER — there is no real "CA" role or per-admin mode in the backend
 * today (confirmed: no reviewer/ca role value, no assigned_ca field, no
 * allocation endpoint — see ADMIN_SIDE_REVAMP_PLAN.md). This is a local,
 * session-only UI toggle so the prototype's two tab-bar layouts and two
 * dashboards can be demonstrated; it does not change what the logged-in
 * admin can actually do or see from the backend's perspective.
 *
 * A tiny external store (not Context) so both the tab bar (_layout.tsx) and
 * any screen that offers a "Switch role" action can read/flip the same
 * value without prop-drilling.
 */
import { useEffect, useState } from "react";

let mode: "reviewer" | "ca" = "reviewer";
const listeners = new Set<() => void>();

export function getAdminMode() {
  return mode;
}

export function setAdminMode(next: "reviewer" | "ca") {
  mode = next;
  listeners.forEach((l) => l());
}

export function toggleAdminMode() {
  setAdminMode(mode === "reviewer" ? "ca" : "reviewer");
}

export function useAdminMode() {
  const [, forceRender] = useState(0);
  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);
  return mode;
}
