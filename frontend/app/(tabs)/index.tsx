import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { colors, spacing, radius, formatINR } from "@/src/theme";
import { apiGet } from "@/src/api";

type Match = { scheme_id: string; name: string; score: number; funding_estimate: number; subsidy_estimate: number; reason: string };
type DashData = { matches: Match[]; funding_estimate: number; subsidy_estimate: number; readiness_score: number };

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashData | null>(null);
  const [user, setUser] = useState<any>(null);
  const [next, setNext] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [me, m, c] = await Promise.all([
        apiGet<any>("/auth/me"),
        apiGet<DashData>("/match/me"),
        apiGet<any[]>("/consultations/me").catch(() => []),
      ]);
      setUser(me); setData(m);
      setNext((c || []).find((x: any) => x.status === "confirmed") || null);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  if (loading) return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF" }}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceAlt }} edges={["top"]} testID="dashboard-screen">
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}>
        <View style={styles.header}>
          <View>
            <Text style={styles.hello}>Namaste 🙏</Text>
            <Text style={styles.name}>{user?.full_name || "Friend"}</Text>
          </View>
          <TouchableOpacity testID="bell-btn" onPress={() => router.push("/notifications")} style={styles.bell}><Text style={{ fontSize: 20 }}>🔔</Text></TouchableOpacity>
        </View>

        {/* Readiness */}
        <View style={[styles.card, { backgroundColor: colors.primary, borderColor: colors.primary }]} testID="readiness-card">
          <Text style={styles.readinessLabel}>Funding Readiness Score</Text>
          <Text style={styles.readinessScore}>{data?.readiness_score ?? 0}<Text style={{ fontSize: 22 }}>/100</Text></Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{formatINR(data?.funding_estimate || 0)}</Text>
              <Text style={styles.statKey}>Eligible Funding</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{formatINR(data?.subsidy_estimate || 0)}</Text>
              <Text style={styles.statKey}>Estimated Subsidy</Text>
            </View>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity testID="book-cta" style={styles.bookCta} onPress={() => router.push("/booking")}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bookTitle}>📞 Free Expert Consultation</Text>
            <Text style={styles.bookSub}>30-min 1:1 with a funding advisor</Text>
          </View>
          <Text style={styles.bookArrow}>→</Text>
        </TouchableOpacity>

        {/* Next consultation */}
        {next && (
          <View style={styles.card} testID="upcoming-card">
            <Text style={styles.cardLabel}>Upcoming Consultation</Text>
            <Text style={styles.cardTitle}>{next.consultation_type}</Text>
            <Text style={styles.cardSub}>{next.date} • {next.time_slot}</Text>
          </View>
        )}

        {/* Recommended */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Recommended for you</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/schemes")} testID="view-all-btn"><Text style={styles.viewAll}>View all →</Text></TouchableOpacity>
        </View>

        {(data?.matches || []).slice(0, 3).map((m) => (
          <TouchableOpacity key={m.scheme_id} testID={`match-${m.scheme_id}`} style={styles.matchCard} onPress={() => router.push({ pathname: "/scheme/[id]", params: { id: m.scheme_id } })}>
            <View style={{ flex: 1 }}>
              <Text style={styles.matchName}>{m.name}</Text>
              <Text style={styles.matchReason} numberOfLines={2}>{m.reason}</Text>
              <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                <Text style={styles.metaG}>Up to {formatINR(m.funding_estimate)}</Text>
                {m.subsidy_estimate > 0 && <Text style={styles.meta}>Subsidy {formatINR(m.subsidy_estimate)}</Text>}
              </View>
            </View>
            <View style={styles.scoreBadge}><Text style={styles.scoreText}>{m.score}%</Text></View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  hello: { fontSize: 13, color: colors.textMuted },
  name: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 2 },
  bell: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFF", borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: "#FFF", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  readinessLabel: { color: "#DCFCE7", fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  readinessScore: { color: "#FFF", fontSize: 48, fontWeight: "800", marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  statBox: { flex: 1, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 12, padding: 12 },
  statVal: { color: "#FFF", fontSize: 18, fontWeight: "700" },
  statKey: { color: "#DCFCE7", fontSize: 12, marginTop: 4 },
  bookCta: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primary, padding: spacing.md, marginBottom: spacing.md },
  bookTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  bookSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  bookArrow: { fontSize: 24, color: colors.primary, fontWeight: "700" },
  cardLabel: { fontSize: 11, fontWeight: "600", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 4 },
  cardSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  viewAll: { fontSize: 13, fontWeight: "600", color: colors.primaryDark },
  matchCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFF", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: 12 },
  matchName: { fontSize: 16, fontWeight: "700", color: colors.text },
  matchReason: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  metaG: { fontSize: 12, color: colors.primaryDark, fontWeight: "700" },
  meta: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  scoreBadge: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primary, alignItems: "center", justifyContent: "center" },
  scoreText: { fontSize: 14, fontWeight: "800", color: colors.primaryDark },
});
