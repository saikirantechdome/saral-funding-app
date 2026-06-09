import { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors, spacing, radius } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";

export default function Notifications() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { apiGet<any[]>("/notifications/me").then((x) => { setItems(x); setLoading(false); }); }, []);

  const markRead = async (id: string) => {
    await apiPost(`/notifications/${id}/read`).catch(() => {});
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID="notifications-screen">
      <BackBar title="Notifications" onBack={() => router.back()} />
      {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.md }}
          ListEmptyComponent={<Text style={styles.empty}>No notifications yet.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity testID={`notif-${item.id}`} style={[styles.card, !item.read && styles.unread]} onPress={() => markRead(item.id)}>
              <View style={[styles.dot, !item.read && { backgroundColor: colors.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.ts}>{new Date(item.created_at).toLocaleString()}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: 12, backgroundColor: "#FFF", borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  unread: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border, marginTop: 6 },
  title: { fontSize: 15, fontWeight: "700", color: colors.text },
  body: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  ts: { fontSize: 11, color: colors.textDim, marginTop: 6 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 40 },
});
