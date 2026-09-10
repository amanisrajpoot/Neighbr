import { create } from "zustand";

export interface UserState {
  id: string;
  phone: string;
  name?: string;
  role: "resident" | "guard" | "admin";
  societyId: string;
  societyName: string;
  unitId?: string;
  unitNumber?: string;
}

interface AuthStore {
  isAuthenticated: boolean;
  accessToken: string | null;
  user: UserState | null;
  login: (token: string, user: UserState) => void;
  logout: () => void;
  switchSociety: (societyId: string, societyName: string, unitNumber?: string) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: true, // Default to demo active session
  accessToken: "mock-access-token",
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
  login: (token, user) => set({ isAuthenticated: true, accessToken: token, user }),
  logout: () => set({ isAuthenticated: false, accessToken: null, user: null }),
  switchSociety: (societyId, societyName, unitNumber) =>
    set((state) => ({
      user: state.user ? { ...state.user, societyId, societyName, unitNumber } : null,
    })),
}));
