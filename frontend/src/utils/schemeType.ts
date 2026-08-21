import { colors, tints } from "@/src/theme";

interface SchemeTypeStyle {
  bg: string;
  fg: string;
  /** Icons8 "color" CDN slug for this scheme category. */
  slug: string;
}

// Icons8 "color" CDN slug + tint per government scheme, grouped by substring
// match on the free-text scheme name. Anything unrecognized falls back to a
// plain briefcase icon, so new/legacy scheme names never break.
export function schemeStyle(schemeName: string | undefined | null): SchemeTypeStyle {
  const t = (schemeName || "").toLowerCase();
  if (t.includes("pmegp")) return { bg: tints.deepTeal.bg, fg: tints.deepTeal.fg, slug: "factory" };
  if (t.includes("mudra") || t.includes("pmmy")) return { bg: tints.amber.bg, fg: tints.amber.fg, slug: "money-bag" };
  if (t.includes("stand-up") || t.includes("stand up")) return { bg: tints.blue.bg, fg: tints.blue.fg, slug: "handshake" };
  if (t.includes("cgtmse") || t.includes("guarantee")) return { bg: tints.red.bg, fg: tints.red.fg, slug: "guarantee" };
  if (t.includes("vishwakarma")) return { bg: tints.amber.bg, fg: tints.amber.fg, slug: "hammer" };
  if (t.includes("svanidhi") || t.includes("street vendor")) return { bg: tints.neutral.bg, fg: tints.neutral.fg, slug: "small-business" };
  if (t.includes("startup") || t.includes("seed fund")) return { bg: tints.teal.bg, fg: tints.teal.fg, slug: "rocket" };
  return { bg: colors.primarySoft, fg: colors.primaryDark, slug: "briefcase" };
}

export function schemeIconSlug(schemeName: string | undefined | null): string {
  return schemeStyle(schemeName).slug;
}
