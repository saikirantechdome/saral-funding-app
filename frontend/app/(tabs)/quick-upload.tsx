import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import { protoColors } from "@/src/theme.proto";

// The prototype's center tab-bar FAB jumps straight to document upload. This
// route exists only because Expo Router requires a real screen behind every
// Tabs.Screen — the actual look is the FabButton in (tabs)/_layout.tsx.
// Redirects into the Documents flow (no dedicated document-scoped "quick
// upload" endpoint exists yet, so this is the closest real, working target —
// see USER_SIDE_REVAMP_PLAN.md).
export default function QuickUpload() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/documents" as any);
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: protoColors.surface }}>
      <ActivityIndicator color={protoColors.primary} />
    </View>
  );
}
