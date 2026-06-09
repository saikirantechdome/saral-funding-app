import { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors, spacing, radius, formatINR } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";

export default function AdminSchemes() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => { setLoading(true); setItems(await apiGet("/admin/schemes")); setLoading(false); };
  useEffect(() => { load(); }, []);

  const toggle = async (s: any) => {
    if (s.disabled) await apiPost(`/admin/schemes/${s.id}/enable`);
    else await apiPost(`/admin/schemes/${s.id}/disable`);
    load();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID="admin-schemes">
      <BackBar title="Schemes" onBack={() => router.back()} />
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`admin-scheme-${item.id}`}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta} numberOfLines={2}>{item.description}</Text>
                <Text style={styles.meta2}>Up to {formatINR(item.max_funding)} • {item.max_subsidy_percent}% subsidy</Text>
              </View>
              <TouchableOpacity testID={`toggle-${item.id}`} style={[styles.toggle, item.disabled ? styles.off : styles.on]} onPress={() => toggle(item)}>
                <Text style={[styles.toggleText, item.disabled ? styles.offText : styles.onText]}>{item.disabled ? "Disabled" : "Active"}</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: 10, padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: "#FFF", marginBottom: 8 },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  meta2: { fontSize: 11, color: colors.primaryDark, fontWeight: "700", marginTop: 4 },
  toggle: { paddingHorizontal: 10, borderRadius: 9999, borderWidth: 1, alignItems: "center", justifyContent: "center", height: 32, alignSelf: "center" },
  on: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  off: { borderColor: colors.danger, backgroundColor: "#FEE2E2" },
  onText: { color: colors.primaryDark },
  offText: { color: colors.danger },
  toggleText: { fontSize: 12, fontWeight: "700" },
});
