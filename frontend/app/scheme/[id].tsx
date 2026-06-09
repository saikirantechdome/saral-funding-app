import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { colors, spacing, radius, formatINR } from "@/src/theme";
import { apiGet } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";

export default function SchemeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [scheme, setScheme] = useState<any>(null);

  useEffect(() => { apiGet<any>(`/schemes/${id}`).then(setScheme).catch(() => {}); }, [id]);

  if (!scheme) return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF" }}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID={`scheme-detail-${id}`}>
      <BackBar title={scheme.name} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}>
        <Text style={styles.full}>{scheme.full_name}</Text>
        <Text style={styles.desc}>{scheme.description}</Text>

        <View style={styles.hero}>
          <View style={styles.heroBox}><Text style={styles.heroLabel}>MAX FUNDING</Text><Text style={styles.heroVal}>{formatINR(scheme.max_funding)}</Text></View>
          {scheme.max_subsidy_percent > 0 && <View style={[styles.heroBox, { borderLeftWidth: 1, borderLeftColor: colors.border }]}><Text style={styles.heroLabel}>SUBSIDY</Text><Text style={styles.heroVal}>{scheme.max_subsidy_percent}%</Text></View>}
        </View>

        <Section title="Eligibility"><Bullets items={scheme.eligibility} /></Section>
        <Section title="Benefits"><Bullets items={scheme.benefits} /></Section>
        <Section title="Documents Required"><Bullets items={scheme.documents} /></Section>
        <Section title="Application Process"><Text style={styles.body}>{scheme.process}</Text></Section>
        <Section title="State Applicability">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(scheme.states || []).map((s: string) => (
              <View key={s} style={styles.tag}><Text style={styles.tagText}>{s}</Text></View>
            ))}
          </View>
        </Section>

        <TouchableOpacity testID="book-from-scheme" style={styles.cta} onPress={() => router.push("/booking")}>
          <Text style={styles.ctaText}>Book Free Consultation</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: any) {
  return (<View style={{ marginTop: spacing.md }}><Text style={styles.sec}>{title}</Text>{children}</View>);
}
function Bullets({ items = [] }: { items?: string[] }) {
  return (
    <View>
      {items.map((it, i) => (
        <View key={i} style={{ flexDirection: "row", marginBottom: 6 }}>
          <Text style={{ color: colors.primary, marginRight: 8, fontWeight: "700" }}>•</Text>
          <Text style={styles.body}>{it}</Text>
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  full: { fontSize: 14, color: colors.textMuted, fontStyle: "italic", marginTop: 4 },
  desc: { fontSize: 15, color: colors.text, marginTop: 12, lineHeight: 22 },
  hero: { flexDirection: "row", borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, marginTop: 16, overflow: "hidden" },
  heroBox: { flex: 1, padding: 16, backgroundColor: colors.primarySoft },
  heroLabel: { fontSize: 11, color: colors.primaryDark, fontWeight: "700", letterSpacing: 0.5 },
  heroVal: { fontSize: 22, fontWeight: "800", color: colors.primaryDark, marginTop: 4 },
  sec: { fontSize: 16, fontWeight: "800", color: colors.text, marginBottom: 8 },
  body: { fontSize: 14, color: colors.textMuted, lineHeight: 20, flex: 1 },
  tag: { backgroundColor: colors.surfaceAlt, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  tagText: { fontSize: 12, color: colors.text, fontWeight: "600" },
  cta: { marginTop: 24, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.md, alignItems: "center" },
  ctaText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
});
