// Design tokens for the approved "Saral User Prototype.dc.html" revamp
// (Claude Design project ece3284d-c052-4d4b-8cd7-4ef28cb233bf).
//
// Kept deliberately separate from `theme.ts` (the legacy palette ~49 files
// still depend on) so revamping a screen to match the prototype never
// reskins screens the revamp hasn't reached yet — see USER_SIDE_REVAMP_PLAN.md.
//
// Values are copied verbatim from the prototype's inline <style> block,
// which is the actual rendered source of truth — the imported Techdome
// Design System CSS in that same file defines a different, unused palette.
//
// Sizes are the prototype's own px values scaled ~1.2x: the prototype is
// authored inside a fixed 320pt-wide phone mock for demo purposes, not as
// a 1:1 device spec, and 1.2x brings it in line with a ~375-390pt real
// screen while preserving every proportion and all colors exactly.
const SCALE = 1.2;
const s = (n: number) => Math.round(n * SCALE);

export const protoColors = {
  bg: "#EEF3F1",
  surface: "#FFFFFF",
  surfaceAlt: "#F4F8F6",
  fieldBg: "#F1F5F4",

  primary: "#1B5C55",
  primaryDark: "#0E211E",
  heroGradient: ["#1B6A5F", "#0E211E"] as const,
  heroSolidDark: "#123F39",
  accent: "#2E9385",

  amber: "#E8A33D",
  amberDeep: "#8A5A05",
  amberSoft: "#FEF7EA",
  amberSoft2: "#FBEFD8",

  text: "#12332E",
  textMuted: "#748C87",
  textDim: "#8FA39E",
  border: "#EAF0EE",

  danger: "#B4462F",
  dangerSoft: "#FBE7E2",

  // The prototype's `.s-ico` placeholder square — a flat, un-iconed color
  // block used for every list-row icon slot (Status stages, Documents rows,
  // Profile rows, Notifications) unless that row's state overrides it (e.g.
  // Status's done/now rows tint green/amber). Not the same token as
  // `surfaceAlt` — the prototype uses a distinctly different, slightly
  // greener gray for this one spot.
  iconPlaceholder: "#EDF4F2",

  pill: {
    teal: { bg: "#E7F1EE", text: "#1B5C55" },
    amber: { bg: "#FBEFD8", text: "#8A5A05" },
    blue: { bg: "#E9EFFD", text: "#1766FF" },
    green: { bg: "#E4F5EB", text: "#1F7A4C" },
    neutral: { bg: "#EEF2F1", text: "#7E938E" },
  },
};

// The prototype's actual typeface (its <style> block imports Armata from
// Google Fonts and sets it as the page's body font — see app/_layout.tsx for
// where it's loaded). Only one weight exists in this package (400); the
// prototype's own CSS also never sets font-weight anywhere but its base
// 400 rule, so this is the only proto font token — Armata's own letterforms
// (not synthetic bold) are what give headlines their heavier look.
export const protoFonts = {
  regular: "Armata_400Regular",
};

export const protoRadius = {
  field: s(13),
  btn: s(15),
  card: s(16),
  pill: 999,
};

export const protoSpacing = {
  xs: s(4),
  sm: s(8),
  md: s(13),
  lg: s(20),
  xl: s(28),
};

export const protoSize = {
  field: s(42),
  btn: s(44),
  otpBox: s(46),
  headline: s(24),
  body: s(14),
  small: s(11),
  label: s(9),
};
