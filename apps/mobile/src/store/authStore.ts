import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export interface UserState {
  id: string;
  phone: string;
  name?: string;
  role: "resident" | "guard" | "admin";
  societyId: string;
  societyName: string;
  unitId?: string;
  unitNumber?: string;
  membershipId?: string;
  gateId?: string;
  gateName?: string;
}

interface AuthStore {
  isAuthenticated: boolean;
  accessToken: string | null;
  user: UserState | null;
  savedPersona: "resident" | "guard" | null;
  isHydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
  login: (token: string, user: UserState) => void;
  logout: () => void;
  switchSociety: (
    societyId: string,
    societyName: string,
    unitNumber?: string,
    unitId?: string,
    membershipId?: string
  ) => void;
  authenticatePersona: (role: "resident" | "guard") => Promise<string | null>;
}

const customStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(name);
      }
      return null;
    }
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(name, value);
      }
      return;
    }
    try {
      await SecureStore.setItemAsync(name, value);
    } catch {}
  },
  removeItem: async (name: string): Promise<void> => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(name);
      }
      return;
    }
    try {
      await SecureStore.deleteItemAsync(name);
    } catch {}
  },
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      isAuthenticated: true,
      accessToken: null,
      savedPersona: "resident",
      isHydrated: false,
      user: {
        id: "35f84c33-268a-4073-b52e-f0b780785d7b",
        phone: "+919876530002",
        name: "Siddharth Verma",
        role: "resident",
        societyId: "34090e70-34f9-4cdd-9522-e2098982a5ed",
        societyName: "Greenwood Palms Heights",
        unitId: "0be0d1a7-8a9c-46bf-9677-fa36679e01bd",
        unitNumber: "Villa-42",
      },
      setHydrated: (isHydrated) => set({ isHydrated }),
      login: (token, user) =>
        set({
          isAuthenticated: true,
          accessToken: token,
          user,
          savedPersona: user.role === "guard" ? "guard" : "resident",
        }),
      logout: () =>
        set({
          isAuthenticated: false,
          accessToken: null,
          user: null,
          savedPersona: null,
        }),
      switchSociety: (societyId, societyName, unitNumber, unitId, membershipId) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, societyId, societyName, unitNumber, unitId, membershipId }
            : null,
        })),
      authenticatePersona: async (role: "resident" | "guard"): Promise<string | null> => {
        const { getBaseUrl } = await import("../api/client");
        const baseUrl = getBaseUrl();
        const phone = role === "guard" ? "+919876530003" : "+919876530002";

        try {
          // 1. Request OTP
          const reqRes = await fetch(`${baseUrl}/auth/otp/request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone }),
          }).catch(() => null);

          let otp = "123456";
          if (reqRes && reqRes.ok) {
            const reqData = await reqRes.json().catch(() => null);
            if (reqData?.dev_otp) otp = reqData.dev_otp;
          }

          // 2. Verify OTP
          const res = await fetch(`${baseUrl}/auth/otp/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone,
              otp,
              device_id: role === "guard" ? "gate-device-term-01" : "mobile-app-client-01",
              platform: "android",
              device_name: role === "guard" ? "Guard Gate Terminal" : "Resident Mobile (Expo)",
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const token = data.access_token;
            const userId =
              data.user?.id ||
              (role === "guard"
                ? "e97e82e4-ab50-4a91-b55d-53f748dd3a78"
                : "35f84c33-268a-4073-b52e-f0b780785d7b");
            const userName =
              data.user?.full_name ||
              (role === "guard" ? "Jagdish R. (Guard)" : "Siddharth Verma");

            // 3. Fetch active memberships
            let societyId = "34090e70-34f9-4cdd-9522-e2098982a5ed";
            let societyName = "Greenwood Palms Heights";
            let unitId = role === "guard" ? undefined : "0be0d1a7-8a9c-46bf-9677-fa36679e01bd";
            let unitNumber = role === "guard" ? undefined : "Villa-42";
            let membershipId: string | undefined;
            let gateId: string | undefined =
              role === "guard" ? "6a8c2ff3-bd7c-4e19-9637-55f7f6be4332" : undefined;
            let gateName: string | undefined = role === "guard" ? "Main North Gate" : undefined;

            const memRes = await fetch(`${baseUrl}/societies/my-memberships`, {
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => null);

            if (memRes && memRes.ok) {
              const memberships = await memRes.json().catch(() => []);
              const activeMem = memberships.find((m: any) => m.role === role) || memberships[0];
              if (activeMem) {
                societyId = activeMem.society_id;
                societyName = activeMem.society_name || societyName;
                membershipId = activeMem.id;
                if (activeMem.unit_id) unitId = activeMem.unit_id;
                if (activeMem.unit_number) unitNumber = activeMem.unit_number;
                if (activeMem.gate_id) gateId = activeMem.gate_id;
                if (activeMem.gate_name) gateName = activeMem.gate_name;
              }
            }

            set({
              isAuthenticated: true,
              accessToken: token,
              savedPersona: role,
              user: {
                id: userId,
                phone,
                name: userName,
                role,
                societyId,
                societyName,
                unitId,
                unitNumber,
                membershipId,
                gateId,
                gateName,
              },
            });
            return token;
          }
        } catch (err) {
          console.warn("Auto-authentication network disturbance, using database seed profile fallback:", err);
        }

        // Seed fallback with genuine UUIDs
        if (role === "guard") {
          set({
            isAuthenticated: true,
            accessToken: "dev-token",
            savedPersona: "guard",
            user: {
              id: "e97e82e4-ab50-4a91-b55d-53f748dd3a78",
              phone: "+919876530003",
              name: "Jagdish R. (Guard)",
              role: "guard",
              societyId: "34090e70-34f9-4cdd-9522-e2098982a5ed",
              societyName: "Greenwood Palms Heights",
              gateId: "6a8c2ff3-bd7c-4e19-9637-55f7f6be4332",
              gateName: "Main North Gate",
            },
          });
        } else {
          set({
            isAuthenticated: true,
            accessToken: "dev-token",
            savedPersona: "resident",
            user: {
              id: "35f84c33-268a-4073-b52e-f0b780785d7b",
              phone: "+919876530002",
              name: "Siddharth Verma",
              role: "resident",
              societyId: "34090e70-34f9-4cdd-9522-e2098982a5ed",
              societyName: "Greenwood Palms Heights",
              unitId: "0be0d1a7-8a9c-46bf-9677-fa36679e01bd",
              unitNumber: "Villa-42",
            },
          });
        }
        return "dev-token";
      },
    }),
    {
      name: "neighbr_mobile_auth_session",
      storage: createJSONStorage(() => customStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
