/**
 * Icon component backed by free PNGs from Flaticon (flaticon.com) — used
 * throughout the revamped ("proto") user-side screens per explicit
 * direction to use Flaticon icons rather than an SVG icon library. Each
 * name maps to a downloaded asset in assets/icons/; Metro requires
 * `require()` calls to be static string literals, so this map (not a
 * dynamic path) is how every icon gets registered.
 *
 * Recolored via RN's `tintColor` (Image style) — every source PNG is a
 * single solid color on a transparent background, same technique other
 * icon-font libraries use under the hood.
 *
 * Attribution: Flaticon's free-tier license requires attribution unless a
 * Premium plan is used. See ICON_CREDITS below — surfaced in-app wherever
 * a credits/about screen exists. See USER_SIDE_REVAMP_PLAN.md.
 */
import { Image, ImageStyle, StyleProp } from "react-native";

const ICONS = {
  "phone-call": require("../../assets/icons/phone-call.png"),
  document: require("../../assets/icons/document.png"),
  bank: require("../../assets/icons/bank.png"),
  "file-check": require("../../assets/icons/file-check.png"),
  review: require("../../assets/icons/review.png"),
  checkmark: require("../../assets/icons/checkmark.png"),
  money: require("../../assets/icons/money.png"),
  "id-card": require("../../assets/icons/id-card.png"),
  certificate: require("../../assets/icons/certificate.png"),
  home: require("../../assets/icons/home.png"),
  receipt: require("../../assets/icons/receipt.png"),
  user: require("../../assets/icons/user.png"),
  briefcase: require("../../assets/icons/briefcase.png"),
  bell: require("../../assets/icons/bell.png"),
  chat: require("../../assets/icons/chat.png"),
  logout: require("../../assets/icons/logout.png"),
  folder: require("../../assets/icons/folder.png"),
  warning: require("../../assets/icons/warning.png"),
  "left-arrow": require("../../assets/icons/left-arrow.png"),
  "chevron-right": require("../../assets/icons/chevron-right.png"),
  plus: require("../../assets/icons/plus.png"),
  close: require("../../assets/icons/close.png"),
  send: require("../../assets/icons/send.png"),
  "external-link": require("../../assets/icons/external-link.png"),
  whatsapp: require("../../assets/icons/whatsapp.png"),
  pencil: require("../../assets/icons/pencil.png"),
  activity: require("../../assets/icons/activity.png"),
} as const;

export type FlatIconName = keyof typeof ICONS;

// Icons whose source PNG is already the right color (brand marks like
// WhatsApp's green) — tinting these would wreck them, so `color` is
// ignored for anything in this set.
const NO_TINT = new Set<FlatIconName>(["whatsapp"]);

interface FlatIconProps {
  name: FlatIconName;
  size?: number;
  color?: string;
  style?: StyleProp<ImageStyle>;
}

export default function FlatIcon({ name, size = 20, color, style }: FlatIconProps) {
  const tintColor = NO_TINT.has(name) ? undefined : color;
  return (
    <Image
      source={ICONS[name]}
      style={[{ width: size, height: size, tintColor }, style]}
      resizeMode="contain"
    />
  );
}

// Credit line for wherever this app surfaces licenses/attribution (e.g. a
// Settings > About screen) — Flaticon's free tier requires this absent a
// Premium subscription. Not yet wired into a screen; flagging here so it
// isn't lost.
export const ICON_CREDITS = "Icons by Flaticon (flaticon.com)";
