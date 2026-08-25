/**
 * Admin "Today" dashboard — matches the approved Saral Admin Prototype's
 * isDash state. Stat tiles and unread-message count are real
 * (`/admin/leads`, `/admin/support/unread-count`). The "Breaching soon" SLA
 * card and "Switch role" are placeholders — see ADMIN_SIDE_REVAMP_PLAN.md:
 * there is no due-date/SLA field or CA role in the backend today, so this
 * uses the real earliest-open lead's name with illustrative framing rather
 * than inventing a fake due-date field.
 */
import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Bell } from "lucide-react-native";

import { apiGet } from "@/src/api";
import { spacing } from "@/src/theme";
import { protoColors, protoSpacing } from "@/src/theme.proto";
import ProtoButton from "@/src/components/proto/ProtoButton";
import { toggleAdminMode } from "@/src/hooks/useAdminMode";
import { useTabBarSpacing } from "@/src/hooks/useTabBarSpacing";

type Lead = { id: string; full_name: string; stage: string; created_at: string; follow_up_date?: string };

function bucketOf(stage: string): "new" | "review" | "changes" | "toAssign" | "other" {
  if (stage === "new") return "new";
  if (stage === "submitted") return "review";
  if (stage === "documentation") return "changes";
  if (stage === "contacted" || stage === "interested") return "toAssign";
  return "other";
}

export default function AdminToday() {
  const router = useRouter();
  const tabBarSpacing = useTabBarSpacing(-36);
  const [me, setMe] = useState<any>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [u, l, s] = await Promise.all([
        apiGet<any>("/auth/me"),
        apiGet<Lead[]>("/admin/leads?limit=200").catch(() => []),
        apiGet<{ unread_count: number }>("/admin/support/unread-count").catch(() => ({ unread_count: 0 })),
      ]);
      setMe(u);
      setLeads(l || []);
      setUnread(s.unread_count || 0);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const counts = leads.reduce(
    (acc, l) => { const b = bucketOf(l.stage); if (b !== "other") acc[b]++; return acc; },
    { new: 0, review: 0, changes: 0, toAssign: 0 }
  );
  // Illustrative "breaching soon" — real lead, no real due-date field exists.
  const oldestOpen = [...leads]
    .filter((l) => l.stage === "new" || l.stage === "contacted")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];

  const roleLabel = me?.role ? me.role.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) : "Reviewer";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: protoColors.primaryDark }} edges={["top"]} testID="admin-today-screen">
      <ScrollView
        style={{ flex: 1, marginBottom: tabBarSpacing, backgroundColor: protoColors.surfaceAlt }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#FFFFFF" />}
      >
        <View style={styles.hero}>
          <View style={styles.headerRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(me?.full_name || "A")[0]?.toUpperCase()}</Text></View>
            <View style={{ flex: 1, marginLeft: protoSpacing.sm }}>
              <Text style={styles.roleLabel}>{roleLabel}</Text>
              <Text style={styles.roleName}>{me?.full_name || "—"}</Text>
            </View>
            <TouchableOpacity style={styles.bell} onPress={() => router.push("/admin/support" as any)} testID="admin-bell">
              <Bell size={18} color="#FFFFFF" strokeWidth={2} />
              {unread > 0 && <View style={styles.bellDot} />}
            </TouchableOpacity>
          </View>
          <View style={styles.statGrid}>
            {([["new", "New"], ["review", "In review"], ["changes", "Changes"], ["toAssign", "To assign"]] as const).map(([key, label]) => (
              <TouchableOpacity key={key} style={styles.statTile} onPress={() => router.push("/admin/apps" as any)} testID={`stat-${key}`}>
                <Text style={styles.statVal}>{counts[key]}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sheet}>
          {oldestOpen && (
            <View style={styles.amberCard} testID="breaching-card">
              <View style={styles.pillRow}><View style={styles.pillAmber}><Text style={styles.pillAmberText}>Needs attention</Text></View></View>
              <Text style={styles.cardTitle}>{oldestOpen.full_name}</Text>
              <ProtoButton variant="amber" label="Open review" onPress={() => router.push(`/admin/application/${oldestOpen.id}` as any)} />
            </View>
          )}

          <View style={styles.card}>
            <TouchableOpacity style={styles.listRow} onPress={() => router.push("/admin/support" as any)} testID="row-unread">
              <View style={{ flex: 1 }}><Text style={styles.rowTitle}>Unread messages</Text></View>
              <View style={styles.pillBlue}><Text style={styles.pillBlueText}>{unread}</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.listRow, styles.listRowLast]} onPress={() => router.push("/admin/cases" as any)} testID="row-ca-pending">
              <View style={{ flex: 1 }}><Text style={styles.rowTitle}>CA allocation pending</Text></View>
              <View style={styles.pillAmber}><Text style={styles.pillAmberText}>{counts.toAssign}</Text></View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.card}
            onPress={() => { toggleAdminMode(); router.replace("/admin/cases" as any); }}
            testID="switch-role-btn"
          >
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Switch role</Text>
                <Text style={styles.rowSub}>Reviewer ↔ CA mode</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: spacing.sm2, paddingHorizontal: spacing.md, paddingBottom: 22 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: protoSpacing.md },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: protoColors.accent, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  roleLabel: { fontSize: 11, color: "rgba(255,255,255,0.6)" },
  roleName: { fontSize: 17, color: "#FFFFFF", fontWeight: "700", marginTop: 1 },
  bell: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  bellDot: { position: "absolute", top: 9, right: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: protoColors.amber },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statTile: { width: "47%", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 14, padding: 12 },
  statVal: { fontSize: 22, color: "#FFFFFF", fontWeight: "700" },
  statLabel: { fontSize: 11.5, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  sheet: { backgroundColor: protoColors.surfaceAlt, borderTopLeftRadius: 29, borderTopRightRadius: 29, marginTop: -18, padding: spacing.md, gap: 13, minHeight: 200 },
  amberCard: { backgroundColor: protoColors.amberSoft, borderRadius: 19, padding: 15, gap: 10 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 19, padding: 4 },
  pillRow: { flexDirection: "row" },
  pillAmber: { backgroundColor: protoColors.pill.amber.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  pillAmberText: { fontSize: 11, fontWeight: "600", color: protoColors.pill.amber.text },
  pillBlue: { backgroundColor: protoColors.pill.blue.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillBlueText: { fontSize: 11, fontWeight: "600", color: protoColors.pill.blue.text },
  cardTitle: { fontSize: 14, fontWeight: "600", color: protoColors.text },
  row: { flexDirection: "row", alignItems: "center" },
  listRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: protoColors.border },
  listRowLast: { borderBottomWidth: 0 },
  rowTitle: { fontSize: 13, color: protoColors.text, fontWeight: "600" },
  rowSub: { fontSize: 11.5, color: protoColors.textMuted, marginTop: 1 },
  chevron: { fontSize: 16, color: protoColors.textMuted },
});
