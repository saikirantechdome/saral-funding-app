/**
 * Confirmation after approve/request-changes — matches the prototype's
 * isSent state.
 */
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check } from "lucide-react-native";

import { spacing } from "@/src/theme";
import { protoColors, protoSpacing } from "@/src/theme.proto";
import ProtoButton from "@/src/components/proto/ProtoButton";

export default function ReviewSent() {
  const router = useRouter();
  const { leadId, userId, kind } = useLocalSearchParams<{ leadId: string; userId: string; kind: string }>();
  const approved = kind === "approved";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: protoColors.primaryDark }} edges={["top", "bottom"]} testID="admin-review-sent-screen">
      <View style={styles.header}><Text style={styles.headerTitle}>Sent</Text></View>
      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.iconWrap}><Check size={20} color="#1F7A4C" strokeWidth={3} /></View>
          <Text style={styles.title}>{approved ? "Document approved" : "Request sent"}</Text>
          <Text style={styles.subtitle}>
            {approved ? "User notified on chat + WhatsApp" : "Chat + WhatsApp · clock restarts on re-upload"}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <View style={styles.row}>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => router.push(`/admin/support/${userId}` as any)}>
            <Text style={styles.outlineBtnText}>Open thread</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <ProtoButton label="Back to queue" onPress={() => router.replace("/admin" as any)} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingTop: protoSpacing.md, paddingBottom: protoSpacing.md },
  headerTitle: { fontSize: 14, fontWeight: "700", color: "#FFFFFF", textAlign: "center" },
  body: { flex: 1, backgroundColor: protoColors.surfaceAlt, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.md, gap: protoSpacing.md },
  card: { backgroundColor: "#FFFFFF", borderRadius: 19, padding: spacing.lg, alignItems: "center", gap: 6 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E4F5EB", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontSize: 16, fontWeight: "700", color: protoColors.text },
  subtitle: { fontSize: 12.5, color: protoColors.textMuted, textAlign: "center" },
  row: { flexDirection: "row", gap: protoSpacing.sm },
  outlineBtn: { flex: 1, height: 53, borderRadius: 18, borderWidth: 1, borderColor: protoColors.border, alignItems: "center", justifyContent: "center" },
  outlineBtnText: { fontSize: 15, fontWeight: "600", color: protoColors.primary },
});
