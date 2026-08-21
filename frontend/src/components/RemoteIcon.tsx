import { useState } from "react";
import { Image } from "react-native";

// Icons8's "color" style CDN serves full-color flat icons by slug, no API key
// needed (https://img.icons8.com/color/{size}/{slug}.png — 404s as JSON if a
// slug doesn't exist). Always request one fixed size so every place in the
// app that shows the same slug shares one cached image, then let RN scale it
// down to fit via the size prop. Falls back to a monochrome lucide icon if
// the network request fails or the slug is wrong, so a bad slug never breaks
// the screen — it just looks like the old icon did before this component.
const REQUEST_SIZE = 128;

type LucideIcon = React.ComponentType<{ size: number; color: string; strokeWidth: number }>;

interface Props {
  slug: string;
  size?: number;
  fallback: LucideIcon;
  fallbackColor?: string;
}

export default function RemoteIcon({ slug, size = 28, fallback: Fallback, fallbackColor = "#8A9490" }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <Fallback size={size} color={fallbackColor} strokeWidth={1.8} />;
  }

  return (
    <Image
      source={{ uri: `https://img.icons8.com/color/${REQUEST_SIZE}/${slug}.png` }}
      style={{ width: size, height: size }}
      resizeMode="contain"
      onError={() => setFailed(true)}
    />
  );
}
