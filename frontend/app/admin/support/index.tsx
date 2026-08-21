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

import { colors, spacing, radius, fonts, elevation } from "@/src/theme";
import { apiGet } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]} testID="admin-support-inbox">
      <BackBar
        title="Messages"
        onBack={() => router.back()}
        right={
          <TouchableOpacity
            testID="support-broadcast-btn"
            onPress={() => router.push("/admin/support/broadcast" as any)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Send size={19} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        }
      />

      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Search size={15} color={colors.textDim} strokeWidth={2} />
          <TextInput
            testID="admin-support-search"
            placeholder="Search by name or mobile…"
            placeholderTextColor={colors.textPlaceholder}
            style={styles.searchInput}
            value={q}
            onChangeText={onSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {!loading && (
        <Text style={styles.countLabel}>
          {total} conversation{total !== 1 ? "s" : ""}{q ? ` matching "${q}"` : ""}
        </Text>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
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
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: 12,
    backgroundColor: "#FFF",
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
    padding: 0,
  },
  countLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textDim,
    paddingHorizontal: spacing.md,
    paddingBottom: 6,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
    ...elevation.l1,
  },
  rowUnread: {
    borderColor: colors.primaryMid,
    backgroundColor: colors.primarySoft,
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
    color: colors.text,
  },
  nameUnread: {
    fontFamily: fonts.displayBold,
  },
  time: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textDim,
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
    color: colors.textMuted,
  },
  previewUnread: {
    color: colors.text,
    fontFamily: fonts.medium,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#FFF",
  },
});
