import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "../../src/theme/colors";
import { usePasses, VisitorPassItem } from "../../src/hooks/usePasses";

export default function ResidentVisitorsScreen() {
  const router = useRouter();
  const { passes, isLoading } = usePasses();
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "PAST">("ALL");

  const filteredPasses = passes.filter((p: VisitorPassItem) => {
    if (activeFilter === "ACTIVE") return p.status === "APPROVED" || p.status === "CHECKED_IN";
    if (activeFilter === "PAST") return p.status === "CHECKED_OUT" || p.status === "EXPIRED";
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Visitor Passes</Text>
        <TouchableOpacity
          onPress={() => router.push("/(resident)/create-pass")}
          style={styles.newPassButton}
        >
          <Text style={styles.newPassButtonText}>+ New Pass</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(["ALL", "ACTIVE", "PAST"] as const).map((tab) => {
          const isSelected = activeFilter === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveFilter(tab)}
              style={[styles.filterTab, isSelected && styles.filterTabActive]}
            >
              <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                {tab === "ALL" ? "All Passes" : tab === "ACTIVE" ? "Active / Inside" : "Past History"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {filteredPasses.map((pass) => (
          <View key={pass.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.visitorName}>{pass.visitor_name}</Text>
                <Text style={styles.visitorMeta}>
                  {pass.pass_type} • {pass.valid_from}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  pass.status === "CHECKED_IN" || pass.status === "APPROVED"
                    ? styles.statusSuccess
                    : styles.statusMuted,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    pass.status === "CHECKED_IN" || pass.status === "APPROVED"
                      ? styles.statusTextSuccess
                      : styles.statusTextMuted,
                  ]}
                >
                  {pass.status}
                </Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.vehicleText}>Vehicle: {pass.vehicle_number || "None"}</Text>
              <Text style={styles.qrCodeText}>Code: {pass.qr_token}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  newPassButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  newPassButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.secondaryLight,
  },
  filterTabActive: {
    backgroundColor: Colors.secondary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  filterTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  visitorName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  visitorMeta: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusSuccess: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success,
  },
  statusMuted: {
    backgroundColor: Colors.secondaryLight,
    borderColor: Colors.border,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  statusTextSuccess: {
    color: Colors.success,
  },
  statusTextMuted: {
    color: Colors.textMuted,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  vehicleText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  qrCodeText: {
    fontSize: 11,
    fontFamily: "monospace",
    color: Colors.primaryDark,
    fontWeight: "600",
  },
});
