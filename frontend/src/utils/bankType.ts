import { colors, tints } from "@/src/theme";

interface BankTypeStyle {
  bg: string;
  fg: string;
  /** Icons8 "color" CDN slug for this bank category. */
  slug: string;
}

// Icons8 doesn't host per-bank trademarked logos by name, so every bank gets
// a colorful icon keyed off its category (Public/Private/NBFC/etc.) instead
// of a brand-specific one. Shared by every screen that lists a bank so the
// same bank type always looks the same everywhere.
export function bankTypeStyle(bankType: string | undefined | null): BankTypeStyle {
  const t = (bankType || "").toLowerCase();
  if (t.includes("public")) return { bg: tints.teal.bg, fg: tints.teal.fg, slug: "bank" };
  if (t.includes("private")) return { bg: tints.blue.bg, fg: tints.blue.fg, slug: "bank-building" };
  if (t.includes("development")) return { bg: tints.amber.bg, fg: tints.amber.fg, slug: "guarantee" };
  if (t.includes("small finance")) return { bg: tints.deepTeal.bg, fg: tints.deepTeal.fg, slug: "wallet" };
  if (t.includes("fintech")) return { bg: tints.teal.bg, fg: tints.teal.fg, slug: "money-transfer" };
  if (t.includes("nbfc")) return { bg: tints.neutral.bg, fg: tints.neutral.fg, slug: "briefcase" };
  return { bg: colors.primarySoft, fg: colors.primaryDark, slug: "bank" };
}
