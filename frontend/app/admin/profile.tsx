/**
 * Admin Profile — matches the prototype's isProfile state, plus a
 * "Management" section linking to the existing CRM/back-office screens
 * (Users, Leads, Schemes, Banks, Analytics, Team, Settings) that the
 * prototype doesn't show at all. Per the "keep them, add a way in"
 * decision, those screens are untouched — this is their new entry point
 * now that they're off the tab bar. "Open cases" is real (leads assigned to
 * this admin); "Switch role" is the same placeholder toggle as Today/Cases.
 */
import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Bell, HelpCircle, LogOut, ChevronRight, Users, Target, Landmark, Banknote,
  BarChart2, Shield, Settings as SettingsIcon,
} from "lucide-react-native";

import { apiGet, apiLogout } from "@/src/api";
import { spacing } from "@/src/theme";
import { protoColors, protoSpacing } from "@/src/theme.proto";
import { useAdminMode, toggleAdminMode } from "@/src/hooks/useAdminMode";
import { canAccess } from "./_layout";

const MANAGEMENT_ITEMS = [
  { id: "users", label: "Users", Icon: Users, route: "/admin/users" },
  { id: "leads", label: "CRM / Leads", Icon: Target, route: "/admin/leads" },
  { id: "schemes", label: "Schemes", Icon: Landmark, route: "/admin/schemes" },
  { id: "banks", label: "Banks", Icon: Banknote, route: "/admin/banks" },
  { id: "consultations", label: "Consultations", Icon: BarChart2, route: "/admin/analytics" },
  { id: "team", label: "Team Members", Icon: Shield, route: "/admin/team" },
  { id: "settings", label: "Settings", Icon: SettingsIcon, route: "/admin/settings" },
] as const;

export default function AdminProfile() {
  const router = useRouter();
  const mode = useAdminMode();
  const [me, setMe] = useState<any>(null);
  const [openCases, setOpenCases] = useState(0);

  const load = useCallback(async () => {
    try {
      const u = await apiGet<any>("/auth/me");
      setMe(u);
      const mine = await apiGet<any[]>(`/admin/leads?assigned_to=${u.id}&limit=200`).catch(() => []);
      setOpenCases((mine || []).filter((l) => !["closed", "disbursed"].includes(l.stage)).length);
    } catch { /* not logged in / network */ }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const logout = async () => {
    const doLogout = async () => {
      await apiLogout();
      if (Platform.OS === "web") window.location.href = "/login";
      else router.replace("/login");
    };
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to logout?")) await doLogout();
    } else {
      Alert.alert("Logout", "Are you sure you want to logout?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: doLogout },
      ]);
    }
  };

  const roleLabel = me?.role ? me.role.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) : "Admin";
  // Matches the same canAccess(role, moduleId) gating the old admin
  // dashboard used — schemes/banks/team aren't in ROLE_PERMISSIONS for any
  // non-super_admin role, so (as before) only super_admin sees those three.
  const visibleManagement = MANAGEMENT_ITEMS.filter((m) => canAccess(me?.role || "", m.id));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: protoColors.primaryDark }} edges={["top"]} testID="admin-profile-screen">
      <ScrollView style={{ backgroundColor: protoColors.surfaceAlt }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(me?.full_name || "A")[0]?.toUpperCase()}</Text></View>
          <Text style={styles.name}>{me?.full_name || "—"}</Text>
          <Text style={styles.meta}>{roleLabel} · {me?.email || me?.mobile || ""}</Text>
        </View>

        <View style={styles.sheet}>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Open cases</Text>
              <Text style={styles.rowValue}>{openCases}</Text>
            </View>
            <View style={[styles.row, styles.rowLast]}>
              <Text style={styles.rowLabel}>Mode</Text>
              <Text style={styles.rowValue}>{mode === "ca" ? "CA" : "Reviewer"}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => { toggleAdminMode(); router.replace((mode === "ca" ? "/admin" : "/admin/cases") as any); }}
              testID="profile-switch-role"
            >
              <Text style={styles.rowLabel}>Switch role</Text>
              <View style={styles.pillNeutral}><Text style={styles.pillNeutralText}>{mode === "ca" ? "CA" : "Reviewer"}</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.row} onPress={() => router.push("/admin/notifications" as any)} testID="profile-notifications">
              <View style={styles.iconWrap}><Bell size={15} color={protoColors.primary} strokeWidth={2} /></View>
              <Text style={[styles.rowLabel, { flex: 1 }]}>Notifications</Text>
              <ChevronRight size={15} color={protoColors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.row, styles.rowLast]} onPress={() => router.push("/admin/support" as any)} testID="profile-help">
              <View style={styles.iconWrap}><HelpCircle size={15} color={protoColors.primary} strokeWidth={2} /></View>
              <Text style={[styles.rowLabel, { flex: 1 }]}>Help</Text>
              <ChevronRight size={15} color={protoColors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {visibleManagement.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Management</Text>
              <View style={styles.card}>
                {visibleManagement.map((m, i) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.row, i === visibleManagement.length - 1 && styles.rowLast]}
                    onPress={() => router.push(m.route as any)}
                    testID={`management-${m.id}`}
                  >
                    <View style={styles.iconWrap}><m.Icon size={15} color={protoColors.primary} strokeWidth={2} /></View>
                    <Text style={[styles.rowLabel, { flex: 1 }]}>{m.label}</Text>
                    <ChevronRight size={15} color={protoColors.textMuted} strokeWidth={2} />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <TouchableOpacity style={[styles.card, styles.logoutCard]} onPress={logout} testID="admin-logout-btn">
            <View style={[styles.row, styles.rowLast]}>
              <View style={[styles.iconWrap, styles.logoutIconWrap]}><LogOut size={15} color={protoColors.danger} strokeWidth={2} /></View>
              <Text style={[styles.rowLabel, { flex: 1, color: protoColors.danger }]}>Log out</Text>
              <ChevronRight size={15} color={protoColors.danger} strokeWidth={2} />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: protoColors.primaryDark, alignItems: "center", paddingTop: protoSpacing.lg, paddingBottom: 22, gap: 6 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: protoColors.accent, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  avatarText: { fontSize: 22, fontWeight: "700", color: "#FFFFFF" },
  name: { fontSize: 17, color: "#FFFFFF", fontWeight: "700" },
  meta: { fontSize: 12, color: "rgba(255,255,255,0.6)" },
  sheet: { backgroundColor: protoColors.surfaceAlt, borderTopLeftRadius: 29, borderTopRightRadius: 29, marginTop: -18, padding: spacing.md, gap: 13, minHeight: 300 },
  sectionLabel: { fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase", color: protoColors.textDim, fontWeight: "700", marginLeft: 4, marginTop: 4 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 19, paddingHorizontal: 14 },
  logoutCard: { marginBottom: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: protoColors.border },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 13.5, color: protoColors.text, fontWeight: "600" },
  rowValue: { fontSize: 13.5, color: protoColors.textMuted },
  iconWrap: { width: 30, height: 30, borderRadius: 10, backgroundColor: protoColors.pill.teal.bg, alignItems: "center", justifyContent: "center" },
  logoutIconWrap: { backgroundColor: "#FBE7E2" },
  pillNeutral: { backgroundColor: protoColors.pill.neutral.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillNeutralText: { fontSize: 11, fontWeight: "600", color: protoColors.pill.neutral.text },
});
