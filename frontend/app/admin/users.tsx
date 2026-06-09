import { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TextInput, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors, spacing, radius } from "@/src/theme";
import { apiGet, getToken, API_BASE } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";

export default function AdminUsers() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (query: string) => {
    setLoading(true);
    const res = await apiGet<any[]>(`/admin/users?${query ? `q=${encodeURIComponent(query)}` : ""}`);
    setItems(res); setLoading(false);
  };
  useEffect(() => { load(""); }, []);

  const exportCsv = async () => {
    const token = await getToken();
    const url = `${API_BASE}/admin/exports/users.csv`;
    if (typeof window !== "undefined") {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const text = await r.text();
      const blob = new Blob([text], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "saral-users.csv"; a.click();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID="admin-users">
      <BackBar title="Users" onBack={() => router.back()} />
      <View style={{ padding: spacing.md, flexDirection: "row", gap: 8 }}>
        <TextInput
          testID="admin-users-search"
          placeholder="Search name or mobile…"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          value={q}
          onChangeText={(v) => { setQ(v); load(v); }}
        />
        <TouchableOpacity testID="export-users" style={styles.exportBtn} onPress={exportCsv}>
          <Text style={styles.exportText}>⤓ CSV</Text>
        </TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 40 }}
          ListEmptyComponent={<Text style={styles.empty}>No users found</Text>}
          renderItem={({ item }) => (
            <View style={styles.row} testID={`admin-user-${item.id}`}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.full_name || "Unnamed"}</Text>
                <Text style={styles.meta}>+91 {item.mobile} • {item.state || "—"}</Text>
                <Text style={styles.meta2}>Role: {item.role} • Step: {item.onboarding_step}</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, fontSize: 14, color: colors.text },
  exportBtn: { paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  exportText: { color: colors.primaryDark, fontSize: 13, fontWeight: "700" },
  row: { flexDirection: "row", paddingVertical: 12, paddingHorizontal: 14, backgroundColor: "#FFF", borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  meta2: { fontSize: 11, color: colors.textDim, marginTop: 4 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 40 },
});
