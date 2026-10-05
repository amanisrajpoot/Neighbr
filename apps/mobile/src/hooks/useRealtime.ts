import { useEffect, useState } from "react";
import { realtimeClient, WebSocketStatus } from "../api/websocket";
import { useAuthStore } from "../store/authStore";

export function useRealtime() {
  const { user } = useAuthStore();
  const [status, setStatus] = useState<WebSocketStatus>(realtimeClient.getStatus());

  useEffect(() => {
    if (!user) return;

    realtimeClient.connect({
      userId: user.id,
      societyId: user.societyId,
    });

    const unsubStatus = realtimeClient.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubStatus();
    };
  }, [user?.id, user?.societyId]);

  return {
    status,
    isConnected: status === "CONNECTED",
    on: realtimeClient.on.bind(realtimeClient),
    off: realtimeClient.off.bind(realtimeClient),
    send: realtimeClient.send.bind(realtimeClient),
  };
}
