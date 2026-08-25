/**
 * Standalone Document Vault route — reached as the last onboarding step
 * (from onboarding/business.tsx) before the user enters the main app.
 * Renders the same shared DocumentVault as the Documents tab (see
 * src/screens/DocumentVault.tsx) plus a back arrow and a "Continue to
 * Dashboard" exit action specific to this onboarding context.
 */
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import FlatIcon from "@/src/components/FlatIcon";

import { spacing } from "@/src/theme";
import { protoColors, protoSpacing } from "@/src/theme.proto";
import ProtoButton from "@/src/components/proto/ProtoButton";
import DocumentVault from "@/src/screens/DocumentVault";

export default function DocumentsOnboardingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: protoColors.surface }} edges={["top", "bottom"]}>
      <View style={styles.backRow}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <FlatIcon name="left-arrow" size={20} color={protoColors.text} />
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1 }}>
        <DocumentVault />
      </View>
      <View style={styles.footer}>
        <ProtoButton label="Continue to Dashboard" onPress={() => router.replace("/(tabs)")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backRow: { paddingHorizontal: spacing.md, paddingTop: protoSpacing.sm },
  footer: { paddingHorizontal: spacing.md, paddingTop: protoSpacing.sm, paddingBottom: protoSpacing.md },
});
