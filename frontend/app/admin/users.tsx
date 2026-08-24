import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, Search, Download, User, MapPin, Shield, CheckCircle2, Clock } from "lucide-react-native";

import { colors, spacing, radius, fonts, tints, elevation, formatMobile } from "@/src/theme";
import { apiGet, getToken, API_BASE } from "@/src/api";
import InitialsAvatar from "@/src/components/InitialsAvatar";
import EmptyState from "@/src/components/EmptyState";

function RolePill({ role }: { role: string }) {
  if (role === "user") return null;
  const cfg: Record<string, { bg: string; text: string }> = {
    super_admin: { bg: tints.amber.bg, text: tints.amber.fg },
    manager: { bg: tints.blue.bg, text: tints.blue.fg },
    expert: { bg: tints.deepTeal.bg, text: tints.deepTeal.fg },
    sales_executive: { bg: colors.primarySoft, text: colors.primaryDark },
    support_executive: { bg: tints.red.bg, text: tints.red.fg },
  };
  const { bg, text } = cfg[role] ?? { bg: colors.surfaceAlt, text: colors.textMuted };
  return (
    <View style={[roleStyles.pill, { backgroundColor: bg }]}>
      <Text style={[roleStyles.text, { color: text }]}>{role.replace(/_/g, " ")}</Text>
    </View>
  );
}
const roleStyles = StyleSheet.create({
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  text: { fontSize: 9, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 0.3 },
});

function StepPill({ step }: { step: string }) {
  const isDone = step === "done";
  return (
    <View style={[stepStyles.pill, isDone && stepStyles.pillDone]}>
      {isDone
        ? <CheckCircle2 size={10} color={colors.primaryDark} strokeWidth={2.5} />
        : <Clock size={10} color={colors.textDim} strokeWidth={2} />}
      <Text style={[stepStyles.text, isDone && stepStyles.textDone]}>
        {isDone ? "Complete" : step}
      </Text>
    </View>
  );
}
const stepStyles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  pillDone: { backgroundColor: colors.primarySoft },
  text: { fontSize: 10, fontFamily: fonts.medium, color: colors.textDim, textTransform: "capitalize" },
  textDone: { color: colors.primaryDark, fontFamily: fonts.semiBold },
});

export default function AdminUsers() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const res = await apiGet<any>(`/admin/users?limit=50${query ? `&q=${encodeURIComponent(query)}` : ""}`);
      // Handle both paginated {items, total} and legacy array response
      if (Array.isArray(res)) {
        setItems(res);
        setTotal(res.length);
      } else {
        setItems(res.items || []);
        setTotal(res.total || 0);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(""); }, [load]);

  const onSearch = (text: string) => {
    setQ(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(text), 320);
  };

  const exportCsv = async () => {
    const token = await getToken();
    const url = `${API_BASE}/admin/exports/users.csv`;
    if (typeof window !== "undefined") {
      try {
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const text = await r.text();
        const blob = new Blob([text], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "saral-users.csv";
        a.click();
      } catch {
        Alert.alert("Export Error", "Could not export users. This feature works on web only.");
      }
    } else {
      Alert.alert("Export", "CSV export is available on the web version.");
    }
  };

  // Stat boxes: "Total" is the real server-reported total. There is no
  // active/inactive flag on the user record, so "Active"/"Inactive" are
  // derived client-side from the already-loaded page, using the real
  // onboarding_step field every user already has (done = active).
  const activeCount = useMemo(
    () => items.filter((it) => it.onboarding_step === "done").length,
    [items]
  );
  const inactiveCount = items.length - activeCount;

  const countText = loading
    ? "Loading…"
    : `${total} User${total !== 1 ? "s" : ""}${q ? ` matching "${q}"` : ""}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]} testID="admin-users">
      {/* Header: back chevron, title + live subtitle, search + role-filter icons */}
      <View style={styles.header}>
        <TouchableOpacity
          testID="back-btn"
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>Users</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{countText}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => searchInputRef.current?.focus()}
            activeOpacity={0.75}
          >
            <Search size={16} color={colors.textMuted} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stat boxes */}
      {!loading && (
        <View style={styles.statsRow}>
          <View style={[styles.statBox, styles.statBoxTotal]}>
            <Text style={styles.statValue}>{total}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxActive]}>
            <Text style={[styles.statValue, styles.statValueActive]}>{activeCount}</Text>
            <Text style={[styles.statLabel, styles.statLabelActive]}>Active Users</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxInactive]}>
            <Text style={[styles.statValue, styles.statValueInactive]}>{inactiveCount}</Text>
            <Text style={[styles.statLabel, styles.statLabelInactive]}>Inactive Users</Text>
          </View>
        </View>
      )}

      {/* Search bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Search size={15} color={colors.textDim} strokeWidth={2} />
          <TextInput
            ref={searchInputRef}
            testID="admin-users-search"
            placeholder="Search by name or mobile…"
            placeholderTextColor={colors.textPlaceholder}
            style={styles.searchInput}
            value={q}
            onChangeText={onSearch}
            returnKeyType="search"
          />
        </View>
        {/* Export only works on web (uses browser download APIs), hidden on mobile.
        <TouchableOpacity
          testID="export-users"
          style={styles.exportBtn}
          onPress={exportCsv}
          activeOpacity={0.8}
        >
          <Download size={16} color={colors.primaryDark} strokeWidth={2} />
        </TouchableOpacity>
        */}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <EmptyState
          Icon={User}
          title="No users found"
          subtitle={q ? `No users matching "${q}"` : "No users have registered yet."}
          ctaLabel={q ? "Clear search" : undefined}
          onCta={q ? () => onSearch("") : undefined}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.userCard}
              testID={`admin-user-${item.id}`}
              onPress={() => router.push(`/admin/user/${item.id}`)}
              activeOpacity={0.8}
            >
              {/* Avatar */}
              <InitialsAvatar name={item.full_name || "Unknown"} size={40} />
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName} numberOfLines={1}>{item.full_name || "Unnamed"}</Text>
                  <RolePill role={item.role} />
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.mobile}>{formatMobile(item.mobile)}</Text>
                  {item.state && (
                    <View style={styles.stateMeta}>
                      <MapPin size={10} color={colors.textDim} strokeWidth={2} />
                      <Text style={styles.stateText}>{item.state}</Text>
                    </View>
                  )}
                </View>
              </View>
              {/* Right-aligned status pill — driven by the real onboarding_step
                  field (no active/inactive flag exists on the user record). */}
              <View style={styles.statusSlot}>
                <StepPill step={item.onboarding_step} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "#FFF",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm2,
  },
  statBox: {
    flex: 1,
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  statBoxTotal: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.l1,
  },
  statBoxActive: {
    backgroundColor: tints.green.bg,
  },
  statBoxInactive: {
    backgroundColor: tints.red.bg,
  },
  statValue: {
    fontSize: 22,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  statValueActive: {
    color: tints.green.fg,
  },
  statValueInactive: {
    color: tints.red.fg,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    marginTop: 4,
  },
  statLabelActive: {
    color: tints.green.fg,
  },
  statLabelInactive: {
    color: tints.red.fg,
  },
  searchSection: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: 12,
    backgroundColor: "#FFF",
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
    padding: 0,
  },
  exportBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
    ...elevation.l1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  userName: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mobile: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  stateMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  stateText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textDim,
  },
  statusSlot: {
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 4,
  },
});
