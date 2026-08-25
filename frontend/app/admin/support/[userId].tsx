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
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Send, Headset } from "lucide-react-native";

import { spacing, radius, fonts, elevation, formatMobile } from "@/src/theme";
import { protoColors } from "@/src/theme.proto";
import { apiGet, apiPost } from "@/src/api";
import EmptyState from "@/src/components/EmptyState";
import InitialsAvatar from "@/src/components/InitialsAvatar";
import { useFocusPolling } from "@/src/hooks/useFocusPolling";

type Msg = {
  id: string;
  sender_role: "user" | "admin";
  sender_name: string;
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

export default function AdminSupportConversation() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [targetUser, setTargetUser] = useState<any>(null);
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
      const res = await apiGet<any>(`/admin/support/users/${userId}/messages`);
      const list: Msg[] = res.items || [];
      setItems(list);
      setHasMore(!!res.has_more);
      setTargetUser(res.user);
      if (list.length) latestCreatedAt.current = list[list.length - 1].created_at;
      if (res.conversation?.admin_unread_count > 0) apiPost(`/admin/support/users/${userId}/read`).catch(() => {});
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not load this conversation.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { loadInitial(); }, [loadInitial]));

  const pollNew = useCallback(async () => {
    if (!latestCreatedAt.current) return;
    try {
      const res = await apiGet<any>(`/admin/support/users/${userId}/messages?since=${encodeURIComponent(latestCreatedAt.current)}`);
      const fresh: Msg[] = res.items || [];
      if (fresh.length) {
        setItems((prev) => [...prev, ...fresh]);
        latestCreatedAt.current = fresh[fresh.length - 1].created_at;
        if (fresh.some((m) => m.sender_role === "user")) apiPost(`/admin/support/users/${userId}/read`).catch(() => {});
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      }
    } catch {
      // silent — next tick retries
    }
  }, [userId]);

  useFocusPolling(pollNew, 4000);

  const loadOlder = async () => {
    if (!hasMore || loadingMore || !items.length) return;
    setLoadingMore(true);
    try {
      const res = await apiGet<any>(`/admin/support/users/${userId}/messages?before=${encodeURIComponent(items[0].created_at)}`);
      setItems((prev) => [...(res.items || []), ...prev]);
      setHasMore(!!res.has_more);
    } catch {
      // ignore
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
      const msg = await apiPost<Msg>(`/admin/support/users/${userId}/messages`, { text });
      setItems((prev) => [...prev, msg]);
      latestCreatedAt.current = msg.created_at;
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not send message.");
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID="admin-support-conversation">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={22} color={protoColors.text} strokeWidth={2} />
        </TouchableOpacity>
        <InitialsAvatar name={targetUser?.full_name || "User"} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{targetUser?.full_name || "Conversation"}</Text>
          {targetUser?.mobile && <Text style={styles.headerSub}>{formatMobile(targetUser.mobile)}</Text>}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {loading ? (
          <ActivityIndicator color={protoColors.primary} style={{ marginTop: 60 }} />
        ) : (
          <FlatList
            ref={listRef}
            data={items}
            keyExtractor={(m) => m.id}
            style={{ flex: 1, backgroundColor: protoColors.surfaceAlt }}
            contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              loadingMore ? <ActivityIndicator color={protoColors.primary} style={{ marginBottom: spacing.sm }} /> : null
            }
            onScroll={({ nativeEvent }) => {
              if (nativeEvent.contentOffset.y < 40) loadOlder();
            }}
            scrollEventThrottle={400}
            ListEmptyComponent={
              <EmptyState
                Icon={Headset}
                title="No messages yet"
                subtitle={`Start the conversation with ${targetUser?.full_name || "this user"}.`}
              />
            }
            renderItem={({ item, index }) => {
              const isAdmin = item.sender_role === "admin";
              const prev = items[index - 1];
              const isFirstInGroup = !prev || prev.sender_role !== item.sender_role;
              const next = items[index + 1];
              const isLastInGroup = !next || next.sender_role !== item.sender_role;
              return (
                <View style={[styles.row, isAdmin ? styles.rowAdmin : styles.rowUser, !isFirstInGroup && { marginTop: -6 }]}>
                  {!isAdmin && (
                    <View style={styles.avatarWrap}>
                      {isFirstInGroup && <InitialsAvatar name={targetUser?.full_name || "User"} size={28} />}
                    </View>
                  )}
                  <View style={{ maxWidth: "78%" }}>
                    <View
                      style={[
                        styles.bubble,
                        isAdmin ? styles.bubbleAdmin : styles.bubbleUser,
                        isAdmin && !isFirstInGroup && { borderTopRightRadius: 6 },
                        isAdmin && !isLastInGroup && { borderBottomRightRadius: 6 },
                        !isAdmin && !isFirstInGroup && { borderTopLeftRadius: 6 },
                        !isAdmin && !isLastInGroup && { borderBottomLeftRadius: 6 },
                      ]}
                    >
                      <Text style={[styles.bubbleText, isAdmin && styles.bubbleTextAdmin]}>{item.text}</Text>
                    </View>
                    {isLastInGroup && (
                      <Text style={[styles.time, isAdmin && { textAlign: "right" }]}>{formatTime(item.created_at)}</Text>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            testID="admin-support-input"
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Reply…"
            placeholderTextColor={protoColors.textDim}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            testID="admin-support-send"
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
    borderBottomColor: protoColors.border,
    backgroundColor: "#FFF",
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
    color: protoColors.text,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: protoColors.textMuted,
    marginTop: 1,
  },
  row: {
    flexDirection: "row",
    marginBottom: spacing.sm2,
  },
  rowUser: {
    justifyContent: "flex-start",
  },
  rowAdmin: {
    justifyContent: "flex-end",
  },
  avatarWrap: {
    width: 28,
    marginRight: 8,
    marginTop: 4,
  },
  bubble: {
    borderRadius: radius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleAdmin: {
    backgroundColor: protoColors.primary,
    borderBottomRightRadius: 6,
    shadowColor: protoColors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleUser: {
    backgroundColor: "#FFF",
    borderBottomLeftRadius: 6,
    shadowColor: protoColors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: protoColors.text,
    lineHeight: 20,
  },
  bubbleTextAdmin: {
    color: "#FFF",
  },
  time: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: protoColors.textDim,
    marginTop: 3,
    marginHorizontal: 4,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: spacing.sm2,
    borderTopWidth: 1,
    borderTopColor: protoColors.border,
    backgroundColor: "#FFF",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: protoColors.border,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: protoColors.text,
    maxHeight: 100,
    minHeight: 44,
    backgroundColor: protoColors.surfaceAlt,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: protoColors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...elevation.l1,
  },
  sendBtnDisabled: {
    backgroundColor: protoColors.accent,
    opacity: 0.6,
  },
});
