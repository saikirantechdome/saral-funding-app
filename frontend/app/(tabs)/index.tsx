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

import { colors, spacing, radius, fonts, formatINR, elevation, tints, gradients } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import { DashboardSkeleton, SkeletonBox } from "@/src/components/SkeletonLoader";
import ReadinessRing from "@/src/components/ReadinessRing";
import RemoteIcon from "@/src/components/RemoteIcon";
import InitialsAvatar from "@/src/components/InitialsAvatar";
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
  const [hasAssignedSchemes, setHasAssignedSchemes] = useState(false);
  const [hasAssignedBanks, setHasAssignedBanks] = useState(false);
  const [statCounts, setStatCounts] = useState({ applications: 0, documents: 0, consultations: 0, schemes: 0 });
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
        // Admin: fetch overview data only
        const ov = await apiGet<Overview>("/admin/overview").catch(() => null);
        setOverview(ov);
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
                <Text style={styles.logoTagline}>Funding Clear Hai!</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                testID="support-btn"
                onPress={() => router.push("/admin/support" as any)}
                style={styles.headerBtn}
              >
                <MessageCircle size={18} color={colors.text} strokeWidth={2} />
                {supportUnread > 0 && <View style={styles.badgeDot} />}
              </TouchableOpacity>
              <TouchableOpacity
                testID="bell-btn"
                onPress={() => router.push("/notifications")}
                style={styles.headerBtn}
              >
                <Bell size={18} color={colors.text} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ paddingHorizontal: spacing.md }}>
            {/* Greeting */}
            <Text style={styles.pageGreeting}>
              Hi, {user.role.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
            </Text>
            <Text style={styles.pageGreetingSub}>Here's what's happening today</Text>

            {/* Hero: headline stat, on a dark gradient like the reviewer dashboard */}
            {(() => {
              const visibleStats = STAT_DEFS.filter((s) => canAccess(user.role, s.id));
              const heroStat = visibleStats.find((s) => s.id === "leads") ?? visibleStats.find((s) => s.id === "users") ?? visibleStats[0];
              const restStats = visibleStats.filter((s) => s.id !== heroStat?.id);

              return (
                <>
                  {heroStat && (
                    <LinearGradient
                      colors={gradients.heroCompact}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={adStyles.heroCard}
                      testID="admin-home-hero"
                    >
                      <View style={adStyles.heroTopRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={adStyles.heroLabel}>{heroStat.label}</Text>
                          <Text style={adStyles.heroStatVal}>{heroStat.key ? String((overview as any)?.[heroStat.key] ?? 0) : "—"}</Text>
                        </View>
                        <View style={adStyles.heroIconWrap}>
                          <heroStat.Icon size={22} color="#FFFFFF" strokeWidth={2} />
                        </View>
                      </View>

                      {restStats.length > 0 && (
                        <View style={adStyles.heroStatsGrid}>
                          {restStats.map((s) => (
                            <TouchableOpacity
                              key={s.id}
                              testID={`stat-${s.id}`}
                              style={adStyles.heroStatBox}
                              onPress={() => router.push(s.route as any)}
                              activeOpacity={0.8}
                            >
                              <Text style={adStyles.heroStatBoxVal}>{s.key ? String((overview as any)?.[s.key] ?? 0) : "—"}</Text>
                              <Text style={adStyles.heroStatBoxLabel}>{s.label}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </LinearGradient>
                  )}
                </>
              );
            })()}

            {/* Quick Access */}
            <Text style={[adStyles.sectionLabel, { marginTop: 20 }]}>Quick Access</Text>
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
                    <m.Icon size={20} color={m.iconColor} strokeWidth={2} />
                  </View>
                  <Text style={adStyles.moduleLabel} numberOfLines={1}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Normal User Home View ──
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top"]} testID="dashboard-screen">
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
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Image
              source={require("../../assets/images/logo-icon.png")}
              style={styles.logoIcon}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.logoName}>SARAL</Text>
              <Text style={styles.logoTagline}>Funding Clear Hai!</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              testID="support-btn"
              onPress={() => router.push("/support" as any)}
              style={styles.headerBtn}
            >
              <MessageCircle size={18} color={colors.text} strokeWidth={2} />
              {supportUnread > 0 && <View style={styles.badgeDot} />}
            </TouchableOpacity>
            <TouchableOpacity
              testID="bell-btn"
              onPress={() => router.push("/notifications")}
              style={styles.headerBtn}
            >
              <Bell size={18} color={colors.text} strokeWidth={2} />
              {alerts.length > 0 && <View style={styles.badgeDot} />}
            </TouchableOpacity>
            <TouchableOpacity
              testID="home-avatar-btn"
              onPress={() => router.push("/(tabs)/profile" as any)}
              activeOpacity={0.8}
            >
              <InitialsAvatar name={user?.full_name || "User"} size={32} variant={isAdmin ? "staff" : "user"} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.md }}>

          {/* ── Greeting ── */}
          <Text style={styles.pageGreeting}>
            Hi, {user?.full_name ? user.full_name.split(" ")[0] : "there"}
          </Text>
          <Text style={styles.pageGreetingSub}>Let's grow your business</Text>

          {/* ── Hero: your progress / profile strength ── */}
          <LinearGradient
            colors={gradients.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
            testID="home-hero"
          >
            <View style={styles.heroTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLabel}>Your Progress</Text>
                <Text style={styles.heroGreeting}>Profile Strength</Text>
              </View>
              <ReadinessRing score={score} size={72} />
            </View>
          </LinearGradient>

          {/* ── Book a Free Consultation ── */}
          <TouchableOpacity
            testID="book-cta"
            style={styles.bookCard}
            onPress={() => router.push("/booking")}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.bookTitle}>Book a Free Consultation</Text>
              <Text style={styles.bookSub}>Talk to our experts and get personalised guidance.</Text>
            </View>
            <View style={styles.bookIcon}>
              <Phone size={18} color={tints.teal.fg} strokeWidth={2} />
            </View>
          </TouchableOpacity>

          {/* ── Top Bank Match ── */}
          {bankRec && (
            <TouchableOpacity
              testID="bank-rec-widget"
              style={[styles.card, styles.bankCard]}
              onPress={() => router.push("/banks")}
              activeOpacity={0.85}
            >
              <View style={styles.bankBadge}>
                <RemoteIcon slug="bank" size={20} fallback={Building2} fallbackColor={tints.blue.fg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>Top Bank Match</Text>
                <Text style={styles.bankName}>{bankRec.name}</Text>
                <View style={styles.metaPillRow}>
                  <View style={[styles.metaPill, { backgroundColor: tints.teal.bg }]}>
                    <Text style={[styles.metaPillText, { color: tints.teal.fg }]}>{bankRec.interest_range} interest</Text>
                  </View>
                  <View style={[styles.metaPill, { backgroundColor: tints.amber.bg }]}>
                    <Text style={[styles.metaPillText, { color: tints.amber.fg }]}>{bankRec.score}% match</Text>
                  </View>
                </View>
                <Text style={styles.bankWhy} numberOfLines={2}>{bankRec.why}</Text>
              </View>
              <ChevronRight size={18} color={colors.textDim} strokeWidth={2} />
            </TouchableOpacity>
          )}

          {/* ── Top Scheme Match ── */}
          {data?.matches?.[0] && (
            <TouchableOpacity
              testID="scheme-rec-widget"
              style={[styles.card, styles.bankCard]}
              onPress={() => router.push("/(tabs)/schemes")}
              activeOpacity={0.85}
            >
              <View style={[styles.schemeBadge, { backgroundColor: schemeStyle(data.matches[0].name).bg }]}>
                <RemoteIcon
                  slug={schemeStyle(data.matches[0].name).slug}
                  size={20}
                  fallback={Landmark}
                  fallbackColor={schemeStyle(data.matches[0].name).fg}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>Top Scheme Match</Text>
                <Text style={styles.bankName}>{data.matches[0].name}</Text>
                <View style={styles.metaPillRow}>
                  <View style={[styles.metaPill, { backgroundColor: tints.teal.bg }]}>
                    <Text style={[styles.metaPillText, { color: tints.teal.fg }]}>{formatINR(data.matches[0].funding_estimate)} funding</Text>
                  </View>
                  <View style={[styles.metaPill, { backgroundColor: tints.amber.bg }]}>
                    <Text style={[styles.metaPillText, { color: tints.amber.fg }]}>{data.matches[0].score}% match</Text>
                  </View>
                </View>
                <Text style={styles.bankWhy} numberOfLines={2}>{data.matches[0].reason}</Text>
              </View>
              <ChevronRight size={18} color={colors.textDim} strokeWidth={2} />
            </TouchableOpacity>
          )}

          {/* ── WhatsApp Support ── */}
          <TouchableOpacity
            testID="whatsapp-cta"
            style={styles.waBtn}
            onPress={() => Linking.openURL("https://wa.me/919893869899?text=Hello%2C%20I%20am%20reaching%20out%20from%20the%20Saral%20Funding%20app.%20I%20would%20like%20some%20assistance%20regarding%20my%20funding%20journey.%20Could%20your%20team%20please%20help%20me%3F")}
            activeOpacity={0.85}
          >
            <View style={styles.waIcon}>
              <RemoteIcon slug="whatsapp" size={24} fallback={MessageCircle} fallbackColor="#25D366" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.waTitle}>WhatsApp Support</Text>
              <Text style={styles.waSub}>Chat with our team instantly</Text>
            </View>
            <ChevronRight size={16} color="#FFF" strokeWidth={2} />
          </TouchableOpacity>

          {/* ── Upcoming Consultation ── */}
          {next && (
            <TouchableOpacity style={styles.card} testID="upcoming-card" onPress={() => setMeetModal(true)} activeOpacity={0.85}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Calendar size={14} color={colors.primaryDark} strokeWidth={2} />
                <Text style={styles.sectionLabel}>Upcoming Consultation</Text>
                <ChevronRight size={13} color={colors.primaryDark} strokeWidth={2} style={{ marginLeft: "auto" }} />
              </View>
              <Text style={styles.consultType}>{next.consultation_type}</Text>
              <Text style={styles.consultMeta}>{next.date}  •  {next.time_slot}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                <View style={styles.consultStatus}>
                  <Text style={styles.consultStatusText}>{next.status}</Text>
                </View>
                {next.meet_link && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Video size={12} color={colors.primaryDark} strokeWidth={2} />
                    <Text style={{ fontSize: 11, fontFamily: fonts.semiBold, color: colors.primaryDark }}>Meeting Ready</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                testID="upcoming-view-details-btn"
                style={styles.viewDetailsPill}
                onPress={() => setMeetModal(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.viewDetailsPillText}>View Details</Text>
                <ChevronRight size={12} color={colors.primaryDark} strokeWidth={2.5} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}

          {/* ── Why Saral Funding (marketing tiles) ── */}
          <Text style={[styles.sectionLabel, { marginTop: 4 }]}>Why Saral Funding</Text>
          <View style={styles.marketingGrid}>
            {MARKETING_TILES.map((t) => (
              <View key={t.id} style={styles.marketingTile} testID={`marketing-tile-${t.id}`}>
                <View style={[styles.marketingIconWrap, { backgroundColor: t.tint.bg }]}>
                  <RemoteIcon slug={t.slug} size={22} fallback={t.Fallback} fallbackColor={t.tint.fg} />
                </View>
                <Text style={styles.marketingTitle}>{t.title}</Text>
                <Text style={styles.marketingDesc}>{t.desc}</Text>
              </View>
            ))}
          </View>

          {/* Meet link modal */}
          <Modal visible={meetModal} transparent animationType="slide" onRequestClose={() => setMeetModal(false)}>
            <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}>
              <View style={{ backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 24 + insets.bottom, gap: 16 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 18, fontFamily: fonts.displayBold, color: colors.text }}>Consultation Details</Text>
                  <TouchableOpacity onPress={() => setMeetModal(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" }}>
                    <X size={16} color={colors.textMuted} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
                <View style={{ backgroundColor: colors.surface2, borderRadius: radius.xl, padding: 16, gap: 10 }}>
                  <Text style={{ fontSize: 15, fontFamily: fonts.semiBold, color: colors.text }}>{next?.consultation_type}</Text>
                  <Text style={{ fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted }}>{next?.date}  •  {next?.time_slot}</Text>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.primarySoft, borderRadius: radius.pill, alignSelf: "flex-start" }}>
                    <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: colors.primaryDark, textTransform: "capitalize" }}>{next?.status}</Text>
                  </View>
                </View>
                {next?.meet_link ? (
                  <View style={{ backgroundColor: colors.primarySoft, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.primary, padding: 16, gap: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Video size={16} color={colors.primaryDark} strokeWidth={2} />
                      <Text style={{ fontSize: 14, fontFamily: fonts.displayBold, color: colors.primaryDark }}>Your Meeting Link</Text>
                    </View>
                    <Text style={{ fontSize: 11, fontFamily: fonts.medium, color: colors.primaryDark, opacity: 0.8 }} numberOfLines={1}>{next?.meet_link}</Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primary, backgroundColor: "#FFF" }}
                        onPress={() => Share.share({ message: next?.meet_link, title: "Meeting Link" })}
                        activeOpacity={0.8}
                      >
                        <Copy size={14} color={colors.primaryDark} strokeWidth={2.5} />
                        <Text style={{ fontSize: 13, fontFamily: fonts.semiBold, color: colors.primaryDark }}>Copy Link</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: radius.lg, backgroundColor: colors.primary }}
                        onPress={() => { setMeetModal(false); Linking.openURL(next?.meet_link); }}
                        activeOpacity={0.8}
                      >
                        <Video size={14} color="#FFF" strokeWidth={2.5} />
                        <Text style={{ fontSize: 13, fontFamily: fonts.displayBold, color: "#FFF" }}>Join Meeting</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={{ backgroundColor: colors.surface2, borderRadius: radius.xl, padding: 16, alignItems: "center" }}>
                    <Text style={{ fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, textAlign: "center" }}>Meeting link will be shared by your advisor before the session.</Text>
                  </View>
                )}
              </View>
            </View>
          </Modal>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const adStyles = StyleSheet.create({
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
    marginBottom: 4,
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
    alignItems: "center",
    gap: 14,
  },
  heroLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: "rgba(255,255,255,0.72)",
  },
  heroStatVal: {
    fontSize: 30,
    fontFamily: fonts.displayBold,
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  heroIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  heroStatBox: {
    flexBasis: "30%",
    flexGrow: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 2,
  },
  heroStatBoxVal: {
    fontSize: 20,
    fontFamily: fonts.displayBold,
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },
  heroStatBoxLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "rgba(255,255,255,0.65)",
  },
  modulesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  moduleTile: {
    flexBasis: "30%",
    flexGrow: 1,
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 6,
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
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.text,
    textAlign: "center",
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
