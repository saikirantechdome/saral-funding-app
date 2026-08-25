/**
 * Labeled input matching the approved prototype's `.s-lb` + `.s-field.f`
 * pair (uppercase muted label, pill-ish field, solid teal border, white
 * background). Shared across the revamped ("proto") screens — see
 * USER_SIDE_REVAMP_PLAN.md.
 */
import { View, Text, TextInput, StyleSheet, TextInputProps } from "react-native";
import { protoColors, protoRadius, protoSize, protoSpacing, protoFonts } from "@/src/theme.proto";

interface ProtoFieldProps extends Pick<TextInputProps, "keyboardType" | "maxLength" | "placeholder" | "autoFocus"> {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  prefix?: string;
  testID?: string;
}

export default function ProtoField({ label, value, onChangeText, prefix, testID, ...inputProps }: ProtoFieldProps) {
  // The prototype's login field (Saral User Prototype.dc.html's isLogin
  // state) only has one look — white background, solid teal border — shown
  // unconditionally, not as an interactive "focused" state (its demo is
  // static and always renders class `.s-field.f`). ProtoField only has this
  // one caller today, so it always renders that look rather than toggling
  // border/bg on focus, which was reading as "no border at all" until typed.
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, styles.fieldActive]}>
        {!!prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          testID={testID}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={protoColors.textDim}
          {...inputProps}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: protoSpacing.xs },
  label: {
    fontSize: protoSize.label,
    fontFamily: protoFonts.regular,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: protoColors.textDim,
  },
  field: {
    height: protoSize.field,
    borderRadius: protoRadius.field,
    backgroundColor: protoColors.fieldBg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: protoSpacing.md,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  fieldActive: {
    backgroundColor: "#FFFFFF",
    borderColor: protoColors.accent,
  },
  prefix: {
    fontSize: 15,
    fontFamily: protoFonts.regular,
    color: protoColors.text,
    marginRight: protoSpacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: protoFonts.regular,
    color: protoColors.text,
    letterSpacing: 0.5,
    padding: 0,
  },
});
