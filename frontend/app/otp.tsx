import { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { colors, spacing, radius } from "@/src/theme";
import { apiPost, setToken } from "@/src/api";
import { getLang } from "@/src/i18n";

export default function Otp() {
  const router = useRouter();
  const { mobile } = useLocalSearchParams<{ mobile: string }>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onVerify = async () => {
    setErr("");
    if (code.length !== 6) { setErr("Enter the 6-digit OTP"); return; }
    setLoading(true);
    try {
      const r = await apiPost<{ token: string; user: { onboarding_step: string } }>(
        "/auth/verify-otp",
        { mobile, code, language: getLang() },
      );
      await setToken(r.token);
      const step = r.user.onboarding_step;
      if (step === "profile") router.replace("/onboarding/profile");
      else if (step === "business") router.replace("/onboarding/business");
      else if (step === "assessment") router.replace("/onboarding/assessment");
      else router.replace("/(tabs)");
    } catch (e: any) {
      setErr(e.message || "Invalid OTP");
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="otp-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.body}>
          <TouchableOpacity onPress={() => router.back()} testID="otp-back"><Text style={styles.back}>← Back</Text></TouchableOpacity>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>Sent to +91 {mobile}</Text>

          <TextInput
            testID="otp-input"
            style={styles.input}
            value={code}
            onChangeText={(s) => setCode(s.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            placeholder="● ● ● ● ● ●"
            placeholderTextColor="#D1D5DB"
            maxLength={6}
          />
          <Text style={styles.hint}>For this MVP demo, use 123456</Text>
          {!!err && <Text style={styles.err}>{err}</Text>}

          <TouchableOpacity testID="verify-btn" style={[styles.cta, code.length !== 6 && styles.ctaDisabled]} disabled={code.length !== 6 || loading} onPress={onVerify}>
            <Text style={styles.ctaText}>{loading ? "Verifying…" : "Verify & Continue"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  body: { flex: 1, padding: spacing.lg, paddingTop: spacing.md },
  back: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.md },
  title: { fontSize: 28, fontWeight: "800", color: colors.text, marginTop: spacing.md },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 6, marginBottom: spacing.xl },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16, fontSize: 22, textAlign: "center", letterSpacing: 8, color: colors.text },
  hint: { fontSize: 12, color: colors.primaryDark, marginTop: 8, textAlign: "center", fontWeight: "600" },
  err: { color: colors.danger, fontSize: 13, marginTop: 8, textAlign: "center" },
  cta: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: "center", marginTop: spacing.lg },
  ctaDisabled: { backgroundColor: "#A7F3D0" },
  ctaText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
