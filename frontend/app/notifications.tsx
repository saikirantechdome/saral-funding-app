import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Bell, Target, Building2, Zap, CheckCheck, CheckCircle2, Info } from "lucide-react-native";

import { colors, spacing, radius, fonts, tints, elevation } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import Saathi from "@/src/components/Saathi";
import RemoteIcon from "@/src/components/RemoteIcon";

function notifIcon(type: string) {
  const cfg: Record<string, { icon: any; slug: string; bg: string; color: string }> = {
    high_match: { icon: Target, slug: "target", bg: colors.primarySoft, color: colors.primaryDark },
    state_scheme: { icon: Building2, slug: "bank-building", bg: tints.blue.bg, color: tints.blue.fg },
    readiness: { icon: Zap, slug: "idea", bg: tints.amber.bg, color: tints.amber.fg },
    consultation_reminder: { icon: Bell, slug: "calendar", bg: tints.deepTeal.bg, color: tints.deepTeal.fg },
    platform: { icon: Bell, slug: "megaphone", bg: tints.teal.bg, color: tints.teal.fg },
    reminder: { icon: Bell, slug: "clock", bg: tints.deepTeal.bg, color: tints.deepTeal.fg },
    recommendation: { icon: CheckCircle2, slug: "medal", bg: tints.blue.bg, color: tints.blue.fg },
  };
  return cfg[type] ?? { icon: Info, slug: "info-squared", bg: colors.surfaceAlt, color: colors.textMuted };
}

function formatTs(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function Notifications() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<any[]>("/notifications/me")
      .then((x) => { setItems(x); setLoading(false); })
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

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID="notifications-screen">
      <BackBar title="Notifications" onBack={() => router.back()} />

      {unreadCount > 0 && (
        <View style={styles.subheader}>
          <Text style={styles.subheaderText}>{unreadCount} unread</Text>
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <CheckCheck size={13} color={colors.primaryDark} strokeWidth={2} />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Saathi expression="happy" size={110} />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptySubtitle}>
            We'll notify you about scheme matches, readiness tips, and consultation reminders.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const { icon: IconComponent, slug, bg, color } = notifIcon(item.type);
            return (
              <TouchableOpacity
                testID={`notif-${item.id}`}
                style={[styles.card, !item.read && styles.cardUnread]}
                onPress={() => markRead(item.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.iconWrap, { backgroundColor: bg }]}>
                  <RemoteIcon slug={slug} size={22} fallback={IconComponent} fallbackColor={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                    {!item.read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.body} numberOfLines={3}>{item.body}</Text>
                  <Text style={styles.ts}>{formatTs(item.created_at)}</Text>
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
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textDim,
    textAlign: "center",
    lineHeight: 22,
  },
  subheader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "#FFF",
  },
  subheaderText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm2,
    paddingVertical: spacing.xs2,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  markAllText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
  },
  card: {
    flexDirection: "row",
    gap: spacing.sm2,
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm2,
    ...elevation.l1,
  },
  cardUnread: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMid,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    lineHeight: 19,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  body: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 6,
  },
  ts: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textDim,
  },
});
