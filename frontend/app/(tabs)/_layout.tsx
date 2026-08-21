import { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  LayoutDashboard, ClipboardList, Sparkles, FolderOpen, CircleUser,
  Users, CalendarDays, FileSearch, MessageCircle,
} from "lucide-react-native";

import { colors, fonts, radius, TAB_BAR_HEIGHT } from "@/src/theme";
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
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={isAdmin ? Users : ClipboardList} />,
          tabBarLabel: makeLabel(isAdmin ? "Funnel" : "Applications"),
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
});
