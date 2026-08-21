import { useState } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { fonts } from "@/src/theme";

interface BrandStyle {
  bg: string;
  fg: string;
  initials: string;
}

// Real, well-known brand colors for major Indian banks — used for the
// monogram fallback below when no real logo is available (or fails to
// load). Matched by substring on the bank's full name.
const KNOWN_BANKS: { match: string; bg: string; fg: string; initials: string }[] = [
  { match: "state bank of india", bg: "#1B3A6B", fg: "#FFFFFF", initials: "SBI" },
  { match: "hdfc",                bg: "#004C8F", fg: "#FFFFFF", initials: "HDFC" },
  { match: "icici",                bg: "#B02A30", fg: "#FFFFFF", initials: "ICICI" },
  { match: "axis",                bg: "#97144D", fg: "#FFFFFF", initials: "AXIS" },
  { match: "bank of baroda",      bg: "#F58220", fg: "#FFFFFF", initials: "BoB" },
  { match: "punjab national",     bg: "#8B1C3F", fg: "#FFD700", initials: "PNB" },
  { match: "canara",              bg: "#003D82", fg: "#FFD700", initials: "CNB" },
  { match: "union bank",          bg: "#6A2C91", fg: "#FFFFFF", initials: "UBI" },
  { match: "kotak",               bg: "#ED232A", fg: "#FFFFFF", initials: "K" },
  { match: "yes bank",            bg: "#0033A0", fg: "#FFFFFF", initials: "YES" },
  { match: "indusind",            bg: "#A6192E", fg: "#FFFFFF", initials: "IB" },
  { match: "idbi",                bg: "#E4572E", fg: "#FFFFFF", initials: "IDBI" },
  { match: "bank of india",       bg: "#F26522", fg: "#FFFFFF", initials: "BOI" },
  { match: "indian bank",         bg: "#C8102E", fg: "#FFFFFF", initials: "IB" },
  { match: "indian overseas",     bg: "#0072BC", fg: "#FFFFFF", initials: "IOB" },
  { match: "central bank",        bg: "#004B87", fg: "#FFFFFF", initials: "CBI" },
  { match: "uco bank",            bg: "#003DA5", fg: "#FFD700", initials: "UCO" },
  { match: "federal bank",        bg: "#004C3F", fg: "#FFD700", initials: "FED" },
  { match: "south indian bank",   bg: "#00594C", fg: "#FFFFFF", initials: "SIB" },
  { match: "karnataka bank",      bg: "#003C71", fg: "#FFFFFF", initials: "KTB" },
  { match: "bandhan",             bg: "#8A1538", fg: "#FFFFFF", initials: "BB" },
  { match: "ujjivan",             bg: "#00A651", fg: "#FFFFFF", initials: "UJ" },
  { match: "au small",            bg: "#E31E24", fg: "#FFFFFF", initials: "AU" },
  { match: "sidbi",               bg: "#0B5E3B", fg: "#FFFFFF", initials: "SIDBI" },
  { match: "nabard",              bg: "#1B5E20", fg: "#FFFFFF", initials: "NABARD" },
  { match: "bajaj",               bg: "#005DA8", fg: "#FFFFFF", initials: "BFS" },
  { match: "tata capital",        bg: "#1B1B4E", fg: "#FFFFFF", initials: "TC" },
];

// Real logo images sourced from Wikimedia Commons (public-domain or
// CC-licensed uploads — see the "Bank logos" credit on the Legal screen for
// attribution). Matched the same way as KNOWN_BANKS above; any bank not
// listed here (no suitable logo file exists on Commons) falls back to the
// colored monogram. If a URL ever fails to load (network, moved file), the
// monogram fallback kicks in automatically too.
const REAL_LOGOS: { match: string; url: string }[] = [
  { match: "state bank of india", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/State_Bank_of_India.svg/330px-State_Bank_of_India.svg.png" },
  { match: "bank of baroda",      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Bank_of_Baroda_Logo_since_Dec_19.png/330px-Bank_of_Baroda_Logo_since_Dec_19.png" },
  { match: "canara",              url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Canara_Bank_Logo.svg/330px-Canara_Bank_Logo.svg.png" },
  { match: "punjab national",     url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Punjab_National_Bank_new_logo.svg/330px-Punjab_National_Bank_new_logo.svg.png" },
  { match: "union bank",          url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Union_Bank_of_India_Logo.svg/330px-Union_Bank_of_India_Logo.svg.png" },
  { match: "hdfc",                url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/HDFC_Bank_Logo.svg/330px-HDFC_Bank_Logo.svg.png" },
  { match: "icici",                url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/ICICI_Bank_Logo.svg/330px-ICICI_Bank_Logo.svg.png" },
  { match: "axis",                url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Axis_Bank_logo.svg/330px-Axis_Bank_logo.svg.png" },
  { match: "idfc",                url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Logo_of_IDFC_First_Bank.svg/330px-Logo_of_IDFC_First_Bank.svg.png" },
  { match: "yes bank",            url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Yes_Bank_SVG_Logo.svg/330px-Yes_Bank_SVG_Logo.svg.png" },
  { match: "sidbi",               url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/SIDBI_LOGO.png/330px-SIDBI_LOGO.png" },
  { match: "ujjivan",             url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Ujjivan%27s_new_logo.jpg/330px-Ujjivan%27s_new_logo.jpg" },
  { match: "bajaj",               url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Bajaj_Finserv_Logo.svg/330px-Bajaj_Finserv_Logo.svg.png" },
  { match: "tata capital",        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Tata_Capital_Logo-01.jpg/330px-Tata_Capital_Logo-01.jpg" },
];

// Deterministic fallback palette for any bank not in the curated list above,
// so a new/unrecognized bank still gets a distinct, consistent badge instead
// of a flat generic gray — same "same seed → same result" idea as InitialsAvatar.
const FALLBACK_PALETTE = [
  { bg: "#2A5C8A", fg: "#FFFFFF" },
  { bg: "#6B4C9A", fg: "#FFFFFF" },
  { bg: "#B0562E", fg: "#FFFFFF" },
  { bg: "#2E7D5B", fg: "#FFFFFF" },
  { bg: "#A13D5C", fg: "#FFFFFF" },
  { bg: "#3D6B6B", fg: "#FFFFFF" },
];

function initialsFromName(name: string): string {
  const words = name.replace(/\bbank\b/i, "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join("").toUpperCase();
}

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function bankBrandStyle(name: string, shortName?: string): BrandStyle {
  const t = (name || "").toLowerCase();
  const known = KNOWN_BANKS.find((b) => t.includes(b.match));
  if (known) return known;
  const seed = name || "bank";
  const palette = FALLBACK_PALETTE[hashString(seed) % FALLBACK_PALETTE.length];
  return { ...palette, initials: shortName?.trim() || initialsFromName(name) };
}

function realLogoUrl(name: string): string | null {
  const t = (name || "").toLowerCase();
  return REAL_LOGOS.find((b) => t.includes(b.match))?.url ?? null;
}

interface Props {
  name: string;
  shortName?: string;
  size?: number;
}

export default function BankBadge({ name, shortName, size = 40 }: Props) {
  const logoUrl = realLogoUrl(name);
  const [failed, setFailed] = useState(false);

  if (logoUrl && !failed) {
    return (
      <View style={[s.wrap, s.logoWrap, { width: size, height: size, borderRadius: size * 0.28 }]}>
        <Image
          source={{ uri: logoUrl }}
          style={{ width: size * 0.72, height: size * 0.72 }}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      </View>
    );
  }

  const { bg, fg, initials } = bankBrandStyle(name, shortName);
  const fontSize = initials.length > 3 ? size * 0.26 : size * 0.34;

  return (
    <View style={[s.wrap, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: bg }]}>
      <Text style={[s.text, { color: fg, fontSize }]} numberOfLines={1}>
        {initials}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  logoWrap: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EDEDED",
  },
  text: {
    fontFamily: fonts.bold,
    letterSpacing: -0.2,
  },
});
