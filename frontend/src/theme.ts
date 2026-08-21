// Brand palette audited directly from the production site's compiled CSS
// (saralfunding.com — Tailwind `primary` scale): 100 #37988C, 200 #1C4641,
// 300 #E7F3F1, 400 #F0F6F6, 500 #2A736A (hover), 600 #82D2B9, 700 #18413C.
export const colors = {
  primary: "#37988C",
  primaryDark: "#1C4641",
  primaryLight: "#82D2B9",
  primarySoft: "#E7F3F1",
  primaryMid: "#F0F6F6",
  bg: "#F0F6F6",
  surface: "#FFFFFF",
  surface2: "#F0F6F6",
  surfaceAlt: "#EEF5F4",
  text: "#0F2724",
  textMuted: "#6E8681",
  textDim: "#8CA29D",
  textPlaceholder: "#B7C7C3",
  border: "#E7F3F1",
  borderDark: "#C7DEDA",
  danger: "#EF4444",
  dangerSoft: "#FEECEC",
  warning: "#EAB308",
  warningSoft: "#FDF6E1",
  success: "#2A736A",
  white: "#FFFFFF",
  black: "#0F2724",
  overlay: "rgba(24,65,60,0.45)",
  // Stage colours for CRM pipeline
  stageNew: "#E9EFFD",
  stageActive: "#FCF0DA",
  stageWon: "#E7F3F1",
  stageLost: "#FEECEC",
};

// Named accent tints for category icon chips (stat cards, module tiles,
// file-type chips) — every value here is either an exact hex from the
// production site's compiled CSS (saralfunding.com) or a plain white-mix
// tint of one. The site has no blue/purple/etc. of its own, so "blue" is
// folded into the teal family rather than introducing an unrelated hue.
export const tints = {
  green:  { bg: "#E7F3F1", fg: "#37988C" },   // primary-300 bg / primary-100 text
  teal:   { bg: "#E7F3F1", fg: "#2A736A" },   // primary-300 bg / primary-500 text
  deepTeal: { bg: "#F0F6F6", fg: "#1C4641" }, // primary-400 bg / primary-200 text
  amber:  { bg: "#FDF6E1", fg: "#755A04" },   // site's yellow-500, tinted/darkened
  blue:   { bg: "#F0F6F6", fg: "#18413C" },   // no blue on site — darkest teal instead
  red:    { bg: "#FEECEC", fg: "#EF4444" },   // site's red-500, tinted
  neutral: { bg: "#F3F3F3", fg: "#5A5A5A" },  // site's gray-850 bg / gray-500 text
};

// Hero/header gradients (LinearGradient `colors` prop) — built from the
// audited brand scale only (primary → primary-500 hover → primary-700).
export const gradients = {
  hero: ["#37988C", "#2A736A", "#18413C"] as const,
  heroCompact: ["#2A736A", "#18413C", "#0F2C28"] as const,
};

export const spacing = {
  xs: 4,
  xs2: 6,
  sm: 8,
  sm2: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 18, xxl: 26, pill: 9999 };

// The floating pill tab bar's own height ((tabs)/_layout.tsx). It's an
// absolutely-positioned bar floating `bottom: max(insets.bottom, 12)` above
// the screen edge, so scrollable content needs this height PLUS that same
// bottom offset to actually clear it — see useTabBarSpacing().
export const TAB_BAR_HEIGHT = 64;

// Three elevation levels — Level 0 (flat border), 1 (card), 2 (modal).
// Shadows are navy/ink-tinted, never pure black, to stay in the brand palette.
export const elevation = {
  l0: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: colors.border,
  },
  l1: {
    shadowColor: "#0F2724",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  l2: {
    shadowColor: "#0F2724",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
};

// Poppins, four weights — the display and body scales share the same
// family and weight steps, matching the reference style guide (Regular /
// Medium / Semibold / Bold).
export const fonts = {
  regular: "Poppins_400Regular",
  medium: "Poppins_500Medium",
  semiBold: "Poppins_600SemiBold",
  bold: "Poppins_700Bold",
  displayRegular: "Poppins_400Regular",
  displayMedium: "Poppins_500Medium",
  displaySemiBold: "Poppins_600SemiBold",
  displayBold: "Poppins_700Bold",
};

export const typo = {
  h1: {
    fontSize: 30,
    fontFamily: fonts.displayBold,
    color: colors.text,
    letterSpacing: -0.4,
    lineHeight: 36,
  },
  h2: {
    fontSize: 24,
    fontFamily: fonts.displayBold,
    color: colors.text,
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  h3: {
    fontSize: 20,
    fontFamily: fonts.displayBold,
    color: colors.text,
    letterSpacing: -0.2,
    lineHeight: 26,
  },
  h4: {
    fontSize: 17,
    fontFamily: fonts.displayBold,
    color: colors.text,
    lineHeight: 23,
  },
  bodyLg: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    lineHeight: 20,
  },
  bodyMd: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.text,
    lineHeight: 20,
  },
  caption: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textDim,
    textTransform: "uppercase" as const,
    letterSpacing: 1.4,
  },
  micro: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textPlaceholder,
  },
};

export const formatINR = (n: number): string => {
  if (!n || n <= 0) return "₹0";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(n % 10000000 === 0 ? 0 : 1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
};

// Stored `mobile` values are inconsistent — some already carry a "+91"/"91"
// country code, some don't — so a plain `+91 ${mobile}` template doubles up
// to "+91 +919876543210" for the ones that do. Normalize by digit count
// instead of assuming either shape.
export const formatMobile = (mobile?: string | null): string => {
  if (!mobile) return "—";
  let digits = mobile.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
  return `+91 ${digits}`;
};

// Deterministic short reference code derived from a record's own real id —
// used as a human-scannable "#XXXXXX" tag on application cards/detail screens
// that don't have a separate ticket/application number field of their own.
export const shortRef = (id?: string | null): string => {
  if (!id) return "——";
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
};

// Colour-code CRM stages — deliberately a richer, more varied palette than
// the rest of the app. The marketing site has no lead/consultation status
// system to audit against, so these stay a wider rainbow (by user request)
// for fast visual scanning, while brand-identity colors elsewhere (buttons,
// backgrounds, primary text) stay locked to the audited site palette.
export const stageColor = (stage: string): { bg: string; text: string } => {
  const map: Record<string, { bg: string; text: string }> = {
    new: { bg: "#E9EFFD", text: "#1655D6" },          // blue
    contacted: { bg: "#FCF0DA", text: "#8A5D06" },    // amber
    interested: { bg: "#FCE7F0", text: "#B23A6B" },   // rose
    documentation: { bg: "#F1EAFB", text: "#6D3FA6" },// purple
    submitted: { bg: "#E1F5FA", text: "#0E7C93" },    // cyan
    approved: { bg: "#E7F5EC", text: "#1B6E45" },     // green
    disbursed: { bg: "#DCEEE8", text: "#14544B" },    // deep teal
    closed: { bg: "#EFF3F2", text: "#7D918D" },       // neutral gray
    called: { bg: "#FCE9DE", text: "#B5502A" },       // terracotta
    follow_up: { bg: "#EAEBFB", text: "#4C4FC4" },    // indigo
  };
  return map[stage] ?? { bg: "#EFF3F2", text: "#7D918D" };
};

// Deterministic colour per free-text tag (consultation type, lead interest, etc.)
// — same tag always gets the same colour, cycling through the in-palette tints
// so a list of mixed tags stays visually distinguishable without ad-hoc hexes.
const TAG_PALETTE = [tints.blue, tints.amber, tints.deepTeal, tints.teal, tints.red, tints.green];

export const tagColor = (tag: string): { bg: string; text: string } => {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) | 0;
  const t = TAG_PALETTE[Math.abs(h) % TAG_PALETTE.length];
  return { bg: t.bg, text: t.fg };
};
