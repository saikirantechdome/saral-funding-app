/**
 * Circular progress ring matching the approved prototype's status rings
 * (`conic-gradient(#2E9385 0 X%, #E6EEEB 0)` with a solid white/dark inner
 * circle showing the percentage). Used on Home and Status. Shared across
 * the revamped ("proto") screens — see USER_SIDE_REVAMP_PLAN.md.
 */
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { protoColors } from "@/src/theme.proto";

interface ProtoRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  innerSize?: number;
  innerBg?: string;
  textColor?: string;
  trackColor?: string;
  fillColor?: string;
  fontSize?: number;
  label?: string;
}

export default function ProtoRing({
  percent,
  size = 67,
  strokeWidth = 7,
  innerSize,
  innerBg = "#FFFFFF",
  textColor = protoColors.text,
  trackColor = "#E6EEEB",
  fillColor = protoColors.accent,
  fontSize = 15,
  label,
}: ProtoRingProps) {
  const r = (size - strokeWidth) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const dashoffset = circumference * (1 - clamped / 100);
  const inner = innerSize ?? size - strokeWidth * 2 - 4;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFillObject}>
        <Circle cx={c} cy={c} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <Circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}
        />
      </Svg>
      <View style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: innerBg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize, fontWeight: "700", color: textColor }}>{Math.round(clamped)}%</Text>
        {!!label && <Text style={{ fontSize: 8, color: textColor, opacity: 0.7 }}>{label}</Text>}
      </View>
    </View>
  );
}
