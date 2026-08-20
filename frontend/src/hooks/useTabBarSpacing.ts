import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_HEIGHT } from "@/src/theme";

/**
 * Bottom padding needed for scrollable content to clear the floating pill
 * tab bar. `useBottomTabBarHeight()` alone under-reports this — it only
 * returns the bar's own `height` style value and knows nothing about the
 * `bottom: max(insets.bottom, 12)` gap that floats it above the screen edge
 * (../../app/(tabs)/_layout.tsx). Uses safe-area insets directly instead, so
 * it's also correct for screens (e.g. admin/leads, admin/consultations)
 * that are embedded as tab content but not always guaranteed to render
 * inside the Bottom Tab Navigator's own context.
 */
export function useTabBarSpacing(extra = 4): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, 12) + extra;
}
