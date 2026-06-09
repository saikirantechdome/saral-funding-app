import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors, spacing, radius, formatINR } from "@/src/theme";
import { apiGet } from "@/src/api";
import { SCHEME_CATEGORIES } from "@/src/constants";

export default function Schemes() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (cat && cat !== "All") params.set("category", cat);
    if (q) params.set("q", q);
    const data = await apiGet<any[]>(`/schemes?${params.toString()}`);
    setItems(data);
    setLoading(false);
  }, [cat, q]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top"]} testID="schemes-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Government Schemes</Text>
        <TextInput
          testID="schemes-search"
          style={styles.search}
          placeholder="Search schemes…"
          placeholderTextColor="#9CA3AF"
          value={q}
          onChangeText={setQ}
          returnKeyType="search"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 8, paddingHorizontal: 2 }}>
          {SCHEME_CATEGORIES.map((c) => {
            const active = c === cat;
            return (
              <TouchableOpacity key={c} testID={`chip-${c}`} style={[styles.chip, active && styles.chipActive]} onPress={() => setCat(c)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
          ListEmptyComponent={<Text style={styles.empty}>No schemes match your filters.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity testID={`scheme-${item.id}`} style={styles.card} onPress={() => router.push({ pathname: "/scheme/[id]", params: { id: item.id } })}>
              <View style={styles.row}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <View style={styles.statePill}><Text style={styles.statePillText}>{(item.states || [])[0] || "All India"}</Text></View>
              </View>
              <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaG}>Up to {formatINR(item.max_funding)}</Text>
                {item.max_subsidy_percent > 0 && <Text style={styles.meta}>{item.max_subsidy_percent}% subsidy</Text>}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: "#FFF" },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: 12 },
  search: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, fontSize: 15, color: colors.text, backgroundColor: "#FFF" },
  chip: { flexShrink: 0, paddingHorizontal: 14, height: 36, borderRadius: 9999, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF" },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textMuted, fontWeight: "500" },
  chipTextActive: { color: colors.primaryDark, fontWeight: "700" },
  card: { backgroundColor: "#FFF", borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.text },
  statePill: { backgroundColor: colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statePillText: { fontSize: 10, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  desc: { fontSize: 13, color: colors.textMuted, marginTop: 8, lineHeight: 18 },
  metaRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  metaG: { fontSize: 12, color: colors.primaryDark, fontWeight: "700" },
  meta: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  empty: { textAlign: "center", padding: 40, color: colors.textMuted },
});
