import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, ScrollView, Modal, TextInput, Alert, Linking, Share,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  X, Calendar, Clock, StickyNote, Phone, Video, Copy, MapPin,
  Heart, FileText, CheckCircle2, XCircle,
} from "lucide-react-native";

import { colors, spacing, radius, fonts, stageColor, formatMobile } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import InitialsAvatar from "@/src/components/InitialsAvatar";
import EmptyState from "@/src/components/EmptyState";
import { useTabBarSpacing } from "@/src/hooks/useTabBarSpacing";

const STATUSES = ["all", "new", "called", "follow_up", "interested", "submitted", "approved", "closed"];
const STATUS_ICONS: Record<string, any> = {
  new: Phone, called: Phone, follow_up: Clock, interested: Heart,
  submitted: FileText, approved: CheckCircle2, closed: XCircle,
};

function StatusPill({ status }: { status: string }) {
  const { bg, text } = stageColor(status);
  return (
    <View style={[pillStyles.wrap, { backgroundColor: bg }]}>
      <Text style={[pillStyles.text, { color: text }]}>{status.replace("_", " ")}</Text>
    </View>
  );
}
const pillStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, alignSelf: "flex-start" },
  text: { fontSize: 10, fontFamily: fonts.bold, textTransform: "capitalize", letterSpacing: 0.3 },
});

export default function AdminConsultations() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarSpacing = useTabBarSpacing();
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [notes, setNotes] = useState("");

  const load = async (st: string) => {
    setLoading(true);
    try {
      const res = await apiGet<any[]>(`/admin/consultations${st !== "all" ? `?status=${st}` : ""}`);
      setItems(res);
    } catch {
      Alert.alert("Error", "Failed to load consultations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filter); }, [filter]);

  const updateStatus = async (cid: string, status: string) => {
    await apiPost(`/admin/consultations/${cid}`, { status, notes });
    setEditing(null);
    setNotes("");
    load(filter);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top"]} testID="admin-consultations">
      <BackBar title="Consultations" onBack={() => router.back()} />

      <View style={{ position: "relative" }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingVertical: 8, paddingHorizontal: spacing.md }}
          style={{ flexGrow: 0 }}
        >
          {STATUSES.map((s) => {
            const active = filter === s;
            const { bg, text: textColor } = s !== "all" ? stageColor(s) : { bg: colors.surfaceAlt, text: colors.textMuted };
            const isAllActive = s === "all" && active;
            const chipColor = isAllActive ? "#FFF" : textColor;
            const Icon = STATUS_ICONS[s];
            return (
              <TouchableOpacity
                key={s}
                testID={`status-filter-${s}`}
                style={[
                  styles.filterChip,
                  { backgroundColor: isAllActive ? colors.primary : bg },
                  active && { borderWidth: 1.5, borderColor: isAllActive ? colors.primary : textColor },
                ]}
                onPress={() => setFilter(s)}
              >
                {Icon && <Icon size={12} color={chipColor} strokeWidth={2} />}
                <Text style={[
                  styles.filterChipText,
                  { color: chipColor },
                  active && { fontFamily: fonts.bold },
                ]}>
                  {s.replace("_", " ")}
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
      ) : items.length === 0 ? (
        <EmptyState Icon={Phone} title="No consultations" subtitle={`No "${filter}" consultations`} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          style={{ flex: 1, marginBottom: tabBarSpacing }}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 4 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const accent = stageColor(item.status);
            return (
            <TouchableOpacity
              testID={`consult-${item.id}`}
              style={[styles.card, { borderLeftWidth: 4, borderLeftColor: accent.text }]}
              onPress={() => { setEditing(item); setNotes(item.notes || ""); }}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <InitialsAvatar name={item.user?.full_name || "Unknown"} size={34} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{item.user?.full_name || "—"}</Text>
                  <Text style={styles.userMobile}>{formatMobile(item.user?.mobile)}</Text>
                </View>
                <StatusPill status={item.status} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.consultType}>{item.consultation_type}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Calendar size={11} color={colors.textDim} strokeWidth={2} />
                    <Text style={styles.metaText}>{item.date}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Clock size={11} color={colors.textDim} strokeWidth={2} />
                    <Text style={styles.metaText}>{item.time_slot}</Text>
                  </View>
                  {item.user?.state && (
                    <View style={styles.metaItem}>
                      <MapPin size={11} color={colors.textDim} strokeWidth={2} />
                      <Text style={styles.metaText}>{item.user.state}</Text>
                    </View>
                  )}
                </View>
                {item.notes && (
                  <View style={styles.notesPreview}>
                    <StickyNote size={11} color={colors.textDim} strokeWidth={2} />
                    <Text style={styles.notesText} numberOfLines={1}>{item.notes}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal visible={!!editing} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <View style={styles.modalBg}>
          <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>{editing?.user?.full_name || "Consultation"}</Text>
                <Text style={styles.sheetMeta}>
                  {editing?.consultation_type}  ·  {editing?.date}  {editing?.time_slot}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setEditing(null)}
                testID="cancel-update"
              >
                <X size={16} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              testID="consult-notes"
              style={styles.notesInput}
              placeholder="Add consultation notes…"
              placeholderTextColor={colors.textPlaceholder}
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
              textAlignVertical="top"
            />

            {editing?.meet_link && (
              <View style={styles.meetBox}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Video size={15} color={colors.primaryDark} strokeWidth={2} />
                  <Text style={styles.fieldLabel}>Meeting Link</Text>
                </View>
                <Text style={styles.meetLinkText} numberOfLines={1}>{editing.meet_link}</Text>
                <View style={styles.meetActions}>
                  <TouchableOpacity
                    style={styles.meetBtn}
                    onPress={() => Share.share({ message: editing.meet_link, title: "Meeting Link" })}
                    activeOpacity={0.8}
                  >
                    <Copy size={13} color={colors.primaryDark} strokeWidth={2.5} />
                    <Text style={styles.meetBtnText}>Copy Link</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.meetBtn, styles.meetBtnJoin]}
                    onPress={() => Linking.openURL(editing.meet_link)}
                    activeOpacity={0.8}
                  >
                    <Video size={13} color="#FFF" strokeWidth={2.5} />
                    <Text style={[styles.meetBtnText, { color: "#FFF" }]}>Join Meeting</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={styles.fieldLabel}>Update Status</Text>
            <View style={styles.statusGrid}>
              {STATUSES.filter((s) => s !== "all").map((s) => {
                const { bg, text: textColor } = stageColor(s);
                const isActive = editing?.status === s;
                return (
                  <TouchableOpacity
                    key={s}
                    testID={`upd-status-${s}`}
                    style={[styles.statusChip, { backgroundColor: isActive ? bg : "#FFF", borderColor: isActive ? textColor : colors.border }]}
                    onPress={() => updateStatus(editing!.id, s)}
                  >
                    <Text style={[styles.statusChipText, { color: isActive ? textColor : colors.textMuted }]}>
                      {s.replace("_", " ")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    height: 30,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: "transparent",
    backgroundColor: "#FFF",
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
    marginBottom: 10,
  },
  userName: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  userMobile: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textDim,
    marginTop: 1,
  },
  cardBody: {},
  consultType: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
    color: colors.text,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
  metaText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  notesPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  notesText: {
    flex: 1,
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textDim,
    fontStyle: "italic",
  },
  modalBg: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.lg,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  sheetMeta: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: {
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
    backgroundColor: colors.surface2,
    marginBottom: 16,
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  statusChipText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    textTransform: "capitalize",
  },
  meetBox: {
    backgroundColor: colors.primarySoft, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.primary, padding: 14, marginBottom: 16,
  },
  meetLinkText: {
    fontSize: 11, fontFamily: fonts.medium, color: colors.primaryDark,
    opacity: 0.8, marginBottom: 10,
  },
  meetActions: { flexDirection: "row", gap: 8 },
  meetBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 9, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.primary, backgroundColor: "#FFF",
  },
  meetBtnJoin: { backgroundColor: colors.primary, borderColor: colors.primary },
  meetBtnText: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.primaryDark },
});
