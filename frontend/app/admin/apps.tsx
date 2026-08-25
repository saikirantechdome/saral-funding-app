/**
 * Applications list — matches the prototype's isList state. Backed by
 * `/admin/leads` (real data) — see ADMIN_SIDE_REVAMP_PLAN.md for why: there
 * is no admin-wide "list all scheme applications" endpoint, only the
 * user-scoped `/my/scheme-applications`. Leads are the closest real,
 * listable, per-user progress data (name, stage, follow_up_date), so they
 * stand in for the prototype's SRL-numbered "applications" here.
 */
import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Search } from "lucide-react-native";

import { apiGet } from "@/src/api";
import { spacing, shortRef } from "@/src/theme";
import { protoColors, protoSpacing } from "@/src/theme.proto";
import { useTabBarSpacing } from "@/src/hooks/useTabBarSpacing";

type Lead = { id: string; full_name: string; mobile?: string; stage: string; created_at: string };

const FILTERS = ["All", "New", "Review", "Changes"] as const;
type Filter = typeof FILTERS[number];

function filterOf(stage: string): Filter | null {
  if (stage === "new") return "New";
  if (stage === "submitted") return "Review";
  if (stage === "documentation") return "Changes";
  return null;
}

function pillFor(stage: string) {
  if (stage === "approved" || stage === "disbursed") return { bg: protoColors.pill.blue.bg, text: protoColors.pill.blue.text, label: "Assign" };
  if (stage === "closed") return { bg: protoColors.pill.neutral.bg, text: protoColors.pill.neutral.text, label: "Closed" };
  if (stage === "new") return { bg: protoColors.pill.neutral.bg, text: protoColors.pill.neutral.text, label: "New" };
  if (stage === "documentation") return { bg: protoColors.pill.amber.bg, text: protoColors.pill.amber.text, label: "Changes" };
  return { bg: protoColors.pill.amber.bg, text: protoColors.pill.amber.text, label: "In review" };
}

export default function AdminApps() {
  const router = useRouter();
  const tabBarSpacing = useTabBarSpacing(-36);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter | "All">("All");

  const load = useCallback(async (q?: string) => {
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (q) params.set("q", q);
      const res = await apiGet<Lead[]>(`/admin/leads?${params.toString()}`);
      setLeads(res || []);
    } catch {
      setLeads([]);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(query); }, [load]));

  const filtered = leads.filter((l) => filter === "All" || filterOf(l.stage) === filter);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: protoColors.surface }} edges={["top"]} testID="admin-apps-screen">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Applications</Text>
          <Text style={styles.subtitle}>{leads.length} open</Text>
        </View>
      </View>
      <View style={styles.searchWrap}>
        <Search size={15} color={protoColors.textDim} strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name or ID"
          placeholderTextColor={protoColors.textDim}
          value={query}
          onChangeText={(v) => { setQuery(v); load(v); }}
          testID="apps-search"
        />
      </View>
      <View style={styles.filterRow}>
        {(["All", ...FILTERS] as const).map((f) => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.pill, filter === f && styles.pillOn]}>
            <Text style={[styles.pillText, filter === f && styles.pillTextOn]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        style={{ flex: 1, marginBottom: tabBarSpacing }}
        contentContainerStyle={styles.body}
        data={filtered}
        keyExtractor={(l) => l.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const pill = pillFor(item.stage);
          return (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/admin/application/${item.id}` as any)} testID={`app-row-${item.id}`}>
              <View style={styles.row}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{(item.full_name || "?").slice(0, 2).toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.full_name}</Text>
                  <Text style={styles.meta}>SRL-{shortRef(item.id)}</Text>
                </View>
                <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                  <Text style={[styles.pillTextSm, { color: pill.text }]}>{pill.label}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No applications match this filter.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingTop: protoSpacing.md, paddingBottom: protoSpacing.sm },
  title: { fontSize: 18, fontWeight: "700", color: protoColors.text },
  subtitle: { fontSize: 12, color: protoColors.textMuted, marginTop: 2 },
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: spacing.md, marginBottom: protoSpacing.sm,
    backgroundColor: protoColors.fieldBg, borderRadius: 13, paddingHorizontal: 13, height: 42,
  },
  searchInput: { flex: 1, fontSize: 13, color: protoColors.text },
  filterRow: { flexDirection: "row", gap: 6, paddingHorizontal: spacing.md, marginBottom: protoSpacing.sm },
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: protoColors.pill.neutral.bg },
  pillOn: { backgroundColor: protoColors.pill.teal.bg },
  pillText: { fontSize: 11.5, fontWeight: "600", color: protoColors.pill.neutral.text },
  pillTextOn: { color: protoColors.pill.teal.text },
  pillTextSm: { fontSize: 10.5, fontWeight: "600" },
  body: { paddingHorizontal: spacing.md, gap: 10, paddingBottom: spacing.lg },
  card: { backgroundColor: "#FFFFFF", borderRadius: 19, padding: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: 11 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: protoColors.pill.teal.bg, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 12, fontWeight: "700", color: protoColors.pill.teal.text },
  name: { fontSize: 13.5, color: protoColors.text, fontWeight: "600" },
  meta: { fontSize: 11.5, color: protoColors.textMuted, marginTop: 2 },
  empty: { textAlign: "center", color: protoColors.textMuted, marginTop: 40, fontSize: 13 },
});
