# Admin Side Revamp — Plan & Decisions

Source of truth: `Saral Admin Prototype.dc.html` (interactive, 13 states) + `Saral Admin UI.dc.html` (static high-fidelity version of the same 6 core screens) from the same Claude Design project as the User side. **Login is explicitly out of scope** — the existing email+password admin auth stays exactly as-is.

## What the prototype actually describes

A mobile-first **Reviewer / CA case-queue app** — Today (dashboard) → Applications (list) → Application detail → Document review → Request changes → Sent, plus Inbox → Thread, plus a parallel **CA mode**: Cases → Tasks, and an Allocate-a-CA flow. Tab bar: Today / Apps / [+FAB] / Inbox / Profile (Reviewer) or Cases / Tasks / [+FAB] / Inbox / Profile (CA).

This is **not** the current admin's structure at all (Users / CRM-Leads / Schemes / Banks / Analytics / Team / Settings, desktop-dashboard style). Confirmed via backend audit: there is **no** Reviewer/CA role, no case-assignment field, no SLA/due-date tracking, and no CA-allocation endpoint anywhere in `backend/server.py` or the mock server — this entire workflow is net-new on the backend.

## Decisions (confirmed with user)

1. **UI-first, gaps flagged** — build every screen to match the prototype, wire whatever already has real backend support, and clearly mark (in code comments, not silently) anything that's mock/placeholder pending backend work.
2. **Existing CRM pages stay** — Users/Leads/Schemes/Banks/Analytics/Team/Settings are untouched, reachable via a management entry point from the new Admin Profile screen. The new prototype flow (Today/Apps/Inbox/Profile) becomes the primary admin navigation, replacing today's dashboard-grid home for the tab bar.

## What's real vs. placeholder

| Screen | Data source | Status |
|---|---|---|
| Today (dashboard) | `/admin/leads` counts by stage, `/admin/support/unread-count` | Real counts; "Breaching soon" SLA card is placeholder (no due-date field exists) |
| Applications list/detail | `/admin/leads` (+ `/admin/leads/{id}` for detail) | **Real, but a semantic substitution**: the prototype's "Applications" (SRL-numbered scheme applications) has no admin-wide list endpoint at all — only `/my/scheme-applications` (user-scoped). `/admin/leads` is the closest real, listable, per-user progress data (name, stage, `follow_up_date`), so it stands in here. Flagging this clearly rather than inventing a fake endpoint or hardcoding rows. |
| Document review / Request changes / Sent | `/admin/users/{uid}/documents`, `POST /admin/documents/{id}/status` | Real — same endpoint the existing `AdminUserDocuments` component already uses |
| Inbox / Thread | `/admin/support/*` | Real — restyled, not rebuilt; same endpoints as `admin/support/index.tsx` / `[userId].tsx` |
| CA allocation, CA Cases, CA Tasks, "Switch role" | None | **Placeholder** — local component state only, using the prototype's own demo names (Priya/Rohit/Anjali). Flagged in code for future backend work (new role values, `assigned_ca`/`due_date` fields, allocation endpoint, CA-scoped document visibility) if this becomes a real feature. |
| SLA "due in N days" / "Breaching soon" pills | None | **Placeholder** — illustrative only |

## Screen mapping (prototype state → route)

| Prototype state | Route | Notes |
|---|---|---|
| isDash (Today) | `admin/index.tsx` (rewritten) | New tab-bar home |
| isList (Apps) | `admin/apps.tsx` (new) | |
| isDetail | `admin/application/[id].tsx` (new) | Uses lead id |
| isReview | `admin/application/[id]/review/[docId].tsx` (new) | |
| isChanges | same file, second state | Reject-reason flow |
| isSent | same file, third state | Confirmation |
| isInbox | `admin/support/index.tsx` (restyled) | Reused, not rebuilt |
| isThread | `admin/support/[userId].tsx` (restyled) | Reused, not rebuilt |
| isCa | `admin/application/[id]/allocate-ca.tsx` (new, placeholder) | |
| isCaCases | `admin/cases.tsx` (new, placeholder) | |
| isCaTasks | `admin/case-tasks/[id].tsx` (new, placeholder) | |
| isProfile | `admin/profile.tsx` (new) | Adds the "More" entry to existing CRM pages |

Tab bar (`admin/_layout.tsx`, Stack → Tabs): Today / Apps / [FAB] / Inbox / Profile, swapping to Cases / Tasks / [FAB] / Inbox / Profile when the local "CA mode" toggle is on.
