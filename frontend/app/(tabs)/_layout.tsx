import { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import {
  LayoutDashboard, ClipboardList, Sparkles, FolderOpen, CircleUser,
  Users, CalendarDays, FileSearch,
} from "lucide-react-native";

import { colors, fonts } from "@/src/theme";
import { apiGet } from "@/src/api";

const TAB_ICON_SIZE = 22;

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
    <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    apiGet<any>("/auth/me")
      .then((me) => setIsAdmin(me?.role && me.role !== "user"))
      .catch(() => {});
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
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
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  iconWrap: {
    width: 40,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: colors.primarySoft,
  },
  tabLabel: {
    fontSize: 9,
    fontFamily: fonts.medium,
    color: colors.textDim,
    letterSpacing: 0,
    textAlign: "center",
  },
  tabLabelActive: {
    color: colors.primary,
    fontFamily: fonts.semiBold,
  },
});
