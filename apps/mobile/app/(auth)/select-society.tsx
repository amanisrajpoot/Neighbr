import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "../../src/theme/colors";
import { useAuthStore } from "../../src/store/authStore";
import { SearchablePicker } from "../../src/components/SearchablePicker";
import { societyApi } from "../../src/api/client";

export default function SelectSocietyScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const switchSociety = useAuthStore((state) => state.switchSociety);
  const login = useAuthStore((state) => state.login);
  const accessToken = useAuthStore((state) => state.accessToken);

  const [societies, setSocieties] = useState<any[]>([
    { id: "34090e70-34f9-4cdd-9522-e2098982a5ed", label: "Greenwood Palms Heights", subLabel: "42 Varthur Road, Whitefield, Bengaluru", badge: "Primary", icon: "🏢" },
  ]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [selectedSociety, setSelectedSociety] = useState(societies[0]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        // Load societies
        const socList = await societyApi.listSocieties().catch(() => []);
        if (socList && socList.length > 0) {
          const formatted = socList.map((s: any, idx: number) => ({
            id: s.id,
            label: s.name,
            subLabel: `${s.city || "Bengaluru"}, ${s.address_line1 || ""}`.trim(),
            badge: idx === 0 ? "Primary" : "Active",
            icon: "🏢",
          }));
          setSocieties(formatted);
          if (!selectedSociety || !formatted.find((f: any) => f.id === selectedSociety.id)) {
            setSelectedSociety(formatted[0]);
          }
        }

        // Load memberships
        const memList = await societyApi.getMyMemberships().catch(() => []);
        if (memList && memList.length > 0) {
          setMemberships(memList);
        }
      } catch (e) {
        console.warn("Failed to load societies/memberships:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const residentMem = memberships.find((m) => m.role === "resident" || m.role === "society_admin") || memberships[0];
  const guardMem = memberships.find((m) => m.role === "guard");

  const selectResidentRole = () => {
    if (user) {
      switchSociety(
        selectedSociety.id,
        selectedSociety.label,
        residentMem?.unit_number || user.unitNumber || "Villa-42",
        residentMem?.unit_id || user.unitId || "0be0d1a7-8a9c-46bf-9677-fa36679e01bd",
        residentMem?.id
      );
    }
    router.replace("/(resident)");
  };

  const selectGuardRole = () => {
    if (user) {
      login(accessToken || "dev-token", {
        ...user,
        role: "guard",
        societyId: selectedSociety.id,
        societyName: selectedSociety.label,
        gateId: guardMem?.gate_id || "6a8c2ff3-bd7c-4e19-9637-55f7f6be4332",
        gateName: guardMem?.gate_name || "Main North Gate",
      });
    }
    router.replace("/(guard)");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome, {user?.name || "Resident"}</Text>
          <Text style={styles.subtitle}>Select your society property and active terminal</Text>
        </View>

        {/* Searchable Society Property Selector */}
        <View style={styles.pickerSection}>
          <Text style={styles.sectionLabel}>Select Gated Community Property</Text>
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 12 }} />
          ) : (
            <SearchablePicker
              title="Select Gated Community"
              placeholder="Search society name or location..."
              searchPlaceholder="Type society name (e.g. Greenwood, Sobha, Prestige)..."
              selectedId={selectedSociety?.id}
              onSelect={(item) => setSelectedSociety(item as any)}
              items={societies}
            />
          )}
        </View>

        <View style={styles.cardList}>
          {/* Resident Option */}
          <TouchableOpacity onPress={selectResidentRole} style={styles.roleCard}>
            <View style={styles.roleHeader}>
              <Text style={styles.roleEmoji}>🏡</Text>
              <View style={styles.badgeResident}>
                <Text style={styles.badgeTextResident}>RESIDENT FLAT</Text>
              </View>
            </View>

            <Text style={styles.societyTitle}>{selectedSociety?.label || "Society"}</Text>
            <Text style={styles.roleMeta}>Unit: {residentMem?.unit_number || user?.unitNumber || "Villa-42"} • Owner Membership</Text>
            <Text style={styles.actionPrompt}>Open Resident Gate Pass & Approvals →</Text>
          </TouchableOpacity>

          {/* Guard Option */}
          <TouchableOpacity onPress={selectGuardRole} style={[styles.roleCard, styles.roleCardGuard]}>
            <View style={styles.roleHeader}>
              <Text style={styles.roleEmoji}>🛡️</Text>
              <View style={styles.badgeGuard}>
                <Text style={styles.badgeTextGuard}>SECURITY GATE DUTY</Text>
              </View>
            </View>

            <Text style={styles.societyTitle}>{selectedSociety?.label || "Society"}</Text>
            <Text style={styles.roleMeta}>Terminal: {guardMem?.gate_name || "Main North Gate"} (GATE-01) • Morning Shift</Text>

            <Text style={styles.actionPrompt}>Open Guard QR Scanner & Gate Console →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 24,
    gap: 24,
  },
  header: {
    marginTop: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "900",
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },
  pickerSection: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  cardList: {
    gap: 16,
  },
  roleCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    gap: 8,
  },
  roleCardGuard: {
    borderColor: Colors.primary,
    backgroundColor: "#ffffff",
  },
  roleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roleEmoji: {
    fontSize: 28,
  },
  badgeResident: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeTextResident: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.primaryDark,
  },
  badgeGuard: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeTextGuard: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ffffff",
  },
  societyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 4,
  },
  roleMeta: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  actionPrompt: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
    marginTop: 8,
  },
});
