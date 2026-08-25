import { useEffect, useState } from "react";
import { Tabs, useRouter } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
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
// with a plain "+"). A custom `tabBarIcon`, not `tabBarButton` — Expo Router
// disallows tabBarButton on a screen that also resolves an `href` (every
// Tabs.Screen has one by default, and even `href: null` still counts), so
// there's no way to keep a fully custom button here. The default tab button
// chrome still wraps this icon, but unlabeled it just reads as a floating
// circle; the tabPress listener below fully intercepts actual navigation.
function FabIcon() {
  return (
    <View style={styles.fab}>
      <Plus size={22} color="#FFFFFF" strokeWidth={2.4} />
    </View>
  );
}

export default function TabsLayout() {
  const [isAdmin, setIsAdmin] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    apiGet<any>("/auth/me")
      .then((me) => {
        const admin = !!(me?.role && me.role !== "user");
        setIsAdmin(admin);
        // Admins now land on the revamped /admin experience (Today/Apps/
        // Inbox/Profile) instead of these dual-role user tabs — mirrors the
        // existing reverse guard in admin/_layout.tsx (which sends non-admins
        // back here). Not a login/auth change: OTP verification still routes
        // everyone here first; this just forwards admin roles onward.
        if (admin) router.replace("/admin" as any);
      })
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
          tabBarIcon: FabIcon,
          tabBarLabel: () => null,
        }}
        listeners={{
          // The FAB never actually navigates to the "quick-upload" screen —
          // it intercepts the tab press and jumps straight into the Documents
          // tab with the add-document sheet already open, matching the
          // prototype's Home-FAB → Upload flow. (Tabs.Screen still needs a
          // real route file behind it; quick-upload.tsx's own redirect is
          // just a safety net if this listener ever doesn't fire.)
          tabPress: (e) => {
            e.preventDefault();
            router.push("/(tabs)/documents?add=1" as any);
          },
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
