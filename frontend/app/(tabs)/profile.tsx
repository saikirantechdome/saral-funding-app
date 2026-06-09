import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { colors, spacing, radius } from "@/src/theme";
import { apiGet, clearToken } from "@/src/api";

export default function Profile() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [bp, setBp] = useState<any>(null);

  useFocusEffect(useCallback(() => {
    Promise.all([apiGet<any>("/auth/me"), apiGet<any>("/business-profile").catch(() => ({}))])
      .then(([u, b]) => { setMe(u); setBp(b); });
  }, []));

  const logout = async () => {
    await clearToken();
    router.replace("/login");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceAlt }} edges={["top"]} testID="profile-tab">
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}>
        <View style={styles.head}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(me?.full_name || "U").charAt(0).toUpperCase()}</Text></View>
          <Text style={styles.name}>{me?.full_name || "Guest"}</Text>
          <Text style={styles.mobile}>+91 {me?.mobile}</Text>
        </View>

        <Section title="Personal">
          <Row label="State" value={me?.state} />
          <Row label="District" value={me?.district} />
          <Row label="Gender" value={me?.gender} />
          <Row label="Age" value={me?.age?.toString()} />
          <Row label="Category" value={me?.category} />
        </Section>

        {bp?.industry && (
          <Section title="Business">
            <Row label="Stage" value={bp?.business_stage} />
            <Row label="Industry" value={bp?.industry} />
            <Row label="Funding Required" value={bp?.funding_required ? `₹${bp.funding_required.toLocaleString("en-IN")}` : "—"} />
            <Row label="GST" value={bp?.gst_available ? "Yes" : "No"} />
            <Row label="Udyam" value={bp?.udyam_available ? "Yes" : "No"} />
          </Section>
        )}

        <View style={styles.actions}>
          <TouchableOpacity testID="goto-bookings" style={styles.action} onPress={() => router.push("/booking")}><Text style={styles.actionText}>📞  Book Consultation</Text><Text style={styles.chev}>›</Text></TouchableOpacity>
          <TouchableOpacity testID="goto-notif" style={styles.action} onPress={() => router.push("/notifications")}><Text style={styles.actionText}>🔔  Notifications</Text><Text style={styles.chev}>›</Text></TouchableOpacity>
          <TouchableOpacity testID="goto-settings" style={styles.action} onPress={() => router.push("/settings")}><Text style={styles.actionText}>⚙️  Settings</Text><Text style={styles.chev}>›</Text></TouchableOpacity>
          <TouchableOpacity testID="logout-btn" style={[styles.action, { borderColor: colors.danger }]} onPress={logout}><Text style={[styles.actionText, { color: colors.danger }]}>Logout</Text><Text style={[styles.chev, { color: colors.danger }]}>›</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: any) {
  return (<View style={{ marginBottom: spacing.md }}><Text style={styles.secTitle}>{title}</Text><View style={styles.card}>{children}</View></View>);
}
function Row({ label, value }: { label: string; value?: string }) {
  return (<View style={styles.row}><Text style={styles.rowL}>{label}</Text><Text style={styles.rowV}>{value || "—"}</Text></View>);
}

const styles = StyleSheet.create({
  head: { alignItems: "center", paddingVertical: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 32, fontWeight: "800", color: "#FFF" },
  name: { fontSize: 20, fontWeight: "800", color: colors.text, marginTop: 12 },
  mobile: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  secTitle: { fontSize: 12, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: "#FFF", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowL: { fontSize: 14, color: colors.textMuted },
  rowV: { fontSize: 14, fontWeight: "600", color: colors.text },
  actions: { marginTop: 8 },
  action: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFF", borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 16, marginBottom: 8 },
  actionText: { fontSize: 15, fontWeight: "600", color: colors.text },
  chev: { fontSize: 20, color: colors.textMuted },
});
