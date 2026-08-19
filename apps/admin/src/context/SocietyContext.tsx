"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api, SocietyItem } from "@/lib/api";

interface SocietyContextType {
  currentSociety: SocietyItem | null;
  societies: SocietyItem[];
  isLoading: boolean;
  selectSociety: (id: string) => void;
  refreshSocieties: () => Promise<void>;
}

const SocietyContext = createContext<SocietyContextType>({
  currentSociety: null,
  societies: [],
  isLoading: true,
  selectSociety: () => {},
  refreshSocieties: async () => {},
});

export function SocietyProvider({ children }: { children: ReactNode }) {
  const [societies, setSocieties] = useState<SocietyItem[]>([]);
  const [currentSociety, setCurrentSociety] = useState<SocietyItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSocieties = async () => {
    try {
      setIsLoading(true);
      const list = await api.getSocieties();
      if (Array.isArray(list) && list.length > 0) {
        setSocieties(list);
        // Default to Greenwood Palms if available or first
        const defaultSoc = list.find((s) => s.slug === "greenwood-palms") || list[0];
        setCurrentSociety(defaultSoc);
      }
    } catch (err) {
      console.warn("Could not fetch societies from live API, will retry on login", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSocieties();
  }, []);

  const selectSociety = (id: string) => {
    const found = societies.find((s) => s.id === id);
    if (found) {
      setCurrentSociety(found);
    }
  };

  return (
    <SocietyContext.Provider
      value={{
        currentSociety,
        societies,
        isLoading,
        selectSociety,
        refreshSocieties: fetchSocieties,
      }}
    >
      {children}
    </SocietyContext.Provider>
  );
}

export function useSociety() {
  return useContext(SocietyContext);
}
