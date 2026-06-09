import { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors, spacing, radius } from "@/src/theme";
import { apiPost } from "@/src/api";
import { INDUSTRIES, INDIAN_STATES } from "@/src/constants";
import Picker from "@/src/components/Picker";
import StepBar, { BackBar } from "@/src/components/StepBar";

export default function AssessmentScreen() {
  const router = useRouter();
  const [businessType, setBusinessType] = useState("");
  const [funding, setFunding] = useState("");
  const [location, setLocation] = useState("");
  const [existing, setExisting] = useState(false);
  const [woman, setWoman] = useState(false);
  const [gst, setGst] = useState(false);
  const [udyam, setUdyam] = useState(false);
  const [loans, setLoans] = useState(false);
  const [loading, setLoading] = useState(false);

  const valid = businessType && funding && location;

  const onSubmit = async () => {
    if (!valid) return;
    setLoading(true);
    try {
      await apiPost("/funding-assessment", {
        business_type: businessType,
        funding_requirement: Number(funding || 0),
        business_location: location,
        existing_business: existing,
        woman_entrepreneur: woman,
        gst_registration: gst,
        udyam_registration: udyam,
        existing_loans: loans,
      });
      router.replace("/(tabs)");
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID="assessment-onboarding">
      <BackBar title="Funding Assessment" onBack={() => router.back()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          <StepBar step={3} total={3} />
          <Text style={styles.h1}>Quick eligibility check</Text>
          <Text style={styles.sub}>Answer a few questions to compute your funding score.</Text>

          <Picker label="Business Type" testID="biz-type" value={businessType} options={INDUSTRIES} onChange={setBusinessType} />
          <Text style={styles.label}>Funding Requirement (₹)</Text>
          <TextInput testID="fund-req" style={styles.input} value={funding} onChangeText={(v) => setFunding(v.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="e.g. 1500000" placeholderTextColor="#9CA3AF" />
          <Picker label="Business Location (State)" testID="biz-state" value={location} options={INDIAN_STATES} onChange={setLocation} />

          <Text style={[styles.label, { marginTop: 16 }]}>Tell us more</Text>
          <YesNo testID="q-existing" q="Already running a business?" value={existing} onChange={setExisting} />
          <YesNo testID="q-woman" q="Woman entrepreneur?" value={woman} onChange={setWoman} />
          <YesNo testID="q-gst" q="GST registered?" value={gst} onChange={setGst} />
          <YesNo testID="q-udyam" q="Udyam registered?" value={udyam} onChange={setUdyam} />
          <YesNo testID="q-loans" q="Any existing loans?" value={loans} onChange={setLoans} />
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity testID="assessment-submit" style={[styles.cta, !valid && styles.ctaDisabled]} disabled={!valid || loading} onPress={onSubmit}>
            <Text style={styles.ctaText}>{loading ? "Computing…" : "See My Recommendations"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function YesNo({ q, value, onChange, testID }: { q: string; value: boolean; onChange: (v: boolean) => void; testID: string }) {
  return (
    <View style={styles.yn}>
      <Text style={styles.ynLabel}>{q}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[true, false].map((v) => (
          <TouchableOpacity key={String(v)} testID={`${testID}-${v ? "yes" : "no"}`} style={[styles.ynBtn, value === v && styles.ynBtnActive]} onPress={() => onChange(v)}>
            <Text style={[styles.ynText, value === v && styles.ynTextActive]}>{v ? "Yes" : "No"}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 4 },
  sub: { fontSize: 14, color: colors.textMuted, marginTop: 6, marginBottom: spacing.lg },
  label: { fontSize: 12, fontWeight: "600", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, fontSize: 16, color: colors.text, marginBottom: spacing.md, minHeight: 48 },
  yn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  ynLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.text },
  ynBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8, minWidth: 60, alignItems: "center" },
  ynBtnActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  ynText: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
  ynTextActive: { color: colors.primaryDark },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: "#FFF" },
  cta: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: "center" },
  ctaDisabled: { backgroundColor: "#A7F3D0" },
  ctaText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
