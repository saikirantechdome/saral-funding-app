import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { colors, spacing, formatINR } from "@/src/theme";
import { apiPost } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";

export default function BanksCompare() {
  const { ids } = useLocalSearchParams<{ ids: string }>();
  const router = useRouter();
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiPost<{ banks: any[] }>("/banks/compare", { ids: (ids || "").split(",") })
      .then((d) => { setBanks(d.banks); setLoading(false); }).catch(() => setLoading(false));
  }, [ids]);

  if (loading) return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF" }}><ActivityIndicator color={colors.primary} /></View>;

  const rows: { k: string; render: (b: any) => string }[] = [
    { k: "Type", render: (b) => b.type },
    { k: "Interest", render: (b) => `${b.interest_min}–${b.interest_max}%` },
    { k: "Max Funding", render: (b) => formatINR(b.max_funding) },
    { k: "Processing Fee", render: (b) => `${b.processing_fee_percent}%` },
    { k: "Collateral", render: (b) => b.collateral_required ? "Required" : "Not Required" },
    { k: "Min Credit Score", render: (b) => String(b.min_credit_score) },
    { k: "Min Turnover", render: (b) => b.min_turnover ? formatINR(b.min_turnover) : "—" },
    { k: "Programs", render: (b) => (b.supports || []).join(", ") },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID="banks-compare-screen">
      <BackBar title="Compare Banks" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={[styles.row, { borderTopWidth: 0 }]}>
              <View style={[styles.cellK, styles.cellHead]}><Text style={styles.k}>Bank</Text></View>
              {banks.map((b) => <View key={b.id} style={[styles.cellV, styles.cellHead]}><Text style={styles.name}>{b.short_name}</Text></View>)}
            </View>
            {rows.map((r) => (
              <View key={r.k} style={styles.row}>
                <View style={styles.cellK}><Text style={styles.k}>{r.k}</Text></View>
                {banks.map((b) => <View key={b.id} style={styles.cellV}><Text style={styles.v}>{r.render(b)}</Text></View>)}
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.border },
  cellHead: { backgroundColor: colors.surfaceAlt },
  cellK: { width: 130, padding: 10, borderRightWidth: 1, borderRightColor: colors.border },
  cellV: { width: 140, padding: 10, borderRightWidth: 1, borderRightColor: colors.border },
  k: { fontSize: 12, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  v: { fontSize: 13, color: colors.text, fontWeight: "600" },
  name: { fontSize: 14, fontWeight: "800", color: colors.text },
});
