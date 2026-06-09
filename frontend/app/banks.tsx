import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { colors, spacing, radius, formatINR } from "@/src/theme";
import { apiGet } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";

type Rec = { bank_id: string; name: string; short_name: string; type: string; score: number; interest_range: string; suggested_amount: number; collateral_required: boolean; supports: string[]; why: string; description: string };

export default function BanksScreen() {
  const router = useRouter();
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);

  useFocusEffect(useCallback(() => {
    apiGet<{ recommendations: Rec[] }>("/banks/recommend/me")
      .then((d) => { setRecs(d.recommendations || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []));

  const toggle = (id: string) => setSelected((cur) => cur.includes(id) ? cur.filter(x => x !== id) : (cur.length >= 3 ? cur : [...cur, id]));

  if (loading) return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF" }}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID="banks-screen">
      <BackBar title="Recommended Banks" onBack={() => router.back()} />
      <View style={{ paddingHorizontal: spacing.md, paddingTop: 12 }}>
        <Text style={styles.sub}>Personalised for your business profile</Text>
      </View>
      <FlatList
        data={recs}
        keyExtractor={(x) => x.bank_id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 140 }}
        renderItem={({ item }) => {
          const isSel = selected.includes(item.bank_id);
          return (
            <View style={styles.card}>
              <TouchableOpacity testID={`bank-card-${item.bank_id}`} activeOpacity={0.8} onPress={() => router.push({ pathname: "/bank/[id]", params: { id: item.bank_id } })}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.metaG}>{item.type} • {item.interest_range}</Text>
                  </View>
                  <View style={styles.scoreBadge}><Text style={styles.scoreText}>{item.score}%</Text></View>
                </View>
                <Text style={styles.why} numberOfLines={3}>{item.why}</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statKey}>Suggested</Text>
                    <Text style={styles.statVal}>{formatINR(item.suggested_amount)}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statKey}>Collateral</Text>
                    <Text style={[styles.statVal, !item.collateral_required && { color: colors.primaryDark }]}>{item.collateral_required ? "Required" : "Not Required"}</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity testID={`bank-compare-${item.bank_id}`} style={[styles.compareToggle, isSel && styles.compareActive]} onPress={() => toggle(item.bank_id)}>
                <Text style={[styles.compareText, isSel && styles.compareTextActive]}>{isSel ? "✓ Selected for compare" : "+ Add to compare"}</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
      {selected.length >= 2 && (
        <View style={styles.footer}>
          <TouchableOpacity testID="compare-go" style={styles.cta} onPress={() => router.push({ pathname: "/banks-compare", params: { ids: selected.join(",") } })}>
            <Text style={styles.ctaText}>Compare {selected.length} banks →</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sub: { fontSize: 14, color: colors.textMuted, marginBottom: 12 },
  card: { backgroundColor: "#FFF", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  name: { fontSize: 16, fontWeight: "800", color: colors.text },
  metaG: { fontSize: 12, color: colors.primaryDark, fontWeight: "700", marginTop: 4 },
  why: { fontSize: 13, color: colors.textMuted, marginTop: 10, lineHeight: 18 },
  scoreBadge: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primary, alignItems: "center", justifyContent: "center" },
  scoreText: { fontSize: 13, fontWeight: "800", color: colors.primaryDark },
  statsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  statBox: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 10 },
  statKey: { fontSize: 10, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  statVal: { fontSize: 13, fontWeight: "700", color: colors.text, marginTop: 4 },
  compareToggle: { marginTop: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  compareActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  compareText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  compareTextActive: { color: colors.primaryDark, fontWeight: "700" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: spacing.md, backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: colors.border },
  cta: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: "center" },
  ctaText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
