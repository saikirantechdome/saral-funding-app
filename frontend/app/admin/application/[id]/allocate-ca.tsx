/**
 * Allocate a CA — matches the prototype's isCa state. PLACEHOLDER: no real
 * CA role, assignment field, or allocation endpoint exists in the backend
 * (see ADMIN_SIDE_REVAMP_PLAN.md). This screen is local UI state only —
 * "Allocate & notify" does not persist anything or send a real
 * notification. The three CA names are the prototype's own demo content.
 */
import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Check } from "lucide-react-native";

import { spacing } from "@/src/theme";
import { protoColors, protoSpacing } from "@/src/theme.proto";
import ProtoButton from "@/src/components/proto/ProtoButton";

const CAS = [
  { id: "priya", name: "CA Priya N.", meta: "Pune · 6 open cases" },
  { id: "rohit", name: "CA Rohit M.", meta: "Mumbai · 11 open cases" },
  { id: "anjali", name: "CA Anjali D.", meta: "Nagpur · 4 open cases" },
];
const SCOPE = ["Financials", "DPR", "Filing", "Bank"];

export default function AllocateCa() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pick, setPick] = useState("priya");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: protoColors.primaryDark }} edges={["top", "bottom"]} testID="allocate-ca-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}><ArrowLeft size={20} color="#FFFFFF" strokeWidth={2} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Allocate CA</Text>
        <View style={styles.stepPill}><Text style={styles.stepPillText}>Step 4</Text></View>
      </View>
      <Text style={styles.headerNote}>Allocated with the schemes.</Text>

      <ScrollView style={{ backgroundColor: protoColors.surfaceAlt }} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {CAS.map((ca) => (
          <TouchableOpacity key={ca.id} style={styles.caCard} onPress={() => setPick(ca.id)} testID={`pick-${ca.id}`}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{ca.name.replace("CA ", "").split(" ").map((w) => w[0]).join("")}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.caName}>{ca.name}</Text>
              <Text style={styles.caMeta}>{ca.meta}</Text>
            </View>
            <View style={[styles.check, pick === ca.id && styles.checkOn]}>{pick === ca.id && <Check size={13} color="#FFFFFF" strokeWidth={3} />}</View>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionLabel}>Scope</Text>
        <View style={styles.pillRow}>
          {SCOPE.map((s) => <View key={s} style={styles.scopePill}><Text style={styles.scopePillText}>{s}</Text></View>)}
        </View>

        <View style={{ flex: 1, minHeight: protoSpacing.lg }} />

        <ProtoButton label="Allocate & notify user" onPress={() => router.replace(`/admin/application/${id}` as any)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingTop: protoSpacing.sm },
  headerTitle: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  stepPill: { backgroundColor: "rgba(232,163,61,0.2)", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  stepPillText: { fontSize: 10.5, fontWeight: "600", color: "#F5C877" },
  headerNote: { fontSize: 12, color: "rgba(255,255,255,0.62)", paddingHorizontal: spacing.md, paddingTop: protoSpacing.sm, paddingBottom: protoSpacing.md },
  body: { padding: spacing.md, gap: protoSpacing.sm, flexGrow: 1 },
  caCard: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: "#FFFFFF", borderRadius: 16, padding: 13 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: protoColors.pill.teal.bg, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 12, fontWeight: "700", color: protoColors.pill.teal.text },
  caName: { fontSize: 13.5, fontWeight: "600", color: protoColors.text },
  caMeta: { fontSize: 11.5, color: protoColors.textMuted, marginTop: 2 },
  check: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: protoColors.border },
  checkOn: { backgroundColor: protoColors.primary, borderColor: protoColors.primary, alignItems: "center", justifyContent: "center" },
  sectionLabel: { fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: protoColors.textDim, fontWeight: "700", marginTop: 8 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  scopePill: { backgroundColor: protoColors.pill.teal.bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  scopePillText: { fontSize: 11.5, fontWeight: "600", color: protoColors.pill.teal.text },
});
