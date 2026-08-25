/**
 * Status tab — matches the approved prototype's `isStatus` state exactly:
 * dark gradient hero (back arrow, centered title, ring, "SRL-xxxx · ..."
 * subtitle) over a white sheet holding one card of plain stage rows (flat
 * placeholder icon square + label + Done/Now/— pill, no checkmarks). See
 * `Saral User Prototype.dc.html` lines 132-150.
 *
 * The prototype's demo hardcodes 6 illustrative stage names (Onboarding,
 * Documents, Review, Schemes, Bank, Completed) that don't line up with this
 * app's real 7-stage pipeline's order (scheme identification and the bank
 * application both happen *before* review, not after) — reusing them as
 * literal labels would misrepresent real progress. So this keeps the real
 * STAGES/STAGE_LABELS from stageProgress.ts (same data Home's status card
 * uses) and only carries over the prototype's *visual* row design. The
 * "View all applications" link some earlier iteration added here is
 * dropped too — the prototype has no such row.
 */
import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

import { apiGet } from "@/src/api";
import { spacing } from "@/src/theme";
import { protoColors } from "@/src/theme.proto";
import ProtoRing from "@/src/components/proto/ProtoRing";
import { STAGES, STAGE_LABELS, journeyProgress, SchemeApp } from "@/src/utils/stageProgress";
import { useTabBarSpacing } from "@/src/hooks/useTabBarSpacing";

// Mirrors the relative-date formatter repeated elsewhere in this codebase
// (e.g. (tabs)/index.tsx, admin/support/index.tsx) — small enough that a
// shared export isn't worth it yet.
function formatRelative(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 3600000) return "just now";
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function Status() {
  const router = useRouter();
  const [apps, setApps] = useState<SchemeApp[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const tabBarSpacing = useTabBarSpacing(-36);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<SchemeApp[]>("/my/scheme-applications");
      setApps(data || []);
    } catch {
      setApps([]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const journey = journeyProgress(apps);
  const latestUpdate = journey.app
    ? formatRelative((journey.app as any).stage_history?.slice(-1)?.[0]?.updated_at || (journey.app as any).created_at)
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: protoColors.surfaceAlt }} testID="status-screen">
      <SafeAreaView style={{ flex: 1, backgroundColor: protoColors.primaryDark }} edges={["top"]}>
        <ScrollView
          // See (tabs)/index.tsx for why this is contentContainerStyle
          // paddingBottom, not a marginBottom on the ScrollView itself — a
          // marginBottom gap here isn't covered by this light background and
          // exposes the dark SafeAreaView behind it as a black strip under
          // the floating tab bar.
          style={{ flex: 1, backgroundColor: protoColors.surfaceAlt }}
          contentContainerStyle={{ paddingBottom: tabBarSpacing, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#FFFFFF" />}
        >
          <LinearGradient colors={protoColors.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => router.push("/(tabs)" as any)} hitSlop={12} testID="status-back">
                <ArrowLeft size={18} color="#FFFFFF" strokeWidth={2} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Status</Text>
              <View style={{ width: 18 }} />
            </View>
            <View style={styles.ringWrap}>
              <ProtoRing
                percent={journey.percent}
                size={89}
                strokeWidth={10}
                innerSize={68}
                fontSize={20}
                innerBg={protoColors.heroSolidDark}
                textColor="#FFFFFF"
                trackColor="rgba(255,255,255,0.16)"
              />
            </View>
            <Text style={styles.subtitle}>
              {journey.app ? `SRL-${String(journey.app.id).slice(-4).toUpperCase()}` : "No application yet"}
              {latestUpdate ? ` · updated ${latestUpdate}` : ""}
            </Text>
          </LinearGradient>

          <View style={styles.sheet}>
            <View style={styles.card}>
              {STAGES.map((stage, i) => {
                const state = i < journey.stageIndex ? "done" : i === journey.stageIndex ? "now" : "pending";
                return (
                  <View key={stage} style={[styles.row, i === STAGES.length - 1 && styles.rowLast]}>
                    <View style={[styles.icon, state === "done" && styles.iconDone, state === "now" && styles.iconNow]} />
                    <Text style={[styles.rowLabel, state === "pending" && styles.rowLabelPending]}>
                      {STAGE_LABELS[stage]}
                    </Text>
                    <View style={[styles.pill, state === "done" && styles.pillDone, state === "now" && styles.pillNow]}>
                      <Text style={[styles.pillText, state === "done" && styles.pillTextDone, state === "now" && styles.pillTextNow]}>
                        {state === "done" ? "Done" : state === "now" ? "Now" : "—"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    paddingTop: spacing.sm2,
    paddingHorizontal: spacing.md,
    paddingBottom: 24,
    gap: 11,
  },
  headerRow: { flexDirection: "row", alignItems: "center", width: "100%" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  ringWrap: { alignItems: "center" },
  subtitle: { fontSize: 12, color: "#93ABA6", textAlign: "center" },
  sheet: {
    backgroundColor: protoColors.surfaceAlt,
    borderTopLeftRadius: 29,
    borderTopRightRadius: 29,
    marginTop: -18,
    padding: spacing.md,
    minHeight: 200,
  },
  card: { backgroundColor: "#FFFFFF", borderRadius: 19, paddingHorizontal: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: protoColors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  icon: { width: 40, height: 40, borderRadius: 13, backgroundColor: protoColors.iconPlaceholder },
  iconDone: { backgroundColor: protoColors.pill.green.bg },
  iconNow: { backgroundColor: protoColors.pill.amber.bg },
  rowLabel: { flex: 1, fontSize: 13, color: protoColors.text },
  rowLabelPending: { color: protoColors.textDim },
  pill: { backgroundColor: protoColors.pill.neutral.bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  pillDone: { backgroundColor: protoColors.pill.green.bg },
  pillNow: { backgroundColor: protoColors.pill.amber.bg },
  pillText: { fontSize: 10, fontWeight: "600", color: protoColors.pill.neutral.text },
  pillTextDone: { color: protoColors.pill.green.text },
  pillTextNow: { color: protoColors.pill.amber.text },
});
