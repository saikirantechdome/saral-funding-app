import { useState } from "react";
import { Image } from "react-native";

// Icons8's icon-style CDN serves icons by slug, no API key needed
// (https://img.icons8.com/{style}/{size}/{slug}.png — 404s as JSON if a
// slug doesn't exist). "color" (flat) is the default used everywhere in the
// app; "3d-fluency" (glossy 3D renders) is used for a couple of hero/decor
// spots. Always request one fixed size per style so the same slug shares one
// cached image, then let RN scale it down via the size prop. Falls back to a
// monochrome lucide icon if the network request fails or the slug is wrong,
// so a bad slug never breaks the screen — it just looks like the old icon
// did before this component.
const REQUEST_SIZE = 128;
const REQUEST_SIZE_3D = 192;

type LucideIcon = React.ComponentType<{ size: number; color: string; strokeWidth: number }>;

interface Props {
  slug: string;
  size?: number;
  fallback: LucideIcon;
  fallbackColor?: string;
  /** Icons8 style — "color" (default, flat) or "3d-fluency" (glossy 3D). */
  style?: "color" | "3d-fluency";
}

export default function RemoteIcon({ slug, size = 28, fallback: Fallback, fallbackColor = "#8A9490", style = "color" }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <Fallback size={size} color={fallbackColor} strokeWidth={1.8} />;
  }

  const requestSize = style === "3d-fluency" ? REQUEST_SIZE_3D : REQUEST_SIZE;

  return (
    <Image
      source={{ uri: `https://img.icons8.com/${style}/${requestSize}/${slug}.png` }}
      style={{ width: size, height: size }}
      resizeMode="contain"
      onError={() => setFailed(true)}
    />
  );
}
