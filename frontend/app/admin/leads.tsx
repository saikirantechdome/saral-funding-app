import { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors, spacing, radius, formatINR } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";

const STAGES = ["all", "new", "contacted", "interested", "documentation", "submitted", "approved", "disbursed", "closed"];

export default function AdminLeads() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);

  const load = async (st: string) => {
    setLoading(true);
    setItems(await apiGet<any[]>(`/admin/leads${st !== "all" ? `?stage=${st}` : ""}`));
    setLoading(false);
  };
  useEffect(() => { load(filter); }, [filter]);

  const moveStage = async (lid: string, stage: string) => {
    await apiPost(`/admin/leads/${lid}`, { stage });
    setEditing(null); load(filter);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID="admin-leads">
      <BackBar title="CRM / Leads" onBack={() => router.back()} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 8, paddingHorizontal: spacing.md }}>
        {STAGES.map((s) => (
          <TouchableOpacity key={s} testID={`stage-filter-${s}`} style={[styles.chip, filter === s && styles.chipActive]} onPress={() => setFilter(s)}>
            <Text style={[styles.chipText, filter === s && styles.chipTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
          ListEmptyComponent={<Text style={styles.empty}>No leads in this stage</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity testID={`lead-${item.id}`} style={styles.card} onPress={() => setEditing(item)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.full_name || "Unknown"} • +91 {item.mobile || ""}</Text>
                <Text style={styles.meta}>{item.consultation_type} • {item.state || "—"}</Text>
                {item.funding_required ? <Text style={styles.meta2}>Funding: {formatINR(item.funding_required)}</Text> : null}
              </View>
              <View style={styles.stageBadge}><Text style={styles.stageText}>{item.stage}</Text></View>
            </TouchableOpacity>
          )}
        />
      )}
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalBg}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Move Lead Stage</Text>
            <Text style={styles.sheetMeta}>{editing?.full_name || "Lead"}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {STAGES.filter((s) => s !== "all").map((s) => (
                <TouchableOpacity key={s} testID={`move-${s}`} style={styles.stageBtn} onPress={() => moveStage(editing.id, s)}>
                  <Text style={styles.stageBtnText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity testID="lead-cancel" style={styles.cancel} onPress={() => setEditing(null)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, height: 32, borderRadius: 9999, borderWidth: 1, borderColor: colors.border, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { fontSize: 12, color: colors.textMuted, fontWeight: "600", textTransform: "capitalize" },
  chipTextActive: { color: colors.primaryDark, fontWeight: "700" },
  card: { flexDirection: "row", gap: 8, padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: "#FFF", marginBottom: 8 },
  name: { fontSize: 14, fontWeight: "700", color: colors.text },
  meta: { fontSize: 13, color: colors.text, marginTop: 4 },
  meta2: { fontSize: 12, color: colors.primaryDark, fontWeight: "700", marginTop: 4 },
  stageBadge: { backgroundColor: colors.primarySoft, borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  stageText: { fontSize: 10, fontWeight: "800", color: colors.primaryDark, textTransform: "uppercase", letterSpacing: 0.5 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#FFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  sheetMeta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  stageBtn: { paddingHorizontal: 14, height: 36, borderRadius: 9999, borderWidth: 1, borderColor: colors.primary, alignItems: "center", justifyContent: "center" },
  stageBtnText: { fontSize: 13, color: colors.primaryDark, fontWeight: "700", textTransform: "capitalize" },
  cancel: { marginTop: 16, padding: 12, alignItems: "center" },
  cancelText: { color: colors.textMuted, fontWeight: "600" },
});
