import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { ChevronLeft, Send, Headset } from "lucide-react-native";

import { colors, spacing, radius, fonts, elevation } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import EmptyState from "@/src/components/EmptyState";
import InitialsAvatar from "@/src/components/InitialsAvatar";
import { useFocusPolling } from "@/src/hooks/useFocusPolling";
import { useTabBarSpacing } from "@/src/hooks/useTabBarSpacing";

type Msg = {
  id: string;
  sender_role: "user" | "admin";
  text: string;
  created_at: string;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return time;
  return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${time}`;
}

export default function Support() {
  const router = useRouter();
  const tabBarSpacing = useTabBarSpacing();
  const [items, setItems] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const listRef = useRef<FlatList>(null);
  const latestCreatedAt = useRef<string | null>(null);

  const loadInitial = useCallback(async () => {
    try {
      const res = await apiGet<any>("/support/messages");
      const list: Msg[] = res.items || [];
      setItems(list);
      setHasMore(!!res.has_more);
      if (list.length) latestCreatedAt.current = list[list.length - 1].created_at;
      if (res.conversation?.user_unread_count > 0) apiPost("/support/read").catch(() => {});
    } catch {
      // empty state covers the failure case too
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadInitial(); }, [loadInitial]));

  const pollNew = useCallback(async () => {
    if (!latestCreatedAt.current) return;
    try {
      const res = await apiGet<any>(`/support/messages?since=${encodeURIComponent(latestCreatedAt.current)}`);
      const fresh: Msg[] = res.items || [];
      if (fresh.length) {
        setItems((prev) => [...prev, ...fresh]);
        latestCreatedAt.current = fresh[fresh.length - 1].created_at;
        if (fresh.some((m) => m.sender_role === "admin")) apiPost("/support/read").catch(() => {});
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      }
    } catch {
      // silent — next tick retries
    }
  }, []);

  useFocusPolling(pollNew, 4000);

  const loadOlder = async () => {
    if (!hasMore || loadingMore || !items.length) return;
    setLoadingMore(true);
    try {
      const res = await apiGet<any>(`/support/messages?before=${encodeURIComponent(items[0].created_at)}`);
      setItems((prev) => [...(res.items || []), ...prev]);
      setHasMore(!!res.has_more);
    } catch {
      // ignore — user can just try scrolling again
    } finally {
      setLoadingMore(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    try {
      const msg = await apiPost<Msg>("/support/messages", { text });
      setItems((prev) => [...prev, msg]);
      latestCreatedAt.current = msg.created_at;
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not send your message. Please try again.");
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top"]} testID="support-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerAvatarWrap}>
          <InitialsAvatar name="Support Team" size={38} variant="staff" />
          <View style={styles.onlineDot} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Support Team</Text>
          <Text style={styles.headerSub}>Usually replies within a few hours</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
        ) : (
          <FlatList
            ref={listRef}
            data={items}
            keyExtractor={(m) => m.id}
            style={{ flex: 1, backgroundColor: colors.surface2 }}
            contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            onEndReachedThreshold={0.3}
            ListHeaderComponent={
              loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginBottom: spacing.sm }} /> : null
            }
            onScroll={({ nativeEvent }) => {
              if (nativeEvent.contentOffset.y < 40) loadOlder();
            }}
            scrollEventThrottle={400}
            ListEmptyComponent={
              <EmptyState
                Icon={Headset}
                iconSlug="online-support"
                title="Need help? We're here."
                subtitle="Send a message about your application, documents, or schemes — our support team will reply here."
              />
            }
            renderItem={({ item, index }) => {
              const isUser = item.sender_role === "user";
              const prev = items[index - 1];
              const isFirstInGroup = !prev || prev.sender_role !== item.sender_role;
              const next = items[index + 1];
              const isLastInGroup = !next || next.sender_role !== item.sender_role;
              return (
                <View style={[styles.row, isUser ? styles.rowUser : styles.rowAdmin, !isFirstInGroup && { marginTop: -6 }]}>
                  {!isUser && (
                    <View style={styles.avatarWrap}>
                      {isFirstInGroup && <InitialsAvatar name="Support Team" size={28} variant="staff" />}
                    </View>
                  )}
                  <View style={{ maxWidth: "78%" }}>
                    {!isUser && isFirstInGroup && <Text style={styles.senderLabel}>Support Team</Text>}
                    <View
                      style={[
                        styles.bubble,
                        isUser ? styles.bubbleUser : styles.bubbleAdmin,
                        isUser && !isFirstInGroup && { borderTopRightRadius: 6 },
                        isUser && !isLastInGroup && { borderBottomRightRadius: 6 },
                        !isUser && !isFirstInGroup && { borderTopLeftRadius: 6 },
                        !isUser && !isLastInGroup && { borderBottomLeftRadius: 6 },
                      ]}
                    >
                      <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{item.text}</Text>
                    </View>
                    {isLastInGroup && (
                      <Text style={[styles.time, isUser && { textAlign: "right" }]}>{formatTime(item.created_at)}</Text>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}

        <View style={[styles.inputBar, { paddingBottom: spacing.sm2 + tabBarSpacing }]}>
          <TextInput
            testID="support-input"
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type your message…"
            placeholderTextColor={colors.textPlaceholder}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            testID="support-send"
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!input.trim() || sending}
          >
            <Send size={18} color="#FFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "#FFF",
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarWrap: {
    position: "relative",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: fonts.displayBold,
    color: colors.text,
    lineHeight: 20,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    marginBottom: spacing.sm2,
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  rowAdmin: {
    justifyContent: "flex-start",
  },
  avatarWrap: {
    width: 28,
    marginRight: 8,
    marginTop: 16,
  },
  senderLabel: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
    marginBottom: 3,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: radius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 6,
    ...elevation.l1,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bubbleAdmin: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 6,
    ...elevation.l1,
  },
  bubbleText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: "#FFF",
  },
  time: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: colors.textDim,
    marginTop: 3,
    marginHorizontal: 4,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: spacing.sm2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "#FFF",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
    maxHeight: 100,
    minHeight: 44,
    backgroundColor: colors.surface2,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...elevation.l1,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: colors.primaryLight,
    opacity: 0.6,
  },
});
