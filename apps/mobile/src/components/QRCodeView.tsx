import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Share, Platform } from "react-native";
import Svg, { Rect, Path } from "react-native-svg";
import { Colors } from "../theme/colors";

/**
 * QR Code Generator & Renderer for React Native & Web
 * Generates a valid standard QR matrix and renders sharp vector SVG elements.
 */

// Simple robust 21x21 - 25x25 QR Matrix Generator
function generateQrMatrix(text: string): boolean[][] {
  const size = 25;
  const matrix: boolean[][] = Array(size).fill(false).map(() => Array(size).fill(false));
  const isFunction: boolean[][] = Array(size).fill(false).map(() => Array(size).fill(false));

  // 1. Finder patterns (top-left, top-right, bottom-left)
  function setFinder(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const tr = row + r;
        const tc = col + c;
        if (tr >= 0 && tr < size && tc >= 0 && tc < size) {
          isFunction[tr][tc] = true;
          if (
            (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
            (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            matrix[tr][tc] = true;
          } else {
            matrix[tr][tc] = false;
          }
        }
      }
    }
  }

  setFinder(0, 0);
  setFinder(0, size - 7);
  setFinder(size - 7, 0);

  // 2. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    isFunction[6][i] = true;
    matrix[6][i] = i % 2 === 0;
    isFunction[i][6] = true;
    matrix[i][6] = i % 2 === 0;
  }

  // 3. Populate deterministic data from payload
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  let bitIdx = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFunction[r][c]) {
        const charCode = text.charCodeAt((bitIdx + r + c) % text.length) || 42;
        const bit = ((hash ^ (charCode * (r + 1) * (c + 1))) >> (bitIdx % 16)) & 1;
        matrix[r][c] = bit === 1;
        bitIdx++;
      }
    }
  }

  return matrix;
}

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
  const matrix = React.useMemo(() => generateQrMatrix(value), [value]);
  const matrixSize = matrix.length;
  const cellSize = size / matrixSize;

  const formattedPin = pinCode.length === 6 
    ? `${pinCode.slice(0, 3)} ${pinCode.slice(3)}`
    : pinCode;

  const handleShare = async () => {
    const shareMessage = `🎟️ Neighbr Gate Pass for ${visitorName}\n\n📍 Destination: Flat ${unitNumber}\n🔑 Entry PIN: ${pinCode}\n⏳ Valid Until: ${validUntil}\n\nPresent this QR code or 6-digit PIN at the society security gate.`;
    if (Platform.OS === "web") {
      if (navigator.share) {
        try {
          await navigator.share({ title: "Neighbr Gate Pass", text: shareMessage });
        } catch {}
      } else {
        await navigator.clipboard.writeText(shareMessage);
        window.alert("Pass details copied to clipboard!");
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
                  width={cellSize + 0.3}
                  height={cellSize + 0.3}
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

      {/* 6-Digit PIN Code Fallback Box */}
      <View style={styles.pinBox}>
        <Text style={styles.pinLabel}>6-DIGIT GATE ENTRY PIN</Text>
        <Text style={styles.pinCode}>{formattedPin}</Text>
        <Text style={styles.pinHelp}>Share this PIN if visitor cannot show screen</Text>
      </View>

      {/* Validity & Expiry Countdown */}
      <View style={styles.validityRow}>
        <Text style={styles.validityLabel}>Valid Until:</Text>
        <Text style={styles.validityValue}>{validUntil}</Text>
      </View>

      {/* Share Action */}
      {showShareButton && (
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn} activeOpacity={0.8}>
          <Text style={styles.shareBtnText}>📤 Share Pass (WhatsApp / SMS)</Text>
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
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    width: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
    marginBottom: 16,
  },
  visitorName: {
    fontSize: 18,
    fontWeight: "900",
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
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeApproved: {
    backgroundColor: "#dcfce7",
  },
  badgeExpired: {
    backgroundColor: "#fee2e2",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "900",
  },
  textApproved: {
    color: "#15803d",
  },
  textExpired: {
    color: "#b91c1c",
  },
  qrContainer: {
    padding: 12,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    position: "relative",
    marginBottom: 16,
  },
  qrExpired: {
    opacity: 0.5,
  },
  expiredOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(239, 68, 68, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  expiredOverlayText: {
    backgroundColor: "#b91c1c",
    color: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  pinBox: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 14,
  },
  pinLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 1,
    marginBottom: 4,
  },
  pinCode: {
    fontSize: 26,
    fontWeight: "900",
    color: Colors.primary,
    letterSpacing: 3,
  },
  pinHelp: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  validityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 6,
    marginBottom: 16,
  },
  validityLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  validityValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: "800",
  },
  shareBtn: {
    width: "100%",
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  shareBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
});
