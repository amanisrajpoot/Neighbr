import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "../src/theme/colors";
import { useAuthStore } from "../src/store/authStore";

export default function AppEntryScreen() {
  const router = useRouter();
  const { isAuthenticated, user, login, authenticatePersona } = useAuthStore();
  const [isLaunching, setIsLaunching] = React.useState(false);

  useEffect(() => {
    // If user already has an active authenticated session, auto-navigate
    const state = useAuthStore.getState();
    if (state.isAuthenticated && state.user && state.accessToken) {
      if (state.user.role === "guard") {
        router.replace("/(guard)");
      } else {
        router.replace("/(resident)");
      }
    }
  }, [router]);

  const launchResident = async () => {
    try {
      setIsLaunching(true);
      await authenticatePersona("resident");
      router.replace("/(resident)");
    } catch {
      router.replace("/(resident)");
    } finally {
      setIsLaunching(false);
    }
  };

  const launchGuard = async () => {
    try {
      setIsLaunching(true);
      await authenticatePersona("guard");
      router.replace("/(guard)");
    } catch {
      router.replace("/(guard)");
    } finally {
      setIsLaunching(false);
    }
  };

  const launchAuth = () => {
    router.push("/(auth)/login");
  };


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.content}>
        {/* Brand Banner */}
        <View style={styles.brandBox}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>N</Text>
          </View>
          <Text style={styles.title}>Neighbr Mobile</Text>
          <Text style={styles.subtitle}>Gated Community Management & Gatekeeping</Text>
        </View>

        {/* Quick Launch Personas */}
        <View style={styles.launchCard}>
          <Text style={styles.launchCardTitle}>Launch Mobile Persona</Text>

          <TouchableOpacity onPress={launchResident} style={styles.personaButton}>
            <View style={styles.personaIconBox}>
              <Text style={{ fontSize: 22 }}>🏡</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.personaTitle}>Resident Experience</Text>
              <Text style={styles.personaSub}>Pre-approve passes, QR invites, 1-tap SOS</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={launchGuard} style={[styles.personaButton, styles.personaButtonDark]}>
            <View style={[styles.personaIconBox, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
              <Text style={{ fontSize: 22 }}>🛡️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.personaTitle, { color: "#ffffff" }]}>Guard Gate Console</Text>
              <Text style={[styles.personaSub, { color: "#94a3b8" }]}>QR scanner, walk-ins, offline SQLite sync</Text>
            </View>
            <Text style={[styles.arrow, { color: "#ffffff" }]}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={launchAuth} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>Log in with Phone OTP Number</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Neighbr Modular Monolith • R1 Rapid Release</Text>
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
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
  },
  brandBox: {
    alignItems: "center",
    marginTop: 30,
  },
  logo: {
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
    marginBottom: 14,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "900",
    color: "#ffffff",
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: "center",
  },
  launchCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    gap: 12,
  },
  launchCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  personaButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.secondaryLight,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  personaButtonDark: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  personaIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  personaTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },
  personaSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  arrow: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.primary,
  },
  loginLink: {
    alignItems: "center",
    paddingTop: 8,
  },
  loginLinkText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
  },
  footer: {
    fontSize: 11,
    color: Colors.textLight,
    textAlign: "center",
  },
});
