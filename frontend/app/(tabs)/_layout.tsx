import { Tabs } from "expo-router";
import { Text, View } from "react-native";

import { colors } from "@/src/theme";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const map: Record<string, string> = { Dashboard: "🏠", Schemes: "📋", Advisor: "🤖", Profile: "👤" };
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 6 }}>
      <Text style={{ fontSize: 20 }}>{map[label]}</Text>
      <Text style={{ fontSize: 11, fontWeight: focused ? "700" : "500", color: focused ? colors.primary : colors.textMuted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: { backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: colors.border, height: 70, paddingTop: 4, paddingBottom: 12 },
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Dashboard" focused={focused} /> }} />
      <Tabs.Screen name="schemes" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Schemes" focused={focused} /> }} />
      <Tabs.Screen name="advisor" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Advisor" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Profile" focused={focused} /> }} />
    </Tabs>
  );
}
