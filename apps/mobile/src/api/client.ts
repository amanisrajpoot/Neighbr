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
  const defaultLanIp = "192.168.1.48";

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

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let token = useAuthStore.getState().accessToken;
  const baseUrl = getBaseUrl();

  // If token is missing, attempt silent restore if user profile or savedPersona exists
  if (!token) {
    const state = useAuthStore.getState();
    const persona = state.savedPersona || (state.user?.role === "guard" ? "guard" : "resident");
    if (state.isAuthenticated && persona) {
      await state.authenticatePersona(persona).catch(() => {});
      token = useAuthStore.getState().accessToken;
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  // If 401 Unauthorized: recover automatically without kicking user to login!
  if (response.status === 401) {
    const state = useAuthStore.getState();
    const persona = state.savedPersona || (state.user?.role === "guard" ? "guard" : "resident");

    if (persona) {
      let newToken: string | null = null;
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          newToken = await state.authenticatePersona(persona);
          isRefreshing = false;
          if (newToken) {
            onRefreshed(newToken);
          }
        } catch (e) {
          isRefreshing = false;
          onRefreshed("");
        }
      } else {
        // Wait for active refresh to complete
        newToken = await new Promise<string>((resolve) => {
          subscribeTokenRefresh((refreshedToken) => resolve(refreshedToken));
        });
      }

      const refreshedToken = newToken || useAuthStore.getState().accessToken;
      if (refreshedToken) {
        headers["Authorization"] = `Bearer ${refreshedToken}`;
        response = await fetch(`${baseUrl}${endpoint}`, {
          ...options,
          headers,
        });
      }
    }
  }

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
      bodyPayload = { qr_token: trimmed, pin_code: trimmed };
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
  listPasses: async (societyId: string, unitId?: string) => {
    const endpoint = unitId
      ? `/societies/${societyId}/visitors/passes?unit_id=${unitId}`
      : `/societies/${societyId}/visitors/passes`;
    return apiClient<any[]>(endpoint);
  },
  getInsideVisitors: async (societyId: string) => {
    return apiClient<any[]>(`/societies/${societyId}/visitors/inside`);
  },
  approvePass: async (societyId: string, passId: string) => {
    return apiClient<any>(`/societies/${societyId}/visitors/passes/${passId}/approve`, {
      method: "POST",
    });
  },
  rejectPass: async (societyId: string, passId: string) => {
    return apiClient<any>(`/societies/${societyId}/visitors/passes/${passId}/reject`, {
      method: "POST",
    });
  },
  revokePass: async (societyId: string, passId: string) => {
    return apiClient<any>(`/societies/${societyId}/visitors/passes/${passId}/revoke`, {
      method: "POST",
    });
  },
};

export const societyApi = {
  listSocieties: async () => {
    return apiClient<any[]>("/societies");
  },
  getMyMemberships: async () => {
    return apiClient<any[]>("/societies/my-memberships");
  },
  getGates: async (societyId: string) => {
    return apiClient<any[]>(`/societies/${societyId}/gates`);
  },
  getUnits: async (societyId: string, buildingId?: string) => {
    const endpoint = buildingId
      ? `/societies/${societyId}/units?building_id=${buildingId}`
      : `/societies/${societyId}/units`;
    return apiClient<any[]>(endpoint);
  },
  getEmergencyContacts: async (societyId: string) => {
    return apiClient<any[]>(`/societies/${societyId}/emergency-contacts`);
  },
};

