import { useId, useMemo } from "react";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import { createAvatar } from "@dicebear/core";
import * as micah from "@dicebear/micah";
import * as personas from "@dicebear/personas";

// DiceBear's generated SVGs use fixed internal ids for masks/gradients
// (e.g. "viewboxMask") regardless of seed. On web, react-native-svg renders
// real DOM <svg> elements, so two avatars on screen at once — any list —
// end up with duplicate ids; the browser resolves each mask/url(#id)
// reference to only one of them, leaving every other avatar blank. Suffix
// every id (and its references) with a value unique to this component
// instance so the same avatar can render any number of times on one screen.
function makeIdsUnique(svg: string, uid: string): string {
  const ids = new Set<string>();
  const idRegex = /\sid="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = idRegex.exec(svg))) ids.add(m[1]);

  let out = svg;
  for (const id of ids) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const suffixed = `${id}-${uid}`;
    out = out
      .replace(new RegExp(`id="${escaped}"`, "g"), `id="${suffixed}"`)
      .replace(new RegExp(`url\\(#${escaped}\\)`, "g"), `url(#${suffixed})`)
      .replace(new RegExp(`href="#${escaped}"`, "g"), `href="#${suffixed}"`);
  }
  return out;
}

// A wide, vibrant pastel spread for regular users — deliberately broader
// than the site's narrow brand palette (same exception already applied to
// CRM stage colors) since these exist purely to make each person's avatar
// feel distinct and lively, not to carry brand meaning.
const USER_BG_COLORS = [
  "E7F3F1", "DCEEE8", "FDF6E1", "FEECEC",
  "F0EFFC", "EAF4FB", "FDF0E3", "EFF3EA",
];

// A tighter, brand-anchored teal+gold spread for admin/staff — deliberately
// narrower and more "official" than the customer palette above, so a staff
// member's avatar reads as part of the Saral Funding team at a glance.
const STAFF_BG_COLORS = ["E7F3F1", "DCEEE8", "F0F6F6", "FDF6E1"];

interface Props {
  name: string;
  size?: number;
  testID?: string;
  /** "staff" for admin/super_admin/team members, "user" (default) for everyone else. */
  variant?: "user" | "staff";
}

// Deterministic, offline illustrated-person avatar — a colorful, stylized
// face/hair/clothing per name instead of flat text initials or an abstract
// pattern. Same name always renders the same character. Regular users get
// DiceBear "micah" (lively, varied); admin/staff get "personas" (a visually
// distinct, more formal style) so the two are never confused at a glance.
export default function InitialsAvatar({ name, size = 34, testID, variant = "user" }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const svg = useMemo(() => {
    const seed = name || "user";
    const avatar = variant === "staff"
      ? createAvatar(personas, { seed, backgroundColor: STAFF_BG_COLORS })
      : createAvatar(micah, { seed, backgroundColor: USER_BG_COLORS });
    const raw = avatar.toString().replace(/<metadata[\s\S]*?<\/metadata>/, "");
    return makeIdsUnique(raw, uid);
  }, [name, variant, uid]);

  return (
    <View
      testID={testID}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        // Fallback swatch so a failed/slow SVG render (bad seed, cache hiccup)
        // never shows as a see-through hole against a dark header background —
        // the avatar's own opaque background rect paints over this once it loads.
        backgroundColor: variant === "staff" ? "#DCEEE8" : "#E7F3F1",
      }}
    >
      <SvgXml xml={svg} width={size} height={size} />
    </View>
  );
}
