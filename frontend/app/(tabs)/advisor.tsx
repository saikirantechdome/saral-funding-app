import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing, radius } from "@/src/theme";
import { apiGet, apiPost, apiDelete } from "@/src/api";
import { getLang } from "@/src/i18n";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "I need ₹25 lakh for a steel shop",
  "What schemes are available in Gujarat?",
  "Can I get subsidy for manufacturing?",
  "Best loan for a woman entrepreneur",
];

export default function Advisor() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    apiGet<{ messages: Msg[] }>("/advisor/history").then((d) => setMessages(d.messages || [])).catch(() => {});
  }, []);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setSending(true);
    try {
      const r = await apiPost<{ reply: string }>("/advisor/chat", { message: msg, language: getLang() });
      setMessages((m) => [...m, { role: "assistant", content: r.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, I couldn't process that. Please try again." }]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  };

  const clearChat = async () => {
    await apiDelete("/advisor/history");
    setMessages([]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top"]} testID="advisor-screen">
      <View style={styles.bar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>AI Funding Advisor</Text>
          <Text style={styles.sub}>Ask anything about government schemes</Text>
        </View>
        {messages.length > 0 && <TouchableOpacity testID="clear-chat" onPress={clearChat}><Text style={styles.clear}>Clear</Text></TouchableOpacity>}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 16 }}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === "user" ? styles.user : styles.ai]}>
              <Text style={[styles.bubbleText, item.role === "user" && styles.userText]}>{item.content}</Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ paddingHorizontal: 4, paddingTop: 16 }}>
              <Text style={styles.empty}>Try asking…</Text>
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity key={s} testID={`suggestion-${s.slice(0, 10)}`} style={styles.suggest} onPress={() => send(s)}>
                  <Text style={styles.suggestText}>“{s}”</Text>
                </TouchableOpacity>
              ))}
            </View>
          }
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
        {sending && <View style={{ paddingHorizontal: spacing.md, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 8 }}><ActivityIndicator color={colors.primary} size="small" /><Text style={{ color: colors.textMuted, fontSize: 13 }}>Advisor is thinking…</Text></View>}
        <View style={styles.inputBar}>
          <TextInput
            testID="advisor-input"
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about funding, subsidies, loans…"
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
          />
          <TouchableOpacity testID="advisor-send" style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.5 }]} onPress={() => send()} disabled={!input.trim() || sending}>
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: spacing.md, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "800", color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  clear: { color: colors.primaryDark, fontSize: 13, fontWeight: "600" },
  bubble: { padding: 12, borderRadius: 16, marginVertical: 4, maxWidth: "85%" },
  user: { backgroundColor: colors.primary, alignSelf: "flex-end", borderBottomRightRadius: 4 },
  ai: { backgroundColor: colors.surfaceAlt, alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, color: colors.text, lineHeight: 20 },
  userText: { color: "#FFF" },
  empty: { fontSize: 13, color: colors.textMuted, marginBottom: 12, fontWeight: "600" },
  suggest: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  suggestText: { fontSize: 14, color: colors.text },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: "#FFF" },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, fontSize: 15, color: colors.text, maxHeight: 100, minHeight: 44 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  sendIcon: { color: "#FFF", fontSize: 22, fontWeight: "800" },
});
