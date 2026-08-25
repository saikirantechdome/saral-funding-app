import { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import FlatIcon from "@/src/components/FlatIcon";

import { spacing } from "@/src/theme";
import { protoColors, protoSpacing, protoFonts } from "@/src/theme.proto";
import { apiGet, apiPost } from "@/src/api";

// Real notification `type` values bucketed into the prototype's two filter
// pills — Actions (needs the user to do something) vs Updates (informational).
const ACTION_TYPES = new Set(["reminder", "consultation_reminder"]);

function formatTs(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const FILTERS = ["All", "Actions", "Updates"] as const;
type Filter = typeof FILTERS[number];

export default function Notifications() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("All");

  useEffect(() => {
    apiGet<any[]>("/notifications/me")
      .then((x) => { setItems(x || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const markRead = async (id: string) => {
    await apiPost(`/notifications/${id}/read`).catch(() => {});
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = async () => {
    const unread = items.filter((n) => !n.read);
    await Promise.all(unread.map((n) => apiPost(`/notifications/${n.id}/read`).catch(() => {})));
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const filtered = items.filter((n) => {
    if (filter === "All") return true;
    const isAction = ACTION_TYPES.has(n.type);
    return filter === "Actions" ? isAction : !isAction;
  });
  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: protoColors.surface }} edges={["top", "bottom"]} testID="notifications-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <FlatIcon name="left-arrow" size={20} color={protoColors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead} disabled={unreadCount === 0}>
          <Text style={[styles.readAll, unreadCount === 0 && { opacity: 0.4 }]}>Read all</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.pill, filter === f && styles.pillOn]}>
            <Text style={[styles.pillText, filter === f && styles.pillTextOn]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={protoColors.primary} style={{ marginTop: 60 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing here</Text>
          <Text style={styles.emptySubtitle}>We'll notify you about document actions and application updates.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(x) => x.id}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isAction = ACTION_TYPES.has(item.type) && !item.read;
            return (
              <TouchableOpacity
                testID={`notif-${item.id}`}
                style={[styles.card, isAction && styles.cardAmber]}
                onPress={() => markRead(item.id)}
                activeOpacity={0.85}
              >
                <View style={styles.row}>
                  {!item.read && <View style={[styles.dot, isAction && styles.dotAmber]} />}
                  {/* Flat placeholder background matching the prototype's
                      `.s-ico`; unread action items get its slightly deeper
                      amber tint (`#F6E4C4`) plus an alert icon instead of a
                      plain bell. */}
                  <View style={[styles.icon, isAction && styles.iconAmber]}>
                    {isAction
                      ? <FlatIcon name="warning" size={16} color={protoColors.amberDeep} />
                      : <FlatIcon name="bell" size={16} color={protoColors.textMuted} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.itemTs}>{formatTs(item.created_at)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", gap: protoSpacing.sm,
    paddingHorizontal: spacing.md, paddingTop: protoSpacing.sm, paddingBottom: protoSpacing.sm,
  },
  title: { flex: 1, fontSize: 15, fontFamily: protoFonts.regular, color: protoColors.text, textAlign: "center" },
  readAll: { fontSize: 12.5, color: protoColors.textMuted, fontFamily: protoFonts.regular },
  filterRow: { flexDirection: "row", gap: 6, paddingHorizontal: spacing.md, marginBottom: protoSpacing.sm },
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: protoColors.pill.neutral.bg },
  pillOn: { backgroundColor: protoColors.pill.teal.bg },
  pillText: { fontSize: 11.5, fontFamily: protoFonts.regular, color: protoColors.pill.neutral.text },
  pillTextOn: { color: protoColors.pill.teal.text },
  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg, gap: 10 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 19, padding: 13 },
  cardAmber: { backgroundColor: protoColors.amberSoft },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: protoColors.accent, marginTop: 6 },
  dotAmber: { backgroundColor: protoColors.amber },
  icon: { width: 34, height: 34, borderRadius: 12, backgroundColor: protoColors.iconPlaceholder, alignItems: "center", justifyContent: "center" },
  iconAmber: { backgroundColor: "#F6E4C4" },
  itemTitle: { fontSize: 12.5, color: protoColors.text, lineHeight: 17, fontFamily: protoFonts.regular },
  itemTs: { fontSize: 11, color: protoColors.textMuted, marginTop: 2, fontFamily: protoFonts.regular },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontSize: 15, fontFamily: protoFonts.regular, color: protoColors.text },
  emptySubtitle: { fontSize: 12.5, color: protoColors.textMuted, textAlign: "center", lineHeight: 18, fontFamily: protoFonts.regular },
});
