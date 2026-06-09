import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors, spacing, radius } from "@/src/theme";
import { apiGet } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";

export default function AdminAnalytics() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  useEffect(() => { apiGet<any>("/admin/analytics").then(setData); }, []);

  if (!data) return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF" }}><ActivityIndicator color={colors.primary} /></View>;

  const maxPop = Math.max(1, ...(data.popular_schemes || []).map((p: any) => p.matches));
  const maxState = Math.max(1, ...(data.state_distribution || []).map((s: any) => s.count));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID="admin-analytics">
      <BackBar title="Analytics" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}>
        <Text style={styles.section}>Popular Schemes</Text>
        {(data.popular_schemes || []).length === 0 && <Text style={styles.empty}>No matches yet</Text>}
        {(data.popular_schemes || []).map((p: any) => (
          <View key={p.scheme_id} style={styles.barRow} testID={`pop-${p.scheme_id}`}>
            <View style={{ flex: 1 }}>
              <Text style={styles.barTitle}>{p.name}</Text>
              <View style={styles.barTrack}><View style={[styles.barFill, { width: `${(p.matches / maxPop) * 100}%` }]} /></View>
            </View>
            <Text style={styles.barCount}>{p.matches}</Text>
          </View>
        ))}

        <Text style={styles.section}>State Distribution</Text>
        {(data.state_distribution || []).length === 0 && <Text style={styles.empty}>No users yet</Text>}
        {(data.state_distribution || []).map((s: any) => (
          <View key={s.state} style={styles.barRow} testID={`state-${s.state}`}>
            <View style={{ flex: 1 }}>
              <Text style={styles.barTitle}>{s.state}</Text>
              <View style={styles.barTrack}><View style={[styles.barFill, { width: `${(s.count / maxState) * 100}%` }]} /></View>
            </View>
            <Text style={styles.barCount}>{s.count}</Text>
          </View>
        ))}

        <Text style={styles.section}>Lead Pipeline</Text>
        <View style={styles.pipeline}>
          {Object.entries(data.lead_pipeline || {}).map(([k, v]) => (
            <View key={k} style={styles.pipeBox}>
              <Text style={styles.pipeV}>{String(v)}</Text>
              <Text style={styles.pipeK}>{k}</Text>
            </View>
          ))}
          {Object.keys(data.lead_pipeline || {}).length === 0 && <Text style={styles.empty}>No leads yet</Text>}
        </View>

        <Text style={styles.section}>Consultation Status</Text>
        <View style={styles.pipeline}>
          {(data.consultation_status || []).map((s: any) => (
            <View key={s.status} style={styles.pipeBox}>
              <Text style={styles.pipeV}>{s.count}</Text>
              <Text style={styles.pipeK}>{s.status}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 14, fontWeight: "800", color: colors.text, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 16, marginBottom: 12 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  barTitle: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 6 },
  barTrack: { height: 8, backgroundColor: colors.surfaceAlt, borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 4 },
  barCount: { fontSize: 13, fontWeight: "800", color: colors.text, width: 36, textAlign: "right" },
  pipeline: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pipeBox: { width: "31%", padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: "#FFF" },
  pipeV: { fontSize: 20, fontWeight: "800", color: colors.text },
  pipeK: { fontSize: 11, color: colors.textMuted, marginTop: 4, textTransform: "capitalize" },
  empty: { color: colors.textMuted, fontSize: 13 },
});
