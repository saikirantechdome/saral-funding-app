import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Link2, Phone, CheckCircle2 } from "lucide-react-native";

import { colors, spacing, radius, fonts, tints, elevation } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import Button from "@/src/components/ui/Button";

type AdminConfig = {
  calendly_url?: string;
  whatsapp_number?: string;
  consultation_duration_min?: number;
};

export default function AdminSettings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [config, setConfig] = useState<AdminConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiGet<AdminConfig>("/admin/config")
      .then(setConfig)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await apiPost("/admin/config", config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      Alert.alert("Error", "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]} testID="admin-settings">
      <BackBar title="App Settings" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Calendly */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Link2 size={16} color={colors.primaryDark} strokeWidth={2} />
                </View>
                <Text style={styles.sectionTitle}>Calendly Integration</Text>
              </View>

              <Text style={styles.fieldLabel}>Calendly URL</Text>
              <TextInput
                style={styles.input}
                value={config.calendly_url || ""}
                onChangeText={(v) => setConfig((c) => ({ ...c, calendly_url: v }))}
                placeholder="https://calendly.com/your-org/consultation"
                placeholderTextColor={colors.textPlaceholder}
                autoCapitalize="none"
                keyboardType="url"
              />

              <Text style={styles.fieldLabel}>Consultation Duration (minutes)</Text>
              <TextInput
                style={styles.inputLast}
                value={String(config.consultation_duration_min ?? 30)}
                onChangeText={(v) => setConfig((c) => ({ ...c, consultation_duration_min: parseInt(v) || 30 }))}
                keyboardType="number-pad"
                placeholder="30"
                placeholderTextColor={colors.textPlaceholder}
              />
            </View>

            {/* WhatsApp */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: tints.deepTeal.bg }]}>
                  <Phone size={16} color={tints.deepTeal.fg} strokeWidth={2} />
                </View>
                <Text style={styles.sectionTitle}>WhatsApp Support</Text>
              </View>

              <Text style={styles.fieldLabel}>WhatsApp Number (with country code)</Text>
              <TextInput
                style={styles.inputLast}
                value={config.whatsapp_number || ""}
                onChangeText={(v) => setConfig((c) => ({ ...c, whatsapp_number: v }))}
                placeholder="919876543210"
                placeholderTextColor={colors.textPlaceholder}
                keyboardType="phone-pad"
              />
              <Text style={styles.hint}>Enter number without + sign, e.g. 919876543210</Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Save button */}
      <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
        <Button
          label={saved ? "Saved!" : "Save Settings"}
          onPress={save}
          disabled={saving || loading}
          loading={saving}
          Icon={saved ? CheckCircle2 : undefined}
          iconPosition="left"
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: "#FFF", borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.lg,
    ...elevation.l1,
  },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm2,
    marginBottom: spacing.md, paddingBottom: spacing.sm2,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  sectionIcon: {
    width: 36, height: 36, borderRadius: radius.lg,
    backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center",
  },
  sectionTitle: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.text },
  fieldLabel: {
    fontSize: 11, fontFamily: fonts.bold, color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl,
    padding: 12, fontSize: 14, fontFamily: fonts.regular,
    color: colors.text, backgroundColor: colors.surface2, marginBottom: spacing.sm2,
  },
  inputLast: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl,
    padding: 12, fontSize: 14, fontFamily: fonts.regular,
    color: colors.text, backgroundColor: colors.surface2, marginBottom: 0,
  },
  hint: {
    fontSize: 11, fontFamily: fonts.regular, color: colors.textDim,
    marginTop: spacing.xs, marginBottom: 0,
  },
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: spacing.md, backgroundColor: "#FFF",
    borderTopWidth: 1, borderTopColor: colors.border,
  },
});
