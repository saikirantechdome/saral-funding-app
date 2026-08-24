import { useCallback, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import {
  XCircle, ChevronRight, FileText, Building2, CheckCircle2,
} from "lucide-react-native";

import { colors, spacing, radius, fonts, tints, elevation, shortRef } from "@/src/theme";
import { apiGet } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import Saathi from "@/src/components/Saathi";
import RemoteIcon from "@/src/components/RemoteIcon";
import { schemeIconSlug } from "@/src/utils/schemeType";
import { useTabBarSpacing } from "@/src/hooks/useTabBarSpacing";

const STAGES = [
  "call_done",
  "documents_submitted",
  "scheme_identified",
  "application_filed",
  "under_review",
  "approved",
  "disbursed",
];

const STAGE_LABELS: Record<string, string> = {
  documents_submitted: "Documents Submitted",
  call_done:           "Call Done",
  scheme_identified:   "Scheme Identified",
  application_filed:   "Application Filed",
  under_review:        "Under Review",
  approved:            "Approved",
  disbursed:           "Disbursed",
  rejected:            "Rejected",
};

// Per-stage accent tint (bg + fg) — drives the percent ring, the stage
// pill, and the "done" checkmarks/connector lines in the vertical tracker.
const STAGE_TINTS: Record<string, { bg: string; fg: string }> = {
  approved:  tints.teal,
  disbursed: tints.deepTeal,
  rejected:  tints.red,
};

// Client-side filter tabs — bucket each app's `stage` into one of these
// groups without any extra API call.
const FILTER_TABS = ["All", "In Progress", "Approved", "Rejected"] as const;
type FilterTab = typeof FILTER_TABS[number];

function appBucket(stage: string): Exclude<FilterTab, "All"> {
  if (stage === "rejected") return "Rejected";
  if (stage === "approved" || stage === "disbursed") return "Approved";
  return "In Progress";
}

type SchemeApp = {
  id: string;
  scheme_name: string;
  bank_name?: string;
  stage: string;
  stage_label: string;
  stage_index: number;
  stage_history: { stage: string; note: string; updated_by: string; updated_at: string }[];
  created_at: string;
};

// Most recent update timestamp for the reference line under each card's
// percent ring — falls back to the application's creation date when no
// stage_history entries exist yet. `stage_history` is stored oldest-first
// (see the reversed render below), so the last entry is the newest one.
function lastUpdatedLabel(app: SchemeApp): string {
  const iso = app.stage_history.length > 0
    ? app.stage_history[app.stage_history.length - 1].updated_at
    : app.created_at;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function MyApplications() {
  const router = useRouter();
  // Smaller than the default clearance — this list is bounded (a handful of
  // schemes per user, not an open-ended feed), so the tighter margin doesn't
  // risk the last card hiding behind the tab bar the way an unbounded list could.
  const tabBarSpacing = useTabBarSpacing(-36);
  const [apps, setApps] = useState<SchemeApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("All");
  const scrollRef = useRef<ScrollView>(null);
  const cardTops = useRef<Record<string, number>>({});

  const load = async () => {
    try {
      const data = await apiGet<SchemeApp[]>("/my/scheme-applications");
      setApps(data);
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = () => { setRefreshing(true); load(); };

  const filteredApps = filter === "All" ? apps : apps.filter((a) => appBucket(a.stage) === filter);

  if (loading) {
    return (
      <SafeAreaView style={s.root} edges={["top"]}>
        <BackBar title="My Applications" onBack={() => router.back()} />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <BackBar title="My Applications" onBack={() => router.back()} />
      {apps.length > 0 && (
        <Text style={s.countLabel}>{apps.length} application{apps.length !== 1 ? "s" : ""}</Text>
      )}
      {apps.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.filterBar}
          contentContainerStyle={s.filterBarContent}
        >
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[s.filterChip, filter === tab && s.filterChipActive]}
              onPress={() => setFilter(tab)}
              activeOpacity={0.8}
            >
              <Text style={[s.filterChipText, filter === tab && s.filterChipTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, marginBottom: tabBarSpacing }}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {apps.length === 0 ? (
          <EmptyState />
        ) : filteredApps.length === 0 ? (
          <Text style={s.noMatchText}>No applications match this filter</Text>
        ) : (
          filteredApps.map((app) => (
            <View key={app.id} onLayout={(e) => { cardTops.current[app.id] = e.nativeEvent.layout.y; }}>
              <AppCard
                app={app}
                expanded={expanded === app.id}
                onToggle={() => {
                  const willExpand = expanded !== app.id;
                  setExpanded(willExpand ? app.id : null);
                  if (willExpand) {
                    // Bring the card to the top of the viewport so its expanded
                    // Activity section (added below the header) has room to show
                    // instead of running behind the tab bar.
                    setTimeout(() => {
                      const y = cardTops.current[app.id];
                      if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
                    }, 150);
                  }
                }}
              />
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AppCard({ app, expanded, onToggle }: {
  app: SchemeApp;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isRejected = app.stage === "rejected";
  const isDisbursed = app.stage === "disbursed";
  const activeStageIdx = STAGES.indexOf(app.stage);
  const accentTint = STAGE_TINTS[app.stage] ?? tints.blue;
  const accentColor = accentTint.fg;
  const progressPct = Math.round(((activeStageIdx + 1) / STAGES.length) * 100);

  return (
    <View style={[s.card, { borderLeftWidth: 4, borderLeftColor: accentColor }]}>
      {/* Header */}
      <TouchableOpacity style={s.cardHeader} onPress={onToggle} activeOpacity={0.8}>
        <View style={[s.schemeIcon, isDisbursed && s.schemeIconGreen, isRejected && s.schemeIconRed]}>
          <RemoteIcon
            slug={schemeIconSlug(app.scheme_name)}
            size={22}
            fallback={FileText}
            fallbackColor={isRejected ? tints.red.fg : isDisbursed ? tints.deepTeal.fg : colors.primary}
          />
        </View>
        <View style={s.cardHeaderText}>
          <Text style={s.schemeName} numberOfLines={1}>{app.scheme_name}</Text>
          {app.bank_name ? (
            <View style={s.bankRow}>
              <Building2 size={11} color={colors.textDim} strokeWidth={2} />
              <Text style={s.bankName}>{app.bank_name}</Text>
            </View>
          ) : null}
          <StagePill stage={app.stage} label={app.stage_label} />
        </View>
        {/* Top-right: percent ring for this application's overall progress,
            plus the expand/collapse chevron underneath it */}
        <View style={s.headerRight}>
          {!isRejected && (
            <View style={[s.percentRing, { borderColor: accentTint.fg, backgroundColor: accentTint.bg }]}>
              <Text style={[s.percentRingText, { color: accentTint.fg }]}>{progressPct}%</Text>
            </View>
          )}
          <ChevronRight
            size={18}
            color={colors.textDim}
            style={{ transform: [{ rotate: expanded ? "90deg" : "0deg" }] }}
            strokeWidth={2}
          />
        </View>
      </TouchableOpacity>

      {isRejected && (
        <View style={s.rejectedBanner}>
          <XCircle size={14} color={tints.red.fg} strokeWidth={2} />
          <Text style={s.rejectedText}>Application not proceeded. Contact our team for details.</Text>
        </View>
      )}

      {/* Journey tracker — reference line + a clean vertical checklist of
          every stage (done / current / upcoming), replacing the old
          horizontal progress bar so the whole journey is scannable at once */}
      {!isRejected && (
        <>
          <Text style={s.refLine}>Ref #{shortRef(app.id)} · Updated {lastUpdatedLabel(app)}</Text>
          <View style={s.stageList}>
            {STAGES.map((stg, i) => {
              const isLastStage = i === STAGES.length - 1;
              const isDone = i < activeStageIdx || (i === activeStageIdx && isLastStage);
              const isCurrent = i === activeStageIdx && !isLastStage;
              const statusWord = isDone ? "Done" : isCurrent ? "Now" : "—";
              return (
                <View key={stg} style={s.stageRow}>
                  <View style={s.stageDotCol}>
                    {isDone ? (
                      <CheckCircle2 size={18} color={accentTint.fg} strokeWidth={2.2} />
                    ) : isCurrent ? (
                      <View style={[s.stageDotCurrent, { borderColor: accentTint.fg }]} />
                    ) : (
                      <View style={s.stageDotUpcoming} />
                    )}
                    {!isLastStage && (
                      <View style={[s.stageLine, isDone && { backgroundColor: accentTint.fg }]} />
                    )}
                  </View>
                  <View style={s.stageInfo}>
                    <Text
                      style={[s.stageName, isCurrent && s.stageNameCurrent, isDone && s.stageNameDone]}
                      numberOfLines={1}
                    >
                      {STAGE_LABELS[stg]}
                    </Text>
                    <Text style={[s.stageStatus, isDone && { color: accentTint.fg }, isCurrent && { color: accentTint.fg, fontFamily: fonts.bold }]}>
                      {statusWord}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* History (expanded) — connected vertical timeline */}
      {expanded && app.stage_history.length > 0 && (
        <View style={s.history}>
          <Text style={s.historyTitle}>Activity Log</Text>
          {[...app.stage_history].reverse().map((h, i, arr) => {
            const isFirst = i === 0;
            return (
              <View key={i} style={s.historyRow}>
                <View style={s.historyDotCol}>
                  <View style={[s.historyDot, isFirst && s.historyDotActive]} />
                  {i < arr.length - 1 && <View style={s.historyLine} />}
                </View>
                <View style={s.historyContent}>
                  <Text style={s.historyStage}>{STAGE_LABELS[h.stage] ?? h.stage}</Text>
                  {h.note ? <Text style={s.historyNote}>{h.note}</Text> : null}
                  <Text style={s.historyMeta}>
                    {h.updated_by} · {new Date(h.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={s.viewDetailsRow}>
        <TouchableOpacity style={s.viewDetailsBtn} onPress={onToggle} activeOpacity={0.8}>
          <Text style={s.viewDetailsText}>{expanded ? "Hide Details" : "View Details"}</Text>
          <ChevronRight
            size={13}
            color={colors.primaryDark}
            strokeWidth={2.5}
            style={{ transform: [{ rotate: expanded ? "90deg" : "0deg" }] }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StagePill({ stage, label }: { stage: string; label: string }) {
  const tint = STAGE_TINTS[stage] ?? tints.blue;
  return (
    <View style={[s.pill, { backgroundColor: tint.bg }]}>
      <Text style={[s.pillText, { color: tint.fg }]}>{label}</Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={s.empty}>
      <Saathi expression="explaining" size={110} />
      <Text style={s.emptyTitle}>No applications yet</Text>
      <Text style={s.emptyBody}>
        After your consultation call, our team will assign the schemes you qualify for and track them here.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: colors.surface2 },
  countLabel:      { fontSize: 12, fontFamily: fonts.medium, color: colors.textDim, paddingHorizontal: spacing.md, paddingBottom: 6 },
  content:         { padding: spacing.md, gap: spacing.sm2, paddingBottom: 4 },

  filterBar:       { maxHeight: 44 },
  filterBarContent:{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: 8 },
  filterChip:      { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: "#fff" },
  filterChipActive:{ borderColor: colors.primary, backgroundColor: colors.primarySoft },
  filterChipText:  { fontSize: 12, fontFamily: fonts.medium, color: colors.textMuted },
  filterChipTextActive: { color: colors.primaryDark, fontFamily: fonts.bold },
  noMatchText:     { fontSize: 13, fontFamily: fonts.regular, color: colors.textDim, textAlign: "center", paddingTop: 40 },

  card:            { backgroundColor: "#fff", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border,
                     padding: spacing.sm2, ...elevation.l1 },
  cardHeader:      { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginBottom: spacing.sm2 },
  schemeIcon:      { width: 40, height: 40, borderRadius: radius.lg, backgroundColor: tints.blue.bg,
                     alignItems: "center", justifyContent: "center" },
  schemeIconGreen: { backgroundColor: tints.deepTeal.bg },
  schemeIconRed:   { backgroundColor: tints.red.bg },
  cardHeaderText:  { flex: 1, gap: 4 },
  schemeName:      { fontSize: 15, fontFamily: fonts.semiBold, color: colors.text },
  bankRow:         { flexDirection: "row", alignItems: "center", gap: 4 },
  bankName:        { fontSize: 12, fontFamily: fonts.regular, color: colors.textDim },
  pill:            { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  pillText:        { fontSize: 11, fontFamily: fonts.semiBold },

  headerRight:     { alignItems: "center", gap: 6 },
  percentRing:     { width: 42, height: 42, borderRadius: 21, borderWidth: 2.5,
                     alignItems: "center", justifyContent: "center" },
  percentRingText: { fontSize: 12, fontFamily: fonts.bold },

  refLine:         { fontSize: 11, fontFamily: fonts.regular, color: colors.textDim, marginBottom: spacing.sm },

  stageList:       { gap: 0 },
  stageRow:        { flexDirection: "row", alignItems: "stretch", gap: 10 },
  stageDotCol:     { width: 20, alignItems: "center" },
  stageDotCurrent: { width: 14, height: 14, borderRadius: 7, borderWidth: 2.5, marginTop: 3, backgroundColor: "#fff" },
  stageDotUpcoming:{ width: 8, height: 8, borderRadius: 4, marginTop: 8, backgroundColor: colors.border },
  stageLine:       { width: 2, flex: 1, minHeight: 18, backgroundColor: colors.border, marginVertical: 2 },
  stageInfo:       { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                     minHeight: 34, paddingBottom: 4 },
  stageName:       { flex: 1, fontSize: 13, fontFamily: fonts.medium, color: colors.textDim, marginRight: spacing.sm },
  stageNameDone:   { color: colors.text },
  stageNameCurrent:{ fontFamily: fonts.semiBold, color: colors.text },
  stageStatus:     { fontSize: 11, fontFamily: fonts.semiBold, color: colors.textPlaceholder },

  rejectedBanner:  { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: tints.red.bg,
                     borderRadius: radius.md, padding: spacing.sm, marginBottom: 4 },
  rejectedText:    { flex: 1, fontSize: 12, fontFamily: fonts.regular, color: tints.red.fg },

  history:         { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm,
                     paddingTop: spacing.sm, gap: 2 },
  historyTitle:    { fontSize: 12, fontFamily: fonts.semiBold, color: colors.textDim,
                     marginBottom: 6 },
  historyRow:      { flexDirection: "row", gap: 10, alignItems: "stretch" },
  historyDotCol:   { width: 8, alignItems: "center" },
  historyDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border, marginTop: 5, flexShrink: 0 },
  historyDotActive:{ backgroundColor: colors.primary },
  historyLine:     { width: 2, flex: 1, backgroundColor: colors.border, marginTop: 2, marginBottom: -4 },
  historyContent:  { flex: 1, gap: 2, paddingBottom: 14 },
  historyStage:    { fontSize: 13, fontFamily: fonts.semiBold, color: colors.text },
  historyNote:     { fontSize: 12, fontFamily: fonts.regular, color: colors.textDim },
  historyMeta:     { fontSize: 11, fontFamily: fonts.regular, color: colors.textDim },

  viewDetailsRow:  { flexDirection: "row", justifyContent: "flex-end", marginTop: spacing.sm },
  viewDetailsBtn:  { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6,
                     borderRadius: radius.pill, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary },
  viewDetailsText: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.primaryDark },

  empty:           { alignItems: "center", paddingTop: 80, gap: spacing.md, paddingHorizontal: 32 },
  emptyTitle:      { fontSize: 18, fontFamily: fonts.semiBold, color: colors.text },
  emptyBody:       { fontSize: 14, fontFamily: fonts.regular, color: colors.textDim, textAlign: "center", lineHeight: 22 },
});
