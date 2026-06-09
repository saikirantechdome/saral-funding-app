export const colors = {
  primary: "#22C55E",
  primaryDark: "#15803D",
  primarySoft: "#EBFDF0",
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceAlt: "#F3F4F6",
  text: "#111111",
  textMuted: "#374151",
  textDim: "#6B7280",
  border: "#E5E7EB",
  borderDark: "#D1D5DB",
  danger: "#EF4444",
  warning: "#F59E0B",
  white: "#FFFFFF",
  black: "#111111",
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const radius = { sm: 4, md: 8, lg: 12, xl: 16, pill: 9999 };

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
};

export const typo = {
  h1: { fontSize: 32, fontWeight: "800" as const, color: colors.text, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: "700" as const, color: colors.text, letterSpacing: -0.3 },
  h3: { fontSize: 20, fontWeight: "700" as const, color: colors.text },
  body: { fontSize: 14, fontWeight: "400" as const, color: colors.textMuted, lineHeight: 20 },
  bodyLg: { fontSize: 16, fontWeight: "600" as const, color: colors.text },
  caption: { fontSize: 12, fontWeight: "500" as const, color: colors.textMuted, textTransform: "uppercase" as const, letterSpacing: 0.5 },
};

export const formatINR = (n: number): string => {
  if (!n || n <= 0) return "₹0";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(n % 10000000 === 0 ? 0 : 1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
};
