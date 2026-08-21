import { useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";

/**
 * Runs `callback` on an interval while the screen is focused, and stops
 * immediately on blur/unmount. There's no websocket/push-driven live layer
 * in this app, so chat screens use this as their "near real-time" refresh —
 * kept short-lived and screen-scoped rather than a global background poller.
 */
export function useFocusPolling(callback: () => void, intervalMs: number) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useFocusEffect(
    useCallback(() => {
      const id = setInterval(() => savedCallback.current(), intervalMs);
      return () => clearInterval(id);
    }, [intervalMs])
  );
}
