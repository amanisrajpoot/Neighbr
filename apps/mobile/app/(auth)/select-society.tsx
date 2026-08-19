import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "../../src/theme/colors";
import { useAuthStore } from "../../src/store/authStore";

export default function SelectSocietyScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const login = useAuthStore((state) => state.login);

  const selectResidentRole = () => {
    login("mock-access-token", {
      id: "u-resident-01",
      phone: "+919876530002",
      name: "Siddharth Verma",
      role: "resident",
      societyId: "34090e70-34f9-4cdd-9522-e2098982a5ed",
      societyName: "Greenwood Palms Heights",
      unitNumber: "Villa-42",
    });
    router.replace("/(resident)");
  };

  const selectGuardRole = () => {
    login("mock-access-token", {
      id: "u-guard-01",
      phone: "+919876530003",
      name: "Jagdish R. (Guard)",
      role: "guard",
      societyId: "34090e70-34f9-4cdd-9522-e2098982a5ed",
      societyName: "Greenwood Palms Heights",
      unitNumber: undefined,
    });
    router.replace("/(guard)");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome, {user?.name || "User"}</Text>
          <Text style={styles.subtitle}>Select your society role and terminal to continue</Text>
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

            <Text style={styles.societyTitle}>Greenwood Palms Heights</Text>
            <Text style={styles.roleMeta}>Unit: Villa-42 • Owner Membership</Text>
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

            <Text style={styles.societyTitle}>Greenwood Palms Heights</Text>
            <Text style={styles.roleMeta}>Terminal: Main North Gate (GATE-01) • Morning Shift</Text>
            <Text style={styles.actionPrompt}>Open Guard QR Scanner & Gate Console →</Text>
          </TouchableOpacity>
        </View>
      </View>
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
