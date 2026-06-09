import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { colors, spacing, radius } from "@/src/theme";
import { apiGet } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";

type Overview = { total_users: number; total_admins: number; total_schemes: number; total_consultations: number; total_leads: number; total_chats: number; daily_active_users: number };

const NAV = [
  { id: "users", label: "Users", icon: "👥" },
  { id: "schemes", label: "Schemes", icon: "📋" },
  { id: "consultations", label: "Consultations", icon: "📞" },
  { id: "leads", label: "CRM / Leads", icon: "🎯" },
  { id: "notifications", label: "Notifications", icon: "🔔" },
  { id: "analytics", label: "Analytics", icon: "📊" },
];

export default function AdminHome() {
  const router = useRouter();
  const [o, setO] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    apiGet<Overview>("/admin/overview").then((d) => { setO(d); setLoading(false); }).catch(() => setLoading(false));
  }, []));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceAlt }} edges={["top", "bottom"]} testID="admin-home">
      <BackBar title="Admin Console" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <Text style={styles.h1}>Operations Dashboard</Text>
        {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : (
          <View style={styles.grid}>
            <Stat k="Total Users" v={String(o?.total_users || 0)} />
            <Stat k="DAU" v={String(o?.daily_active_users || 0)} />
            <Stat k="Consultations" v={String(o?.total_consultations || 0)} />
            <Stat k="Leads" v={String(o?.total_leads || 0)} />
            <Stat k="AI Chats" v={String(o?.total_chats || 0)} />
            <Stat k="Schemes" v={String(o?.total_schemes || 0)} />
          </View>
        )}

        <Text style={styles.section}>Modules</Text>
        <View style={styles.navGrid}>
          {NAV.map((n) => (
            <TouchableOpacity key={n.id} testID={`admin-nav-${n.id}`} style={styles.navTile} onPress={() => router.push(`/admin/${n.id}` as any)}>
              <Text style={{ fontSize: 28 }}>{n.icon}</Text>
              <Text style={styles.navLabel}>{n.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statV}>{v}</Text>
      <Text style={styles.statK}>{k}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 12 },
  section: { fontSize: 14, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 20, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stat: { width: "31.5%", backgroundColor: "#FFF", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 12 },
  statV: { fontSize: 22, fontWeight: "800", color: colors.text },
  statK: { fontSize: 11, color: colors.textMuted, marginTop: 4, fontWeight: "600" },
  navGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  navTile: { width: "48%", backgroundColor: "#FFF", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 18, alignItems: "flex-start" },
  navLabel: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 10 },
});
