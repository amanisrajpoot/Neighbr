import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Platform,
} from "react-native";
import { Colors } from "../theme/colors";

export interface PickerItem {
  id: string;
  label: string;
  subLabel?: string;
  badge?: string;
  icon?: string;
  data?: any;
}

interface SearchablePickerProps {
  title: string;
  placeholder: string;
  items: PickerItem[];
  selectedId?: string;
  onSelect: (item: PickerItem) => void;
  disabled?: boolean;
  searchPlaceholder?: string;
}

export function SearchablePicker({
  title,
  placeholder,
  items,
  selectedId,
  onSelect,
  disabled = false,
  searchPlaceholder = "Type to search...",
}: SearchablePickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedItem = items.find((i) => i.id === selectedId);

  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const matchLabel = item.label.toLowerCase().includes(q);
    const matchSub = item.subLabel ? item.subLabel.toLowerCase().includes(q) : false;
    const matchBadge = item.badge ? item.badge.toLowerCase().includes(q) : false;
    return matchLabel || matchSub || matchBadge;
  });

  const handleOpen = () => {
    if (disabled) return;
    setSearchQuery("");
    setModalVisible(true);
  };

  const handleSelectItem = (item: PickerItem) => {
    onSelect(item);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleOpen}
        disabled={disabled}
        activeOpacity={0.7}
        style={[
          styles.triggerButton,
          disabled && styles.triggerDisabled,
          selectedItem && styles.triggerSelected,
        ]}
      >
        <View style={styles.triggerLeft}>
          {selectedItem?.icon && <Text style={styles.triggerIcon}>{selectedItem.icon}</Text>}
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.triggerText,
                !selectedItem && styles.placeholderText,
              ]}
              numberOfLines={1}
            >
              {selectedItem ? selectedItem.label : placeholder}
            </Text>
            {selectedItem?.subLabel && (
              <Text style={styles.triggerSubText} numberOfLines={1}>
                {selectedItem.subLabel}
              </Text>
            )}
          </View>
        </View>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      {/* Search & Select Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{title}</Text>
              <Text style={styles.modalSubTitle}>
                {filteredItems.length} available {filteredItems.length === 1 ? "option" : "options"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={searchPlaceholder}
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={Platform.OS !== "web"}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Items List */}
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🔎</Text>
                <Text style={styles.emptyTitle}>No matching options found</Text>
                <Text style={styles.emptyText}>
                  Try typing a different unit number, tower name, or property code.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isSelected = item.id === selectedId;
              return (
                <TouchableOpacity
                  onPress={() => handleSelectItem(item)}
                  style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemLeft}>
                    {item.icon ? (
                      <Text style={styles.itemIcon}>{item.icon}</Text>
                    ) : (
                      <View style={styles.itemDot} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemLabel, isSelected && styles.itemLabelSelected]}>
                        {item.label}
                      </Text>
                      {item.subLabel && (
                        <Text style={styles.itemSubLabel}>{item.subLabel}</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.itemRight}>
                    {item.badge && (
                      <View style={styles.badgeContainer}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    )}
                    {isSelected && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  triggerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  triggerDisabled: {
    opacity: 0.6,
    backgroundColor: "#f8fafc",
  },
  triggerSelected: {
    borderColor: Colors.primary,
    backgroundColor: "#f0f9ff",
  },
  triggerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  triggerIcon: {
    fontSize: 20,
  },
  triggerText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  triggerSubText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: "500",
  },
  placeholderText: {
    color: Colors.textMuted,
    fontWeight: "500",
  },
  chevron: {
    fontSize: 16,
    color: Colors.textMuted,
    fontWeight: "800",
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.text,
  },
  modalSubTitle: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "600",
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    marginHorizontal: 20,
    marginVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  clearBtn: {
    padding: 6,
  },
  clearBtnText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "800",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 10,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    padding: 16,
  },
  itemCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: "#f0f9ff",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  itemIcon: {
    fontSize: 22,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },
  itemLabelSelected: {
    color: Colors.primary,
  },
  itemSubLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "500",
    marginTop: 2,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  badgeContainer: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
  },
  checkMark: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.primary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});
