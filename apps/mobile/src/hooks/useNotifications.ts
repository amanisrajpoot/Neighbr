import { useEffect, useRef } from "react";
import { Alert, Platform } from "react-native";
import { useAuthStore } from "../store/authStore";
import { getWsUrl } from "../api/client";

export function useNotifications() {
  const { user, isAuthenticated } = useAuthStore();
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      return;
    }

    // Connect to WebSocket
    const connectWs = () => {
      try {
        const wsBase = getWsUrl();
        // Connect to the specific user's websocket channel
        ws.current = new WebSocket(`${wsBase}/${user.id}`);

        ws.current.onopen = () => {
          console.log("Notifications WebSocket Connected for user:", user.id);
        };

        ws.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === "NOTIFICATION") {
              const data = message.data;
              const title = data.title || "Society Notification";
              const body = data.body || "New alert received.";

              if (Platform.OS === "web" && typeof window !== "undefined") {
                window.alert(`🔔 ${title}\n\n${body}`);
              } else {
                Alert.alert(title, body, [{ text: "OK" }]);
              }
            }
          } catch (e) {
            console.error("Failed to parse websocket message", e);
          }
        };

        ws.current.onerror = (e) => {
          // Log cleanly without triggering yellow/red LogBox warning modal on device
          console.log("[WebSocket Info] Reconnecting to notification hub...");
        };

        ws.current.onclose = () => {
          console.log("[WebSocket Info] Socket closed, retry in 5s...");
          setTimeout(() => {
            if (useAuthStore.getState().isAuthenticated) {
              connectWs();
            }
          }, 5000);
        };
      } catch (err) {
        console.log("[WebSocket Info] Initialization pending:", err);
      }
    };

    connectWs();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [isAuthenticated, user?.id]);
}
