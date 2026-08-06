import { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, SectionList, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronDown, Check, Search } from "lucide-react-native";
import { colors, spacing, radius, fonts } from "@/src/theme";

export interface PickerGroup {
  label: string;
  options: string[];
}

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options?: string[];
  groups?: PickerGroup[];
  testID?: string;
  placeholder?: string;
  error?: string;
  disabledOptions?: string[];
  optionBadge?: (option: string) => string | undefined;
  searchable?: boolean;
}

export default function Picker({
  label, value, onChange, options, groups, testID, placeholder, error,
  disabledOptions, optionBadge, searchable,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const insets = useSafeAreaInsets();

  const borderColor = error ? colors.danger : open ? colors.primary : colors.border;
  const bgColor = error ? colors.dangerSoft : open ? "#FFF" : colors.surface2;

  const allGroups: PickerGroup[] = groups ?? [{ label: "", options: options ?? [] }];
  const totalCount = allGroups.reduce((n, g) => n + g.options.length, 0);
  const showSearch = searchable ?? totalCount > 8;

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allGroups
      .map((g) => ({
        title: g.label,
        data: q ? g.options.filter((o) => o.toLowerCase().includes(q)) : g.options,
      }))
      .filter((g) => g.data.length > 0);
  }, [allGroups, query]);

  const close = () => { setOpen(false); setQuery(""); };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        testID={testID}
        style={[
          styles.field,
          {
            borderColor,
            backgroundColor: bgColor,
            borderWidth: open ? 1.5 : 1,
          },
        ]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
          {value || placeholder || `Select ${label}`}
        </Text>
        <ChevronDown
          size={16}
          color={open ? colors.primary : colors.textDim}
          strokeWidth={2}
        />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close}>
          <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{label}</Text>

            {showSearch && (
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
            )}

            <SectionList
              sections={sections}
              keyExtractor={(item, i) => `${item}-${i}`}
              showsVerticalScrollIndicator={false}
              stickySectionHeadersEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              ListEmptyComponent={<Text style={styles.emptyText}>No matches found</Text>}
              renderSectionHeader={({ section }) =>
                section.title ? <Text style={styles.groupLabel}>{section.title}</Text> : null
              }
              renderItem={({ item }) => {
                const selected = item === value;
                const isDisabled = !!disabledOptions?.includes(item);
                const badge = optionBadge?.(item);
                return (
                  <TouchableOpacity
                    testID={`${testID}-opt-${item}`}
                    style={[styles.opt, selected && styles.optSelected, isDisabled && styles.optDisabled]}
                    onPress={() => { if (isDisabled) return; onChange(item); close(); }}
                    activeOpacity={isDisabled ? 1 : 0.7}
                  >
                    <Text style={[styles.optText, selected && styles.optTextSelected, isDisabled && styles.optTextDisabled]}>
                      {item}
                    </Text>
                    {badge && (
                      <View style={styles.optBadge}>
                        <Text style={styles.optBadgeText}>{badge}</Text>
                      </View>
                    )}
                    {selected && (
                      <Check size={15} color={colors.primaryDark} strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 7,
  },
  field: {
    borderRadius: radius.xl,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 50,
  },
  value: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  placeholder: {
    color: colors.textPlaceholder,
  },
  errorText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.danger,
    marginTop: 5,
    marginLeft: 4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontFamily: fonts.displayBold,
    color: colors.text,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface2,
    borderRadius: radius.xl,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.text,
    padding: 0,
  },
  groupLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  opt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optSelected: {
    backgroundColor: colors.primarySoft,
  },
  optText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    flex: 1,
  },
  optTextSelected: {
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
  },
  optDisabled: {
    opacity: 0.5,
  },
  optTextDisabled: {
    color: colors.textDim,
  },
  optBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  optBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: 24,
  },
  sep: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
});
