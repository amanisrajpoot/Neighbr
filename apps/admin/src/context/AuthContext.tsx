"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const API_BASE_URL = rawApiUrl.replace(/\/+$/, "");

export interface UserProfile {
  id: string;
  phone: string;
  full_name: string;
  is_platform_admin?: boolean;
  avatar_url?: string;
  role?: string;
}

export type RoleType = "society_admin" | "security_supervisor" | "accountant" | "committee" | "resident" | "guard";

export interface RoleOption {
  id: RoleType;
  label: string;
  description: string;
  icon: string;
  badge: string;
}

export const ALL_ROLES: RoleOption[] = [
  {
    id: "society_admin",
    label: "Estate Super Administrator",
    description: "Full society command, flat inventory, guard rosters & gate security",
    icon: "🏢",
    badge: "Admin Access",
  },
  {
    id: "security_supervisor",
    label: "Security Head / Supervisor",
    description: "Gate barrier IoT telemetry, guard shift assignments & incident audit logs",
    icon: "🛡️",
    badge: "Security Ops",
  },
  {
    id: "accountant",
    label: "Society Treasurer & Accountant",
    description: "Maintenance invoices, offline payment reconciliation & billing ledgers",
    icon: "💰",
    badge: "Finance & Accounts",
  },
  {
    id: "committee",
    label: "Management Committee Member",
    description: "Notices broadcast, resident directory governance & amenity oversight",
    icon: "📜",
    badge: "Committee",
  },
  {
    id: "resident",
    label: "Resident Flat Owner (Villa-42)",
    description: "Manage household members, issue guest gate passes & view notice board",
    icon: "🏡",
    badge: "Resident Mode",
  },
  {
    id: "guard",
    label: "Gate Security Guard (Gate-01)",
    description: "Live camera scanner, visitor check-in/out & security blacklist",
    icon: "👮",
    badge: "Guard Station",
  },
];

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  activeRole: RoleType;
  availableRoles: RoleOption[];
  isLoading: boolean;
  isAuthenticated: boolean;
  switchRole: (role: RoleType) => void;
  requestOtp: (phone: string) => Promise<{ success: boolean; message?: string }>;
  login: (phone: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  activeRole: "society_admin",
  availableRoles: ALL_ROLES,
  isLoading: true,
  isAuthenticated: false,
  switchRole: () => {},
  requestOtp: async () => ({ success: false }),
  login: async () => ({ success: false }),
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<RoleType>("society_admin");
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load existing session from localStorage on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("neighbr_admin_token");
      const storedUser = localStorage.getItem("neighbr_admin_user");
      const storedRole = localStorage.getItem("neighbr_active_role") as RoleType | null;

      if (storedRole && ALL_ROLES.some((r) => r.id === storedRole)) {
        setActiveRole(storedRole);
      }

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } else if (storedToken) {
        const fallbackUser: UserProfile = {
          id: "u-admin-01",
          phone: "+919876500001",
          full_name: "Aman Sharma",
          role: "society_admin",
        };
        setUser(fallbackUser);
        localStorage.setItem("neighbr_admin_user", JSON.stringify(fallbackUser));
      }
    } catch (err) {
      console.warn("Failed to load stored auth session:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchRole = (newRole: RoleType) => {
    setActiveRole(newRole);
    if (typeof window !== "undefined") {
      localStorage.setItem("neighbr_active_role", newRole);
    }
  };

  const requestOtp = async (phone: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, message: err.error?.message || "Failed to send OTP" };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || "Network error sending OTP" };
    }
  };

  const login = async (phone: string, otp: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          otp,
          device_id: "admin-desktop-session-01",
          platform: "web",
          device_name: "Admin Web Console (Desktop)",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.error?.message || err.detail || "Invalid OTP code" };
      }

      const data = await res.json();
      const accessToken = data.access_token;
      const userProfile: UserProfile = data.user || {
        id: "u-admin-01",
        phone,
        full_name: phone.includes("00001") ? "Aman Sharma (Admin)" : "Estate Manager",
        role: "society_admin",
      };

      setToken(accessToken);
      setUser(userProfile);
      localStorage.setItem("neighbr_admin_token", accessToken);
      localStorage.setItem("neighbr_admin_user", JSON.stringify(userProfile));

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Login request failed" };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("neighbr_admin_token");
    localStorage.removeItem("neighbr_admin_user");
    localStorage.removeItem("neighbr_active_role");
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activeRole,
        availableRoles: ALL_ROLES,
        isLoading,
        isAuthenticated: !!token,
        switchRole,
        requestOtp,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
