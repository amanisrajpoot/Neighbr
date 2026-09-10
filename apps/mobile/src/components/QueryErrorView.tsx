import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import { Colors } from "../theme/colors";

interface QueryErrorViewProps {
  message?: string;
  error?: Error | unknown;
  onRetry?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const QueryErrorView: React.FC<QueryErrorViewProps> = ({
  message,
  error,
  onRetry,
  compact = false,
  style,
}) => {
  const displayMessage =
    message ||
    (error instanceof Error ? error.message : null) ||
    "Something went wrong loading this data.";

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <Text style={styles.compactIcon}>⚠️</Text>
        <Text style={styles.compactText} numberOfLines={2}>
          {displayMessage}
        </Text>
        {onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.compactRetryBtn} activeOpacity={0.7}>
            <Text style={styles.compactRetryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>⚠️</Text>
      </View>
      <Text style={styles.title}>Unable to Load Data</Text>
      <Text style={styles.message}>{displayMessage}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.retryBtn} activeOpacity={0.8}>
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: "#fecdd3", // Rose 200
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ffe4e6", // Rose 100
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  icon: {
    fontSize: 22,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.danger,
    marginBottom: 6,
    textAlign: "center",
  },
  message: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  retryBtn: {
    backgroundColor: Colors.danger,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  retryBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: "#fecdd3",
    marginVertical: 8,
    gap: 8,
  },
  compactIcon: {
    fontSize: 16,
  },
  compactText: {
    flex: 1,
    fontSize: 12,
    color: Colors.danger,
    fontWeight: "500",
  },
  compactRetryBtn: {
    backgroundColor: Colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  compactRetryText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
});
