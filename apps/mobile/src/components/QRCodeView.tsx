import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Share, Platform } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { Colors } from "../theme/colors";
import { generateStandardQrMatrix } from "../utils/qrGenerator";

interface QRCodeViewProps {
  value: string;
  pinCode?: string;
  visitorName?: string;
  unitNumber?: string;
  validUntil?: string;
  status?: string;
  size?: number;
  showShareButton?: boolean;
}

export function QRCodeView({
  value,
  pinCode = "889922",
  visitorName = "Guest Visitor",
  unitNumber = "Villa-42",
  validUntil = "Today, 11:59 PM",
  status = "APPROVED",
  size = 220,
  showShareButton = true,
}: QRCodeViewProps) {
  // Generate 100% compliant ISO standard QR Matrix
  const matrix = React.useMemo(() => generateStandardQrMatrix(value), [value]);
  const matrixSize = matrix.length;
  const cellSize = size / matrixSize;

  const formattedPin = pinCode.length === 6 
    ? `${pinCode.slice(0, 3)} ${pinCode.slice(3)}`
    : pinCode;

  const handleShare = async () => {
    const shareMessage = `━━━━━━━━━━━━━━━━━━━━━
🎟️ NEIGHBR DIGITAL GATE PASS
━━━━━━━━━━━━━━━━━━━━━
👤 Visitor: ${visitorName}
📍 Destination: Flat ${unitNumber}
🔑 6-Digit Gate PIN: ${formattedPin}
⏳ Valid Until: ${validUntil}
🔖 Pass Token: ${value}

👉 Present this pass or tell the 6-digit PIN to security guards at the society gate.`;

    if (Platform.OS === "web") {
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: "Neighbr Gate Pass", text: shareMessage });
        } catch {}
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareMessage);
        window.alert("🎟️ Digital Pass details copied to clipboard!");
      }
    } else {
      await Share.share({ message: shareMessage });
    }
  };

  const isExpired = status === "EXPIRED";

  return (
    <View style={styles.card}>
      {/* Header Info */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.visitorName}>{visitorName}</Text>
          <Text style={styles.unitText}>Destination: Flat {unitNumber}</Text>
        </View>
        <View style={[styles.statusBadge, isExpired ? styles.badgeExpired : styles.badgeApproved]}>
          <Text style={[styles.statusText, isExpired ? styles.textExpired : styles.textApproved]}>
            {isExpired ? "EXPIRED" : "ACTIVE PASS"}
          </Text>
        </View>
      </View>

      {/* SVG QR Code Container */}
      <View style={[styles.qrContainer, isExpired && styles.qrExpired]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Rect width={size} height={size} fill="#ffffff" />
          {matrix.map((row, r) =>
            row.map((isDark, c) =>
              isDark ? (
                <Rect
                  key={`${r}-${c}`}
                  x={c * cellSize}
                  y={r * cellSize}
                  width={cellSize + 0.15}
                  height={cellSize + 0.15}
                  fill={isExpired ? "#94a3b8" : "#0f172a"}
                />
              ) : null
            )
          )}
        </Svg>

        {isExpired && (
          <View style={styles.expiredOverlay}>
            <Text style={styles.expiredOverlayText}>PASS EXPIRED</Text>
          </View>
        )}
      </View>

      {/* Fallback 6-Digit PIN Code Box */}
      <View style={styles.pinBox}>
        <Text style={styles.pinLabel}>GUARD ENTRY PIN (CAMERA FALLBACK)</Text>
        <Text style={styles.pinText}>{formattedPin}</Text>
      </View>

      {/* Expiration Meta */}
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Valid Until</Text>
        <Text style={styles.metaValue}>{validUntil}</Text>
      </View>

      {/* Share / Save Actions */}
      {showShareButton && (
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <Text style={styles.shareText}>📤 Share Pass on WhatsApp / SMS</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  visitorName: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
  },
  unitText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeApproved: {
    backgroundColor: "#ecfdf5",
  },
  badgeExpired: {
    backgroundColor: "#fef2f2",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  textApproved: {
    color: "#059669",
  },
  textExpired: {
    color: "#dc2626",
  },
  qrContainer: {
    padding: 12,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    marginVertical: 12,
    position: "relative",
  },
  qrExpired: {
    opacity: 0.4,
  },
  expiredOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  expiredOverlayText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#dc2626",
    letterSpacing: 1.5,
    backgroundColor: "#fee2e2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pinBox: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 8,
  },
  pinLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
  },
  pinText: {
    fontSize: 22,
    fontWeight: "900",
    color: Colors.primaryDark,
    fontFamily: "monospace",
    marginTop: 2,
    letterSpacing: 4,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  metaLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  metaValue: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: "700",
  },
  shareButton: {
    width: "100%",
    backgroundColor: Colors.primary,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 16,
  },
  shareText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
});
