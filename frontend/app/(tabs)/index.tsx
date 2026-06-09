import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { colors, spacing, radius, formatINR } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";

type Match = { scheme_id: string; name: string; score: number; funding_estimate: number; subsidy_estimate: number; reason: string };
type DashData = { matches: Match[]; funding_estimate: number; subsidy_estimate: number; readiness_score: number };
type BankRec = { bank_id: string; name: string; short_name: string; score: number; interest_range: string; why: string };
type Readiness = { score: number; max: number; actions: { title: string; detail: string; weight: string }[] };

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashData | null>(null);
  const [user, setUser] = useState<any>(null);
  const [next, setNext] = useState<any>(null);
  const [bankRec, setBankRec] = useState<BankRec | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [me, m, c, banks, ready, alertsRes] = await Promise.all([
        apiGet<any>("/auth/me"),
        apiGet<DashData>("/match/me"),
        apiGet<any[]>("/consultations/me").catch(() => []),
        apiGet<{ recommendations: BankRec[] }>("/banks/recommend/me").catch(() => ({ recommendations: [] })),
        apiGet<Readiness>("/readiness/me").catch(() => null),
        apiPost<{ new_alerts: any[] }>("/alerts/evaluate", {}).catch(() => ({ new_alerts: [] })),
      ]);
      setUser(me); setData(m);
      setNext((c || []).find((x: any) => ["confirmed", "new", "called", "follow_up"].includes(x.status)) || null);
      setBankRec((banks.recommendations || [])[0] || null);
      setReadiness(ready);
      const notif = await apiGet<any[]>("/notifications/me").catch(() => []);
      setAlerts(notif.filter((n: any) => !n.read).slice(0, 3));
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  if (loading) return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF" }}><ActivityIndicator color={colors.primary} /></View>;

  const isAdmin = user?.role && user.role !== "user";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceAlt }} edges={["top"]} testID="dashboard-screen">
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}>
        <View style={styles.header}>
          <View>
            <Text style={styles.hello}>Namaste 🙏</Text>
            <Text style={styles.name}>{user?.full_name || "Friend"}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {isAdmin && (
              <TouchableOpacity testID="admin-shortcut" onPress={() => router.push("/admin")} style={[styles.bell, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                <Text style={{ fontSize: 16, color: "#FFF", fontWeight: "800" }}>A</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity testID="bell-btn" onPress={() => router.push("/notifications")} style={styles.bell}>
              <Text style={{ fontSize: 20 }}>🔔</Text>
              {alerts.length > 0 && <View style={styles.dot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Readiness Hero */}
        <View style={[styles.card, { backgroundColor: colors.primary, borderColor: colors.primary }]} testID="readiness-card">
          <Text style={styles.readinessLabel}>Funding Readiness Score</Text>
          <Text style={styles.readinessScore}>{readiness?.score ?? data?.readiness_score ?? 0}<Text style={{ fontSize: 22 }}>/100</Text></Text>
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

        {/* Readiness action items */}
        {readiness && readiness.actions.length > 0 && (
          <View style={styles.card} testID="readiness-actions">
            <Text style={styles.sectionTitleSmall}>Improve your score</Text>
            {readiness.actions.slice(0, 3).map((a, i) => (
              <View key={i} style={styles.actionRow}>
                <Text style={styles.actionDot}>•</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>{a.title}</Text>
                  <Text style={styles.actionDetail} numberOfLines={2}>{a.detail}</Text>
                </View>
                <View style={styles.weightPill}><Text style={styles.weightText}>{a.weight}</Text></View>
              </View>
            ))}
          </View>
        )}

        {/* Smart Alerts */}
        {alerts.length > 0 && (
          <View style={styles.card} testID="alerts-widget">
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitleSmall}>Smart Alerts</Text>
              <TouchableOpacity onPress={() => router.push("/notifications")}><Text style={styles.viewAll}>All →</Text></TouchableOpacity>
            </View>
            {alerts.map((n: any) => (
              <View key={n.id} style={styles.alertRow}>
                <View style={styles.alertDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle} numberOfLines={1}>{n.title}</Text>
                  <Text style={styles.alertBody} numberOfLines={2}>{n.body}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Bank Recommendation */}
        {bankRec && (
          <TouchableOpacity testID="bank-rec-widget" style={styles.bankRec} onPress={() => router.push("/banks")}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitleSmall}>Top Bank Match</Text>
              <Text style={styles.bankName}>{bankRec.name}</Text>
              <Text style={styles.bankRange}>{bankRec.interest_range} • Match {bankRec.score}%</Text>
              <Text style={styles.bankWhy} numberOfLines={2}>{bankRec.why}</Text>
            </View>
            <Text style={styles.bookArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* CTAs */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <TouchableOpacity testID="book-cta" style={[styles.smallCta, { flex: 1.4 }]} onPress={() => router.push("/booking")}>
            <Text style={styles.smallCtaTitle}>📞 Free Consultation</Text>
            <Text style={styles.smallCtaSub}>30-min advisor call</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="banks-cta" style={styles.smallCta} onPress={() => router.push("/banks")}>
            <Text style={styles.smallCtaTitle}>🏦 All Banks</Text>
            <Text style={styles.smallCtaSub}>Compare offers</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming consultation */}
        {next && (
          <View style={styles.card} testID="upcoming-card">
            <Text style={styles.cardLabel}>Upcoming Consultation</Text>
            <Text style={styles.cardTitle}>{next.consultation_type}</Text>
            <Text style={styles.cardSub}>{next.date} • {next.time_slot}</Text>
          </View>
        )}

        {/* Recommended */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Recommended Schemes</Text>
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
  dot: { position: "absolute", top: 8, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  card: { backgroundColor: "#FFF", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  readinessLabel: { color: "#DCFCE7", fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  readinessScore: { color: "#FFF", fontSize: 48, fontWeight: "800", marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  statBox: { flex: 1, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 12, padding: 12 },
  statVal: { color: "#FFF", fontSize: 18, fontWeight: "700" },
  statKey: { color: "#DCFCE7", fontSize: 12, marginTop: 4 },
  sectionTitleSmall: { fontSize: 14, fontWeight: "800", color: colors.text, marginBottom: 10 },
  actionRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 8, gap: 6 },
  actionDot: { color: colors.primary, fontSize: 18, fontWeight: "800", marginTop: -2 },
  actionTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  actionDetail: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  weightPill: { backgroundColor: colors.primarySoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  weightText: { fontSize: 11, fontWeight: "800", color: colors.primaryDark },
  alertRow: { flexDirection: "row", paddingVertical: 8, gap: 10, alignItems: "center" },
  alertDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  alertTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
  alertBody: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  bankRec: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primary, padding: spacing.md, marginBottom: spacing.md, gap: 12 },
  bankName: { fontSize: 17, fontWeight: "800", color: colors.text, marginTop: 4 },
  bankRange: { fontSize: 12, color: colors.primaryDark, fontWeight: "700", marginTop: 2 },
  bankWhy: { fontSize: 12, color: colors.textMuted, marginTop: 6, lineHeight: 16 },
  bookArrow: { fontSize: 24, color: colors.primary, fontWeight: "700" },
  smallCta: { flex: 1, backgroundColor: "#FFF", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 12 },
  smallCtaTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  smallCtaSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
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
