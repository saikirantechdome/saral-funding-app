import { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors, spacing, radius } from "@/src/theme";
import { apiPost } from "@/src/api";
import { INDUSTRIES } from "@/src/constants";
import Picker from "@/src/components/Picker";
import StepBar, { BackBar } from "@/src/components/StepBar";

export default function BusinessScreen() {
  const router = useRouter();
  const [stage, setStage] = useState<"existing" | "new">("new");
  const [industry, setIndustry] = useState("");
  const [funding, setFunding] = useState("");
  const [turnover, setTurnover] = useState("");
  const [employees, setEmployees] = useState("");
  const [gst, setGst] = useState(false);
  const [udyam, setUdyam] = useState(false);
  const [loading, setLoading] = useState(false);

  const valid = industry && funding;

  const onSave = async () => {
    if (!valid) return;
    setLoading(true);
    try {
      await apiPost("/business-profile", {
        business_stage: stage,
        industry,
        funding_required: Number(funding || 0),
        annual_turnover: Number(turnover || 0),
        employees: Number(employees || 0),
        gst_available: gst,
        udyam_available: udyam,
      });
      router.replace("/onboarding/assessment");
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID="business-onboarding">
      <BackBar title="Business Profile" onBack={() => router.back()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          <StepBar step={2} total={3} />
          <Text style={styles.h1}>About your business</Text>
          <Text style={styles.sub}>This helps us find subsidies and loans for your sector.</Text>

          <Text style={styles.label}>Business Stage</Text>
          <View style={styles.segment}>
            {(["new", "existing"] as const).map((s) => (
              <TouchableOpacity key={s} testID={`stage-${s}`} style={[styles.segItem, stage === s && styles.segActive]} onPress={() => setStage(s)}>
                <Text style={[styles.segText, stage === s && styles.segTextActive]}>{s === "new" ? "New Business" : "Existing Business"}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Picker label="Industry" testID="industry" value={industry} options={INDUSTRIES} onChange={setIndustry} />

          <Text style={styles.label}>Funding Required (₹)</Text>
          <TextInput testID="funding" style={styles.input} value={funding} onChangeText={(v) => setFunding(v.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="e.g. 1000000" placeholderTextColor="#9CA3AF" />
          <Text style={styles.hint}>{funding ? `≈ ${(Number(funding) / 100000).toFixed(1)} Lakhs` : " "}</Text>

          <Text style={styles.label}>Annual Turnover (₹)</Text>
          <TextInput testID="turnover" style={styles.input} value={turnover} onChangeText={(v) => setTurnover(v.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="0 if not started" placeholderTextColor="#9CA3AF" />

          <Text style={styles.label}>Number of Employees</Text>
          <TextInput testID="employees" style={styles.input} value={employees} onChangeText={(v) => setEmployees(v.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="e.g. 5" placeholderTextColor="#9CA3AF" />

          <View style={styles.toggleRow}>
            <ToggleRow testID="gst" label="GST Registered" value={gst} onChange={setGst} />
            <ToggleRow testID="udyam" label="Udyam Registered" value={udyam} onChange={setUdyam} />
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity testID="business-save" style={[styles.cta, !valid && styles.ctaDisabled]} disabled={!valid || loading} onPress={onSave}>
            <Text style={styles.ctaText}>{loading ? "Saving…" : "Save & Continue"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ToggleRow({ label, value, onChange, testID }: { label: string; value: boolean; onChange: (v: boolean) => void; testID: string }) {
  return (
    <TouchableOpacity testID={testID} style={[styles.toggle, value && styles.toggleOn]} onPress={() => onChange(!value)}>
      <Text style={[styles.toggleText, value && styles.toggleTextOn]}>{value ? "✓ " : "○ "}{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 4 },
  sub: { fontSize: 14, color: colors.textMuted, marginTop: 6, marginBottom: spacing.lg },
  label: { fontSize: 12, fontWeight: "600", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, fontSize: 16, color: colors.text, minHeight: 48 },
  hint: { fontSize: 12, color: colors.textDim, marginTop: 4, minHeight: 16 },
  segment: { flexDirection: "row", borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: "hidden", marginBottom: spacing.md },
  segItem: { flex: 1, paddingVertical: 14, alignItems: "center", backgroundColor: "#FFF" },
  segActive: { backgroundColor: colors.primarySoft },
  segText: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
  segTextActive: { color: colors.primaryDark },
  toggleRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  toggle: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, alignItems: "center" },
  toggleOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  toggleText: { fontSize: 14, color: colors.textMuted, fontWeight: "600" },
  toggleTextOn: { color: colors.primaryDark },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: "#FFF" },
  cta: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: "center" },
  ctaDisabled: { backgroundColor: "#A7F3D0" },
  ctaText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
