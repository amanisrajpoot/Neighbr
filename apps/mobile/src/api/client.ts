/**
 * Mobile API Client connected to FastAPI Backend
 */

import { Platform } from "react-native";
import Constants from "expo-constants";
import { useAuthStore } from "../store/authStore";

export const getServerHost = () => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.hostname ? `${window.location.hostname}:8000` : "localhost:8000";
  }

  if (process.env.EXPO_PUBLIC_API_URL) {
    try {
      const url = new URL(process.env.EXPO_PUBLIC_API_URL);
      return url.host;
    } catch {
      // fallback
    }
  }

  // On physical device / Expo Go: extract dev machine IP from hostUri
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const rawHost = hostUri.split(":")[0];
    // If not localhost and not an ngrok/exp.direct tunnel domain
    if (rawHost && rawHost !== "localhost" && rawHost !== "127.0.0.1" && !rawHost.includes("exp.direct") && !rawHost.includes("ngrok")) {
      return `${rawHost}:8000`;
    }
  }

  // Common local Wi-Fi LAN IP fallback for mobile dev
  const defaultLanIp = "192.168.1.19";

  // Android emulator fallback
  if (Platform.OS === "android") {
    return `${defaultLanIp}:8000`;
  }

  if (Platform.OS === "ios") {
    return `${defaultLanIp}:8000`;
  }

  return "localhost:8000";
};

export const getBaseUrl = () => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const host = window.location.hostname || "localhost";
    return `http://${host}:8000/api/v1`;
  }
  if (process.env.EXPO_PUBLIC_API_URL) {
    let url = process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, "");
    if (!url.endsWith("/api/v1")) {
      url += "/api/v1";
    }
    return url;
  }
  const host = getServerHost();
  return `http://${host}/api/v1`;
};

export const getWsUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    try {
      const url = new URL(process.env.EXPO_PUBLIC_API_URL);
      const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
      return `${wsProtocol}//${url.host}/api/v1/notifications/ws`;
    } catch {}
  }
  const host = getServerHost();
  return `ws://${host}/api/v1/notifications/ws`;
};

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const baseUrl = getBaseUrl();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let errorMessage = `Request failed with status ${response.status}`;

    if (errorData && typeof errorData === "object") {
      if (errorData.error?.message && typeof errorData.error.message === "string") {
        errorMessage = errorData.error.message;
        if (Array.isArray(errorData.error.field_errors) && errorData.error.field_errors.length > 0) {
          const fieldMsgs = errorData.error.field_errors
            .map((fe: any) => (fe.field ? `${fe.field}: ${fe.message}` : fe.message))
            .filter(Boolean)
            .join(", ");
          if (fieldMsgs) {
            errorMessage += ` (${fieldMsgs})`;
          }
        }
      } else if (errorData.detail) {
        if (typeof errorData.detail === "string") {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          const msgs = errorData.detail
            .map((d: any) => {
              if (typeof d === "string") return d;
              if (d && typeof d === "object") {
                const field = Array.isArray(d.loc) ? d.loc.slice(1).join(".") : "";
                return field ? `${field}: ${d.msg}` : d.msg;
              }
              return null;
            })
            .filter(Boolean)
            .join(", ");
          if (msgs) errorMessage = msgs;
        } else if (typeof errorData.detail === "object") {
          errorMessage = JSON.stringify(errorData.detail);
        }
      } else if (typeof errorData.message === "string") {
        errorMessage = errorData.message;
      }
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

export const visitorApi = {
  scanPass: async (societyId: string, gateId: string, query: string | { qr_token?: string; pin_code?: string }) => {
    let bodyPayload: any = {};
    if (typeof query === "string") {
      const trimmed = query.trim();
      if (/^\d{6}$/.test(trimmed)) {
        bodyPayload = { pin_code: trimmed };
      } else {
        bodyPayload = { qr_token: trimmed };
      }
    } else {
      bodyPayload = query;
    }
    return apiClient<any>(`/societies/${societyId}/gates/${gateId}/scan`, {
      method: "POST",
      body: JSON.stringify(bodyPayload),
    });
  },
  gateCheckIn: async (societyId: string, gateId: string, payload: any) => {
    return apiClient<any>(`/societies/${societyId}/gates/${gateId}/check-in`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  gateCheckOut: async (societyId: string, gateId: string, payload: any) => {
    return apiClient<any>(`/societies/${societyId}/gates/${gateId}/check-out`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  createPass: async (societyId: string, payload: any) => {
    return apiClient<any>(`/societies/${societyId}/visitors/passes`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  listPasses: async (societyId: string) => {
    return apiClient<any[]>(`/societies/${societyId}/visitors/passes`);
  },
};
