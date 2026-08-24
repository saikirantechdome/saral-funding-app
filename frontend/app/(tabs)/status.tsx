import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Check, ChevronRight } from "lucide-react-native";

import { apiGet } from "@/src/api";
import { spacing } from "@/src/theme";
import { protoColors, protoSpacing } from "@/src/theme.proto";
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const tabBarSpacing = useTabBarSpacing(-36);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<SchemeApp[]>("/my/scheme-applications");
      setApps(data || []);
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const journey = journeyProgress(apps);
  const latestUpdate = journey.app
    ? formatRelative((journey.app as any).stage_history?.slice(-1)?.[0]?.updated_at || (journey.app as any).created_at)
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: protoColors.surface }} edges={["top"]} testID="status-screen">
      <ScrollView
        style={{ flex: 1, marginBottom: tabBarSpacing }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={protoColors.primary} />}
      >
        <Text style={styles.title}>Status</Text>

        <View style={styles.ringWrap}>
          <ProtoRing percent={journey.percent} size={89} strokeWidth={9} innerSize={68} fontSize={20} />
        </View>
        <Text style={styles.subtitle}>
          {journey.app ? `SRL-${String(journey.app.id).slice(-4).toUpperCase()}` : "No application yet"}
          {latestUpdate ? ` · updated ${latestUpdate}` : ""}
        </Text>

        <View style={styles.card}>
          {STAGES.map((stage, i) => {
            const state = i < journey.stageIndex ? "done" : i === journey.stageIndex ? "now" : "pending";
            return (
              <View key={stage} style={[styles.row, i === STAGES.length - 1 && styles.rowLast]}>
                <View
                  style={[
                    styles.dot,
                    state === "done" && styles.dotDone,
                    state === "now" && styles.dotNow,
                  ]}
                >
                  {state === "done" && <Check size={13} color="#1F7A4C" strokeWidth={3} />}
                </View>
                <Text style={[styles.rowLabel, state === "pending" && styles.rowLabelPending]}>
                  {STAGE_LABELS[stage]}
                </Text>
                <View
                  style={[
                    styles.pill,
                    state === "done" && styles.pillDone,
                    state === "now" && styles.pillNow,
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      state === "done" && styles.pillTextDone,
                      state === "now" && styles.pillTextNow,
                    ]}
                  >
                    {state === "done" ? "Done" : state === "now" ? "Now" : "—"}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {apps.length > 0 && (
          <TouchableOpacity style={styles.viewAll} onPress={() => router.push("/my-applications" as any)} testID="view-all-applications">
            <Text style={styles.viewAllText}>View all applications</Text>
            <ChevronRight size={15} color={protoColors.primary} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.md, paddingTop: protoSpacing.md, paddingBottom: spacing.lg },
  title: { fontSize: 18, fontWeight: "700", color: protoColors.text, marginBottom: protoSpacing.md },
  ringWrap: { alignItems: "center", marginBottom: protoSpacing.sm },
  subtitle: { fontSize: 12, color: protoColors.textMuted, textAlign: "center", marginBottom: protoSpacing.lg },
  card: { backgroundColor: "#FFFFFF", borderRadius: 19, paddingHorizontal: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: protoColors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  dot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: protoColors.surfaceAlt,
    alignItems: "center", justifyContent: "center",
  },
  dotDone: { backgroundColor: "#E4F5EB" },
  dotNow: { backgroundColor: protoColors.amber },
  rowLabel: { flex: 1, fontSize: 12.5, color: protoColors.text },
  rowLabelPending: { color: protoColors.textDim },
  pill: { backgroundColor: protoColors.pill.neutral.bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  pillDone: { backgroundColor: protoColors.pill.green.bg },
  pillNow: { backgroundColor: protoColors.pill.amber.bg },
  pillText: { fontSize: 10, fontWeight: "600", color: protoColors.pill.neutral.text },
  pillTextDone: { color: protoColors.pill.green.text },
  pillTextNow: { color: protoColors.pill.amber.text },
  viewAll: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    marginTop: protoSpacing.md, paddingVertical: 10,
  },
  viewAllText: { fontSize: 13, fontWeight: "600", color: protoColors.primary },
});
