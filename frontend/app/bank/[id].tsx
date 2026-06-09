import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { colors, spacing, radius, formatINR } from "@/src/theme";
import { apiGet } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";

export default function BankDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [bank, setBank] = useState<any>(null);

  useEffect(() => { apiGet<any>(`/banks/${id}`).then(setBank); }, [id]);

  if (!bank) return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF" }}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID={`bank-detail-${id}`}>
      <BackBar title={bank.name} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}>
        <View style={styles.hero}>
          <Text style={styles.type}>{bank.type} Sector Bank</Text>
          <Text style={styles.name}>{bank.name}</Text>
          <Text style={styles.desc}>{bank.description}</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.tile}><Text style={styles.tileK}>Interest Range</Text><Text style={styles.tileV}>{bank.interest_min}% – {bank.interest_max}%</Text></View>
          <View style={styles.tile}><Text style={styles.tileK}>Max Funding</Text><Text style={styles.tileV}>{formatINR(bank.max_funding)}</Text></View>
          <View style={styles.tile}><Text style={styles.tileK}>Processing Fee</Text><Text style={styles.tileV}>{bank.processing_fee_percent}%</Text></View>
          <View style={styles.tile}><Text style={styles.tileK}>Min Credit Score</Text><Text style={styles.tileV}>{bank.min_credit_score}</Text></View>
          <View style={styles.tile}><Text style={styles.tileK}>Collateral</Text><Text style={[styles.tileV, !bank.collateral_required && { color: colors.primaryDark }]}>{bank.collateral_required ? "Required" : "Not Required"}</Text></View>
          <View style={styles.tile}><Text style={styles.tileK}>Min Turnover</Text><Text style={styles.tileV}>{bank.min_turnover ? formatINR(bank.min_turnover) : "—"}</Text></View>
        </View>

        <Text style={styles.sec}>Supported Programs</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(bank.supports || []).map((s: string) => (
            <View key={s} style={styles.chip}><Text style={styles.chipText}>{s}</Text></View>
          ))}
        </View>

        <Text style={styles.sec}>Why Recommended</Text>
        <Text style={styles.body}>{bank.why}</Text>

        <Text style={styles.sec}>Industries Served</Text>
        <Text style={styles.body}>{(bank.industries || []).join(" • ")}</Text>

        <TouchableOpacity testID="book-from-bank" style={styles.cta} onPress={() => router.push("/booking")}>
          <Text style={styles.ctaText}>Book Free Consultation</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 16 },
  type: { fontSize: 12, fontWeight: "700", color: colors.primaryDark, letterSpacing: 0.5, textTransform: "uppercase" },
  name: { fontSize: 24, fontWeight: "800", color: colors.text, marginTop: 4 },
  desc: { fontSize: 14, color: colors.textMuted, marginTop: 8, lineHeight: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { width: "48%", backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 12 },
  tileK: { fontSize: 11, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  tileV: { fontSize: 15, fontWeight: "800", color: colors.text, marginTop: 4 },
  sec: { fontSize: 14, fontWeight: "800", color: colors.text, marginTop: 20, marginBottom: 10 },
  body: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  chip: { backgroundColor: colors.surfaceAlt, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.text },
  cta: { marginTop: 28, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.md, alignItems: "center" },
  ctaText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
});
