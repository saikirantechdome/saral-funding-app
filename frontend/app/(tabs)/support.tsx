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
import { ArrowLeft, Send, Headset } from "lucide-react-native";

import { spacing } from "@/src/theme";
import { protoColors, protoSpacing, protoFonts } from "@/src/theme.proto";
import { apiGet, apiPost } from "@/src/api";
import EmptyState from "@/src/components/EmptyState";
import { useFocusPolling } from "@/src/hooks/useFocusPolling";
import { useTabBarSpacing } from "@/src/hooks/useTabBarSpacing";

// Quick-reply chips matching the approved prototype's Chat state exactly —
// the second chip's visible label ("Kab tak?") is shorter than the message
// it actually sends ("Kab tak ho jayega?"), same as the prototype's
// sendReply2. Just a shortcut that fills+sends through the same real send().
const QUICK_REPLIES = [
  { label: "Bhej diya", text: "Bhej diya" },
  { label: "Kab tak?", text: "Kab tak ho jayega?" },
];

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

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: protoColors.surface }} edges={["top"]} testID="support-screen">
      <View style={styles.header}>
        {/* Prototype's isChat header opens with a back arrow (goHome) —
            present even though Chat is a persistent tab here, same as the
            Status tab's header. */}
        <TouchableOpacity onPress={() => router.push("/(tabs)" as any)} hitSlop={12} testID="chat-back">
          <ArrowLeft size={18} color={protoColors.text} strokeWidth={2} />
        </TouchableOpacity>
        {/* Flat placeholder circle, no illustration — the prototype's Chat
            header avatar is a blank `.s-ico` circle, same treatment as
            Status/Documents/Home/Profile. */}
        <View style={[styles.headerAvatarWrap, styles.avatarBlank, { width: 34, height: 34, borderRadius: 17 }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Karan S.</Text>
          <Text style={styles.headerSub}>Reviewer · replies in ~2h</Text>
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
            onEndReachedThreshold={0.3}
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
                iconSlug="online-support"
                title="Need help? We're here."
                subtitle="Send a message about your application, documents, or schemes — Karan will reply here."
              />
            }
            renderItem={({ item, index }) => {
              const isUser = item.sender_role === "user";
              const prev = items[index - 1];
              const isFirstInGroup = !prev || prev.sender_role !== item.sender_role;
              const next = items[index + 1];
              const isLastInGroup = !next || next.sender_role !== item.sender_role;
              return (
                // No per-message avatar — the prototype's message rows
                // (`.s-bubl`/`.s-bubr`) have no avatar element at all, just
                // the "KARAN"-style sender label above the first bubble in a
                // group plus bubble alignment to tell sender apart.
                <View style={[styles.row, isUser ? styles.rowUser : styles.rowAdmin, !isFirstInGroup && { marginTop: -6 }]}>
                  <View style={{ maxWidth: "78%" }}>
                    {!isUser && isFirstInGroup && <Text style={styles.senderLabel}>KARAN</Text>}
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

        <View style={styles.quickRow}>
          {QUICK_REPLIES.map((q) => (
            <TouchableOpacity key={q.label} style={styles.quickChip} onPress={() => send(q.text)} disabled={sending} testID={`quick-reply-${q.label}`}>
              <Text style={styles.quickChipText}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Single flat bar (text + inline send affordance) — matches the
            prototype's isChat input exactly, instead of a separate pill
            field plus a floating circular send button. */}
        <View style={[styles.inputBarWrap, { paddingBottom: tabBarSpacing }]}>
          <View style={styles.inputBar}>
            <TextInput
              testID="support-input"
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Message"
              placeholderTextColor={protoColors.textDim}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              testID="support-send"
              onPress={() => send()}
              disabled={!input.trim() || sending}
              hitSlop={8}
            >
              <Send size={17} color={input.trim() && !sending ? protoColors.primary : protoColors.textDim} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
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
    backgroundColor: protoColors.surface,
  },
  headerAvatarWrap: {
    position: "relative",
  },
  avatarBlank: {
    backgroundColor: protoColors.accent,
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: protoFonts.regular,
    color: protoColors.text,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: protoFonts.regular,
    color: protoColors.textMuted,
    marginTop: 1,
  },
  quickRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingTop: protoSpacing.sm,
    backgroundColor: protoColors.surfaceAlt,
  },
  quickChip: {
    backgroundColor: protoColors.pill.neutral.bg,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickChipText: {
    fontSize: 12,
    fontFamily: protoFonts.regular,
    color: protoColors.pill.neutral.text,
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
  senderLabel: {
    fontSize: 11,
    fontFamily: protoFonts.regular,
    color: protoColors.textMuted,
    marginBottom: 3,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: 17,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: protoColors.primary,
    borderBottomRightRadius: 6,
  },
  bubbleAdmin: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 6,
    shadowColor: protoColors.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleText: {
    fontSize: 14,
    fontFamily: protoFonts.regular,
    color: protoColors.text,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: "#FFFFFF",
  },
  time: {
    fontSize: 10,
    fontFamily: protoFonts.regular,
    color: protoColors.textDim,
    marginTop: 3,
    marginHorizontal: 4,
  },
  inputBarWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: protoSpacing.sm,
    // Same light panel as the message list and quick-reply row behind it —
    // the prototype's whole lower sheet is one continuous background, with
    // just the pill-shaped bar itself (below) rendered white.
    backgroundColor: protoColors.surfaceAlt,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minHeight: 50,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E9E6",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: protoFonts.regular,
    color: protoColors.text,
    maxHeight: 100,
  },
});
