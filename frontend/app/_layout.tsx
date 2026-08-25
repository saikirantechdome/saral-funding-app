import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
// The approved prototype's actual typeface (its <style> block loads
// `family=Armata` from Google Fonts and sets it as the body font) — the
// revamped ("proto") screens were using Poppins instead, which reads
// noticeably thinner/different at the same weight. See theme.proto.ts.
import { Armata_400Regular } from "@expo-google-fonts/armata";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { loadLang } from "@/src/i18n";
import { apiPost, getToken } from "@/src/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerPushToken() {
  try {
    if (!Device.isDevice) return;
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const token = await getToken();
    if (!token) return;

    const pushToken = (await Notifications.getExpoPushTokenAsync()).data;
    await apiPost("/notifications/push-token", { token: pushToken });
  } catch (e) {
    // silently fail — push is non-critical
  }
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [iconsLoaded, iconError] = useIconFonts();
  const [fontsLoaded, fontsError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Armata_400Regular,
  });

  // Timeout fallback: if fonts haven't resolved after 4s (can happen on web
  // when @font-face stalls without throwing), proceed with system fonts.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);

  const ready =
    ((iconsLoaded || !!iconError) && (fontsLoaded || !!fontsError)) || timedOut;

  useEffect(() => {
    loadLang();
    if (ready) {
      SplashScreen.hideAsync();
      registerPushToken();
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#FFFFFF" } }} />
    </SafeAreaProvider>
  );
}
