import { useEffect, useState } from "react";
import { Tabs, useRouter } from "expo-router";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  LayoutGrid, FileText, Plus, MessageCircle, CircleUser, CheckSquare,
} from "lucide-react-native";

import { colors } from "@/src/theme";
import { protoColors, protoRadius } from "@/src/theme.proto";
import { apiGet } from "@/src/api";
import { useAdminMode } from "@/src/hooks/useAdminMode";

// Roles that can access the admin section at all
const ADMIN_ROLES = new Set(["super_admin", "manager", "expert", "sales_executive", "support_executive"]);

export type AdminRole = "super_admin" | "manager" | "expert" | "sales_executive" | "support_executive" | "user";

/** Which modules each role can access. super_admin always gets everything. */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["users", "consultations", "leads", "settings", "support"],
  manager: ["users", "consultations", "leads", "support"],
  expert: ["consultations", "support"],
  sales_executive: ["leads", "support"],
  support_executive: ["consultations", "leads", "support"],
};

export function canAccess(role: string, module: string): boolean {
  if (role === "super_admin") return true;
  return (ROLE_PERMISSIONS[role] ?? []).includes(module);
}

const TAB_ICON_SIZE = 20;
const TAB_BAR_HEIGHT = 64;

function TabIcon({ focused, Icon }: { focused: boolean; Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }> }) {
  return <Icon size={TAB_ICON_SIZE} color={focused ? protoColors.primary : protoColors.textDim} strokeWidth={focused ? 2.2 : 1.8} />;
}

function makeLabel(label: string) {
  return ({ focused }: { focused: boolean }) => (
    <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>{label}</Text>
  );
}

// Center FAB matching the prototype's `.s-fab` — purely visual, wired via
// the tabPress listener below (same pattern as the user side's tab bar).
function FabButton(props: React.ComponentProps<typeof TouchableOpacity>) {
  return (
    <TouchableOpacity {...props} style={styles.fabWrap} activeOpacity={0.85}>
      <View style={styles.fab}>
        <Plus size={22} color="#FFFFFF" strokeWidth={2.4} />
      </View>
    </TouchableOpacity>
  );
}

export default function AdminLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const insets = useSafeAreaInsets();
  const caMode = useAdminMode() === "ca";

  useEffect(() => {
    (async () => {
      try {
        const user = await apiGet<any>("/auth/me");
        if (!ADMIN_ROLES.has(user?.role)) {
          router.replace("/(tabs)" as any);
        }
      } catch {
        router.replace("/login" as any);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }],
      }}
    >
      {/* Reviewer mode */}
      <Tabs.Screen name="index" options={{ href: caMode ? null : undefined, tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={LayoutGrid} />, tabBarLabel: makeLabel("Today") }} />
      <Tabs.Screen name="apps" options={{ href: caMode ? null : undefined, tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={FileText} />, tabBarLabel: makeLabel("Apps") }} />
      {/* CA mode */}
      <Tabs.Screen name="cases" options={{ href: caMode ? undefined : null, tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={LayoutGrid} />, tabBarLabel: makeLabel("Cases") }} />
      <Tabs.Screen name="tasks" options={{ href: caMode ? undefined : null, tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={CheckSquare} />, tabBarLabel: makeLabel("Tasks") }} />
      {/* Shared */}
      <Tabs.Screen
        name="quick-action"
        options={{ tabBarButton: FabButton, tabBarLabel: () => null }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push((caMode ? "/admin/tasks" : "/admin/apps") as any);
          },
        }}
      />
      <Tabs.Screen name="support" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={MessageCircle} />, tabBarLabel: makeLabel("Inbox") }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={CircleUser} />, tabBarLabel: makeLabel("Profile") }} />

      {/* Existing CRM/back-office screens — kept fully working, just off the
          tab bar (reachable from Profile's "Management" section instead),
          per the "keep them, add a way in" decision. */}
      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="users" options={{ href: null }} />
      <Tabs.Screen name="banks" options={{ href: null }} />
      <Tabs.Screen name="schemes" options={{ href: null }} />
      <Tabs.Screen name="leads" options={{ href: null }} />
      <Tabs.Screen name="consultations" options={{ href: null }} />
      <Tabs.Screen name="documents" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="team" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopWidth: 1,
    borderTopColor: protoColors.border,
    elevation: 0,
  },
  tabLabel: { fontSize: 10, color: protoColors.textDim, marginTop: 2 },
  tabLabelActive: { color: protoColors.primary, fontWeight: "600" },
  fabWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  fab: {
    width: 52, height: 52, borderRadius: protoRadius.card,
    backgroundColor: protoColors.primary,
    alignItems: "center", justifyContent: "center",
    marginTop: -18,
    shadowColor: protoColors.primaryDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10,
    elevation: 6,
  },
});
