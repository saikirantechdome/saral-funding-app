import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { TrendingUp, MapPin, Target, Phone, Users, Calendar, ChevronDown, CheckCircle2, Banknote } from "lucide-react-native";
import Svg, { Polyline, Circle, Line, Text as SvgText, G } from "react-native-svg";

import { colors, spacing, radius, fonts, stageColor, tints, elevation } from "@/src/theme";
import { apiGet } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";

const SCREEN_W = Dimensions.get("window").width;
const CHART_W = SCREEN_W - spacing.md * 2 - 32; // account for section card padding

// ─── Micro-components ────────────────────────────────────────────────────────

function SectionHeader({ Icon, title }: { Icon: any; title: string }) {
  return (
    <View style={secStyles.wrap}>
      <View style={secStyles.icon}>
        <Icon size={14} color={colors.primaryDark} strokeWidth={2} />
      </View>
      <Text style={secStyles.title}>{title}</Text>
    </View>
  );
}
const secStyles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  icon: { width: 28, height: 28, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 13, fontFamily: fonts.bold, color: colors.text, textTransform: "uppercase", letterSpacing: 0.5 },
});

function BarRow({ label, value, max, color = colors.primary }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <View style={barStyles.row}>
      <Text style={barStyles.label} numberOfLines={1}>{label}</Text>
      <View style={barStyles.trackWrap}>
        <View style={barStyles.track}>
          <View style={[barStyles.fill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
        <Text style={barStyles.count}>{value}</Text>
      </View>
    </View>
  );
}
const barStyles = StyleSheet.create({
  row: { marginBottom: 10 },
  label: { fontSize: 12, fontFamily: fonts.medium, color: colors.text, marginBottom: 5 },
  trackWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  track: { flex: 1, height: 10, backgroundColor: colors.surfaceAlt, borderRadius: 5, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 5 },
  count: { fontSize: 12, fontFamily: fonts.bold, color: colors.text, width: 30, textAlign: "right" },
});

function PipelineBox({ label, value, stage }: { label: string; value: number; stage: string }) {
  const { bg, text } = stageColor(stage);
  return (
    <View style={[pipeStyles.box, { backgroundColor: bg }]}>
      <Text style={[pipeStyles.value, { color: text }]}>{value}</Text>
      <Text style={[pipeStyles.label, { color: text }]}>{label}</Text>
    </View>
  );
}
const pipeStyles = StyleSheet.create({
  box: { width: "30%", padding: 10, borderRadius: radius.lg, marginBottom: 8, alignItems: "center" },
  value: { fontSize: 22, fontFamily: fonts.displayBold },
  label: { fontSize: 10, fontFamily: fonts.semiBold, marginTop: 2, textTransform: "capitalize", textAlign: "center" },
});

/** Decorative period pill — this screen's data has no time-range filter wired up
 * yet, so this is visual-only (matches the Figma "This Month ▾" affordance). */
function MonthPill() {
  return (
    <View style={pillStyles.pill}>
      <Text style={pillStyles.text}>This Month</Text>
      <ChevronDown size={14} color={colors.primaryDark} strokeWidth={2} />
    </View>
  );
}
const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  text: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.text },
});

/** Top-row stat tile — mirrors the StatCard pattern on the admin overview screen. */
function StatTile({ label, value, Icon, color, iconColor }: { label: string; value: string; Icon: any; color: string; iconColor: string }) {
  return (
    <View style={statStyles.tile}>
      <View style={[statStyles.icon, { backgroundColor: color }]}>
        <Icon size={14} color={iconColor} strokeWidth={2} />
      </View>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}
const statStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tile: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    ...elevation.l1,
  },
  icon: { width: 28, height: 28, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  value: { fontSize: 20, fontFamily: fonts.displayBold, color: colors.text, lineHeight: 24 },
  label: { fontSize: 11, fontFamily: fonts.medium, color: colors.textMuted, marginTop: 3 },
});

/** Buckets the real per-stage `lead_pipeline` counts into the same coarse
 * New / In Progress / Approved / Rejected grouping already used for scheme-
 * application stage pills (see admin/lead/[id].tsx's "won / rejected / else"
 * convention) — extended with a "New" bucket since leads (unlike scheme
 * applications) have a distinct "new" stage in LEAD_STAGES. "closed" is the
 * terminal non-conversion stage in LEAD_STAGES, so it maps to Rejected. */
type LeadBucket = "New" | "In Progress" | "Approved" | "Rejected";

function leadBucket(stage: string): LeadBucket {
  if (stage === "new") return "New";
  if (stage === "approved" || stage === "disbursed") return "Approved";
  if (stage === "closed") return "Rejected";
  return "In Progress";
}

const BUCKET_COLOR: Record<LeadBucket, string> = {
  New: stageColor("new").text,
  "In Progress": tints.amber.fg,
  Approved: colors.success,
  Rejected: colors.danger,
};

/** Simple SVG sparkline / area chart for trend data */
function TrendChart({ data, color = colors.primary, height = 80 }: {
  data: { date: string; count: number }[];
  color?: string;
  height?: number;
}) {
  if (!data || data.length < 2) {
    return (
      <View style={{ height, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 12, fontFamily: fonts.regular, color: colors.textDim }}>Not enough data</Text>
      </View>
    );
  }

  const w = CHART_W;
  const h = height;
  const padX = 28;
  const padY = 12;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;

  const maxVal = Math.max(1, ...data.map((d) => d.count));
  const xs = data.map((_, i) => padX + (i / (data.length - 1)) * innerW);
  const ys = data.map((d) => padY + (1 - d.count / maxVal) * innerH);
  const points = xs.map((x, i) => `${x},${ys[i]}`).join(" ");

  // Show first and last date labels
  const firstDate = data[0].date.slice(5); // MM-DD
  const lastDate = data[data.length - 1].date.slice(5);

  return (
    <Svg width={w} height={h + 16}>
      {/* Grid line */}
      <Line x1={padX} y1={padY} x2={padX} y2={padY + innerH} stroke={colors.border} strokeWidth={1} />
      <Line x1={padX} y1={padY + innerH} x2={padX + innerW} y2={padY + innerH} stroke={colors.border} strokeWidth={1} />

      {/* Trend line */}
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Data dots */}
      {xs.map((x, i) => (
        <Circle key={i} cx={x} cy={ys[i]} r={3} fill={color} />
      ))}

      {/* Max value label */}
      <SvgText x={padX - 4} y={padY + 4} fontSize={9} fill={colors.textDim} textAnchor="end">{maxVal}</SvgText>
      <SvgText x={padX - 4} y={padY + innerH + 4} fontSize={9} fill={colors.textDim} textAnchor="end">0</SvgText>

      {/* Date labels */}
      <SvgText x={padX} y={h + 14} fontSize={9} fill={colors.textDim} textAnchor="middle">{firstDate}</SvgText>
      <SvgText x={padX + innerW} y={h + 14} fontSize={9} fill={colors.textDim} textAnchor="middle">{lastDate}</SvgText>
    </Svg>
  );
}

/** Donut chart — one ring segment per entry, proportional to value. */
function DonutChart({ segments, size = 132, strokeWidth = 20, centerLabel = "Total Leads" }: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  let cumulative = 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.surfaceAlt} strokeWidth={strokeWidth} />
          {total > 0 && segments.filter((s) => s.value > 0).map((seg, i) => {
            const segLen = (seg.value / total) * c;
            const dashOffset = -cumulative;
            cumulative += segLen;
            return (
              <Circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${segLen} ${c - segLen}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="butt"
              />
            );
          })}
        </G>
      </Svg>
      <View style={StyleSheet.absoluteFillObject}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 22, fontFamily: fonts.displayBold, color: colors.text }}>{total}</Text>
          <Text style={{ fontSize: 10, fontFamily: fonts.medium, color: colors.textDim }}>{centerLabel}</Text>
        </View>
      </View>
    </View>
  );
}

function DonutLegend({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <View style={{ flex: 1, gap: 8 }}>
      {segments.filter((s) => s.value > 0).map((seg) => (
        <View key={seg.label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: seg.color }} />
          <Text style={{ flex: 1, fontSize: 12, fontFamily: fonts.medium, color: colors.text, textTransform: "capitalize" }} numberOfLines={1}>
            {seg.label}
          </Text>
          <Text style={{ fontSize: 12, fontFamily: fonts.bold, color: colors.textMuted }}>
            {seg.value} ({Math.round((seg.value / total) * 100)}%)
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function AdminAnalytics() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    apiGet<any>("/admin/analytics").then(setData).catch(() => {});
  }, []);

  if (!data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]}>
        <BackBar title="Analytics" onBack={() => router.back()} />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const maxPop = Math.max(1, ...(data.popular_schemes || []).map((p: any) => p.matches));
  const maxState = Math.max(1, ...(data.state_distribution || []).map((s: any) => s.count));
  const stateColors = [colors.primaryDark, tints.deepTeal.fg, colors.primary, tints.teal.fg, colors.primaryLight];

  // Stat tiles + Applications Overview donut — all derived from the same
  // already-fetched `lead_pipeline` (real per-stage counts), no new API calls.
  const pipeline: Record<string, number> = data.lead_pipeline || {};
  const totalLeads = Object.values(pipeline).reduce((s: number, v: any) => s + Number(v), 0);
  const approvedCount = Number(pipeline.approved || 0);
  const disbursedCount = Number(pipeline.disbursed || 0);
  const bucketedSegments = (["New", "In Progress", "Approved", "Rejected"] as LeadBucket[]).map((b) => ({
    label: b,
    value: Object.entries(pipeline).reduce((s, [k, v]) => s + (leadBucket(k) === b ? Number(v) : 0), 0),
    color: BUCKET_COLOR[b],
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]} testID="admin-analytics">
      <BackBar title="Analytics" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        <MonthPill />

        {/* Stat tiles */}
        <View style={statStyles.row}>
          <StatTile label="Total Leads" value={String(totalLeads)} Icon={Users} color={colors.primarySoft} iconColor={colors.primaryDark} />
          <StatTile label="Approved" value={String(approvedCount)} Icon={CheckCircle2} color={tints.green.bg} iconColor={tints.green.fg} />
          <StatTile label="Disbursed" value={String(disbursedCount)} Icon={Banknote} color={tints.deepTeal.bg} iconColor={tints.deepTeal.fg} />
        </View>

        {/* Applications Overview — bucketed donut (New / In Progress / Approved / Rejected) */}
        <View style={styles.section}>
          <SectionHeader Icon={Target} title="Applications Overview" />
          {totalLeads === 0 ? (
            <Text style={styles.empty}>No leads yet</Text>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
              <DonutChart segments={bucketedSegments} centerLabel="Total" />
              <DonutLegend segments={bucketedSegments} />
            </View>
          )}
        </View>

        {/* Daily User Trend */}
        {(data.daily_user_trend || []).length > 0 && (
          <View style={styles.section}>
            <SectionHeader Icon={Users} title="Daily New Users (14 days)" />
            <TrendChart data={data.daily_user_trend} color={colors.primary} height={80} />
          </View>
        )}

        {/* Consultation Trend */}
        {(data.consultation_trend || []).length > 0 && (
          <View style={styles.section}>
            <SectionHeader Icon={Calendar} title="Consultations Booked (14 days)" />
            <TrendChart data={data.consultation_trend} color={tints.deepTeal.fg} height={80} />
          </View>
        )}

        {/* Popular schemes */}
        <View style={styles.section}>
          <SectionHeader Icon={TrendingUp} title="Popular Schemes" />
          {(data.popular_schemes || []).length === 0 ? (
            <Text style={styles.empty}>No match data yet</Text>
          ) : (
            (data.popular_schemes || []).map((p: any) => (
              <BarRow key={p.scheme_id} label={p.name} value={p.matches} max={maxPop} color={colors.primary} />
            ))
          )}
        </View>

        {/* State distribution */}
        <View style={styles.section}>
          <SectionHeader Icon={MapPin} title="State Distribution" />
          {(data.state_distribution || []).length === 0 ? (
            <Text style={styles.empty}>No users yet</Text>
          ) : (
            (data.state_distribution || []).map((s: any, i: number) => (
              <BarRow key={s.state} label={s.state} value={s.count} max={maxState} color={stateColors[i % stateColors.length]} />
            ))
          )}
        </View>

        {/* Leads by status — donut */}
        <View style={styles.section}>
          <SectionHeader Icon={Target} title="Leads by Status" />
          {Object.keys(data.lead_pipeline || {}).length === 0 ? (
            <Text style={styles.empty}>No leads yet</Text>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
              <DonutChart
                segments={Object.entries(data.lead_pipeline || {}).map(([k, v]) => ({
                  label: k, value: Number(v), color: stageColor(k).text,
                }))}
              />
              <DonutLegend
                segments={Object.entries(data.lead_pipeline || {}).map(([k, v]) => ({
                  label: k, value: Number(v), color: stageColor(k).text,
                }))}
              />
            </View>
          )}
        </View>

        {/* Lead pipeline */}
        <View style={styles.section}>
          <SectionHeader Icon={Target} title="Lead Pipeline" />
          <View style={styles.pipelineGrid}>
            {Object.keys(data.lead_pipeline || {}).length === 0 ? (
              <Text style={styles.empty}>No leads yet</Text>
            ) : (
              Object.entries(data.lead_pipeline || {}).map(([k, v]) => (
                <PipelineBox key={k} label={k} value={Number(v)} stage={k} />
              ))
            )}
          </View>
        </View>

        {/* Consultation status */}
        <View style={styles.section}>
          <SectionHeader Icon={Phone} title="Consultation Status" />
          <View style={styles.pipelineGrid}>
            {(data.consultation_status || []).map((s: any) => (
              <PipelineBox key={s.status} label={s.status} value={s.count} stage={s.status} />
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 12,
    ...elevation.l1,
  },
  pipelineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  empty: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    paddingVertical: 8,
  },
});
