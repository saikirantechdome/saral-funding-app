/**
 * Document review — matches the prototype's isReview state. Approve calls
 * the real `POST /admin/documents/{id}/status` endpoint (same one the
 * existing AdminUserDocuments component already uses); Request changes
 * hands off to changes.tsx which posts the rejection with a reason.
 */
import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Check, FileText } from "lucide-react-native";

import { apiPost } from "@/src/api";
import { spacing } from "@/src/theme";
import { protoColors, protoSpacing } from "@/src/theme.proto";

export default function DocumentReview() {
  const router = useRouter();
  const { docId, leadId, userId, name, docType, status, rejectReason } = useLocalSearchParams<{
    docId: string; leadId: string; userId: string; name: string; docType: string; status: string; rejectReason: string;
  }>();
  const [approving, setApproving] = useState(false);

  const approve = async () => {
    setApproving(true);
    try {
      await apiPost(`/admin/documents/${docId}/status`, { status: "verified" });
      router.replace(`/admin/review/${docId}/sent?leadId=${leadId}&kind=approved` as any);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not approve this document.");
    } finally {
      setApproving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: protoColors.surface }} edges={["top", "bottom"]} testID="admin-review-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}><ArrowLeft size={20} color={protoColors.text} strokeWidth={2} /></TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{decodeURIComponent(docType || "Document")} · {name}</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.viewerBox}>
          <FileText size={32} color={protoColors.textDim} strokeWidth={1.5} />
          <Text style={styles.viewerLabel}>Document viewer</Text>
        </View>

        {status === "rejected" && !!rejectReason && (
          <View style={styles.amberCard}>
            <Text style={styles.amberLabel}>Previous decision</Text>
            <Text style={styles.amberBody}>Changes requested — {decodeURIComponent(rejectReason)}</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>Decision</Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.decisionBtn, styles.approveBtn]} onPress={approve} disabled={approving} testID="approve-btn">
            {approving ? <ActivityIndicator color="#FFFFFF" size="small" /> : (
              <>
                <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.decisionBtnText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.decisionBtn, styles.changesBtn]}
            onPress={() => router.push(`/admin/review/${docId}/changes?leadId=${leadId}&userId=${userId}&name=${name}&docType=${docType}` as any)}
            testID="request-changes-btn"
          >
            <Text style={styles.decisionBtnTextDark}>Request changes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingTop: protoSpacing.sm, paddingBottom: protoSpacing.sm, gap: protoSpacing.sm },
  headerTitle: { flex: 1, fontSize: 14, fontWeight: "700", color: protoColors.text, textAlign: "center" },
  body: { padding: spacing.md, gap: protoSpacing.md },
  viewerBox: { height: 220, borderRadius: 18, backgroundColor: protoColors.surfaceAlt, alignItems: "center", justifyContent: "center", gap: 8 },
  viewerLabel: { fontSize: 12, color: protoColors.textDim },
  amberCard: { backgroundColor: protoColors.amberSoft, borderRadius: 16, padding: 14, gap: 4 },
  amberLabel: { fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: protoColors.amberDeep, fontWeight: "700" },
  amberBody: { fontSize: 12.5, color: protoColors.text },
  sectionLabel: { fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: protoColors.textDim, fontWeight: "700" },
  row: { flexDirection: "row", gap: protoSpacing.sm },
  decisionBtn: { flex: 1, height: 53, borderRadius: 18, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  approveBtn: { backgroundColor: "#1F7A4C" },
  changesBtn: { backgroundColor: protoColors.amber },
  decisionBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  decisionBtnTextDark: { fontSize: 14, fontWeight: "700", color: "#3A2703" },
});
