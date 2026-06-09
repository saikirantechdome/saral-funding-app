import { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors, spacing, radius } from "@/src/theme";
import { apiPost } from "@/src/api";

export default function Login() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSend = async () => {
    setErr("");
    if (mobile.length < 10) { setErr("Enter a valid 10-digit mobile"); return; }
    setLoading(true);
    try {
      await apiPost("/auth/send-otp", { mobile });
      router.push({ pathname: "/otp", params: { mobile } });
    } catch (e: any) {
      setErr(e.message || "Failed to send OTP");
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="login-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.body}>
          <View style={styles.brand}>
            <View style={styles.logo}><Text style={styles.logoText}>S</Text></View>
            <Text style={styles.brandName}>Saral Funding</Text>
          </View>
          <Text style={styles.title}>Welcome 👋</Text>
          <Text style={styles.subtitle}>Login to discover government schemes you{"'"}re eligible for</Text>

          <Text style={styles.label}>Mobile Number</Text>
          <View style={styles.inputRow}>
            <Text style={styles.prefix}>+91</Text>
            <TextInput
              testID="mobile-input"
              style={styles.input}
              value={mobile}
              onChangeText={(s) => setMobile(s.replace(/\D/g, "").slice(0, 10))}
              keyboardType="number-pad"
              placeholder="10-digit mobile"
              placeholderTextColor="#9CA3AF"
              maxLength={10}
            />
          </View>
          {!!err && <Text style={styles.err}>{err}</Text>}

          <TouchableOpacity testID="send-otp-btn" style={[styles.cta, mobile.length < 10 && styles.ctaDisabled]} disabled={mobile.length < 10 || loading} onPress={onSend}>
            <Text style={styles.ctaText}>{loading ? "Sending…" : "Send OTP"}</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>By continuing you agree to our Terms & Privacy.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  body: { flex: 1, padding: spacing.lg, paddingTop: spacing.xl },
  brand: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: spacing.xl },
  logo: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  logoText: { color: "#FFF", fontSize: 20, fontWeight: "800" },
  brandName: { fontSize: 18, fontWeight: "700", color: colors.text },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 8, marginBottom: spacing.xl },
  label: { fontSize: 12, fontWeight: "600", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  inputRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12 },
  prefix: { fontSize: 16, fontWeight: "600", color: colors.text, marginRight: 8 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: colors.text },
  err: { color: colors.danger, fontSize: 13, marginTop: 8 },
  cta: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: "center", marginTop: spacing.lg },
  ctaDisabled: { backgroundColor: "#A7F3D0" },
  ctaText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  hint: { fontSize: 12, color: colors.textDim, marginTop: 16, textAlign: "center" },
});
