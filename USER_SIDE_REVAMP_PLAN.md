# User Side Revamp — Audit & Screen Mapping

Branch: `sa-dev-revamp` (created from `sai-dev-deploy`, the most up-to-date branch — it is 7 commits ahead of `sai-dev`/`origin/HEAD` and already contains prior UI redesign work; `sai-dev-deploy` has nothing `sai-dev` doesn't).

Status: **All 10 screens/states in `Saral User Prototype.dc.html` implemented and committed locally** (Login, OTP, Home, Status, Documents list, per-document Upload, Submitted confirmation, Notifications, Chat, Profile), plus the tab bar restructure. **Not pushed yet** — holding until Admin side (Phase 2) is also done, per instruction. See "What was adapted, not copied verbatim" below for the handful of deliberate deviations, and "Still open" for follow-ups.

---

## 1. Design source — what was actually found

Claude Design project `ece3284d-c052-4d4b-8cd7-4ef28cb233bf` ("Copy of Mobile app screen wireframes") contains **five** separate design files, not one:

| File | What it is |
|---|---|
| `Saral User Prototype.dc.html` | ✅ **The file named in the brief.** Compact, *interactive* clickable prototype — one phone frame (320×664), 10 state-driven screens wired together with click handlers (`isLogin`/`isOtp`/`isHome`/`isStatus`/`isDocs`/`isUpload`/`isDone`/`isNotif`/`isChat`/`isProfile`). Flat cards, boxy 5-icon tab bar, teal `#1B5C55` / dark `#0E211E` / amber `#E8A33D` palette on `#EEF3F1` background. Font: **Armata**. |
| `Saral User UI v2.dc.html` | A separate, **static, non-interactive** visual-style exploration ("v2, less boxy") — only 4 frames (Home, Status, Documents, Completed), phone frame 375×812, curved gradient hero, floating pill nav bar, animated SVG arc gauges, blob glows. Different palette: bg `#E9EFED`, hero gradient `#2A8E7C→#14544B→#0C2622`, accent `#3FBAA4`, amber `#E19A28`. |
| `Saral User UI.dc.html` | Not yet opened — presumably the v1 predecessor of the above. |
| `Saral User Wireframes.dc.html` / `Saral Mobile Wireframes.dc.html` | Not yet opened — likely low-fi layout-only wireframes. |

**This matters:** the Prototype file and the UI v2 file show visually *different* design languages for the same three screens (Home, Status, Documents) — different corner radii, nav bar style, gauge treatment, and palette. Per your instructions the Prototype file is the named source of truth, so this plan and all mapping below is built against **`Saral User Prototype.dc.html` only**. I have not touched UI v2/UI/Wireframes beyond confirming they exist. **See Question 1 below** — I want your explicit confirmation before building against the compact Prototype file, given a fuller-fidelity alternative sits right next to it in the same project.

Also fetched: `_ds/.../colors_and_type.css` (the imported Techdome Design System stylesheet) — its tokens (`--tech-blue: #49C0EE`, navy `#0F172A`, etc.) are **not** the colors actually used on screen; the Prototype ignores that stylesheet's palette entirely and hardcodes its own teal/amber values inline. So the design-system CSS is not a reliable color source for this project — the Prototype's own inline `<style>` block is ground truth.

Encouragingly, the Prototype's teal (`#1B5C55`) is close to the existing app's `frontend/src/theme.ts` primary teal, which its own comment says was "audited directly from production site's compiled CSS" — so the brand color direction is not a big departure, mostly a refinement.

---

## 2. Existing app — audit summary

- **Stack**: Expo 54 / React Native 0.81 / React 19, **Expo Router** (file-based routes under `frontend/app/`), plain `StyleSheet` (no NativeWind/Tailwind), no Redux/Zustand — per-screen `useState` + ad-hoc `GET /auth/me` calls for role/profile. HTTP via a hand-rolled `fetch` wrapper in `frontend/src/api.ts` (bearer token + 401 refresh retry). Fonts: **Poppins** (`@expo-google-fonts/poppins`), not Armata.
- **Theme file**: `frontend/src/theme.ts` — already has `colors`, `spacing`, `radius`, `typo`, `elevation`, `gradients`, tab-bar height constant. This is the file to extend/adjust rather than replace.
- **Current bottom tab bar** (`frontend/app/(tabs)/_layout.tsx`): 5 visible user tabs — **Home, Applications, Documents, Chat, Profile**. No center FAB, no "Status" tab.
- **Prototype's tab bar**: **Home, Status, [+ FAB → upload], Docs, Chat** — no Profile tab (profile reached by tapping the avatar in the Home header), no Applications tab.
- Auth flow (phone + OTP + onboarding) already exists end-to-end and works; this revamp is UI-only there.
- One dead end already in the codebase, unrelated to this revamp but worth knowing: the "Saathi AI advisor chat" screen (`(tabs)/advisor.tsx`) is currently unreachable for regular users (tab hidden, no link pushes to it).

Full architecture/API/component inventory is in the audit already done this session (screens, endpoints, reusable components, storage) — happy to drop it into a file too if you want it preserved in-repo; currently it only exists in this conversation.

---

## 3. Screen mapping — Prototype states → existing app

| Prototype screen (state) | Existing screen/route | Status | Required changes |
|---|---|---|---|
| Login (mobile entry) | `frontend/app/login.tsx` | Exists | UI revamp: logo top-left, "Funding, clear hai." headline, single mobile field, full-width `Continue` button, terms line footer. Existing screen already has a 3D-illustration hero (per recent commit `053419c`) — decide whether to keep that illustration or match the Prototype's plainer layout (see Question 2). |
| OTP verification | `frontend/app/otp.tsx` | Exists | UI revamp: 6-box grid, back arrow + "Enter the code" title, "Resend in 00:24" countdown, `Verify` button, "Change number" footer link. |
| Home / dashboard | `frontend/app/(tabs)/index.tsx` | Exists, currently dual-role (user+admin) and much richer than the Prototype | Major revamp: dark teal header (greeting, avatar→Profile, bell→Notifications), status ring card (stage X of 7, %, progress strip, tap→Status), amber "needs action" card, 2-up grid (Documents / Chat tiles). The Prototype's Home is deliberately minimal — existing Home also carries scheme matches, funding estimate, bank recommendations not present in the Prototype at all (see Question 3). |
| Bottom tab bar | `frontend/app/(tabs)/_layout.tsx` | Exists, different composition | **Flow adjustment — needs your decision.** Prototype = Home / Status / [FAB upload] / Docs / Chat (no Profile tab). Existing = Home / Applications / Documents / Chat / Profile (no Status tab, no FAB). See Question 4. |
| Status (application progress) | No direct 1:1 today — closest are `funding-case.tsx`, `my-applications.tsx`, `readiness.tsx` | New screen / consolidation | Build a "Status" screen: big % ring header (SRL id + next-update date) + vertical stage list (Onboarding → Documents → Review → Schemes → Bank → Completed), each with a done/now/pending pill. |
| Documents list | `frontend/app/(tabs)/documents.tsx` + `frontend/app/documents.tsx` (two vault screens today) | Exists (duplicated) | UI revamp: header with "Due {date}" + 6-segment progress strip, one card per document with status pill (Approved/Review/To do/Action). Also worth deciding whether to merge the two existing vault screens into one (see Question 5). |
| Document upload/review detail | Upload handled inline on the vault screens; no standalone per-document screen today | New screen | Build a per-document detail screen: amber "why it came back" card when rejected, placeholder preview area, Retake/Choose-file row when action-needed, single dynamic submit button (`Re-upload` vs `Back to documents` depending on state). |
| Submitted confirmation | Not a separate screen today (upload flows stay on the list) | New screen | "Document sent" confirmation: success icon, application/reviewer/due-date/status key-value rows, Message + Home buttons. |
| Notifications | `frontend/app/notifications.tsx` | Exists | UI revamp: filter pills (All / Actions / Updates), amber-tinted card for action items, "Read all" header action. |
| Chat (reviewer) | `frontend/app/(tabs)/support.tsx` | Exists | UI revamp: reviewer header (name + "replies in ~2h"), left/right bubble styling, quick-reply chips, bottom composer with send icon. |
| Profile | `frontend/app/(tabs)/profile.tsx` | Exists | UI revamp: dark teal header (avatar, name, mobile+ID), state/city/category rows, then business profile / notifications / help / log-out list rows. |

**Existing screens with no corresponding state in this Prototype file at all**: onboarding (profile/business/assessment), Schemes list, Scheme detail, Assigned banks, Bank detail, Bank comparison, Bank-account linking (Setu), Consultation booking, Readiness detail, My Applications, Language picker, Legal. The compact Prototype simply doesn't model these flows. Per your rule "do not use a generic UI" and "do not substitute your own decisions," I don't want to freelance a visual style for ~12 screens the approved file never shows — **see Question 6**.

---

## 4. Decisions (resolved 2026-08-24)

1. **Authoritative design file — RESOLVED.** User confirmed via screenshot: `Saral User Prototype.dc.html` and `Saral Admin Prototype.dc.html` are "the two final, approved designs / final flow." `Saral User UI v2.dc.html`, `Saral User UI.dc.html`, and the Wireframes files are superseded explorations — not used as reference.
2. **Login/OTP hero — RESOLVED by extension.** Since the Prototype is the approved design and instructions require matching it exactly, the existing app's 3D-illustration hero (commit `053419c`) is replaced with the Prototype's plain layout (logo top-left, headline, subtext, single field, full-width button, terms footer).
3. **Bottom tab bar — RESOLVED by extension.** Adopt the Prototype's exact 5 tabs: Home / Status / [FAB → upload] / Docs / Chat. Profile is reached via the avatar tap on Home's header, not a tab. "Applications" as a tab is retired; its content is superseded by the new Status screen.
4. **Screens absent from the Prototype** (onboarding steps, Schemes, Bank list/detail/compare, bank-linking, booking, readiness, My Applications, language, legal): **left on current UI for now** — not part of the approved flow, so no invented visual style for them in Phase 1. Flagged for a follow-up decision once Phase 1 is reviewed.
5. **Duplicate document-vault screens** (`(tabs)/documents.tsx` and standalone `documents.tsx`): to be consolidated into one screen matching the Prototype's Documents state, since the Prototype models only one Documents screen.

Implementation proceeded screen-by-screen per the suggested order, committing to `sa-dev-revamp` locally after each milestone (6 commits: plan → Login/OTP → Home/Status/tab-bar → Documents flow → Notifications/Chat/Profile). **Not pushed** — per your instruction, pushing waits until Admin (Phase 2) is also done.

## 5. What was adapted, not copied verbatim

Faithful to the prototype's colors/type/spacing/components everywhere, but a few real-app realities forced small, documented adaptations:

- **Sizing is scaled ~1.2×** from the prototype's own px values (it's authored in a fixed 320pt-wide demo phone frame, not a 1:1 device spec) — see `theme.proto.ts`. Colors are exact; proportions are preserved; absolute px are scaled up for comfortable real touch targets.
- **Stage taxonomy on Home/Status** uses the app's real 7-stage CRM pipeline (`call_done → documents_submitted → scheme_identified → application_filed → under_review → approved → disbursed`, from `/my/scheme-applications`) rather than the prototype's demo labels ("Schemes & your CA", etc.) — real data was already 7 stages, matching the prototype's "of 7" exactly, so I used the real names instead of inventing fake ones.
- **Document Upload/Submitted screens are new** (`app/document/[type].tsx`, `app/document/submitted.tsx`) — the old app only had one inline upload UI on the list screen; it's now three screens matching the prototype's Documents → Upload → Submitted flow.
- **Two duplicate document-vault implementations were consolidated** into one shared `src/screens/DocumentVault.tsx`, used by both the standalone post-onboarding route and the Documents tab.
- **Home dropped** the bank-match / scheme-match / WhatsApp / consultation / marketing sections — none are in the prototype's Home. Those features (Banks, Schemes, Booking, WhatsApp) still work but currently have **no entry point** anywhere in the revamped nav. This is the one open item that needs your call — see below.
- **FAB tab** (center "+") redirects into the Documents flow (`app/(tabs)/quick-upload.tsx`) since there's no generic "quick upload" endpoint to target more specifically.
- **Reviewer name**: the prototype shows a fictional "Karan S."; the real app has no assigned-reviewer field, so screens say "Our team" instead of a fabricated name.

## 6. Still open

1. **Where do Banks / Schemes / Booking / WhatsApp go now?** They lost their only entry point when Home was simplified to match the prototype. Options: add a "More" section somewhere, extend the Status screen, or leave them until a prototype screen covers them explicitly.
2. **Icon source** (Flaticon vs the current lucide-react-native + Icons8 mix) — asked earlier, no answer yet. Nothing revamped so far uses Icons8; all new icons are lucide vector components.
3. A pre-existing, unrelated `ReferenceError: colors is not defined` shows up in the browser console on every page load — confirmed via bisection to already exist in the original pre-revamp code (053419c), harmless to visible UI. Left untouched (out of scope) but worth a look separately if it bothers you.
4. Interactive browser click-testing became unreliable partway through this session (see chat) — Documents/Notifications/Chat/Profile were verified by compile/console cleanliness and by reusing the exact same components already pixel-verified on Login/OTP/Home/Status, not by a fresh screenshot pass. Worth a visual pass once the Browser pane is behaving normally again.
