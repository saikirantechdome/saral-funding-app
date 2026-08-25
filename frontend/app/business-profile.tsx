/**
 * Read-only Business Profile screen — reached from Profile's "Business
 * profile" row. The approved prototype's Profile screen only shows a
 * chevron row for this (no inline business card), so this moves what used
 * to be shown directly on Profile into its own screen. Real data, same
 * /business-profile endpoint Profile already used.
 */
import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

import { spacing } from "@/src/theme";
import { protoColors, protoSpacing } from "@/src/theme.proto";
import { apiGet } from "@/src/api";

function Row({ label, value, last = false }: { label: string; value?: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || "—"}</Text>
    </View>
  );
}

export default function BusinessProfile() {
  const router = useRouter();
  const [bp, setBp] = useState<any>(null);

  useFocusEffect(useCallback(() => {
    apiGet<any>("/business-profile").then(setBp).catch(() => setBp({}));
  }, []));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: protoColors.surfaceAlt }} edges={["top", "bottom"]} testID="business-profile-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={20} color={protoColors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Profile</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Row label="Stage" value={bp?.business_stage} />
          <Row label="Industry" value={bp?.industry} />
          <Row label="GST" value={bp?.gst_available ? "Registered" : "Not registered"} />
          <Row label="Udyam" value={bp?.udyam_available ? "Registered" : "Not registered"} last={!bp?.business_activity} />
        </View>

        {!!bp?.business_activity && (
          <View style={styles.card}>
            <Text style={styles.activityLabel}>Business Activity</Text>
            <Text style={styles.activityValue}>{bp.business_activity}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.md, paddingTop: protoSpacing.sm, paddingBottom: protoSpacing.sm,
  },
  headerTitle: { fontSize: 15, fontWeight: "700", color: protoColors.text },
  body: { padding: spacing.md, gap: protoSpacing.md },
  card: { backgroundColor: "#FFFFFF", borderRadius: 19, overflow: "hidden", padding: 4 },
  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 12, paddingHorizontal: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: protoColors.border },
  rowLabel: { fontSize: 13, color: protoColors.textMuted },
  rowValue: { fontSize: 13, fontWeight: "600", color: protoColors.text, maxWidth: "55%", textAlign: "right" },
  activityLabel: { fontSize: 13, color: protoColors.textMuted, padding: 12, paddingBottom: 0 },
  activityValue: { fontSize: 13, fontWeight: "600", color: protoColors.text, padding: 12, paddingTop: 4, lineHeight: 18 },
});
