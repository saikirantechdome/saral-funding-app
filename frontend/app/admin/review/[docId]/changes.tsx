/**
 * Request changes — matches the prototype's isChanges state. Sends a real
 * rejection (`POST /admin/documents/{id}/status`) and, if "In-app chat" is
 * checked, a real message via the existing admin support endpoint. The
 * backend already pushes a notification to the user on rejection (see
 * DocumentStatusIn handling), so this covers the prototype's "user notified"
 * promise without duplicating it. WhatsApp/Email checkboxes are
 * informational only — no messaging integration exists for either here.
 */
import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Check } from "lucide-react-native";

import { apiPost } from "@/src/api";
import { spacing } from "@/src/theme";
import { protoColors, protoSpacing } from "@/src/theme.proto";
import ProtoButton from "@/src/components/proto/ProtoButton";

const REASONS = ["Unclear", "Expired", "Wrong document", "Incomplete"];
const REASON_MESSAGES: Record<string, string> = {
  Unclear: "The document is unclear. Please send a sharper photo of both sides in daylight, all four corners visible.",
  Expired: "This document has expired. Please upload a currently valid copy.",
  "Wrong document": "This doesn't match the requested document type. Please upload the correct document.",
  Incomplete: "This document looks incomplete. Please upload all pages.",
};

export default function RequestChanges() {
  const router = useRouter();
  const { docId, leadId, userId, name } = useLocalSearchParams<{ docId: string; leadId: string; userId: string; name: string }>();
  const [reason, setReason] = useState("Unclear");
  const [message, setMessage] = useState(REASON_MESSAGES.Unclear);
  const [sendChat, setSendChat] = useState(true);
  const [sendWhatsapp, setSendWhatsapp] = useState(true);
  const [sending, setSending] = useState(false);

  const pickReason = (r: string) => { setReason(r); setMessage(REASON_MESSAGES[r] || ""); };

  const send = async () => {
    if (!message.trim()) { Alert.alert("Add a message", "Let the applicant know what to fix."); return; }
    setSending(true);
    try {
      await apiPost(`/admin/documents/${docId}/status`, { status: "rejected", reject_reason: message.trim() });
      if (sendChat && userId) {
        await apiPost(`/admin/support/users/${userId}/messages`, { text: message.trim() }).catch(() => {});
      }
      router.replace(`/admin/review/${docId}/sent?leadId=${leadId}&userId=${userId}&kind=changes` as any);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not send the request.");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: protoColors.surface }} edges={["top", "bottom"]} testID="admin-request-changes-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}><ArrowLeft size={20} color={protoColors.text} strokeWidth={2} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Request changes</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Reason</Text>
        <View style={styles.pillRow}>
          {REASONS.map((r) => (
            <TouchableOpacity key={r} onPress={() => pickReason(r)} style={[styles.pill, reason === r && styles.pillOn]}>
              <Text style={[styles.pillText, reason === r && styles.pillTextOn]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Message to {name}</Text>
        <TextInput
          style={styles.textarea}
          value={message}
          onChangeText={setMessage}
          multiline
          placeholder="Describe what needs to change…"
          placeholderTextColor={protoColors.textDim}
          testID="changes-message-input"
        />

        <Text style={styles.sectionLabel}>Send on</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.checkRow} onPress={() => setSendChat((v) => !v)} testID="check-chat">
            <View style={[styles.checkbox, sendChat && styles.checkboxOn]}>{sendChat && <Check size={13} color="#FFFFFF" strokeWidth={3} />}</View>
            <Text style={styles.checkLabel}>In-app chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.checkRow} onPress={() => setSendWhatsapp((v) => !v)} testID="check-whatsapp">
            <View style={[styles.checkbox, sendWhatsapp && styles.checkboxOn]}>{sendWhatsapp && <Check size={13} color="#FFFFFF" strokeWidth={3} />}</View>
            <Text style={styles.checkLabel}>WhatsApp</Text>
          </TouchableOpacity>
          <View style={[styles.checkRow, { borderBottomWidth: 0, opacity: 0.5 }]}>
            <View style={styles.checkbox} />
            <Text style={styles.checkLabel}>Email (not connected)</Text>
          </View>
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteText}>The review clock restarts when {name?.split(" ")[0]} re-uploads.</Text>
        </View>

        <ProtoButton variant="amber" label={sending ? "Sending…" : "Send request"} onPress={send} loading={sending} disabled={sending} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingTop: protoSpacing.sm, paddingBottom: protoSpacing.sm },
  headerTitle: { fontSize: 14, fontWeight: "700", color: protoColors.text },
  body: { padding: spacing.md, gap: protoSpacing.sm },
  sectionLabel: { fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: protoColors.textDim, fontWeight: "700", marginTop: 6 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: protoColors.pill.neutral.bg },
  pillOn: { backgroundColor: protoColors.pill.amber.bg },
  pillText: { fontSize: 11.5, fontWeight: "600", color: protoColors.pill.neutral.text },
  pillTextOn: { color: protoColors.pill.amber.text },
  textarea: { backgroundColor: protoColors.fieldBg, borderRadius: 14, padding: 13, fontSize: 13, color: protoColors.text, minHeight: 90, textAlignVertical: "top" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, paddingHorizontal: 13 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: protoColors.border },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: protoColors.border },
  checkboxOn: { backgroundColor: protoColors.primary, borderColor: protoColors.primary, alignItems: "center", justifyContent: "center" },
  checkLabel: { fontSize: 13.5, color: protoColors.text, fontWeight: "600" },
  noteCard: { backgroundColor: protoColors.amberSoft, borderRadius: 14, padding: 12 },
  noteText: { fontSize: 12, color: protoColors.amberDeep },
});
