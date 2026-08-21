import { colors, tints } from "@/src/theme";

interface DocTypeStyle {
  bg: string;
  fg: string;
  /** Icons8 "color" CDN slug for this document category. */
  slug: string;
}

// Single source of truth for both the chip tint and the Icons8 icon shown
// per document type, grouped by substring match on the free-text doc_type.
// Shared by the user-facing Document Vault and both admin document-review
// screens so all three stay visually consistent. Anything unrecognized
// falls back to a plain teal chip + generic file icon, so new/legacy doc
// types never break.
export function docTypeStyle(docType: string | undefined | null): DocTypeStyle {
  const t = (docType || "").toLowerCase();
  if (t.includes("aadhaar") || t.includes("pan") || t.includes("photograph") || t.includes("address proof")) {
    return { bg: tints.blue.bg, fg: tints.blue.fg, slug: "identification-documents" };
  }
  if (
    t.includes("gst") || t.includes("udyam") || t.includes("registration") || t.includes("incorporation") ||
    t.includes("moa") || t.includes("aoa") || t.includes("board resolution") || t.includes("company") ||
    t.includes("shop") || t.includes("establishment") || t.includes("factory") || t.includes("partnership")
  ) {
    return { bg: tints.deepTeal.bg, fg: tints.deepTeal.fg, slug: "certificate" };
  }
  if (
    t.includes("bank") || t.includes("itr") || t.includes("income tax") || t.includes("cheque") ||
    t.includes("cma") || t.includes("cash flow") || t.includes("dscr") || t.includes("loan")
  ) {
    return { bg: tints.amber.bg, fg: tints.amber.fg, slug: "bank-cards" };
  }
  if (t.includes("property") || t.includes("land") || t.includes("building")) {
    return { bg: tints.red.bg, fg: tints.red.fg, slug: "home" };
  }
  if (t.includes("project") || t.includes("quotation") || t.includes("invoice") || t.includes("dpr")) {
    return { bg: tints.neutral.bg, fg: tints.neutral.fg, slug: "invoice" };
  }
  return { bg: colors.primarySoft, fg: colors.primaryDark, slug: "file" };
}
