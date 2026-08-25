/**
 * PLACEHOLDER data for CA mode (Cases/Tasks screens) — matches the
 * prototype's own demo content. No backend model exists for CA cases or
 * tasks (see ADMIN_SIDE_REVAMP_PLAN.md); this is local-only, not fetched
 * from any API, so it never claims to be real.
 */
export interface CaTask {
  id: string;
  label: string;
  status: "done" | "in_progress" | "todo";
}

export interface CaCase {
  id: string;
  name: string;
  scheme: string;
  note: string;
  pill: { label: string; tone: "amber" | "blue" | "neutral" };
  tasks: CaTask[];
  bank: string;
}

export const CA_CASES: CaCase[] = [
  {
    id: "ramesh",
    name: "Ramesh Kulkarni",
    scheme: "PMEGP",
    note: "DPR pending",
    pill: { label: "Next", tone: "amber" },
    bank: "State Bank of India",
    tasks: [
      { id: "financials", label: "Verify financials", status: "done" },
      { id: "docs", label: "Collect documents", status: "done" },
      { id: "dpr", label: "Prepare DPR", status: "in_progress" },
      { id: "file", label: "File application", status: "todo" },
      { id: "bank", label: "Bank liaison", status: "todo" },
    ],
  },
  {
    id: "imran",
    name: "Imran Shaikh",
    scheme: "PMMY",
    note: "Filed 09 Aug · bank follow-up",
    pill: { label: "Bank", tone: "blue" },
    bank: "HDFC Bank",
    tasks: [
      { id: "financials", label: "Verify financials", status: "done" },
      { id: "docs", label: "Collect documents", status: "done" },
      { id: "dpr", label: "Prepare DPR", status: "done" },
      { id: "file", label: "File application", status: "done" },
      { id: "bank", label: "Bank liaison", status: "in_progress" },
    ],
  },
  {
    id: "meena",
    name: "Meena Patil",
    scheme: "PMEGP",
    note: "Financials to verify",
    pill: { label: "New", tone: "neutral" },
    bank: "Bank of Baroda",
    tasks: [
      { id: "financials", label: "Verify financials", status: "todo" },
      { id: "docs", label: "Collect documents", status: "todo" },
      { id: "dpr", label: "Prepare DPR", status: "todo" },
      { id: "file", label: "File application", status: "todo" },
      { id: "bank", label: "Bank liaison", status: "todo" },
    ],
  },
];
