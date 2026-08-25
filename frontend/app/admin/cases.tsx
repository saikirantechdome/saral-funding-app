/**
 * CA mode — "My cases" (prototype's isCaCases state). PLACEHOLDER data —
 * see src/mock/caCases.ts and ADMIN_SIDE_REVAMP_PLAN.md.
 */
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { spacing } from "@/src/theme";
import { protoColors, protoSpacing } from "@/src/theme.proto";
import { toggleAdminMode } from "@/src/hooks/useAdminMode";
import { useTabBarSpacing } from "@/src/hooks/useTabBarSpacing";
import { CA_CASES } from "@/src/mock/caCases";

const PILL_STYLE = {
  amber: { bg: protoColors.pill.amber.bg, text: protoColors.pill.amber.text },
  blue: { bg: protoColors.pill.blue.bg, text: protoColors.pill.blue.text },
  neutral: { bg: protoColors.pill.neutral.bg, text: protoColors.pill.neutral.text },
};

export default function CaCases() {
  const router = useRouter();
  const tabBarSpacing = useTabBarSpacing(-36);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: protoColors.primaryDark }} edges={["top"]} testID="ca-cases-screen">
      <ScrollView style={{ flex: 1, marginBottom: tabBarSpacing, backgroundColor: protoColors.surfaceAlt }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.headerRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>PN</Text></View>
            <View style={{ flex: 1, marginLeft: protoSpacing.sm }}>
              <Text style={styles.roleLabel}>CA mode</Text>
              <Text style={styles.roleName}>CA Priya N.</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>My cases</Text>
        </View>

        <View style={styles.sheet}>
          {CA_CASES.map((c) => {
            const pill = PILL_STYLE[c.pill.tone];
            return (
              <TouchableOpacity key={c.id} style={styles.card} onPress={() => router.push(`/admin/case-tasks/${c.id}` as any)} testID={`case-${c.id}`}>
                <View style={styles.row}>
                  <View style={styles.avatarSm}><Text style={styles.avatarSmText}>{c.name.split(" ").map((w) => w[0]).join("")}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{c.name}</Text>
                    <Text style={styles.meta}>{c.scheme} · {c.note}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: pill.bg }]}><Text style={[styles.pillText, { color: pill.text }]}>{c.pill.label}</Text></View>
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={styles.card} onPress={() => { toggleAdminMode(); router.replace("/admin" as any); }} testID="switch-role-back">
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>Switch role</Text>
                <Text style={styles.meta}>Back to reviewer</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: protoColors.primaryDark, paddingHorizontal: spacing.md, paddingTop: protoSpacing.sm, paddingBottom: 22 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: protoSpacing.md },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  roleLabel: { fontSize: 11, color: "rgba(255,255,255,0.6)" },
  roleName: { fontSize: 17, color: "#FFFFFF", fontWeight: "700", marginTop: 1 },
  heroTitle: { fontSize: 18, color: "#FFFFFF", fontWeight: "700" },
  sheet: { backgroundColor: protoColors.surfaceAlt, borderTopLeftRadius: 29, borderTopRightRadius: 29, marginTop: -18, padding: spacing.md, gap: 11, minHeight: 200 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 19, padding: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: 11 },
  avatarSm: { width: 40, height: 40, borderRadius: 20, backgroundColor: protoColors.pill.teal.bg, alignItems: "center", justifyContent: "center" },
  avatarSmText: { fontSize: 12, fontWeight: "700", color: protoColors.pill.teal.text },
  name: { fontSize: 13.5, color: protoColors.text, fontWeight: "600" },
  meta: { fontSize: 11.5, color: protoColors.textMuted, marginTop: 2 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 10.5, fontWeight: "600" },
  chevron: { fontSize: 16, color: protoColors.textMuted },
});
