// Shared "your journey" stage helpers for the revamped Home + Status screens.
// Mirrors the same 7-stage CRM pipeline `my-applications.tsx` already uses
// (STAGES/STAGE_LABELS defined locally there) — duplicated here rather than
// importing, consistent with this codebase's existing convention of small
// per-screen constant repeats (see e.g. admin/leads.tsx vs admin/lead/[id].tsx).
// This is real backend data (`stage`/`stage_index` on each scheme application
// from GET /my/scheme-applications) — not invented to match the prototype's
// "Stage 3 of 7" demo copy, which happens to line up with this app's actual
// 7-stage pipeline.
export const STAGES = [
  "call_done",
  "documents_submitted",
  "scheme_identified",
  "application_filed",
  "under_review",
  "approved",
  "disbursed",
] as const;

export const STAGE_LABELS: Record<string, string> = {
  call_done: "Call done",
  documents_submitted: "Documents submitted",
  scheme_identified: "Scheme identified",
  application_filed: "Application filed",
  under_review: "Document review",
  approved: "Approved",
  disbursed: "Disbursed",
  rejected: "Rejected",
};

export interface SchemeApp {
  id: string;
  scheme_name?: string;
  bank_name?: string;
  stage: string;
  stage_label?: string;
  stage_index: number;
  created_at?: string;
}

export interface JourneyProgress {
  app: SchemeApp | null;
  stageIndex: number;
  stageLabel: string;
  percent: number;
}

// Picks the most-advanced non-rejected application to represent "your
// journey" on Home/Status when a user has more than one scheme application.
// Falls back to stage 0 (not yet started) when there are none at all.
export function journeyProgress(apps: SchemeApp[]): JourneyProgress {
  const active = (apps || []).filter((a) => a.stage !== "rejected");
  const best = active.reduce<SchemeApp | null>((acc, a) => (
    !acc || a.stage_index > acc.stage_index ? a : acc
  ), null);

  const stageIndex = best?.stage_index ?? 0;
  const stageLabel = best ? (STAGE_LABELS[best.stage] ?? best.stage_label ?? best.stage) : "Getting started";
  const percent = Math.round(((stageIndex + 1) / STAGES.length) * 100);

  return { app: best, stageIndex, stageLabel, percent };
}
