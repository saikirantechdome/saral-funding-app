import { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  LayoutDashboard, ClipboardList, Activity, Plus, FolderOpen, CircleUser,
  Users, CalendarDays, FileSearch, MessageCircle,
} from "lucide-react-native";

import { colors, fonts, radius, TAB_BAR_HEIGHT } from "@/src/theme";
import { protoColors } from "@/src/theme.proto";
import { apiGet } from "@/src/api";

const TAB_ICON_SIZE = 20;

interface TabIconProps {
  focused: boolean;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
}

// Icon-only — sits in the library's own tabBarIcon slot, which already
// reserves the right amount of space and clears the device's safe area
// correctly on its own, no manual height/padding math needed.
function TabIcon({ focused, Icon }: TabIconProps) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Icon
        size={TAB_ICON_SIZE}
        color={focused ? colors.primary : colors.textDim}
        strokeWidth={focused ? 2.2 : 1.8}
      />
    </View>
  );
}

// Label-only — sits in the library's own tabBarLabel slot, sized to fit the
// text instead of being squeezed into the icon's fixed box.
function makeLabel(label: string) {
  return ({ focused }: { focused: boolean }) => (
    <View style={{ alignItems: "center" }}>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
        {label}
      </Text>
      {focused && <View style={styles.tabUnderline} />}
    </View>
  );
}

// Center FAB matching the approved prototype's `.s-fab` (raised teal circle
// with a plain "+"). Purely visual — `quick-upload.tsx` behind this tab does
// the actual navigation (redirects into the Documents flow), so this is just
// a styled tabBarButton, not a custom press handler.
function FabButton(props: React.ComponentProps<typeof TouchableOpacity>) {
  return (
    <TouchableOpacity {...props} style={styles.fabWrap} activeOpacity={0.85}>
      <View style={styles.fab}>
        <Plus size={22} color="#FFFFFF" strokeWidth={2.4} />
      </View>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const [isAdmin, setIsAdmin] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    apiGet<any>("/auth/me")
      .then((me) => setIsAdmin(me?.role && me.role !== "user"))
      .catch(() => {});
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { bottom: Math.max(insets.bottom, 12) }],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={LayoutDashboard} />,
          tabBarLabel: makeLabel("Home"),
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          // Retired as a user-facing tab — the prototype has no "Applications"
          // tab; its content is superseded by the new Status tab. Admin's
          // "Funnel" still uses this same route/file, unaffected.
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={isAdmin ? Users : ClipboardList} />,
          tabBarLabel: makeLabel(isAdmin ? "Funnel" : "Applications"),
        }}
      />
      <Tabs.Screen
        name="status"
        options={{
          href: isAdmin ? null : undefined,
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={Activity} />,
          tabBarLabel: makeLabel("Status"),
        }}
      />
      <Tabs.Screen
        name="quick-upload"
        options={{
          href: isAdmin ? null : undefined,
          tabBarButton: FabButton,
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="funding-case"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="schemes"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="advisor"
        options={{
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={CalendarDays} />,
          tabBarLabel: makeLabel("Calendly"),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={isAdmin ? FileSearch : FolderOpen} />,
          tabBarLabel: makeLabel(isAdmin ? "Docs" : "Documents"),
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          href: isAdmin ? null : undefined,
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={MessageCircle} />,
          tabBarLabel: makeLabel("Chat"),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          // Retired as a user-facing tab — the prototype reaches Profile via
          // the avatar tap on Home's header instead. Admin keeps this tab.
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={CircleUser} />,
          tabBarLabel: makeLabel("Profile"),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 16,
    right: 16,
    height: TAB_BAR_HEIGHT,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0,
    borderRadius: radius.pill,
    elevation: 0,
  },
  iconWrap: {
    width: 42,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {},
  tabLabel: {
    fontSize: 9,
    fontFamily: fonts.medium,
    color: colors.textDim,
    letterSpacing: 0,
    textAlign: "center",
    marginTop: 2,
  },
  tabLabelActive: {
    color: colors.primary,
    fontFamily: fonts.semiBold,
  },
  tabUnderline: {
    width: 14,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 3,
  },
  fabWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 20,
    backgroundColor: protoColors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -22,
    shadowColor: protoColors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
});
