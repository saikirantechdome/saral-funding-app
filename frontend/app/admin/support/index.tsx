import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Search, Headset, Send } from "lucide-react-native";

import { spacing, fonts } from "@/src/theme";
import { protoColors, protoSpacing } from "@/src/theme.proto";
import { apiGet } from "@/src/api";
import InitialsAvatar from "@/src/components/InitialsAvatar";
import EmptyState from "@/src/components/EmptyState";

function formatRelative(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 172800000) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function AdminSupportInbox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const res = await apiGet<any>(`/admin/support/conversations?limit=100${query ? `&q=${encodeURIComponent(query)}` : ""}`);
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(q); }, [load]));

  const onSearch = (text: string) => {
    setQ(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(text), 320);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: protoColors.surface }} edges={["top"]} testID="admin-support-inbox">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Inbox</Text>
          <Text style={styles.subtitle}>{total} conversation{total !== 1 ? "s" : ""}</Text>
        </View>
        <TouchableOpacity
          testID="support-broadcast-btn"
          onPress={() => router.push("/admin/support/broadcast" as any)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Send size={19} color={protoColors.text} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Search size={15} color={protoColors.textDim} strokeWidth={2} />
          <TextInput
            testID="admin-support-search"
            placeholder="Search by name or mobile…"
            placeholderTextColor={protoColors.textDim}
            style={styles.searchInput}
            value={q}
            onChangeText={onSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={protoColors.primary} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <EmptyState
          Icon={Headset}
          title="No conversations yet"
          subtitle={q ? `No conversations matching "${q}"` : "Once a user messages support, or you message a user, it'll show up here."}
          ctaLabel={q ? "Clear search" : undefined}
          onCta={q ? () => onSearch("") : undefined}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const unread = item.admin_unread_count > 0;
            const youPrefix = item.last_message_sender_role === "admin" ? "You: " : "";
            return (
              <TouchableOpacity
                testID={`support-convo-${item.user_id}`}
                style={[styles.row, unread && styles.rowUnread]}
                onPress={() => router.push(`/admin/support/${item.user_id}` as any)}
                activeOpacity={0.8}
              >
                <InitialsAvatar name={item.user_full_name || "Unknown"} size={44} />
                <View style={{ flex: 1 }}>
                  <View style={styles.topLine}>
                    <Text style={[styles.name, unread && styles.nameUnread]} numberOfLines={1}>
                      {item.user_full_name || "Unknown"}
                    </Text>
                    <Text style={styles.time}>{formatRelative(item.last_message_at)}</Text>
                  </View>
                  <View style={styles.bottomLine}>
                    <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
                      {youPrefix}{item.last_message_text || ""}
                    </Text>
                    {unread && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.admin_unread_count}</Text>
                      </View>
                    )}
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
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: spacing.md, paddingTop: protoSpacing.md, paddingBottom: protoSpacing.sm },
  title: { fontSize: 18, fontWeight: "700", color: protoColors.text },
  subtitle: { fontSize: 12, color: protoColors.textMuted, marginTop: 2 },
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 13,
    paddingHorizontal: 12,
    backgroundColor: protoColors.fieldBg,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: protoColors.text,
    padding: 0,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    padding: 13,
    marginBottom: 10,
  },
  rowUnread: {
    backgroundColor: protoColors.amberSoft,
  },
  topLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: protoColors.text,
  },
  nameUnread: {
    fontFamily: fonts.displayBold,
  },
  time: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: protoColors.textDim,
  },
  bottomLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 3,
  },
  preview: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: protoColors.textMuted,
  },
  previewUnread: {
    color: protoColors.text,
    fontFamily: fonts.medium,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: protoColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#FFF",
  },
});
