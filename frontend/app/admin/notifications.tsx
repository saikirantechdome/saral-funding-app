import { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors, spacing, radius } from "@/src/theme";
import { apiPost } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";

export default function AdminNotifications() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("platform");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(0);

  const send = async () => {
    if (!title || !body) return;
    setSending(true);
    try {
      const r = await apiPost<{ sent: number }>("/admin/notifications", { title, body, type });
      setDone(r.sent);
      setTitle(""); setBody("");
    } finally { setSending(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID="admin-notifications">
      <BackBar title="Send Notification" onBack={() => router.back()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          <Text style={styles.label}>Title</Text>
          <TextInput testID="notif-title" style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. New Gujarat MSME subsidy" placeholderTextColor="#9CA3AF" />
          <Text style={styles.label}>Body</Text>
          <TextInput testID="notif-body" style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]} value={body} onChangeText={setBody} multiline placeholder="Tell users what's new…" placeholderTextColor="#9CA3AF" />
          <Text style={styles.label}>Type</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {["platform", "scheme", "consultation_reminder", "recommendation"].map((t) => (
              <TouchableOpacity key={t} testID={`type-${t}`} style={[styles.chip, type === t && styles.chipActive]} onPress={() => setType(t)}>
                <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {done > 0 && <Text style={styles.success}>✓ Sent to {done} users</Text>}
          <TouchableOpacity testID="send-notif" style={[styles.cta, (!title || !body) && styles.ctaDisabled]} disabled={!title || !body || sending} onPress={send}>
            <Text style={styles.ctaText}>{sending ? "Sending…" : "Broadcast to all users"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 12, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, fontSize: 15, color: colors.text },
  chip: { flexShrink: 0, paddingHorizontal: 12, height: 36, borderRadius: 9999, borderWidth: 1, borderColor: colors.border, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  chipTextActive: { color: colors.primaryDark, fontWeight: "700" },
  success: { color: colors.primaryDark, marginTop: 12, fontWeight: "700" },
  cta: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  ctaDisabled: { backgroundColor: "#A7F3D0" },
  ctaText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
});
