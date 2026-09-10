import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "../../src/theme/colors";
import { getBaseUrl } from "../../src/api/client";

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("+91 98765 30002");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOTP = async () => {
    const cleanPhone = phone.replace(/\s+/g, "");
    if (cleanPhone.length < 10) {
      Alert.alert("Invalid Phone", "Please enter a valid 10-digit mobile phone number.");
      return;
    }

    setIsLoading(true);
    try {
      const baseUrl = getBaseUrl();
      await fetch(`${baseUrl}/auth/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      }).catch(() => {});

      router.push({
        pathname: "/(auth)/verify-otp",
        params: { phone: cleanPhone },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (rolePhone: string) => {
    setPhone(rolePhone);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inner}
      >
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>N</Text>
          </View>
          <Text style={styles.brandTitle}>Neighbr</Text>
          <Text style={styles.brandTagline}>Gated Community & Gatekeeping Platform</Text>
        </View>

        {/* Input Form */}
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Enter your mobile number</Text>
          <Text style={styles.formSubtitle}>
            We will send a 6-digit verification code to log in.
          </Text>

          <View style={styles.phoneInputRow}>
            <View style={styles.countryCodeBadge}>
              <Text style={styles.flagEmoji}>🇮🇳</Text>
              <Text style={styles.countryCodeText}>+91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="98765 43210"
              placeholderTextColor={Colors.textLight}
              keyboardType="phone-pad"
              value={phone.replace("+91", "").trim()}
              onChangeText={(val: string) => setPhone(`+91 ${val}`)}
            />
          </View>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleSendOTP}
            disabled={isLoading}
          >
            <Text style={styles.continueButtonText}>
              {isLoading ? "Sending OTP..." : "Continue with OTP →"}
            </Text>
          </TouchableOpacity>

          {/* Quick Demo Fill Buttons */}
          <View style={styles.quickFillContainer}>
            <Text style={styles.quickFillLabel}>Demo Persona Quick-Select:</Text>
            <View style={styles.personaRow}>
              <TouchableOpacity
                onPress={() => handleQuickFill("+91 98765 30002")}
                style={styles.personaPill}
              >
                <Text style={styles.personaPillText}>🏡 Resident (Villa-42)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleQuickFill("+91 98765 30003")}
                style={styles.personaPill}
              >
                <Text style={styles.personaPillText}>🛡️ Guard (Gate-01)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>
          By continuing, you agree to Neighbr's Terms of Service and Privacy Policy.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    paddingVertical: 20,
  },
  brandContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 12,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "900",
    color: "#ffffff",
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },
  formContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
  },
  formSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: 18,
  },
  phoneInputRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  countryCodeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  flagEmoji: {
    fontSize: 16,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.secondaryLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  continueButton: {
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
  continueButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  quickFillContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  quickFillLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  personaRow: {
    flexDirection: "row",
    gap: 8,
  },
  personaPill: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  personaPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primaryDark,
  },
  footerText: {
    fontSize: 11,
    color: Colors.textLight,
    textAlign: "center",
    lineHeight: 16,
  },
});
