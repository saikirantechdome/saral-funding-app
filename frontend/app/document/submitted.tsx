/**
 * Confirmation screen after a document upload — matches the approved
 * prototype's "Submitted" state.
 */
import { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { apiGet } from "@/src/api";
import { spacing } from "@/src/theme";
import { protoColors, protoSpacing, protoFonts } from "@/src/theme.proto";
import ProtoButton from "@/src/components/proto/ProtoButton";
import { journeyProgress, SchemeApp } from "@/src/utils/stageProgress";

export default function DocumentSubmitted() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();
  const [app, setApp] = useState<SchemeApp | null>(null);

  useFocusEffect(useCallback(() => {
    apiGet<SchemeApp[]>("/my/scheme-applications")
      .then((apps) => setApp(journeyProgress(apps || []).app))
      .catch(() => setApp(null));
  }, []));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: protoColors.surface }} edges={["top", "bottom"]} testID="document-submitted-screen">
      <View style={styles.body}>
        <View style={styles.card}>
          {/* Flat placeholder circle, no checkmark glyph — matches the
              prototype's blank `.s-ico`-style circle exactly. */}
          <View style={styles.iconWrap} />
          <Text style={styles.title}>Document sent</Text>
          <Text style={styles.subtitle}>{decodeURIComponent(type || "Document")} is with our team for review</Text>

          <View style={styles.kvBlock}>
            {app && (
              <View style={styles.kv}>
                <Text style={styles.kvLabel}>Application</Text>
                <Text style={styles.kvValue}>SRL-{String(app.id).slice(-4).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.kv}>
              <Text style={styles.kvLabel}>Reviewer</Text>
              <Text style={styles.kvValue}>Karan S.</Text>
            </View>
            <View style={styles.kv}>
              <Text style={styles.kvLabel}>Status</Text>
              <View style={styles.pill}><Text style={styles.pillText}>Under review</Text></View>
            </View>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        <View style={styles.row}>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => router.push("/(tabs)/support" as any)} activeOpacity={0.85}>
            <Text style={styles.outlineBtnText}>Message</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <ProtoButton label="Home" onPress={() => router.replace("/(tabs)" as any)} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: spacing.md, gap: protoSpacing.md },
  card: { backgroundColor: "#FFFFFF", borderRadius: 19, padding: spacing.lg, alignItems: "center", gap: 6 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E4F5EB", marginBottom: 4 },
  title: { fontSize: 17, fontFamily: protoFonts.regular, color: protoColors.text },
  subtitle: { fontSize: 12.5, fontFamily: protoFonts.regular, color: protoColors.textMuted, textAlign: "center", marginBottom: protoSpacing.sm },
  kvBlock: { width: "100%", gap: 8, marginTop: protoSpacing.sm },
  kv: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kvLabel: { fontSize: 12, fontFamily: protoFonts.regular, color: protoColors.textMuted },
  kvValue: { fontSize: 13, fontFamily: protoFonts.regular, color: protoColors.text },
  pill: { backgroundColor: protoColors.pill.blue.bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  pillText: { fontSize: 11, fontFamily: protoFonts.regular, color: protoColors.pill.blue.text },
  row: { flexDirection: "row", gap: protoSpacing.sm },
  outlineBtn: {
    flex: 1, height: 53, borderRadius: 18, borderWidth: 1, borderColor: protoColors.border,
    alignItems: "center", justifyContent: "center",
  },
  outlineBtnText: { fontSize: 15, fontFamily: protoFonts.regular, color: protoColors.primary },
});
