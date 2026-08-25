import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import { protoColors } from "@/src/theme.proto";
import { getAdminMode } from "@/src/hooks/useAdminMode";

// Exists only because Tabs.Screen needs a real route behind the FAB — the
// actual navigation happens in the tabPress listener in _layout.tsx; this
// is just the safety-net fallback if that listener ever doesn't fire.
export default function QuickAction() {
  const router = useRouter();

  useEffect(() => {
    router.replace((getAdminMode() === "ca" ? "/admin/tasks" : "/admin/apps") as any);
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: protoColors.surface }}>
      <ActivityIndicator color={protoColors.primary} />
    </View>
  );
}
