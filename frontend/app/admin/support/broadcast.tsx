import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Users, User as UserIcon, Search, CheckCircle2, Circle, Send } from "lucide-react-native";

import { colors, spacing, radius, fonts, elevation, formatMobile } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import Input from "@/src/components/ui/Input";
import Button from "@/src/components/ui/Button";
import InitialsAvatar from "@/src/components/InitialsAvatar";

export default function SupportBroadcast() {
  const router = useRouter();
  const [mode, setMode] = useState<"all" | "select">("all");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);

  const [q, setQ] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selected, setSelected] = useState<Record<string, { id: string; full_name: string }>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadUsers = async (query: string) => {
    setLoadingUsers(true);
    try {
      const res = await apiGet<any>(`/admin/users?limit=50&role=user${query ? `&q=${encodeURIComponent(query)}` : ""}`);
      setUsers(res.items || (Array.isArray(res) ? res : []));
    } catch {
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (mode === "select" && users.length === 0) loadUsers("");
  }, [mode]);

  const onSearch = (val: string) => {
    setQ(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadUsers(val), 320);
  };

  const toggleUser = (u: any) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[u.id]) delete next[u.id];
      else next[u.id] = { id: u.id, full_name: u.full_name };
      return next;
    });
  };

  const selectedIds = Object.keys(selected);
  const canSend = text.trim().length > 0 && (mode === "all" || selectedIds.length > 0);

  const doSend = async () => {
    setSending(true);
    try {
      const r = await apiPost<{ sent: number }>("/admin/support/broadcast", {
        text: text.trim(),
        target_user_ids: mode === "all" ? null : selectedIds,
      });
      setSentCount(r.sent);
      setText("");
      setSelected({});
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not send message.");
    } finally {
      setSending(false);
    }
  };

  const confirmSend = () => {
    if (!canSend) return;
    const audience = mode === "all" ? "ALL users" : `${selectedIds.length} selected user${selectedIds.length !== 1 ? "s" : ""}`;
    const message = `This will send a chat message to ${audience}. Continue?`;

    if (Platform.OS === "web") {
      // Alert.alert on web maps to window.confirm, which doesn't reliably
      // support custom multi-button configs — call it directly instead.
      if (window.confirm(message)) doSend();
      return;
    }
    Alert.alert("Send message?", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Send", onPress: doSend },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]} testID="support-broadcast">
      <BackBar title="Broadcast Message" onBack={() => router.back()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {sentCount !== null && (
            <View style={styles.successCard}>
              <View style={styles.successIconChip}>
                <CheckCircle2 size={20} color={colors.primaryDark} strokeWidth={2} />
              </View>
              <View>
                <Text style={styles.successTitle}>Message Sent</Text>
                <Text style={styles.successSub}>Delivered to {sentCount} user{sentCount !== 1 ? "s" : ""}</Text>
              </View>
            </View>
          )}

          <Text style={styles.fieldLabel}>Send To</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              testID="broadcast-mode-all"
              style={[styles.modeCard, mode === "all" && styles.modeCardActive]}
              onPress={() => setMode("all")}
              activeOpacity={0.8}
            >
              <Users size={16} color={mode === "all" ? colors.primaryDark : colors.textDim} strokeWidth={2} />
              <Text style={[styles.modeText, mode === "all" && styles.modeTextActive]}>All Users</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="broadcast-mode-select"
              style={[styles.modeCard, mode === "select" && styles.modeCardActive]}
              onPress={() => setMode("select")}
              activeOpacity={0.8}
            >
              <UserIcon size={16} color={mode === "select" ? colors.primaryDark : colors.textDim} strokeWidth={2} />
              <Text style={[styles.modeText, mode === "select" && styles.modeTextActive]}>Select Users</Text>
            </TouchableOpacity>
          </View>

          {mode === "select" && (
            <View style={styles.pickerWrap}>
              {selectedIds.length > 0 && (
                <Text style={styles.selectedCount}>{selectedIds.length} selected</Text>
              )}
              <View style={styles.searchBox}>
                <Search size={14} color={colors.textDim} strokeWidth={2} />
                <TextInput
                  testID="broadcast-user-search"
                  placeholder="Search by name or mobile…"
                  placeholderTextColor={colors.textPlaceholder}
                  style={styles.searchInput}
                  value={q}
                  onChangeText={onSearch}
                />
              </View>
              {loadingUsers ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
              ) : (
                <FlatList
                  data={users}
                  keyExtractor={(u) => u.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => {
                    const isSelected = !!selected[item.id];
                    return (
                      <TouchableOpacity
                        testID={`broadcast-user-${item.id}`}
                        style={[styles.userRow, isSelected && styles.userRowSelected]}
                        onPress={() => toggleUser(item)}
                        activeOpacity={0.75}
                      >
                        {isSelected
                          ? <CheckCircle2 size={20} color={colors.primary} strokeWidth={2} />
                          : <Circle size={20} color={colors.textDim} strokeWidth={1.5} />}
                        <InitialsAvatar name={item.full_name || "Unknown"} size={32} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.userName} numberOfLines={1}>{item.full_name || "Unnamed"}</Text>
                          <Text style={styles.userMobile}>{formatMobile(item.mobile)}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </View>
          )}

          <Input
            testID="broadcast-text"
            label="Message"
            value={text}
            onChangeText={setText}
            multiline
            placeholder="e.g. Please complete all pending document uploads to avoid delays…"
            maxLength={2000}
            showCount
          />

          <Button
            testID="broadcast-send"
            label={sending ? "Sending…" : "Send Message"}
            onPress={confirmSend}
            disabled={!canSend}
            loading={sending}
            size="lg"
            Icon={Send}
            iconPosition="right"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: 60,
  },
  successCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm2,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primaryMid,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...elevation.l1,
  },
  successIconChip: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryMid,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 14,
    fontFamily: fonts.displayBold,
    color: colors.primaryDark,
  },
  successSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.primaryDark,
    opacity: 0.8,
    marginTop: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  modeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  modeCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: "#FFF",
  },
  modeCardActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  modeText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
  },
  modeTextActive: {
    color: colors.primaryDark,
  },
  pickerWrap: {
    marginBottom: spacing.lg,
  },
  selectedCount: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
    marginBottom: 8,
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
    marginBottom: spacing.sm2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
    padding: 0,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginBottom: 6,
  },
  userRowSelected: {
    borderColor: colors.primaryMid,
    backgroundColor: colors.primarySoft,
  },
  userName: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  userMobile: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 1,
  },
});
