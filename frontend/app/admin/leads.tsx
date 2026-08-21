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
import { X, ChevronRight, Phone, MapPin, DollarSign, StickyNote, Briefcase, Calendar } from "lucide-react-native";

import { colors, spacing, radius, fonts, tints, formatINR, stageColor, tagColor, formatMobile, shortRef } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import InitialsAvatar from "@/src/components/InitialsAvatar";
import { useTabBarSpacing } from "@/src/hooks/useTabBarSpacing";

// Full raw CRM stages — still used for the long-press "Move to Stage" editor,
// which keeps its fine-grained control even though the list's own filter
// chips above now show the coarser buckets below.
const STAGES = ["all", "new", "contacted", "interested", "documentation", "submitted", "approved", "disbursed", "closed"];

// Coarse filter chips shown at the top of the list — buckets the raw CRM
// stages into the 4 groups used across the admin app (same convention as
// `appBucket` in app/my-applications.tsx): rejected -> Rejected,
// approved/disbursed -> Approved, everything else -> In Progress, except the
// lead's own "new" stage gets its own bucket.
const FILTER_TABS = ["All", "New", "In Progress", "Approved", "Rejected"] as const;
type FilterTab = typeof FILTER_TABS[number];

function leadBucket(stage: string): Exclude<FilterTab, "All"> {
  if (stage === "new") return "New";
  if (stage === "rejected") return "Rejected";
  if (stage === "approved" || stage === "disbursed") return "Approved";
  return "In Progress";
}

const BUCKET_STYLE: Record<Exclude<FilterTab, "All">, { bg: string; text: string }> = {
  New: stageColor("new"),
  "In Progress": { bg: tints.blue.bg, text: tints.blue.fg },
  Approved: stageColor("approved"),
  Rejected: { bg: tints.red.bg, text: tints.red.fg },
};

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
  const [filter, setFilter] = useState<FilterTab>("All");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [notes, setNotes] = useState("");

  const openDetail = (lead: any) => {
    router.push(`/admin/lead/${lead.id}` as any);
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiGet<any[]>("/admin/leads");
      setItems(data);
    } catch (e) {
      Alert.alert("Error", "Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredItems = filter === "All" ? items : items.filter((i) => leadBucket(i.stage) === filter);

  const openEdit = (lead: any) => {
    setEditing(lead);
    setNotes(lead.notes || "");
  };

  const moveStage = async (lid: string, stage: string) => {
    await apiPost(`/admin/leads/${lid}`, { stage, notes });
    setEditing(null);
    load();
  };

  const saveNotes = async () => {
    if (!editing) return;
    await apiPost(`/admin/leads/${editing.id}`, { stage: editing.stage, notes });
    setEditing(null);
    load();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top"]} testID="admin-leads">
      <BackBar
        title="Applications"
        onBack={() => router.back()}
      />

      {/* Bucketed filter chips */}
      <View style={{ position: "relative" }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingVertical: 8, paddingHorizontal: spacing.md }}
            style={{ flexGrow: 0 }}
          >
            {FILTER_TABS.map((tab) => {
              const active = filter === tab;
              const { bg, text } = tab !== "All" ? BUCKET_STYLE[tab] : { bg: colors.surfaceAlt, text: colors.textMuted };
              const isAllActive = tab === "All" && active;
              return (
                <TouchableOpacity
                  key={tab}
                  testID={`stage-filter-${tab.toLowerCase().replace(/\s+/g, "-")}`}
                  style={[
                    styles.filterChip,
                    { backgroundColor: isAllActive ? colors.primary : bg },
                    active && { borderWidth: 1.5, borderColor: isAllActive ? colors.primary : text },
                  ]}
                  onPress={() => setFilter(tab)}
                >
                  <Text style={[
                    styles.filterChipText,
                    { color: isAllActive ? "#FFF" : text },
                    active && { fontFamily: fonts.bold },
                  ]}>
                    {tab}
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
          data={filteredItems}
          keyExtractor={(x) => x.id}
          style={{ flex: 1, marginBottom: tabBarSpacing }}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 4 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No applications in "{filter}"</Text>
            </View>
          }
          renderItem={({ item }) => {
            const accent = stageColor(item.stage);
            const tag = item.consultation_type ? tagColor(item.consultation_type) : null;
            const appliedOn = item.created_at
              ? new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
              : null;
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
                    <Text style={styles.leadMobile}>{formatMobile(item.mobile)}</Text>
                  </View>
                </View>
                <StagePill stage={item.stage} />
              </View>

              {/* Details */}
              <View style={styles.detailsRow}>
                {tag && (
                  <View style={[styles.tagItem, { backgroundColor: tag.bg }]}>
                    <Briefcase size={11} color={tag.text} strokeWidth={2} />
                    <Text style={[styles.tagText, { color: tag.text }]}>{item.consultation_type}</Text>
                  </View>
                )}
                {item.funding_required > 0 && (
                  <View style={[styles.metaItem, styles.amountChip]}>
                    <DollarSign size={11} color={colors.primaryDark} strokeWidth={2.4} />
                    <Text style={styles.amountText}>{formatINR(item.funding_required)}</Text>
                  </View>
                )}
                {item.state && (
                  <View style={styles.metaItem}>
                    <MapPin size={11} color={colors.textDim} strokeWidth={2} />
                    <Text style={styles.metaText}>{item.state}</Text>
                  </View>
                )}
              </View>

              {/* Notes preview */}
              {item.notes && (
                <View style={styles.notesPreview}>
                  <StickyNote size={11} color={colors.textDim} strokeWidth={2} />
                  <Text style={styles.notesText} numberOfLines={1}>{item.notes}</Text>
                </View>
              )}

              {/* Footer */}
              <View style={styles.footerRow}>
                <View style={styles.footerDateGroup}>
                  <Calendar size={10} color={colors.textDim} strokeWidth={2} />
                  <Text style={styles.footerText}>{appliedOn ? `Applied on ${appliedOn}` : "Applied date unavailable"}</Text>
                </View>
                <Text style={styles.footerCode}>#{shortRef(item.id)}</Text>
              </View>

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
  amountChip: {
    backgroundColor: colors.primarySoft,
  },
  amountText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
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
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerDateGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textDim,
  },
  footerCode: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
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
