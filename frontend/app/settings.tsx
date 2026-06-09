import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors, spacing, radius } from "@/src/theme";
import { apiPost, clearToken } from "@/src/api";
import { LANGUAGES, loadLang, getLang, setLang } from "@/src/i18n";
import { BackBar } from "@/src/components/StepBar";

export default function Settings() {
  const router = useRouter();
  const [lang, setLangState] = useState("en");

  useEffect(() => { loadLang().then(() => setLangState(getLang())); }, []);

  const change = async (code: string) => {
    setLangState(code);
    await setLang(code);
    await apiPost("/language", { language: code }).catch(() => {});
  };

  const logout = async () => {
    await clearToken();
    router.replace("/login");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceAlt }} edges={["top", "bottom"]} testID="settings-screen">
      <BackBar title="Settings" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <Text style={styles.section}>App Language</Text>
        <View style={styles.card}>
          {LANGUAGES.map((l, i) => (
            <TouchableOpacity key={l.code} testID={`set-lang-${l.code}`} style={[styles.row, i < LANGUAGES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]} onPress={() => change(l.code)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{l.native}</Text>
                <Text style={styles.rowSub}>{l.label}</Text>
              </View>
              {lang === l.code && <Text style={{ color: colors.primaryDark, fontSize: 18 }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>About</Text>
        <View style={styles.card}>
          <View style={styles.row}><Text style={styles.rowTitle}>Version</Text><Text style={styles.rowSub}>1.0.0 (MVP)</Text></View>
        </View>

        <TouchableOpacity testID="settings-logout" style={styles.logout} onPress={logout}><Text style={styles.logoutText}>Logout</Text></TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  section: { fontSize: 12, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginLeft: 4, marginTop: 12, marginBottom: 8 },
  card: { backgroundColor: "#FFF", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", padding: 14, minHeight: 56 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  rowSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  logout: { marginTop: 24, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.danger, alignItems: "center", backgroundColor: "#FFF" },
  logoutText: { color: colors.danger, fontSize: 15, fontWeight: "700" },
});
