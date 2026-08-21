import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react-native";

import { colors, spacing, radius, fonts } from "@/src/theme";
import { apiPost } from "@/src/api";
import Button from "@/src/components/ui/Button";
import RemoteIcon from "@/src/components/RemoteIcon";

const TRUST_ITEMS = [
  { icon: <ShieldCheck size={13} color={colors.primaryDark} strokeWidth={2} />, label: "Secure & private" },
  { icon: <Sparkles size={13} color={colors.primaryDark} strokeWidth={2} />, label: "AI-powered matching" },
  { icon: <CheckCircle2 size={13} color={colors.primaryDark} strokeWidth={2} />, label: "25+ govt schemes" },
];

export default function Login() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSend = async () => {
    setErr("");
    if (mobile.length < 10) { setErr("Enter a valid 10-digit mobile number"); return; }
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

  const isValid = mobile.length === 10;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="login-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Brand */}
          <View style={styles.brandRow}>
            <Image
              source={require("../assets/images/logo-icon.png")}
              style={styles.logoMark}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.brandName}>Saral Funding</Text>
              <Text style={styles.brandTagline}>Government schemes, simplified</Text>
            </View>
          </View>

          {/* Hero illustration */}
          <View style={styles.illustrationWrap}>
            <LinearGradient
              colors={["#D9EFEA", "#EFF6F4", "#FFFFFF"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.glowBackdrop}
            />
            <View style={styles.bubbleTop} />
            <View style={styles.bubbleBottom} />
            <View style={styles.accentSparkle}>
              <RemoteIcon slug="sparkles" style="3d-fluency" size={30} fallback={Sparkles} fallbackColor={colors.primary} />
            </View>
            <RemoteIcon
              slug="padlock"
              style="3d-fluency"
              size={130}
              fallback={ShieldCheck}
              fallbackColor={colors.primary}
            />
            <View style={styles.accentCheck}>
              <RemoteIcon slug="checkmark" style="3d-fluency" size={26} fallback={CheckCircle2} fallbackColor={colors.primary} />
            </View>
          </View>

          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Welcome back!</Text>
            <Text style={styles.heroSub}>
              Login to continue your journey towards business growth.
            </Text>
          </View>

          {/* Trust indicators */}
          <View style={styles.trustRow}>
            {TRUST_ITEMS.map((t, i) => (
              <View key={i} style={styles.trustItem}>
                {t.icon}
                <Text style={styles.trustLabel}>{t.label}</Text>
              </View>
            ))}
          </View>

          {/* Mobile input */}
          <View style={styles.inputSection}>
            <Text style={styles.fieldLabel}>Mobile Number</Text>
            <View style={[styles.inputWrap, isValid && styles.inputWrapValid]}>
              <View style={styles.prefixBox}>
                <Text style={styles.prefix}>+91</Text>
              </View>
              <View style={styles.divider} />
              <TextInput
                testID="mobile-input"
                style={styles.input}
                value={mobile}
                onChangeText={(s) => setMobile(s.replace(/\D/g, "").slice(0, 10))}
                keyboardType="number-pad"
                placeholder="10-digit mobile"
                placeholderTextColor={colors.textPlaceholder}
                maxLength={10}
              />
              {isValid && <CheckCircle2 size={16} color={colors.primary} strokeWidth={2.5} style={{ marginRight: 12 }} />}
            </View>
            {!!err && (
              <View style={styles.errRow}>
                <Text style={styles.err}>{err}</Text>
              </View>
            )}
          </View>

          {/* CTA */}
          <Button
            testID="send-otp-btn"
            label={loading ? "Sending OTP…" : "Continue"}
            onPress={onSend}
            disabled={!isValid}
            loading={loading}
            Icon={ArrowRight}
            iconPosition="right"
            size="lg"
          />

          <Text style={styles.hint}>By continuing you agree to our Terms & Privacy Policy.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  body: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xl, justifyContent: "center" },

  // Brand
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: spacing.xl,
  },
  logoMark: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
  },
  logoText: {
    fontSize: 24,
    fontFamily: fonts.displayBold,
    color: "#FFF",
  },
  brandName: {
    fontSize: 17,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  brandTagline: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textDim,
    marginTop: 1,
  },

  // Hero illustration
  illustrationWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: 190,
    marginBottom: spacing.sm2,
    position: "relative",
  },
  glowBackdrop: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    top: 0,
    left: "50%",
    transform: [{ translateX: -95 }],
  },
  bubbleTop: {
    position: "absolute",
    top: 6,
    right: "20%",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    opacity: 0.9,
  },
  bubbleBottom: {
    position: "absolute",
    bottom: 14,
    left: "14%",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    opacity: 0.8,
  },
  accentSparkle: {
    position: "absolute",
    top: 14,
    left: "16%",
  },
  accentCheck: {
    position: "absolute",
    bottom: 18,
    right: "18%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 3,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },

  // Hero
  heroSection: {
    marginBottom: spacing.lg,
  },
  heroTitle: {
    fontSize: 30,
    fontFamily: fonts.displayBold,
    color: colors.text,
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: spacing.sm2,
    textAlign: "center",
  },
  heroSub: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    lineHeight: 21,
    textAlign: "center",
  },

  // Trust
  trustRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: spacing.lg,
    flexWrap: "wrap",
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  trustLabel: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
  },

  // Input
  inputSection: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface2,
    overflow: "hidden",
  },
  inputWrapValid: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  prefixBox: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  prefix: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
    letterSpacing: 1,
  },
  errRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  err: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.danger,
  },

  hint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textDim,
    marginTop: spacing.md,
    textAlign: "center",
    lineHeight: 18,
  },
});
