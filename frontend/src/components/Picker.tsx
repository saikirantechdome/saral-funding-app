import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from "react-native";
import { colors, spacing, radius } from "@/src/theme";

interface Props {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  testID?: string;
  placeholder?: string;
}

export default function Picker({ label, value, options, onChange, testID, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity testID={testID} style={styles.field} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={[styles.value, !value && styles.placeholder]}>{value || placeholder || "Select"}</Text>
        <Text style={styles.chev}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(x) => x}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              renderItem={({ item }) => (
                <TouchableOpacity
                  testID={`${testID}-opt-${item}`}
                  style={styles.opt}
                  onPress={() => { onChange(item); setOpen(false); }}
                >
                  <Text style={[styles.optText, item === value && { color: colors.primaryDark, fontWeight: "700" }]}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "600", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  field: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 48 },
  value: { fontSize: 16, color: colors.text },
  placeholder: { color: "#9CA3AF" },
  chev: { fontSize: 14, color: colors.textMuted },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#FFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingBottom: 32, maxHeight: "70%" },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: colors.text, paddingHorizontal: 20, paddingBottom: 12 },
  opt: { paddingVertical: 14, paddingHorizontal: 20 },
  optText: { fontSize: 16, color: colors.text },
  sep: { height: 1, backgroundColor: colors.border, marginHorizontal: 20 },
});
