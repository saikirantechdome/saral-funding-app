import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Users, Phone, Target, Landmark, FolderOpen,
  TrendingUp, MessageSquare, ChevronRight, Percent, Eye, Settings, Shield, Bell, BarChart2,
} from "lucide-react-native";

import { colors, spacing, radius, fonts, tints } from "@/src/theme";
import { apiGet } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import { SkeletonBox } from "@/src/components/SkeletonLoader";
import { canAccess } from "./_layout";

type Overview = {
  total_users: number; total_admins: number; total_schemes: number;
  total_consultations: number; total_leads: number; total_chats: number;
  daily_active_users: number; conversion_rate: number;
  scheme_views: number; bank_recommendation_views: number;
};

const ALL_MODULES = [
  { id: "users",         label: "Users",          sub: "Manage & view",         Icon: Users,     color: colors.primarySoft, iconColor: colors.primaryDark },
  { id: "consultations", label: "Consultations",  sub: "Track & update",        Icon: Phone,     color: tints.deepTeal.bg, iconColor: tints.deepTeal.fg },
  { id: "leads",         label: "CRM / Leads",    sub: "Pipeline & stages",     Icon: Target,    color: tints.amber.bg, iconColor: tints.amber.fg },
  { id: "schemes",       label: "Schemes",         sub: "Enable & disable",      Icon: Landmark,  color: tints.red.bg, iconColor: tints.red.fg },
  { id: "documents",    label: "Documents",       sub: "Review & approve docs", Icon: FolderOpen, color: tints.teal.bg, iconColor: tints.teal.fg },
  { id: "analytics",    label: "Analytics",       sub: "Charts & trends",       Icon: BarChart2, color: tints.blue.bg, iconColor: tints.blue.fg },
  { id: "notifications",label: "Notifications",   sub: "Broadcast to all users",Icon: Bell,      color: tints.amber.bg, iconColor: tints.amber.fg },
  { id: "team",          label: "Team Members",   sub: "Invite & manage roles", Icon: Shield,    color: tints.deepTeal.bg, iconColor: tints.deepTeal.fg },
  { id: "settings",     label: "Settings",        sub: "App configuration",     Icon: Settings,  color: tints.neutral.bg, iconColor: tints.neutral.fg },
];

function StatCard({ label, value, Icon, color, iconColor }: { label: string; value: string; Icon: any; color: string; iconColor: string }) {
  return (
    <View style={[statStyles.card]}>
      <View style={[statStyles.icon, { backgroundColor: color }]}>
        <Icon size={14} color={iconColor} strokeWidth={2} />
      </View>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    width: "31%",
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  icon: { width: 28, height: 28, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  value: { fontSize: 20, fontFamily: fonts.displayBold, color: colors.text, lineHeight: 24 },
  label: { fontSize: 10, fontFamily: fonts.medium, color: colors.textMuted, marginTop: 3, lineHeight: 14 },
});

export default function AdminHome() {
  const router = useRouter();
  const [o, setO] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("super_admin");

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        apiGet<Overview>("/admin/overview"),
        apiGet<any>("/auth/me"),
      ]).then(([overview, me]) => {
        setO(overview);
        setUserRole(me?.role ?? "super_admin");
        setLoading(false);
      }).catch(() => setLoading(false));
    }, [])
  );

  const visibleModules = ALL_MODULES.filter((m) => canAccess(userRole, m.id));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]} testID="admin-home">
      <BackBar title="Admin Console" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* Stats grid */}
        <Text style={styles.sectionLabel}>Overview</Text>
        {loading ? (
          <View style={styles.statsGrid}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <SkeletonBox key={i} width="31%" height={90} borderRadius={radius.xl} />
            ))}
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <StatCard label="Total Users" value={String(o?.total_users ?? 0)} Icon={Users} color={colors.primarySoft} iconColor={colors.primaryDark} />
            <StatCard label="Daily Active" value={String(o?.daily_active_users ?? 0)} Icon={TrendingUp} color={tints.blue.bg} iconColor={tints.blue.fg} />
            <StatCard label="AI Chats" value={String(o?.total_chats ?? 0)} Icon={MessageSquare} color={tints.deepTeal.bg} iconColor={tints.deepTeal.fg} />
            <StatCard label="Consultations" value={String(o?.total_consultations ?? 0)} Icon={Phone} color={tints.amber.bg} iconColor={tints.amber.fg} />
            <StatCard label="Leads" value={String(o?.total_leads ?? 0)} Icon={Target} color={tints.red.bg} iconColor={tints.red.fg} />
            <StatCard label="Schemes" value={String(o?.total_schemes ?? 0)} Icon={Landmark} color={colors.surfaceAlt} iconColor={colors.textMuted} />
            <StatCard label="Conversion" value={`${o?.conversion_rate ?? 0}%`} Icon={Percent} color={tints.teal.bg} iconColor={tints.teal.fg} />
            <StatCard label="Scheme Views" value={String(o?.scheme_views ?? 0)} Icon={Eye} color={tints.neutral.bg} iconColor={tints.neutral.fg} />
          </View>
        )}

        {/* Role badge */}
        <View style={styles.roleBadgeRow}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Role: {userRole.replace("_", " ").toUpperCase()}</Text>
          </View>
        </View>

        {/* Modules */}
        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Modules</Text>
        <View style={styles.modulesGrid}>
          {visibleModules.map((m) => (
            <TouchableOpacity
              key={m.id}
              testID={`admin-nav-${m.id}`}
              style={styles.moduleTile}
              onPress={() => router.push(`/admin/${m.id}` as any)}
              activeOpacity={0.85}
            >
              <View style={[styles.moduleIcon, { backgroundColor: m.color }]}>
                <m.Icon size={20} color={m.iconColor} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.moduleLabel}>{m.label}</Text>
                <Text style={styles.moduleSub}>{m.sub}</Text>
              </View>
              <ChevronRight size={15} color={colors.textDim} strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  roleBadgeRow: {
    marginTop: 12,
    flexDirection: "row",
  },
  roleBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  roleBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
    letterSpacing: 0.4,
  },
  modulesGrid: {
    gap: 8,
  },
  moduleTile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  moduleIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleLabel: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  moduleSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 1,
  },
});
