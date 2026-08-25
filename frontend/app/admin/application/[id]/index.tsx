/**
 * Application detail — matches the prototype's isDetail state. Backed by
 * `/admin/leads/{id}` (real — see apps.tsx for why leads stand in for
 * "applications"), enriched with the same user's real documents and bank
 * assignments. "CA" row is a placeholder (no real field) — see
 * ADMIN_SIDE_REVAMP_PLAN.md.
 */
import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

import { apiGet } from "@/src/api";
import { spacing, shortRef } from "@/src/theme";
import { protoColors, protoSpacing } from "@/src/theme.proto";
import ProtoButton from "@/src/components/proto/ProtoButton";

const LEAD_STAGES = ["new", "contacted", "interested", "documentation", "submitted", "approved", "disbursed", "closed"];

export default function ApplicationDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lead, setLead] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [bankAssigned, setBankAssigned] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const l = await apiGet<any>(`/admin/leads/${id}`);
      setLead(l);
      const uid = l?.user_id;
      if (uid) {
        const [d, b] = await Promise.all([
          apiGet<any[]>(`/admin/users/${uid}/documents`).catch(() => []),
          apiGet<any[]>(`/admin/users/${uid}/bank-assignments`).catch(() => []),
        ]);
        setDocs(d || []);
        setBankAssigned((b || []).length > 0);
      }
    } catch {
      setLead(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !lead) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: protoColors.surfaceAlt }} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}><ArrowLeft size={20} color="#FFFFFF" strokeWidth={2} /></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const stageIdx = Math.max(0, LEAD_STAGES.indexOf(lead.stage));
  const rejectedDoc = docs.find((d) => d.status === "rejected");
  const pendingDoc = docs.find((d) => d.status === "pending");
  const docsPill = rejectedDoc
    ? { label: "Action", bg: protoColors.pill.amber.bg, text: protoColors.pill.amber.text }
    : pendingDoc
    ? { label: "Review", bg: protoColors.pill.blue.bg, text: protoColors.pill.blue.text }
    : docs.length > 0
    ? { label: "Approved", bg: protoColors.pill.green.bg, text: protoColors.pill.green.text }
    : { label: "Not started", bg: protoColors.pill.neutral.bg, text: protoColors.pill.neutral.text };
  const hasSchemes = (lead.scheme_matches || []).length > 0;

  const reviewTarget = rejectedDoc || pendingDoc || docs[0];
  const reviewHref = reviewTarget
    ? `/admin/review/${reviewTarget.id}?leadId=${id}&userId=${lead.user_id}&name=${encodeURIComponent(lead.full_name)}&docType=${encodeURIComponent(reviewTarget.doc_type)}&status=${reviewTarget.status}&rejectReason=${encodeURIComponent(reviewTarget.reject_reason || "")}`
    : null;

  const rows = [
    { label: "Documents", pill: docsPill, onPress: () => reviewHref && router.push(reviewHref as any) },
    { label: "Schemes", pill: hasSchemes ? { label: "Assigned", bg: protoColors.pill.green.bg, text: protoColors.pill.green.text } : { label: "Not assigned", bg: protoColors.pill.neutral.bg, text: protoColors.pill.neutral.text } },
    { label: "CA", pill: { label: "Not allocated", bg: protoColors.pill.neutral.bg, text: protoColors.pill.neutral.text }, onPress: () => router.push(`/admin/application/${id}/allocate-ca` as any) },
    { label: "Bank", pill: bankAssigned ? { label: "Assigned", bg: protoColors.pill.green.bg, text: protoColors.pill.green.text } : { label: "Not assigned", bg: protoColors.pill.neutral.bg, text: protoColors.pill.neutral.text } },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: protoColors.primaryDark }} edges={["top"]} testID="application-detail-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}><ArrowLeft size={20} color="#FFFFFF" strokeWidth={2} /></TouchableOpacity>
        <Text style={styles.headerTitle}>SRL-{shortRef(lead.id)}</Text>
        <View style={{ width: 20 }} />
      </View>
      <View style={styles.identityRow}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(lead.full_name || "?").slice(0, 2).toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{lead.full_name}</Text>
          <Text style={styles.subtitle}>{lead.user?.district || lead.business_location || "—"} · {lead.business_type || "business"}</Text>
        </View>
      </View>
      <View style={styles.strip}>
        {LEAD_STAGES.map((_, i) => (
          <View key={i} style={[styles.stripSeg, i < stageIdx && styles.stripOn, i === stageIdx && styles.stripAct]} />
        ))}
      </View>

      <ScrollView style={{ backgroundColor: protoColors.surfaceAlt }} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {rows.map((r, i) => (
            <TouchableOpacity
              key={r.label}
              style={[styles.row, i === rows.length - 1 && styles.rowLast]}
              onPress={r.onPress}
              disabled={!r.onPress}
              activeOpacity={r.onPress ? 0.7 : 1}
            >
              <Text style={styles.rowLabel}>{r.label}</Text>
              <View style={[styles.pill, { backgroundColor: r.pill.bg }]}>
                <Text style={[styles.pillText, { color: r.pill.text }]}>{r.pill.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.buttonRow}>
          <View style={{ flex: 1 }}>
            <ProtoButton variant="outline" label="Message" onPress={() => router.push(`/admin/support/${lead.user_id}` as any)} />
          </View>
          <View style={{ flex: 1 }}>
            <ProtoButton
              label="Review docs"
              onPress={() => reviewHref && router.push(reviewHref as any)}
              disabled={!reviewHref}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingTop: protoSpacing.sm, paddingBottom: protoSpacing.sm },
  headerTitle: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: spacing.md, paddingBottom: protoSpacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: protoColors.accent, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  name: { fontSize: 16, color: "#FFFFFF", fontWeight: "700" },
  subtitle: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  strip: { flexDirection: "row", gap: 5, paddingHorizontal: spacing.md, paddingBottom: protoSpacing.md },
  stripSeg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.16)" },
  stripOn: { backgroundColor: protoColors.accent },
  stripAct: { backgroundColor: protoColors.amber },
  body: { padding: spacing.md, gap: protoSpacing.md, flexGrow: 1 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 19, paddingHorizontal: 14 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: protoColors.border },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 13, color: protoColors.text },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, fontWeight: "600" },
  buttonRow: { flexDirection: "row", gap: protoSpacing.sm },
});
