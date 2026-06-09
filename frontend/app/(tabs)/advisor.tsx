import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing, radius, formatINR } from "@/src/theme";
import { apiGet, apiPost, apiDelete } from "@/src/api";
import { getLang } from "@/src/i18n";
import { useRouter } from "expo-router";

type Msg = { role: "user" | "assistant"; content: string; structured?: any };

const SUGGESTIONS = [
  "I need ₹25 lakh for a steel shop",
  "What schemes are available in Gujarat?",
  "Best loan for a woman entrepreneur",
  "I want ₹30 lakh for a manufacturing unit",
];

export default function Advisor() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<"chat" | "strategy">("chat");
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
      if (mode === "strategy") {
        const r = await apiPost<any>("/advisor/structured", { query: msg, language: getLang() });
        setMessages((m) => [...m, { role: "assistant", content: r.summary || "", structured: r }]);
      } else {
        const r = await apiPost<{ reply: string }>("/advisor/chat", { message: msg, language: getLang() });
        setMessages((m) => [...m, { role: "assistant", content: r.reply }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, I couldn't process that. Please try again." }]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  };

  const clearChat = async () => { await apiDelete("/advisor/history"); setMessages([]); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top"]} testID="advisor-screen">
      <View style={styles.bar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>AI Funding Advisor</Text>
          <Text style={styles.sub}>Ask anything about schemes & banks</Text>
        </View>
        {messages.length > 0 && <TouchableOpacity testID="clear-chat" onPress={clearChat}><Text style={styles.clear}>Clear</Text></TouchableOpacity>}
      </View>

      <View style={styles.modeRow}>
        {(["chat", "strategy"] as const).map((m) => (
          <TouchableOpacity key={m} testID={`mode-${m}`} style={[styles.modeBtn, mode === m && styles.modeActive]} onPress={() => setMode(m)}>
            <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>{m === "chat" ? "💬 Quick Chat" : "🎯 Funding Strategy"}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 16 }}
          renderItem={({ item }) => {
            if (item.role === "user") return <View style={[styles.bubble, styles.user]}><Text style={[styles.bubbleText, styles.userText]}>{item.content}</Text></View>;
            if (item.structured) return <StructuredCard data={item.structured} onScheme={(n) => router.push("/(tabs)/schemes")} onBank={() => router.push("/banks")} />;
            return <View style={[styles.bubble, styles.ai]}><Text style={styles.bubbleText}>{item.content}</Text></View>;
          }}
          ListEmptyComponent={
            <View style={{ paddingHorizontal: 4, paddingTop: 16 }}>
              <Text style={styles.empty}>{mode === "strategy" ? "Get a full funding strategy" : "Try asking…"}</Text>
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity key={s} testID={`suggestion-${s.slice(0, 10)}`} style={styles.suggest} onPress={() => send(s)}>
                  <Text style={styles.suggestText}>“{s}”</Text>
                </TouchableOpacity>
              ))}
            </View>
          }
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
        {sending && <View style={{ paddingHorizontal: spacing.md, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 8 }}><ActivityIndicator color={colors.primary} size="small" /><Text style={{ color: colors.textMuted, fontSize: 13 }}>{mode === "strategy" ? "Building your roadmap…" : "Advisor is thinking…"}</Text></View>}
        <View style={styles.inputBar}>
          <TextInput
            testID="advisor-input"
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={mode === "strategy" ? "Tell me your funding goal…" : "Ask about funding, subsidies, loans…"}
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

function StructuredCard({ data, onScheme, onBank }: { data: any; onScheme: (n: string) => void; onBank: () => void }) {
  return (
    <View style={styles.struct} testID="structured-response">
      <View style={styles.structHead}>
        <Text style={styles.structTitle}>Your Funding Roadmap</Text>
      </View>
      <Text style={styles.structSummary}>{data.summary}</Text>
      {data.schemes?.length > 0 && (
        <View style={styles.structSec}>
          <Text style={styles.structSecTitle}>📋 Recommended Schemes</Text>
          {data.schemes.map((s: any, i: number) => (
            <TouchableOpacity key={i} testID={`struct-scheme-${i}`} style={styles.structItem} onPress={() => onScheme(s.name)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.structItemTitle}>{s.name}</Text>
                <Text style={styles.structItemBody}>{s.why}</Text>
                {s.estimated_funding > 0 && <Text style={styles.structItemMeta}>Up to {formatINR(s.estimated_funding)}{s.estimated_subsidy > 0 ? ` • Subsidy ${formatINR(s.estimated_subsidy)}` : ""}</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {data.banks?.length > 0 && (
        <View style={styles.structSec}>
          <Text style={styles.structSecTitle}>🏦 Recommended Banks</Text>
          {data.banks.map((b: any, i: number) => (
            <TouchableOpacity key={i} testID={`struct-bank-${i}`} style={styles.structItem} onPress={onBank}>
              <View style={{ flex: 1 }}>
                <Text style={styles.structItemTitle}>{b.name}</Text>
                <Text style={styles.structItemBody}>{b.why}</Text>
                <Text style={styles.structItemMeta}>{b.interest_range}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {data.documents?.length > 0 && (
        <View style={styles.structSec}>
          <Text style={styles.structSecTitle}>📄 Documents Needed</Text>
          {data.documents.map((d: string, i: number) => <Text key={i} style={styles.structBullet}>• {d}</Text>)}
        </View>
      )}
      {data.roadmap?.length > 0 && (
        <View style={styles.structSec}>
          <Text style={styles.structSecTitle}>🛣️ Roadmap</Text>
          {data.roadmap.map((d: string, i: number) => <Text key={i} style={styles.structBullet}>{i + 1}. {d}</Text>)}
        </View>
      )}
      {data.next_steps?.length > 0 && (
        <View style={styles.structSec}>
          <Text style={styles.structSecTitle}>✅ Next Steps</Text>
          {data.next_steps.map((d: string, i: number) => <Text key={i} style={styles.structBullet}>• {d}</Text>)}
        </View>
      )}
      {data.why && (
        <View style={[styles.structSec, { backgroundColor: colors.primarySoft, padding: 10, borderRadius: 8 }]}>
          <Text style={styles.structSecTitle}>Why this plan?</Text>
          <Text style={styles.structBullet}>{data.why}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: spacing.md, paddingTop: 8, paddingBottom: 8, flexDirection: "row", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "800", color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  clear: { color: colors.primaryDark, fontSize: 13, fontWeight: "600" },
  modeRow: { flexDirection: "row", paddingHorizontal: spacing.md, paddingBottom: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 9999, borderWidth: 1, borderColor: colors.border, alignItems: "center", backgroundColor: "#FFF" },
  modeActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  modeText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  modeTextActive: { color: colors.primaryDark, fontWeight: "700" },
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
  struct: { backgroundColor: "#FFF", borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, marginVertical: 6, maxWidth: "95%", alignSelf: "flex-start" },
  structHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  structTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  structSummary: { fontSize: 14, color: colors.text, lineHeight: 20 },
  structSec: { marginTop: 14 },
  structSecTitle: { fontSize: 13, fontWeight: "800", color: colors.text, marginBottom: 8 },
  structItem: { backgroundColor: colors.surfaceAlt, borderRadius: 8, padding: 10, marginBottom: 6 },
  structItemTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
  structItemBody: { fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 16 },
  structItemMeta: { fontSize: 11, color: colors.primaryDark, fontWeight: "700", marginTop: 4 },
  structBullet: { fontSize: 13, color: colors.text, lineHeight: 20 },
});
