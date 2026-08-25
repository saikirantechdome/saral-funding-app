import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Image,
  Modal,
  Share,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Bell, ChevronRight, Phone, Building2, TrendingUp, AlertCircle, Calendar, Landmark,
  Users, Target, BarChart2, FolderOpen as FolderIcon, Settings, Shield, MessageCircle,
  Banknote, Video, Copy, X, Hourglass, Headset,
} from "lucide-react-native";

import { colors, spacing, radius, fonts, formatINR, elevation, tints, gradients, stageColor } from "@/src/theme";
import { protoColors, protoSpacing, protoFonts } from "@/src/theme.proto";
import { apiGet, apiPost } from "@/src/api";
import { DashboardSkeleton, SkeletonBox } from "@/src/components/SkeletonLoader";
import ReadinessRing from "@/src/components/ReadinessRing";
import RemoteIcon from "@/src/components/RemoteIcon";
import InitialsAvatar from "@/src/components/InitialsAvatar";
import BankBadge from "@/src/components/BankBadge";
import ProtoRing from "@/src/components/proto/ProtoRing";
import ProtoButton from "@/src/components/proto/ProtoButton";
import { journeyProgress, STAGES } from "@/src/utils/stageProgress";
import { schemeStyle } from "@/src/utils/schemeType";
import { useTabBarSpacing } from "@/src/hooks/useTabBarSpacing";

type Match = { scheme_id: string; name: string; score: number; funding_estimate: number; subsidy_estimate: number; reason: string };
type DashData = { matches: Match[]; funding_estimate: number; subsidy_estimate: number; readiness_score: number };
type BankRec = { bank_id: string; name: string; short_name: string; score: number; interest_range: string; why: string };
type ReadinessAction = { title: string; detail: string; weight: string };
type Readiness = { score: number; max: number; actions: ReadinessAction[] };
type Overview = {
  total_users: number; total_admins: number; total_schemes: number;
  total_consultations: number; total_leads: number; total_chats: number;
  daily_active_users: number; conversion_rate: number;
  scheme_views: number; bank_recommendation_views: number;
  total_banks: number; total_documents: number;
};
// Normalized shape for the admin dashboard's Overview pipeline breakdown —
// built from either /admin/leads (stage) or /admin/consultations (status),
// whichever this admin's role can access. See `pipelineBucket` below.
type PipelineItem = { id: string; name: string; stage: string; created_at: string };

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["users", "consultations", "leads", "settings"],
  manager: ["users", "consultations", "leads"],
  expert: ["consultations"],
  sales_executive: ["leads"],
  support_executive: ["consultations", "leads"],
};

function canAccess(role: string, module: string): boolean {
  if (role === "super_admin") return true;
  return (ROLE_PERMISSIONS[role] ?? []).includes(module);
}

// Buckets a lead `stage` or consultation `status` into the New / In Progress
// / Approved / Rejected groups the admin dashboard's Overview card shows.
// The two source vocabularies overlap enough (both use "new", "approved",
// "closed") for one function to cover either. Mirrors the spirit of
// `appBucket` in my-applications.tsx, adapted to this domain's stage
// vocab — which has no literal "rejected" value; "closed" is the terminal
// non-conversion outcome here (see its X-circle icon in admin/consultations.tsx).
function pipelineBucket(stage: string): "new" | "inProgress" | "approved" | "rejected" {
  if (stage === "new") return "new";
  if (stage === "closed") return "rejected";
  if (stage === "approved" || stage === "disbursed") return "approved";
  return "inProgress";
}

// Mirrors the relative-time formatter already used in the admin support
// inbox (admin/support/index.tsx) — small and presentational enough that
// repeating it locally (this codebase already repeats small per-screen
// helpers like STAGES across admin/leads.tsx and admin/lead/[id].tsx) beats
// adding a new shared export for one line of formatting.
function formatRelative(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 172800000) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const STAT_DEFS = [
  { id: "users",         label: "Total Users",   Icon: Users,      color: tints.green.bg,    iconColor: tints.green.fg,    route: "/admin/users",         key: "total_users" },
  { id: "consultations", label: "Consultations", Icon: Phone,      color: tints.amber.bg,    iconColor: tints.amber.fg,    route: "/admin/consultations", key: "total_consultations" },
  { id: "leads",         label: "Leads",          Icon: Target,     color: tints.red.bg,      iconColor: tints.red.fg,      route: "/admin/leads",         key: "total_leads" },
  { id: "schemes",       label: "Schemes",        Icon: Landmark,   color: tints.neutral.bg,  iconColor: tints.neutral.fg,  route: "/admin/schemes",       key: "total_schemes" },
  { id: "banks",         label: "Banks",          Icon: Banknote,   color: tints.blue.bg,     iconColor: tints.blue.fg,     route: "/admin/banks",         key: "total_banks" },
  { id: "documents",     label: "Documents",      Icon: FolderIcon, color: tints.teal.bg,     iconColor: tints.teal.fg,     route: "/(tabs)/documents",    key: "total_documents" },
  { id: "team",          label: "Team Members",   Icon: Shield,     color: tints.deepTeal.bg, iconColor: tints.deepTeal.fg, route: "/admin/team",          key: "total_admins" },
] as const;

// Decorative marketing tiles for the bottom of the user home screen — no
// data binding, purely reassurance copy per the Figma reference.
const MARKETING_TILES = [
  { id: "secure",  slug: "shield",         title: "100% Secure",         desc: "Bank-level security to protect your data", tint: tints.teal,     Fallback: Shield },
  { id: "quick",   slug: "hourglass",      title: "Quick Process",       desc: "Fast-track approvals and disbursals",       tint: tints.deepTeal, Fallback: Hourglass },
  { id: "support", slug: "online-support", title: "Expert Support",     desc: "Get guidance from our loan experts",         tint: tints.amber,    Fallback: Headset },
  { id: "grow",    slug: "target",         title: "Grow Your Business", desc: "Better funding for bigger dreams",           tint: tints.blue,     Fallback: Target },
] as const;

const ALL_MODULES = [
  { id: "users",         label: "Users",          sub: "Manage & view",         Icon: Users,       color: tints.green.bg,    iconColor: tints.green.fg },
  { id: "consultations", label: "Consultations",  sub: "Track & update",        Icon: Phone,       color: tints.deepTeal.bg, iconColor: tints.deepTeal.fg },
  { id: "leads",         label: "CRM / Leads",    sub: "Pipeline & stages",     Icon: Target,      color: tints.amber.bg,    iconColor: tints.amber.fg },
  { id: "schemes",       label: "Schemes",         sub: "Enable & disable",      Icon: Landmark,    color: tints.red.bg,      iconColor: tints.red.fg },
  { id: "banks",         label: "Banks",            sub: "Assign & manage banks", Icon: Banknote,    color: tints.blue.bg,     iconColor: tints.blue.fg },
  { id: "documents",    label: "Documents",       sub: "Review & approve docs", Icon: FolderIcon,  color: tints.teal.bg,     iconColor: tints.teal.fg },
  { id: "analytics",    label: "Analytics",       sub: "Charts & trends",       Icon: BarChart2,   color: tints.blue.bg,     iconColor: tints.blue.fg },
  { id: "settings",     label: "Settings",        sub: "App configuration",     Icon: Settings,    color: tints.deepTeal.bg, iconColor: tints.deepTeal.fg },
  { id: "team",          label: "Team Members",   sub: "Invite & manage roles", Icon: Shield,      color: tints.neutral.bg,  iconColor: tints.neutral.fg },
];

function StatCard({ label, value, Icon, color, iconColor, onPress, testID }: { label: string; value?: string; Icon: any; color: string; iconColor: string; onPress?: () => void; testID?: string }) {
  return (
    <TouchableOpacity
      testID={testID}
      style={statStyles.card}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}
    >
      <View style={[statStyles.icon, { backgroundColor: color }]}>
        <Icon size={14} color={iconColor} strokeWidth={2} />
      </View>
      {value != null && <Text style={statStyles.value}>{value}</Text>}
      <Text style={[statStyles.label, value == null && { marginTop: 8 }]}>{label}</Text>
    </TouchableOpacity>
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

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashData | null>(null);
  const [user, setUser] = useState<any>(null);
  const [next, setNext] = useState<any>(null);
  const [meetModal, setMeetModal] = useState(false);
  const [bankRec, setBankRec] = useState<BankRec | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [pipelineItems, setPipelineItems] = useState<PipelineItem[]>([]);
  const [hasAssignedSchemes, setHasAssignedSchemes] = useState(false);
  const [hasAssignedBanks, setHasAssignedBanks] = useState(false);
  const [statCounts, setStatCounts] = useState({ applications: 0, documents: 0, consultations: 0, schemes: 0 });
  // Raw records (not just derived counts) for the revamped Home's status
  // card + document tile — see USER_SIDE_REVAMP_PLAN.md.
  const [rawDocs, setRawDocs] = useState<any[]>([]);
  const [rawApps, setRawApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [supportUnread, setSupportUnread] = useState(0);
  const hasLoadedOnce = useRef(false);
  const insets = useSafeAreaInsets();
  // Smaller than the default clearance — this screen's content is a fixed,
  // bounded set of sections (not an open-ended list), so the far-tighter
  // margin doesn't risk the last row hiding behind the tab bar the way an
  // unbounded list could.
  const tabBarSpacing = useTabBarSpacing(-36);

  useFocusEffect(useCallback(() => {
    if (!user) return;
    const isAdminRole = user.role && user.role !== "user";
    const path = isAdminRole ? "/admin/support/unread-count" : "/support/unread-count";
    apiGet<{ unread_count: number }>(path)
      .then((r) => setSupportUnread(r.unread_count || 0))
      .catch(() => {});
  }, [user?.role]));

  const load = useCallback(async () => {
    try {
      const me = await apiGet<any>("/auth/me");
      setUser(me);

      if (me?.role && me.role !== "user") {
        // Admin: fetch the overview aggregate, plus a lightweight pipeline
        // list to bucket into the dashboard's New/In Progress/Approved/
        // Rejected breakdown — leads via the same endpoint the Leads screen
        // uses, for roles that can see leads; otherwise consultations (whose
        // status vocab buckets the same way) for roles like "expert" that
        // can't. Also this admin's own unread notifications, for the bell badge.
        const usingLeads = canAccess(me.role, "leads");
        const [ov, rawItems, notif] = await Promise.all([
          apiGet<Overview>("/admin/overview").catch(() => null),
          usingLeads
            ? apiGet<any[]>("/admin/leads").catch(() => [])
            : canAccess(me.role, "consultations")
              ? apiGet<any[]>("/admin/consultations").catch(() => [])
              : Promise.resolve([] as any[]),
          apiGet<any[]>("/notifications/me").catch(() => []),
        ]);
        setOverview(ov);
        setPipelineItems((rawItems || []).map((it: any): PipelineItem => (
          usingLeads
            ? { id: it.id, name: it.full_name || "Unknown", stage: it.stage, created_at: it.created_at }
            : { id: it.id, name: it.user?.full_name || "Unknown", stage: it.status, created_at: it.created_at }
        )));
        setAlerts((notif || []).filter((n: any) => !n.read));
      } else {
        // Normal user: fetch full dashboard data
        const [m, c, banks, ready, mySchemes, myBanks, docs] = await Promise.all([
          apiGet<DashData>("/match/me"),
          apiGet<any[]>("/consultations/me").catch(() => []),
          apiGet<{ recommendations: BankRec[] }>("/banks/recommend/me").catch(() => ({ recommendations: [] })),
          apiGet<Readiness>("/readiness/me").catch(() => null),
          apiGet<any[]>("/my/scheme-applications").catch(() => []),
          apiGet<any[]>("/my/bank-assignments").catch(() => []),
          apiGet<any[]>("/documents/me").catch(() => []),
        ]);

        setStatCounts({
          applications: (mySchemes || []).filter((s: any) => !["rejected", "disbursed"].includes(s.stage)).length,
          documents: (docs || []).length,
          consultations: (c || []).length,
          schemes: (m?.matches || []).length,
        });
        setRawDocs(docs || []);
        setRawApps(mySchemes || []);

        // Only keep matches for schemes/banks actually assigned to this user
        const assignedSchemeIds = new Set((mySchemes || []).map((s: any) => s.scheme_id));
        const assignedBankIds   = new Set((myBanks  || []).map((b: any) => b.bank_id));

        const filteredMatches = assignedSchemeIds.size > 0
          ? (m?.matches || []).filter((match: any) => assignedSchemeIds.has(match.scheme_id))
          : [];
        const filteredBankRec = assignedBankIds.size > 0
          ? ((banks.recommendations || []).find((r: BankRec) => assignedBankIds.has(r.bank_id)) ?? null)
          : null;

        setHasAssignedSchemes(assignedSchemeIds.size > 0);
        setHasAssignedBanks(assignedBankIds.size > 0);
        setData({ ...m, matches: filteredMatches });
        setNext((c || []).find((x: any) => ["new", "confirmed", "called", "follow_up", "interested"].includes(x.status)) || null);
        setBankRec(filteredBankRec);
        setReadiness(ready);
        apiPost<{ new_alerts: any[] }>("/alerts/evaluate", {}).catch(() => {});
        const notif = await apiGet<any[]>("/notifications/me").catch(() => []);
        setAlerts(notif.filter((n: any) => !n.read).slice(0, 3));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      hasLoadedOnce.current = true;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Only show the full skeleton on the very first load. On later tab
      // switches, refresh silently in the background so the dashboard
      // doesn't flash back to a loading state every time it regains focus.
      if (!hasLoadedOnce.current) {
        setLoading(true);
      }
      load();
    }, [load])
  );

  const isAdmin = user?.role && user.role !== "user";
  const score = readiness?.score ?? data?.readiness_score ?? 0;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top"]}>
        <DashboardSkeleton />
      </SafeAreaView>
    );
  }

  // ── Admin Console View ──
  if (isAdmin) {
    const visibleModules = ALL_MODULES.filter((m) => canAccess(user.role, m.id));

    // Prefer the leads pipeline for the Overview breakdown (same data the
    // Leads screen shows); a role without leads access (only "expert" today)
    // falls back to the consultations pipeline instead — never show a
    // breakdown sourced from a module this role can't otherwise see.
    const usingLeads = canAccess(user.role, "leads");
    const pipelineCounts = pipelineItems.reduce(
      (acc, it) => { acc[pipelineBucket(it.stage)]++; return acc; },
      { new: 0, inProgress: 0, approved: 0, rejected: 0 }
    );
    const heroTotal = usingLeads ? (overview?.total_leads ?? 0) : (overview?.total_consultations ?? 0);
    const heroTotalLabel = usingLeads ? "Total Leads" : "Total Consultations";
    const pipelineViewAllRoute = usingLeads ? "/admin/leads" : "/admin/consultations";
    const pipelineStats = [
      { id: "new",         label: "New",         value: pipelineCounts.new },
      { id: "in-progress", label: "In Progress", value: pipelineCounts.inProgress },
      { id: "approved",    label: "Approved",    value: pipelineCounts.approved },
      { id: "rejected",    label: "Rejected",    value: pipelineCounts.rejected },
    ];

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top"]} testID="admin-home-tab">
        <ScrollView
          style={{ flex: 1, marginBottom: tabBarSpacing }}
          contentContainerStyle={{ paddingBottom: 4 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoWrap}>
              <Image
                source={require("../../assets/images/logo-icon.png")}
                style={styles.logoIcon}
                resizeMode="contain"
              />
              <View>
                <Text style={styles.logoName}>SARAL</Text>
                <Text style={styles.logoTagline}>Admin Dashboard</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                testID="support-btn"
                onPress={() => router.push("/admin/support" as any)}
                style={styles.headerBtn}
              >
                <MessageCircle size={17} color={colors.text} strokeWidth={2} />
                {supportUnread > 0 && <View style={styles.badgeDot} />}
              </TouchableOpacity>
              <TouchableOpacity
                testID="bell-btn"
                onPress={() => router.push("/notifications")}
                style={styles.headerBtn}
              >
                <Bell size={17} color={colors.text} strokeWidth={2} />
                {alerts.length > 0 && (
                  <View style={adStyles.countBadge}>
                    <Text style={adStyles.countBadgeText}>{alerts.length > 9 ? "9+" : alerts.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                testID="admin-avatar-btn"
                onPress={() => router.push("/(tabs)/profile" as any)}
                activeOpacity={0.8}
              >
                <InitialsAvatar name={user?.full_name || "Admin"} size={32} variant="staff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ paddingHorizontal: spacing.md }}>
            {/* Greeting */}
            <Text style={styles.pageGreeting}>
              Hi, {user.role.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
            </Text>
            <Text style={styles.pageGreetingSub}>Here's what's happening today</Text>

            {/* Overview: headline pipeline total + stage breakdown, on a dark gradient */}
            <LinearGradient
              colors={gradients.heroCompact}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={adStyles.heroCard}
              testID="admin-home-hero"
            >
              <Text style={adStyles.heroLabel}>Overview</Text>

              <Text style={adStyles.heroStatVal}>{heroTotal}</Text>
              <Text style={adStyles.heroStatCaption}>{heroTotalLabel}</Text>

              <View style={adStyles.pipelineGrid}>
                {pipelineStats.map((p) => (
                  <View key={p.id} testID={`overview-stat-${p.id}`} style={adStyles.pipelineBox}>
                    <Text style={adStyles.pipelineVal}>{p.value}</Text>
                    <Text style={adStyles.pipelineLabel}>{p.label}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>

            {/* Quick Access */}
            <View style={[adStyles.sectionHeaderRow, { marginTop: 20 }]}>
              <Text style={adStyles.sectionLabel}>Quick Access</Text>
            </View>
            <View style={adStyles.modulesGrid}>
              {visibleModules.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  testID={`admin-nav-${m.id}`}
                  style={adStyles.moduleTile}
                  onPress={() => router.push((m.id === "documents" ? "/(tabs)/documents" : `/admin/${m.id}`) as any)}
                  activeOpacity={0.85}
                >
                  <View style={[adStyles.moduleIcon, { backgroundColor: m.color }]}>
                    <m.Icon size={19} color={m.iconColor} strokeWidth={2} />
                  </View>
                  <Text style={adStyles.moduleLabel} numberOfLines={2}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Normal User Home View (matches Saral User Prototype.dc.html) ──
  // Note: the approved prototype's Home only shows the status card, a
  // conditional action/review card, and Documents/Chat tiles — it has no
  // bank-match, scheme-match, WhatsApp, consultation, or marketing sections,
  // so those are intentionally dropped here rather than adapted. Those
  // features (Banks, Schemes, Booking, WhatsApp) still work, just aren't
  // linked from Home anymore since the prototype doesn't place them here —
  // flagged in USER_SIDE_REVAMP_PLAN.md for a follow-up decision on where
  // they should live.
  const journey = journeyProgress(rawApps);
  const rejectedDoc = rawDocs.find((d: any) => d.status === "rejected");

  return (
    // Base is the sheet's own color, not the hero's dark green — the hero
    // gradient paints over the top itself, but when the sheet's content is
    // shorter than the screen, whatever's left behind the ScrollView shows
    // through below it, and that needs to match the sheet, not the hero.
    <View style={{ flex: 1, backgroundColor: protoColors.surfaceAlt }} testID="dashboard-screen">
      <SafeAreaView style={{ flex: 1, backgroundColor: protoColors.primaryDark }} edges={["top"]}>
        <ScrollView
          // No marginBottom here — that shrinks the ScrollView's own box,
          // leaving a gap below it that isn't covered by its background and
          // falls through to the dark SafeAreaView behind it (looked like a
          // black strip behind the floating tab bar). Clearance for the tab
          // bar instead comes from padding *inside* the scroll content, which
          // this light background still covers.
          style={{ flex: 1, backgroundColor: protoColors.surfaceAlt }}
          contentContainerStyle={{ paddingBottom: tabBarSpacing, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor="#FFFFFF"
            />
          }
        >
          <LinearGradient
            colors={protoColors.heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={homeStyles.hero}
          >
            <View style={homeStyles.headerRow}>
              <TouchableOpacity testID="home-avatar-btn" onPress={() => router.push("/(tabs)/profile" as any)} activeOpacity={0.8}>
                <View style={homeStyles.avatar}>
                  <Text style={homeStyles.avatarText}>{(user?.full_name || "U").trim()[0]?.toUpperCase()}</Text>
                </View>
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: protoSpacing.sm }}>
                <Text style={homeStyles.greetingSmall}>{greeting}</Text>
                <Text style={homeStyles.greetingName}>{user?.full_name ? user.full_name.split(" ")[0] : "there"}</Text>
              </View>
              <TouchableOpacity testID="bell-btn" onPress={() => router.push("/notifications")} style={homeStyles.bell}>
                <Bell size={18} color="#FFFFFF" strokeWidth={2} />
                {alerts.length > 0 && <View style={homeStyles.bellDot} />}
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <View style={homeStyles.sheet}>
            {/* Status card */}
            <TouchableOpacity
              testID="home-status-card"
              style={homeStyles.card}
              onPress={() => router.push("/(tabs)/status" as any)}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: protoSpacing.sm }}>
                <ProtoRing percent={journey.percent} />
                <View style={{ flex: 1 }}>
                  <Text style={homeStyles.eyebrow}>Stage {journey.stageIndex + 1} of {STAGES.length}</Text>
                  <Text style={homeStyles.cardTitle}>{journey.stageLabel}</Text>
                </View>
                <ChevronRight size={18} color={protoColors.textMuted} strokeWidth={2} />
              </View>
              <View style={homeStyles.strip}>
                {STAGES.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      homeStyles.stripSeg,
                      i < journey.stageIndex && homeStyles.stripOn,
                      i === journey.stageIndex && homeStyles.stripAct,
                    ]}
                  />
                ))}
              </View>
            </TouchableOpacity>

            {/* Conditional action / review card */}
            {rejectedDoc ? (
              <View style={homeStyles.amberCard} testID="home-action-card">
                <View style={homeStyles.pillRow}>
                  <View style={homeStyles.pillAmber}><Text style={homeStyles.pillAmberText}>Action</Text></View>
                  <Text style={homeStyles.pillRowRight} numberOfLines={1}>{rejectedDoc.doc_type}</Text>
                </View>
                <ProtoButton variant="amber" label="Upload clearer copy" onPress={() => router.push("/documents" as any)} />
              </View>
            ) : rawDocs.length > 0 ? (
              <View style={homeStyles.card} testID="home-review-card">
                <View style={homeStyles.pillRow}>
                  <View style={homeStyles.pillBlue}><Text style={homeStyles.pillBlueText}>Under review</Text></View>
                  <Text style={homeStyles.pillRowRight}>Our team</Text>
                </View>
                <Text style={homeStyles.cardBody}>
                  {rawDocs.length} document{rawDocs.length === 1 ? "" : "s"} sent — we'll update you here
                </Text>
              </View>
            ) : null}

            {/* Documents / Chat tiles — flat placeholder icon boxes matching
                the prototype's `.s-ico`, with a fitting icon inside each. */}
            <View style={homeStyles.grid2}>
              <TouchableOpacity testID="home-docs-tile" style={homeStyles.tile} onPress={() => router.push("/(tabs)/documents" as any)} activeOpacity={0.85}>
                <View style={homeStyles.tileIcon}>
                  <FolderIcon size={16} color={protoColors.primary} strokeWidth={2} />
                </View>
                <Text style={homeStyles.tileTitle}>Documents</Text>
                <Text style={homeStyles.cardBody}>{rawDocs.length ? `${rawDocs.filter((d: any) => d.status === "verified").length} of ${rawDocs.length} approved` : "No documents yet"}</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="home-chat-tile" style={homeStyles.tile} onPress={() => router.push("/(tabs)/support" as any)} activeOpacity={0.85}>
                <View style={homeStyles.tileIcon}>
                  <MessageCircle size={16} color={protoColors.primary} strokeWidth={2} />
                </View>
                <Text style={homeStyles.tileTitle}>Chat</Text>
                <Text style={homeStyles.cardBody}>Chat with our team</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const homeStyles = StyleSheet.create({
  hero: {
    paddingTop: spacing.sm2,
    paddingHorizontal: spacing.md,
    paddingBottom: 26,
  },
  headerRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: protoColors.accent,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontFamily: protoFonts.regular, color: "#FFFFFF" },
  greetingSmall: { fontSize: 11, fontFamily: protoFonts.regular, color: "rgba(255,255,255,0.6)" },
  greetingName: { fontSize: 17, color: "#FFFFFF", fontFamily: protoFonts.regular, marginTop: 1 },
  bell: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  bellDot: {
    position: "absolute", top: 9, right: 9,
    width: 7, height: 7, borderRadius: 4, backgroundColor: protoColors.amber,
  },
  sheet: {
    backgroundColor: protoColors.surfaceAlt,
    borderTopLeftRadius: 29,
    borderTopRightRadius: 29,
    marginTop: -18,
    padding: spacing.md,
    gap: 13,
    minHeight: 200,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    padding: 15,
    gap: 10,
  },
  eyebrow: {
    fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase",
    color: protoColors.textDim, fontFamily: protoFonts.regular,
  },
  cardTitle: { fontSize: 15, color: protoColors.text, marginTop: 2, fontFamily: protoFonts.regular },
  cardBody: { fontSize: 12, color: protoColors.textMuted, fontFamily: protoFonts.regular },
  strip: { flexDirection: "row", gap: 6 },
  stripSeg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: "#E1E9E6" },
  stripOn: { backgroundColor: protoColors.accent },
  stripAct: { backgroundColor: protoColors.amber },
  amberCard: {
    backgroundColor: protoColors.amberSoft,
    borderRadius: 19,
    padding: 15,
    gap: 10,
  },
  pillRow: { flexDirection: "row", alignItems: "center" },
  pillRowRight: { flex: 1, textAlign: "right", fontSize: 12, color: protoColors.textMuted, fontFamily: protoFonts.regular },
  pillAmber: { backgroundColor: protoColors.pill.amber.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  pillAmberText: { fontSize: 11, color: protoColors.pill.amber.text, fontFamily: protoFonts.regular },
  pillBlue: { backgroundColor: protoColors.pill.blue.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  pillBlueText: { fontSize: 11, color: protoColors.pill.blue.text, fontFamily: protoFonts.regular },
  grid2: { flexDirection: "row", gap: 12 },
  tile: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 19, padding: 15, gap: 5 },
  tileIcon: {
    // Flat placeholder background matching the prototype's `.s-ico`, with a
    // fitting icon inside.
    width: 34, height: 34, borderRadius: 12,
    backgroundColor: protoColors.iconPlaceholder,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  tileTitle: { fontSize: 13, color: protoColors.text, fontFamily: protoFonts.regular },
});

const adStyles = StyleSheet.create({
  sectionLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroCard: {
    borderRadius: radius.xxl,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: "rgba(255,255,255,0.72)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroStatVal: {
    fontSize: 36,
    fontFamily: fonts.displayBold,
    color: "#FFFFFF",
    letterSpacing: -0.6,
    marginTop: 14,
  },
  heroStatCaption: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "rgba(255,255,255,0.72)",
    marginTop: 2,
    marginBottom: 16,
  },
  pipelineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pipelineBox: {
    flexBasis: "22%",
    flexGrow: 1,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  pipelineVal: {
    fontSize: 18,
    fontFamily: fonts.displayBold,
    letterSpacing: -0.3,
    color: "#FFFFFF",
  },
  pipelineLabel: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
    textAlign: "center",
  },
  modulesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  moduleTile: {
    flexBasis: "22%",
    flexGrow: 1,
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 4,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  moduleIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleLabel: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.text,
    textAlign: "center",
    lineHeight: 14,
  },
  countBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFF",
  },
  countBadgeText: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: "#FFFFFF",
    lineHeight: 11,
  },
});

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm2,
    paddingBottom: spacing.md,
  },
  logoWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  logoName: {
    fontSize: 18,
    fontFamily: fonts.displayBold,
    color: colors.primaryDark,
    letterSpacing: 1.5,
    lineHeight: 22,
  },
  logoTagline: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  greeting: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textDim,
  },
  name: {
    fontSize: 21,
    fontFamily: fonts.displayBold,
    color: colors.text,
    marginTop: 1,
  },
  headerBtn: {
    height: 36,
    paddingHorizontal: 10,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  badgeDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1,
    borderColor: "#FFF",
  },

  heroCard: {
    marginBottom: spacing.sm2,
    borderRadius: radius.xxl,
    padding: spacing.md,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heroGreeting: {
    fontSize: 18,
    fontFamily: fonts.displayBold,
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.72)",
    marginTop: 3,
    lineHeight: 17,
  },
  heroLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  pageGreeting: {
    fontSize: 19,
    fontFamily: fonts.bold,
    color: colors.text,
    marginTop: spacing.sm2,
  },
  pageGreetingSub: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 3,
    marginBottom: spacing.md,
  },
  bookCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    borderRadius: radius.xl,
    padding: spacing.sm2,
    marginBottom: 10,
  },
  bookTitle: {
    fontSize: 14,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  bookSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  bookIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: tints.teal.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  heroInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  heroStats: {
    flex: 1,
  },
  heroStatBox: {
    gap: 4,
  },
  heroStatVal: {
    fontSize: 20,
    fontFamily: fonts.displayBold,
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  heroStatKey: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "rgba(255,255,255,0.65)",
  },

  card: {
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm2,
    ...elevation.l1,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  viewAll: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  alertPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 5,
  },
  alertTitle: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.text,
    lineHeight: 18,
  },
  alertBody: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },

  bankCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderColor: colors.primarySoft,
  },
  bankBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: tints.blue.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  schemeBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: tints.amber.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  bankName: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
    color: colors.text,
    marginTop: 2,
  },
  bankMeta: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
    marginTop: 3,
  },
  bankWhy: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 17,
  },

  metaPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  metaPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  metaPillText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
  },

  waBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.sm2,
    paddingVertical: 14,
    marginBottom: 10,
    ...elevation.l1,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  waIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  waTitle: {
    fontSize: 13,
    fontFamily: fonts.displayBold,
    color: "#FFF",
  },
  waSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },

  consultType: {
    fontSize: 16,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  consultMeta: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 4,
  },
  consultStatus: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  consultStatusText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
    textTransform: "capitalize",
  },
  viewDetailsPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  viewDetailsPillText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
  },

  marketingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: spacing.sm2,
    marginBottom: spacing.sm2,
  },
  marketingTile: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm2,
    ...elevation.l1,
  },
  marketingIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  marketingTitle: {
    fontSize: 13,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  marketingDesc: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 3,
    lineHeight: 15,
  },

  schemeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 10,
    ...elevation.l1,
  },
  schemeName: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  schemeReason: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  schemeAmount: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  schemeSub: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  scoreBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primarySoft,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
    color: colors.primaryDark,
  },
  scoreSubText: {
    fontSize: 9,
    fontFamily: fonts.medium,
    color: colors.primaryDark,
    marginTop: -2,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
  },
  actionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  actionNumText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  actionTitle: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.text,
    lineHeight: 18,
  },
  actionDetail: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },
  weightPill: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  weightHigh: {
    backgroundColor: tints.amber.bg,
  },
  weightText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.textMuted,
  },
  weightTextHigh: {
    color: tints.amber.fg,
  },
  aaBannerCard: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary + "40",
  },
  aaBannerTitle: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
  },
  aaBannerSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.primaryDark,
    opacity: 0.75,
    marginTop: 2,
  },
  aaIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  aaLinkedTitle: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  aaLinkedSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
});
