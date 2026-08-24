import { useCallback, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import {
  XCircle, ChevronRight, FileText, Building2,
} from "lucide-react-native";

import { colors, spacing, radius, fonts, tints, elevation } from "@/src/theme";
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

const STAGE_COLORS: Record<string, string> = {
  approved:  tints.teal.fg,
  disbursed: tints.deepTeal.fg,
  rejected:  tints.red.fg,
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
  const accentColor = STAGE_COLORS[app.stage] ?? tints.blue.fg;
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
        <ChevronRight
          size={18}
          color={colors.textDim}
          style={{ transform: [{ rotate: expanded ? "90deg" : "0deg" }] }}
          strokeWidth={2}
        />
      </TouchableOpacity>

      {/* Progress tracker — compact bar + current-stage caption, not a cramped 7-across row */}
      {!isRejected && (
        <View style={s.progressWrap}>
          <View style={s.progressBarRow}>
            <View style={s.progressBarTrack}>
              <View style={[s.progressBarFill, { width: `${progressPct}%` }]} />
            </View>
            <Text style={s.progressPercent}>{progressPct}%</Text>
          </View>
          <Text style={s.progressCaption}>
            Stage {activeStageIdx + 1} of {STAGES.length} · <Text style={s.progressCaptionActive}>{STAGE_LABELS[app.stage] ?? app.stage_label}</Text>
          </Text>
        </View>
      )}

      {isRejected && (
        <View style={s.rejectedBanner}>
          <XCircle size={14} color={tints.red.fg} strokeWidth={2} />
          <Text style={s.rejectedText}>Application not proceeded. Contact our team for details.</Text>
        </View>
      )}

      {/* History (expanded) — connected vertical timeline */}
      {expanded && app.stage_history.length > 0 && (
        <View style={s.history}>
          <Text style={s.historyTitle}>Activity</Text>
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
  const bg = stage === "approved" ? tints.teal.bg
    : stage === "disbursed" ? tints.deepTeal.bg
    : stage === "rejected" ? tints.red.bg
    : tints.blue.bg;
  const fg = STAGE_COLORS[stage] ?? tints.blue.fg;
  return (
    <View style={[s.pill, { backgroundColor: bg }]}>
      <Text style={[s.pillText, { color: fg }]}>{label}</Text>
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

  progressWrap:    { marginBottom: 4, gap: 6 },
  progressBarRow:  { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  progressBarTrack:{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surface2, overflow: "hidden" },
  progressBarFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  progressPercent: { width: 34, textAlign: "right", fontSize: 12, fontFamily: fonts.bold, color: colors.primaryDark },
  progressCaption: { fontSize: 12, fontFamily: fonts.medium, color: colors.textDim },
  progressCaptionActive: { fontFamily: fonts.semiBold, color: colors.primaryDark },

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
