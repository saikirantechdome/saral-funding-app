import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

import { protoColors, protoRadius, protoSpacing, protoSize } from "@/src/theme.proto";
import { apiPost, setTokens } from "@/src/api";
import { getLang } from "@/src/i18n";
import ProtoButton from "@/src/components/proto/ProtoButton";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function Otp() {
  const router = useRouter();
  const { mobile } = useLocalSearchParams<{ mobile: string }>();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);

  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const code = digits.join("");
  const isComplete = code.length === OTP_LENGTH;

  const handleChange = (text: string, index: number) => {
    const cleaned = text.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    setErr("");
    if (cleaned && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (text: string, index: number) => {
    const cleaned = text.replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (cleaned.length > 1) {
      const next = Array(OTP_LENGTH).fill("");
      cleaned.split("").forEach((c, i) => { next[i] = c; });
      setDigits(next);
      inputs.current[Math.min(cleaned.length, OTP_LENGTH - 1)]?.focus();
    } else {
      handleChange(text, index);
    }
  };

  const onVerify = async () => {
    if (!isComplete) return;
    setErr("");
    setLoading(true);
    try {
      const r = await apiPost<{ token: string; refresh_token: string; user: { onboarding_step: string } }>(
        "/auth/verify-otp",
        { mobile, code, language: getLang() },
      );
      await setTokens(r.token, r.refresh_token);
      const step = r.user.onboarding_step;
      if (router.canDismiss()) router.dismissAll();
      if (step === "profile") router.replace("/onboarding/profile");
      else if (step === "business") router.replace("/onboarding/business");
      else if (step === "assessment") router.replace("/onboarding/business");
      else router.replace("/(tabs)");
    } catch (e: any) {
      setErr(e.message || "Invalid OTP. Please try again.");
      setDigits(Array(OTP_LENGTH).fill(""));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (!canResend) return;
    try {
      await apiPost("/auth/send-otp", { mobile });
      setCanResend(false);
      setCountdown(RESEND_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(""));
      setErr("");
      inputs.current[0]?.focus();
    } catch (e: any) {
      setErr(e.message || "Failed to resend. Please try again.");
    }
  };

  const mm = String(Math.floor(countdown / 60)).padStart(2, "0");
  const ss = String(countdown % 60).padStart(2, "0");

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="otp-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.back} hitSlop={12}>
            <ArrowLeft size={20} color={protoColors.text} strokeWidth={2} />
          </TouchableOpacity>

          <Text style={styles.headline}>Enter the code</Text>
          <Text style={styles.subtitle}>Sent to +91 {mobile}</Text>

          <View style={styles.boxRow}>
            {digits.map((digit, i) => (
              <TextInput
                key={i}
                ref={(r) => { inputs.current[i] = r; }}
                testID={i === 0 ? "otp-input" : `otp-digit-${i}`}
                // Only the next-to-type box gets the white/teal-border "focused"
                // treatment — matches the prototype's OTP demo exactly (filled
                // boxes 1-5 stay plain gray, only the empty 6th box is `.f`).
                // A filled box previously kept this style too, which is backwards.
                style={[styles.box, i === code.length && styles.boxFocused, !!err && styles.boxError]}
                value={digit}
                onChangeText={(t) => (t.length > 1 ? handlePaste(t, i) : handleChange(t, i))}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                caretHidden
              />
            ))}
          </View>

          {err ? (
            <Text style={styles.err}>{err}</Text>
          ) : canResend ? (
            <TouchableOpacity onPress={onResend} testID="resend-otp">
              <Text style={styles.resend}>Resend OTP</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.resend}>Resend in {mm}:{ss}</Text>
          )}

          <View style={{ height: protoSpacing.lg }} />

          <ProtoButton
            testID="verify-btn"
            label={loading ? "Verifying…" : "Verify"}
            onPress={onVerify}
            disabled={!isComplete}
            loading={loading}
          />

          <View style={{ flex: 1, minHeight: protoSpacing.xl }} />

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.footer}>Change number</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const OTP_GAP = protoSpacing.sm;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOX_SIZE = Math.min(
  protoSize.otpBox + 8,
  Math.floor((SCREEN_WIDTH - protoSpacing.lg * 2 - OTP_GAP * (OTP_LENGTH - 1)) / OTP_LENGTH),
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: protoColors.surface },
  body: {
    flexGrow: 1,
    paddingHorizontal: protoSpacing.lg,
    paddingTop: protoSpacing.xl,
    paddingBottom: protoSpacing.lg,
  },
  back: { marginBottom: protoSpacing.md, alignSelf: "flex-start" },
  headline: {
    fontSize: protoSize.headline - 2,
    lineHeight: (protoSize.headline - 2) * 1.2,
    color: protoColors.text,
    fontWeight: "700",
    marginBottom: protoSpacing.xs,
  },
  subtitle: {
    fontSize: protoSize.body,
    color: protoColors.textMuted,
    marginBottom: protoSpacing.lg,
  },
  boxRow: {
    flexDirection: "row",
    gap: OTP_GAP,
    marginBottom: protoSpacing.sm,
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: protoRadius.field,
    backgroundColor: protoColors.fieldBg,
    borderWidth: 1.5,
    borderColor: "transparent",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: protoColors.text,
  },
  boxFocused: {
    backgroundColor: "#FFFFFF",
    borderColor: protoColors.accent,
  },
  boxError: {
    borderColor: protoColors.danger,
    backgroundColor: protoColors.dangerSoft,
  },
  err: {
    fontSize: 12,
    color: protoColors.danger,
  },
  resend: {
    fontSize: protoSize.small,
    color: protoColors.textMuted,
  },
  footer: {
    fontSize: protoSize.small,
    color: protoColors.textMuted,
    textAlign: "center",
  },
});
