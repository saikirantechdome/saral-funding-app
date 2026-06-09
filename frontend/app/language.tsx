import { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors, spacing, radius } from "@/src/theme";
import { LANGUAGES, setLang, loadLang, getLang } from "@/src/i18n";

export default function LanguageScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState("en");

  useEffect(() => { loadLang().then(() => setSelected(getLang())); }, []);

  const onContinue = async () => {
    await setLang(selected);
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="language-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Preferred Language</Text>
        <Text style={styles.subtitle}>आप अपनी भाषा कभी भी बदल सकते हैं</Text>
      </View>
      <FlatList
        data={LANGUAGES}
        keyExtractor={(x) => x.code}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 120 }}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => {
          const active = item.code === selected;
          return (
            <TouchableOpacity
              testID={`lang-${item.code}`}
              activeOpacity={0.85}
              onPress={() => setSelected(item.code)}
              style={[styles.card, active && styles.cardActive]}
            >
              <Text style={[styles.native, active && styles.activeText]}>{item.native}</Text>
              <Text style={[styles.label, active && styles.activeText]}>{item.label}</Text>
            </TouchableOpacity>
          );
        }}
      />
      <View style={styles.footer}>
        <TouchableOpacity testID="lang-continue" style={styles.cta} onPress={onContinue}>
          <Text style={styles.ctaText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: { padding: spacing.lg, paddingBottom: spacing.md },
  title: { fontSize: 26, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  card: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, minHeight: 84, justifyContent: "center" },
  cardActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  native: { fontSize: 22, fontWeight: "700", color: colors.text },
  label: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  activeText: { color: colors.primaryDark },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: spacing.md, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
  cta: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: "center" },
  ctaText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
