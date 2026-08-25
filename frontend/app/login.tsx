import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { protoColors, protoSpacing, protoSize } from "@/src/theme.proto";
import { apiPost } from "@/src/api";
import ProtoButton from "@/src/components/proto/ProtoButton";
import ProtoField from "@/src/components/proto/ProtoField";

export default function Login() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const isValid = mobile.length === 10;

  const onSend = async () => {
    setErr("");
    if (!isValid) { setErr("Enter a valid 10-digit mobile number"); return; }
    setLoading(true);
    try {
      await apiPost("/auth/send-otp", { mobile });
      router.push({ pathname: "/otp", params: { mobile } });
    } catch (e: any) {
      setErr(e.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="login-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo — the real wordmark asset the prototype uses (uploads/pasted-*.png
              in Saral User Prototype.dc.html), not a reconstruction. */}
          <Image
            source={require("../assets/images/logo-full.png")}
            style={styles.logoMark}
            resizeMode="contain"
          />
          {/* The prototype has an extra 4px spacer div between the logo and
              headline, on top of the sheet's own uniform 13px child gap
              (scaled below via `body`'s `gap`) — reproduced literally rather
              than folded into one bigger margin. */}
          <View style={{ height: protoSpacing.xs }} />

          <Text style={styles.headline}>Funding, clear hai.</Text>
          <Text style={styles.subtitle}>Enter your mobile number to start.</Text>

          <ProtoField
            testID="mobile-input"
            label="Mobile number"
            value={mobile}
            onChangeText={(v) => setMobile(v.replace(/\D/g, "").slice(0, 10))}
            prefix="+91"
            keyboardType="number-pad"
            maxLength={10}
            placeholder="98765 43210"
          />
          {!!err && <Text style={styles.err}>{err}</Text>}

          <ProtoButton
            testID="send-otp-btn"
            label={loading ? "Sending OTP…" : "Continue"}
            onPress={onSend}
            disabled={!isValid}
            loading={loading}
          />

          <View style={{ flex: 1, minHeight: protoSpacing.xl }} />

          <TouchableOpacity onPress={() => router.push("/legal")}>
            <Text style={styles.footer}>Terms &amp; Privacy Policy</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: protoColors.surface },
  body: {
    flexGrow: 1,
    paddingHorizontal: protoSpacing.lg,
    paddingTop: protoSpacing.xl,
    paddingBottom: protoSpacing.lg,
    // Uniform gap between every direct child — matches the prototype's
    // `.s-sheet.nb.pl{gap:13px}` (scaled). Previously this was a mix of
    // one-off marginBottoms/spacer Views that didn't add up to the same
    // rhythm (24px before the button vs. the prototype's 16px, etc).
    gap: protoSpacing.md,
  },
  logoMark: {
    width: 104,
    height: 31,
    alignSelf: "flex-start",
  },
  headline: {
    fontSize: protoSize.headline + 5,
    lineHeight: (protoSize.headline + 5) * 1.2,
    color: protoColors.text,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: protoSize.body,
    color: protoColors.textMuted,
  },
  err: {
    fontSize: 12,
    color: protoColors.danger,
    marginTop: protoSpacing.xs,
  },
  footer: {
    fontSize: protoSize.small,
    color: protoColors.textMuted,
    textAlign: "center",
  },
});
