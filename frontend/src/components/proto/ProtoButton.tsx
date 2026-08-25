/**
 * Primary CTA button matching the approved prototype's `.s-btn` (solid teal,
 * height 44/radius 15 scaled) and `.s-btn.a` (amber, for action states like
 * "Re-upload"). Shared across the revamped ("proto") screens — see
 * USER_SIDE_REVAMP_PLAN.md.
 */
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { protoColors, protoRadius, protoSize, protoFonts } from "@/src/theme.proto";

interface ProtoButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "amber" | "outline";
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}

export default function ProtoButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  testID,
}: ProtoButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.82}
      style={[
        styles.base,
        variant === "primary" && { backgroundColor: protoColors.primary },
        variant === "amber" && { backgroundColor: protoColors.amber },
        variant === "outline" && styles.outline,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" ? protoColors.primary : "#FFF"} size="small" />
      ) : (
        <Text
          style={[
            styles.label,
            variant === "outline" ? { color: protoColors.primary } : { color: variant === "amber" ? "#3A2703" : "#FFFFFF" },
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: protoSize.btn,
    borderRadius: protoRadius.btn,
    alignItems: "center",
    justifyContent: "center",
  },
  outline: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: protoColors.border,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 15,
    // Armata (the prototype's actual typeface) has only one weight — its
    // own letterforms are what give button text a heavier look, not a
    // synthetic bold.
    fontFamily: protoFonts.regular,
  },
});
