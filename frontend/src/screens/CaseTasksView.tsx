/**
 * CA task checklist for one case — prototype's isCaTasks state.
 * PLACEHOLDER data/state — see src/mock/caCases.ts. Checking off "Prepare
 * DPR" only updates local state, nothing is persisted. Shared by the
 * case-scoped route (admin/case-tasks/[id].tsx) and the bare "Tasks" tab
 * (admin/tasks.tsx), which has no case context of its own.
 */
import { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Check } from "lucide-react-native";

import { spacing } from "@/src/theme";
import { protoColors, protoSpacing } from "@/src/theme.proto";
import ProtoButton from "@/src/components/proto/ProtoButton";
import { CA_CASES, CaTask } from "@/src/mock/caCases";

const STATUS_PILL = {
  done: { bg: protoColors.pill.green.bg, text: protoColors.pill.green.text, label: "Done" },
  in_progress: { bg: protoColors.pill.amber.bg, text: protoColors.pill.amber.text, label: "In progress" },
  todo: { bg: protoColors.pill.neutral.bg, text: protoColors.pill.neutral.text, label: "To do" },
};

export default function CaseTasksView({ caseId, showBack = true }: { caseId: string; showBack?: boolean }) {
  const router = useRouter();
  const caseData = useMemo(() => CA_CASES.find((c) => c.id === caseId) || CA_CASES[0], [caseId]);
  const [tasks, setTasks] = useState<CaTask[]>(caseData.tasks);

  const finishDpr = () => setTasks((prev) => prev.map((t) => (t.id === "dpr" ? { ...t, status: "done" } : t)));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: protoColors.surface }} edges={["top"]} testID="ca-tasks-screen">
      <View style={styles.header}>
        {showBack ? (
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}><ArrowLeft size={20} color={protoColors.text} strokeWidth={2} /></TouchableOpacity>
        ) : <View style={{ width: 20 }} />}
        <Text style={styles.headerTitle}>{caseData.name.split(" ")[0]} · CA tasks</Text>
        <View style={styles.pill}><Text style={styles.pillText}>{caseData.scheme}</Text></View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {tasks.map((t, i) => {
            const pill = STATUS_PILL[t.status];
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.row, i === tasks.length - 1 && styles.rowLast]}
                onPress={t.id === "dpr" && t.status !== "done" ? finishDpr : undefined}
                disabled={!(t.id === "dpr" && t.status !== "done")}
              >
                <View style={[styles.check, t.status === "done" && styles.checkOn]}>
                  {t.status === "done" && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                </View>
                <Text style={styles.rowLabel}>{t.label}</Text>
                <View style={[styles.statusPill, { backgroundColor: pill.bg }]}><Text style={[styles.statusPillText, { color: pill.text }]}>{pill.label}</Text></View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.bankCard}>
          <Text style={styles.bankName}>{caseData.bank}</Text>
          <Text style={styles.bankNote}>Assign on filing</Text>
        </View>

        <View style={styles.buttonRow}>
          <View style={{ flex: 1 }}><ProtoButton variant="outline" label="Message user" onPress={() => {}} /></View>
          <View style={{ flex: 1 }}><ProtoButton label="Upload DPR" onPress={finishDpr} /></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingTop: protoSpacing.sm, paddingBottom: protoSpacing.sm },
  headerTitle: { fontSize: 14, fontWeight: "700", color: protoColors.text },
  pill: { backgroundColor: protoColors.pill.teal.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 10.5, fontWeight: "600", color: protoColors.pill.teal.text },
  body: { padding: spacing.md, gap: protoSpacing.md },
  card: { backgroundColor: "#FFFFFF", borderRadius: 19, paddingHorizontal: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: protoColors.border },
  rowLast: { borderBottomWidth: 0 },
  check: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: protoColors.border },
  checkOn: { backgroundColor: protoColors.primary, borderColor: protoColors.primary, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 13.5, color: protoColors.text },
  statusPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  statusPillText: { fontSize: 10.5, fontWeight: "600" },
  bankCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14 },
  bankName: { fontSize: 13.5, fontWeight: "600", color: protoColors.text },
  bankNote: { fontSize: 11.5, color: protoColors.textMuted, marginTop: 2 },
  buttonRow: { flexDirection: "row", gap: protoSpacing.sm },
});
