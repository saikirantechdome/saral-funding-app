import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors, spacing } from "@/src/theme";

export default function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, i < step && styles.dotDone, i === step - 1 && styles.dotActive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6, marginBottom: spacing.lg },
  dot: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotDone: { backgroundColor: colors.primary },
  dotActive: { backgroundColor: colors.primaryDark },
});

export function BackBar({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View style={s.bar}>
      {onBack && <TouchableOpacity testID="back-btn" onPress={onBack}><Text style={s.back}>←</Text></TouchableOpacity>}
      <Text style={s.title} numberOfLines={1}>{title}</Text>
      <View style={{ width: 28 }} />
    </View>
  );
}
const s = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: "#FFF" },
  back: { fontSize: 22, color: colors.text, width: 28 },
  title: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.text, textAlign: "center" },
});
