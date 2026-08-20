import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { X, ChevronRight, Phone, MapPin, DollarSign, StickyNote, Briefcase } from "lucide-react-native";

import { colors, spacing, radius, fonts, formatINR, stageColor, tagColor } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import InitialsAvatar from "@/src/components/InitialsAvatar";
import { useTabBarSpacing } from "@/src/hooks/useTabBarSpacing";

const STAGES = ["all", "new", "contacted", "interested", "documentation", "submitted", "approved", "disbursed", "closed"];

function StagePill({ stage }: { stage: string }) {
  const { bg, text } = stageColor(stage);
  return (
    <View style={[pillStyles.wrap, { backgroundColor: bg }]}>
      <Text style={[pillStyles.text, { color: text }]}>{stage}</Text>
    </View>
  );
}
const pillStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, alignSelf: "flex-start" },
  text: { fontSize: 10, fontFamily: fonts.bold, textTransform: "capitalize", letterSpacing: 0.3 },
});

export default function AdminLeads() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarSpacing = useTabBarSpacing();
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [notes, setNotes] = useState("");

  const openDetail = (lead: any) => {
    router.push(`/admin/lead/${lead.id}` as any);
  };

  const load = async (st: string) => {
    setLoading(true);
    try {
      const data = await apiGet<any[]>(`/admin/leads${st !== "all" ? `?stage=${st}` : ""}`);
      setItems(data);
    } catch (e) {
      Alert.alert("Error", "Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filter); }, [filter]);

  const openEdit = (lead: any) => {
    setEditing(lead);
    setNotes(lead.notes || "");
  };

  const moveStage = async (lid: string, stage: string) => {
    await apiPost(`/admin/leads/${lid}`, { stage, notes });
    setEditing(null);
    load(filter);
  };

  const saveNotes = async () => {
    if (!editing) return;
    await apiPost(`/admin/leads/${editing.id}`, { stage: editing.stage, notes });
    setEditing(null);
    load(filter);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top"]} testID="admin-leads">
      <BackBar
        title="CRM / Leads"
        onBack={() => router.back()}
      />

      {/* Stage filter chips */}
      <View style={{ position: "relative" }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingVertical: 8, paddingHorizontal: spacing.md }}
          style={{ flexGrow: 0 }}
        >
          {STAGES.map((s) => {
            const active = filter === s;
            const { bg, text } = s !== "all" ? stageColor(s) : { bg: colors.surfaceAlt, text: colors.textMuted };
            const isAllActive = s === "all" && active;
            return (
              <TouchableOpacity
                key={s}
                testID={`stage-filter-${s}`}
                style={[
                  styles.filterChip,
                  { backgroundColor: isAllActive ? colors.primary : bg },
                  active && { borderWidth: 1.5, borderColor: isAllActive ? colors.primary : text },
                ]}
                onPress={() => setFilter(s)}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: isAllActive ? "#FFF" : text },
                  active && { fontFamily: fonts.bold },
                ]}>
                  {s}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(240,246,246,0)", colors.surface2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.filterFade}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          style={{ flex: 1, marginBottom: tabBarSpacing }}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 4 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No leads in "{filter}" stage</Text>
            </View>
          }
          renderItem={({ item }) => {
            const accent = stageColor(item.stage);
            return (
            <TouchableOpacity
              testID={`lead-${item.id}`}
              style={[styles.card, { borderLeftWidth: 4, borderLeftColor: accent.text }]}
              onPress={() => openDetail(item)}
              onLongPress={() => openEdit(item)}
              activeOpacity={0.85}
            >
              {/* Header */}
              <View style={styles.cardHeader}>
                <InitialsAvatar name={item.full_name || "Unknown"} size={34} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.leadName} numberOfLines={1}>{item.full_name || "Unknown"}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Phone size={10} color={colors.textDim} strokeWidth={2} />
                    <Text style={styles.leadMobile}>+91 {item.mobile || "—"}</Text>
                  </View>
                </View>
                <StagePill stage={item.stage} />
              </View>

              {/* Details */}
              <View style={styles.detailsRow}>
                {item.state && (
                  <View style={styles.metaItem}>
                    <MapPin size={11} color={colors.textDim} strokeWidth={2} />
                    <Text style={styles.metaText}>{item.state}</Text>
                  </View>
                )}
                {item.funding_required > 0 && (
                  <View style={styles.metaItem}>
                    <DollarSign size={11} color={colors.textDim} strokeWidth={2} />
                    <Text style={styles.metaText}>{formatINR(item.funding_required)}</Text>
                  </View>
                )}
                {item.consultation_type && (() => {
                  const tag = tagColor(item.consultation_type);
                  return (
                    <View style={[styles.tagItem, { backgroundColor: tag.bg }]}>
                      <Briefcase size={11} color={tag.text} strokeWidth={2} />
                      <Text style={[styles.tagText, { color: tag.text }]}>{item.consultation_type}</Text>
                    </View>
                  );
                })()}
              </View>

              {/* Notes preview */}
              {item.notes && (
                <View style={styles.notesPreview}>
                  <StickyNote size={11} color={colors.textDim} strokeWidth={2} />
                  <Text style={styles.notesText} numberOfLines={1}>{item.notes}</Text>
                </View>
              )}

              <ChevronRight size={14} color={colors.textDim} strokeWidth={2} style={{ position: "absolute", right: 14, top: 20 }} />
            </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Edit modal */}
      <Modal
        visible={!!editing}
        transparent
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        <View style={styles.modalBg}>
          <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>{editing?.full_name || "Lead"}</Text>
                <Text style={styles.sheetMeta}>Current: <Text style={{ fontFamily: fonts.bold, color: colors.text }}>{editing?.stage}</Text></Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setEditing(null)}
                testID="lead-cancel"
              >
                <X size={16} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Notes input */}
            <Text style={styles.notesLabel}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes about this lead…"
              placeholderTextColor={colors.textPlaceholder}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.stagesLabel}>Move to Stage</Text>
            <View style={styles.stagesGrid}>
              {STAGES.filter((s) => s !== "all").map((s) => {
                const { bg, text: textColor } = stageColor(s);
                const isActive = editing?.stage === s;
                return (
                  <TouchableOpacity
                    key={s}
                    testID={`move-${s}`}
                    style={[styles.stageChip, { backgroundColor: isActive ? bg : "#FFF", borderColor: isActive ? textColor : colors.border }]}
                    onPress={() => moveStage(editing!.id, s)}
                  >
                    <Text style={[styles.stageChipText, { color: isActive ? textColor : colors.textMuted }]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={saveNotes}>
              <Text style={styles.saveBtnText}>Save Notes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  filterFade: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 28,
  },
  filterChip: {
    paddingHorizontal: 12,
    height: 30,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: "transparent",
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    textTransform: "capitalize",
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    paddingRight: 36,
    marginBottom: 8,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  leadName: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    lineHeight: 19,
  },
  leadMobile: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textDim,
  },
  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  tagItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  tagText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
  },
  metaText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  notesPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  notesText: {
    flex: 1,
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textDim,
    fontStyle: "italic",
  },
  emptyWrap: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 14, fontFamily: fonts.regular, color: colors.textMuted },

  // Modal
  modalBg: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  sheetTitle: { fontSize: 18, fontFamily: fonts.displayBold, color: colors.text },
  sheetMeta: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 3 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  notesLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 12,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
    backgroundColor: colors.surface2,
  },
  stagesLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  stagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  stageChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  stageChipText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    textTransform: "capitalize",
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 13,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
    color: "#FFF",
  },
});
