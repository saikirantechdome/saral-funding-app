import { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors, spacing, radius } from "@/src/theme";
import { apiPost } from "@/src/api";
import { INDIAN_STATES, CATEGORIES, GENDERS } from "@/src/constants";
import Picker from "@/src/components/Picker";
import StepBar, { BackBar } from "@/src/components/StepBar";

export default function ProfileScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  const valid = fullName.trim() && state && district.trim() && gender && age && category;

  const onSave = async () => {
    if (!valid) return;
    setLoading(true);
    try {
      await apiPost("/profile", {
        full_name: fullName.trim(),
        state, district: district.trim(),
        gender, age: Number(age), category,
      });
      router.replace("/onboarding/business");
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID="profile-onboarding">
      <BackBar title="Personal Profile" onBack={() => router.back()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          <StepBar step={1} total={3} />
          <Text style={styles.h1}>Tell us about you</Text>
          <Text style={styles.sub}>So we can match the right government schemes for you.</Text>

          <Field label="Full Name">
            <TextInput testID="full-name" style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Rajesh Kumar" placeholderTextColor="#9CA3AF" />
          </Field>
          <Picker label="State" testID="state" value={state} options={INDIAN_STATES} onChange={setState} placeholder="Select state" />
          <Field label="District">
            <TextInput testID="district" style={styles.input} value={district} onChangeText={setDistrict} placeholder="e.g. Surat" placeholderTextColor="#9CA3AF" />
          </Field>
          <Picker label="Gender" testID="gender" value={gender} options={GENDERS} onChange={setGender} />
          <Field label="Age">
            <TextInput testID="age" style={styles.input} value={age} onChangeText={(v) => setAge(v.replace(/\D/g, "").slice(0, 2))} keyboardType="number-pad" placeholder="28" placeholderTextColor="#9CA3AF" />
          </Field>
          <Picker label="Category" testID="category" value={category} options={CATEGORIES} onChange={setCategory} />
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity testID="profile-save" style={[styles.cta, !valid && styles.ctaDisabled]} disabled={!valid || loading} onPress={onSave}>
            <Text style={styles.ctaText}>{loading ? "Saving…" : "Save & Continue"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return <View style={{ marginBottom: spacing.md }}><Text style={styles.label}>{label}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 4 },
  sub: { fontSize: 14, color: colors.textMuted, marginTop: 6, marginBottom: spacing.lg },
  label: { fontSize: 12, fontWeight: "600", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, fontSize: 16, color: colors.text, minHeight: 48 },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: "#FFF" },
  cta: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: "center" },
  ctaDisabled: { backgroundColor: "#A7F3D0" },
  ctaText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
