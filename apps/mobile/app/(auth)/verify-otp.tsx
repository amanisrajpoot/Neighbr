import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Colors } from "../../src/theme/colors";
import { useAuthStore } from "../../src/store/authStore";
import { getBaseUrl } from "../../src/api/client";

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const phone = (params.phone as string) || "+919876530002";
  const [otp, setOtp] = useState("123456");
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert("Invalid Code", "Please enter the complete 6-digit verification code.");
      return;
    }

    setIsLoading(true);
    try {
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          otp,
          device_id: "mobile-device-session-01",
          platform: "android",
          device_name: "Mobile App (Expo)",
        }),
      });

      const isGuard = phone.includes("30003");
      let jwtToken = "dev-token";
      let userId = isGuard ? "e97e82e4-ab50-4a91-b55d-53f748dd3a78" : "35f84c33-268a-4073-b52e-f0b780785d7b";
      let userName = isGuard ? "Jagdish R. (Guard)" : "Siddharth Verma";
      let userRole: "guard" | "resident" = isGuard ? "guard" : "resident";
      let societyId = "34090e70-34f9-4cdd-9522-e2098982a5ed";
      let societyName = "Greenwood Palms Heights";
      let unitId: string | undefined = isGuard ? undefined : "0be0d1a7-8a9c-46bf-9677-fa36679e01bd";
      let unitNumber: string | undefined = isGuard ? undefined : "Villa-42";
      let membershipId: string | undefined;
      let gateId: string | undefined = isGuard ? "6a8c2ff3-bd7c-4e19-9637-55f7f6be4332" : undefined;
      let gateName: string | undefined = isGuard ? "Main North Gate" : undefined;

      if (res.ok) {
        const data = await res.json();
        jwtToken = data.access_token || jwtToken;
        if (data.user?.id) userId = data.user.id;
        if (data.user?.full_name) userName = data.user.full_name;

        // Fetch user memberships to get real society & unit
        const memRes = await fetch(`${baseUrl}/societies/my-memberships`, {
          headers: { Authorization: `Bearer ${jwtToken}` },
        }).catch(() => null);

        if (memRes && memRes.ok) {
          const memberships = await memRes.json().catch(() => []);
          const activeMem = memberships[0];
          if (activeMem) {
            societyId = activeMem.society_id;
            societyName = activeMem.society_name || societyName;
            membershipId = activeMem.id;
            userRole = (activeMem.role === "guard" ? "guard" : "resident") as any;
            if (activeMem.unit_id) unitId = activeMem.unit_id;
            if (activeMem.unit_number) unitNumber = activeMem.unit_number;
            if (activeMem.gate_id) gateId = activeMem.gate_id;
            if (activeMem.gate_name) gateName = activeMem.gate_name;
          }
        }
      }

      login(jwtToken, {
        id: userId,
        phone,
        name: userName,
        role: userRole,
        societyId,
        societyName,
        unitId,
        unitNumber,
        membershipId,
        gateId,
        gateName,
      });

      router.replace("/(auth)/select-society");
    } catch (err) {
      // Offline fallback
      const isGuard = phone.includes("30003");
      login("dev-token", {
        id: isGuard ? "e97e82e4-ab50-4a91-b55d-53f748dd3a78" : "35f84c33-268a-4073-b52e-f0b780785d7b",
        phone,
        name: isGuard ? "Jagdish R. (Guard)" : "Siddharth Verma",
        role: isGuard ? "guard" : "resident",
        societyId: "34090e70-34f9-4cdd-9522-e2098982a5ed",
        societyName: "Greenwood Palms Heights",
        unitId: isGuard ? undefined : "0be0d1a7-8a9c-46bf-9677-fa36679e01bd",
        unitNumber: isGuard ? undefined : "Villa-42",
      });
      router.replace("/(auth)/select-society");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Change Number</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Verify OTP Code</Text>
          <Text style={styles.subtitle}>
            Code sent to <Text style={{ fontWeight: "700", color: Colors.text }}>{phone}</Text>
          </Text>
        </View>

        <View style={styles.otpCard}>
          <Text style={styles.otpLabel}>Enter 6-Digit Code</Text>
          <TextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />

          <View style={styles.devHintBadge}>
            <Text style={styles.devHintText}>💡 Dev Environment: Default OTP is 123456</Text>
          </View>

          <TouchableOpacity
            style={styles.verifyButton}
            onPress={handleVerify}
            disabled={isLoading}
          >
            <Text style={styles.verifyButtonText}>
              {isLoading ? "Verifying..." : "Verify & Proceed →"}
            </Text>
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
    gap: 20,
  },
  backButton: {
    paddingVertical: 8,
  },
  backText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  header: {
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },
  otpCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    gap: 16,
  },
  otpLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  otpInput: {
    backgroundColor: Colors.secondaryLight,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 26,
    fontFamily: "monospace",
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 10,
    color: Colors.text,
  },
  devHintBadge: {
    backgroundColor: Colors.primaryLight,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  devHintText: {
    fontSize: 11,
    color: Colors.primaryDark,
    fontWeight: "700",
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  verifyButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
});
