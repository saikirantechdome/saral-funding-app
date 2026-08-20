import { useMemo } from "react";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import { createAvatar } from "@dicebear/core";
import * as avataaars from "@dicebear/avataaars";

// On-brand background tints the illustrated bust sits on — cycled
// deterministically by seed, same idea as the app's stageColor families.
const BG_COLORS = ["E7F3F1", "DCEEE8", "FDF6E1", "FEECEC", "F0F6F6"];

interface Props {
  name: string;
  size?: number;
  testID?: string;
}

// Deterministic, offline illustrated-person avatar (DiceBear "avataaars") —
// a real-looking face/hair/clothing per name instead of flat text initials
// or an abstract pattern. Same name always renders the same character.
export default function InitialsAvatar({ name, size = 34, testID }: Props) {
  const svg = useMemo(() => {
    const avatar = createAvatar(avataaars, {
      seed: name || "user",
      backgroundColor: BG_COLORS,
    });
    return avatar.toString().replace(/<metadata[\s\S]*?<\/metadata>/, "");
  }, [name]);

  return (
    <View
      testID={testID}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
      }}
    >
      <SvgXml xml={svg} width={size} height={size} />
    </View>
  );
}
