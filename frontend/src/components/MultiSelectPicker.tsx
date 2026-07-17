import { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput } from "react-native";
import { ChevronDown, Check, Search, X } from "lucide-react-native";
import { colors, spacing, radius, fonts } from "@/src/theme";

export interface OptionGroup {
  label: string;
  options: string[];
}

interface Props {
  label: string;
  selected: string[];
  onToggle: (value: string) => void;
  options?: string[];
  groups?: OptionGroup[];
  testID?: string;
  placeholder?: string;
}

export default function MultiSelectPicker({
  label, selected, onToggle, options, groups, testID, placeholder,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const allGroups: OptionGroup[] = groups ?? [{ label: "", options: options ?? [] }];

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allGroups;
    return allGroups
      .map((g) => ({ ...g, options: g.options.filter((o) => o.toLowerCase().includes(q)) }))
      .filter((g) => g.options.length > 0);
  }, [allGroups, query]);

  const summary = selected.length === 0
    ? (placeholder || `Select ${label}`)
    : selected.length <= 2
    ? selected.join(", ")
    : `${selected.slice(0, 2).join(", ")} +${selected.length - 2} more`;

  const close = () => { setOpen(false); setQuery(""); };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {selected.length > 0 && (
          <Text style={{ color: colors.primaryDark, fontFamily: fonts.bold }}> · {selected.length} selected</Text>
        )}
      </Text>
      <TouchableOpacity
        testID={testID}
        style={[styles.field, open && { borderColor: colors.primary, borderWidth: 1.5 }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={[styles.value, selected.length === 0 && styles.placeholder]} numberOfLines={1}>
          {summary}
        </Text>
        <ChevronDown size={16} color={open ? colors.primary : colors.textDim} strokeWidth={2} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={close}>
                <X size={20} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <Search size={14} color={colors.textDim} strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                placeholderTextColor={colors.textPlaceholder}
                value={query}
                onChangeText={setQuery}
              />
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {filteredGroups.length === 0 ? (
                <Text style={styles.emptyText}>No matches found</Text>
              ) : (
                filteredGroups.map((g) => (
                  <View key={g.label || "_flat"} style={{ marginBottom: 8 }}>
                    {!!g.label && <Text style={styles.groupLabel}>{g.label}</Text>}
                    {g.options.map((opt) => {
                      const isSel = selected.includes(opt);
                      return (
                        <TouchableOpacity
                          key={opt}
                          testID={`${testID}-opt-${opt}`}
                          style={[styles.opt, isSel && styles.optSelected]}
                          onPress={() => onToggle(opt)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.checkbox, isSel && styles.checkboxSelected]}>
                            {isSel && <Check size={12} color="#FFF" strokeWidth={3} />}
                          </View>
                          <Text style={[styles.optText, isSel && styles.optTextSelected]}>{opt}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity style={styles.doneBtn} onPress={close} activeOpacity={0.85}>
              <Text style={styles.doneBtnText}>Done{selected.length > 0 ? ` (${selected.length} selected)` : ""}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  label: {
    fontSize: 11, fontFamily: fonts.bold, color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6,
  },
  field: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.xl,
    paddingHorizontal: 14, paddingVertical: 12,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#FFF", minHeight: 46,
  },
  value: { fontSize: 13, fontFamily: fonts.regular, color: colors.text, flex: 1, marginRight: 8 },
  placeholder: { color: colors.textPlaceholder },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingHorizontal: spacing.lg, paddingBottom: 24, maxHeight: "82%",
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 14 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 17, fontFamily: fonts.displayBold, color: colors.text },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.surface2, borderRadius: radius.xl,
    paddingHorizontal: 12, paddingVertical: 9, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 13, fontFamily: fonts.regular, color: colors.text, padding: 0 },
  groupLabel: {
    fontSize: 11, fontFamily: fonts.bold, color: colors.primaryDark,
    textTransform: "uppercase", letterSpacing: 0.4,
    marginTop: 8, marginBottom: 4,
  },
  opt: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 9, paddingHorizontal: 6, borderRadius: radius.lg,
  },
  optSelected: { backgroundColor: colors.primarySoft },
  checkbox: {
    width: 18, height: 18, borderRadius: 5, borderWidth: 1.5,
    borderColor: colors.border, alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optText: { fontSize: 13, fontFamily: fonts.regular, color: colors.text, flex: 1 },
  optTextSelected: { fontFamily: fonts.semiBold, color: colors.primaryDark },
  emptyText: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, textAlign: "center", paddingVertical: 20 },
  doneBtn: { backgroundColor: colors.primary, borderRadius: radius.xl, paddingVertical: 13, alignItems: "center", marginTop: 8 },
  doneBtnText: { fontSize: 14, fontFamily: fonts.displayBold, color: "#FFF" },
});
