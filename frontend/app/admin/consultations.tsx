import { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, Modal, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors, spacing, radius } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";

const STATUSES = ["all", "new", "called", "follow_up", "interested", "submitted", "approved", "closed"];

export default function AdminConsultations() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [notes, setNotes] = useState("");

  const load = async (st: string) => {
    setLoading(true);
    const res = await apiGet<any[]>(`/admin/consultations${st !== "all" ? `?status=${st}` : ""}`);
    setItems(res); setLoading(false);
  };
  useEffect(() => { load(filter); }, [filter]);

  const updateStatus = async (cid: string, status: string) => {
    await apiPost(`/admin/consultations/${cid}`, { status, notes });
    setEditing(null); setNotes(""); load(filter);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID="admin-consultations">
      <BackBar title="Consultations" onBack={() => router.back()} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 8, paddingHorizontal: spacing.md }}>
        {STATUSES.map((s) => (
          <TouchableOpacity key={s} testID={`status-filter-${s}`} style={[styles.chip, filter === s && styles.chipActive]} onPress={() => setFilter(s)}>
            <Text style={[styles.chipText, filter === s && styles.chipTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
          ListEmptyComponent={<Text style={styles.empty}>No consultations</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity testID={`consult-${item.id}`} style={styles.card} onPress={() => { setEditing(item); setNotes(item.notes || ""); }}>
              <Text style={styles.name}>{item.user?.full_name || "—"} • +91 {item.user?.mobile || ""}</Text>
              <Text style={styles.meta}>{item.consultation_type}</Text>
              <Text style={styles.meta2}>{item.date} {item.time_slot} • State: {item.user?.state || "—"}</Text>
              <View style={[styles.statusPill, statusColor(item.status)]}><Text style={styles.statusText}>{item.status}</Text></View>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={!!editing} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <View style={styles.modalBg}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Update Consultation</Text>
            <Text style={styles.sheetMeta}>{editing?.user?.full_name} • {editing?.consultation_type}</Text>
            <TextInput
              testID="consult-notes"
              style={styles.input}
              placeholder="Add notes…"
              placeholderTextColor="#9CA3AF"
              multiline
              value={notes}
              onChangeText={setNotes}
            />
            <Text style={styles.label}>Update status</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {STATUSES.filter((s) => s !== "all").map((s) => (
                <TouchableOpacity key={s} testID={`upd-status-${s}`} style={styles.statusBtn} onPress={() => updateStatus(editing.id, s)}>
                  <Text style={styles.statusBtnText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity testID="cancel-update" style={styles.cancel} onPress={() => setEditing(null)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function statusColor(s: string) {
  if (s === "approved" || s === "submitted") return { backgroundColor: colors.primarySoft, borderColor: colors.primary };
  if (s === "closed") return { backgroundColor: "#FEE2E2", borderColor: colors.danger };
  return { backgroundColor: colors.surfaceAlt, borderColor: colors.border };
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, height: 32, borderRadius: 9999, borderWidth: 1, borderColor: colors.border, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { fontSize: 12, color: colors.textMuted, fontWeight: "600", textTransform: "capitalize" },
  chipTextActive: { color: colors.primaryDark, fontWeight: "700" },
  card: { padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: "#FFF", marginBottom: 8 },
  name: { fontSize: 14, fontWeight: "700", color: colors.text },
  meta: { fontSize: 13, color: colors.text, marginTop: 4 },
  meta2: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  statusPill: { alignSelf: "flex-start", borderRadius: 9999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  statusText: { fontSize: 11, color: colors.text, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#FFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, maxHeight: "85%" },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  sheetMeta: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "700", color: colors.textMuted, marginTop: 12, marginBottom: 8, textTransform: "uppercase" },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 10, minHeight: 80, color: colors.text, fontSize: 14, textAlignVertical: "top" },
  statusBtn: { paddingHorizontal: 12, height: 36, borderRadius: 9999, borderWidth: 1, borderColor: colors.primary, alignItems: "center", justifyContent: "center" },
  statusBtnText: { fontSize: 13, color: colors.primaryDark, fontWeight: "700", textTransform: "capitalize" },
  cancel: { marginTop: 16, padding: 12, alignItems: "center" },
  cancelText: { color: colors.textMuted, fontWeight: "600" },
});
