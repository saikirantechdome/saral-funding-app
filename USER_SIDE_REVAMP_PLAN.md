# User Side Revamp — Audit & Screen Mapping

Branch: `sa-dev-revamp` (created from `sai-dev-deploy`, the most up-to-date branch — it is 7 commits ahead of `sai-dev`/`origin/HEAD` and already contains prior UI redesign work; `sai-dev-deploy` has nothing `sai-dev` doesn't).

Status: **Step 1 & 2 complete (audit + mapping). Not yet implementing — see "Open questions" before Step 3 begins.**

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

## 4. Open questions before Step 3 (implementation) begins

1. **Which file is authoritative for visual style?** The named `Saral User Prototype.dc.html` (compact, flat, boxy nav) or `Saral User UI v2.dc.html` (curved hero, pill nav, arc gauges) sitting in the same project? They disagree on nav bar shape, corner radii, and palette for the same screens.
2. **Login/OTP hero**: keep the existing app's recently-added 3D illustration (commit `053419c`) on the login screen, or strip it down to match the Prototype's plain wordmark-only layout?
3. **Home screen scope**: the Prototype's Home is a minimal 4-card layout; the existing Home also surfaces scheme matches, a funding/subsidy estimate, and bank recommendations. Should those extra sections be dropped to match the Prototype exactly, or kept below the Prototype's cards (i.e. Prototype layout for the top of the screen, existing content preserved further down)?
4. **Bottom tab bar restructuring**: adopt the Prototype's 5 tabs (Home / Status / FAB-upload / Docs / Chat, Profile moved behind the Home-header avatar), replacing today's (Home / Applications / Documents / Chat / Profile)? This drops "Applications" as a tab (folds into the new Status screen?) and removes Profile from the tab bar.
5. **Duplicate document-vault screens**: `(tabs)/documents.tsx` and the standalone `documents.tsx` both implement upload/list/delete today. Revamp both to the new design, or consolidate into one screen?
6. **Screens absent from the Prototype** (onboarding steps, Schemes, Bank list/detail/compare, bank-linking, booking, readiness, My Applications, language, legal): leave these on current UI for now (out of scope until a prototype covers them), or should I extend the Prototype's established visual language (teal/amber, card style, type scale) to these screens using my own judgment for layout?

I'd rather get your call on these six before writing UI code, since a wrong guess on #1 or #4 would mean redoing most of the visual work. Once you confirm, I'll start on Authentication (Login → OTP) first, per your suggested order, then commit that milestone to `sa-dev-revamp` before moving on.
