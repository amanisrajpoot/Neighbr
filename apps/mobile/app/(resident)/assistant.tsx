import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "../../src/theme/colors";
import { useAI, ChatMessage } from "../../src/hooks/useAI";

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "m-1",
    role: "assistant",
    content: "Hi there! I am your Neighbr AI Resident Copilot. How can I assist you with your flat, gate passes, clubhouse bookings, or maintenance today?",
    suggested_actions: ["Book Clubhouse Slot", "Check Maintenance Dues", "Report Plumbing Issue"],
    timestamp: "Just now",
  },
];

const PROMPT_CHIPS = [
  "How do I book the tennis court?",
  "What are my pending maintenance dues?",
  "How do I link a new maid?",
  "Where are the visitor parking slots?",
];

export default function ResidentAIAssistantScreen() {
  const router = useRouter();
  const { sendMessage, isThinking } = useAI();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isThinking) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText("");

    try {
      const res = await sendMessage({
        message: text.trim(),
        history: messages.map((m) => ({ role: m.role, content: m.content })),
      });

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: res.reply,
        suggested_actions: res.suggested_actions,
        timestamp: "Just now",
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const fallbackMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: "I am ready to help! You can book clubhouse slots under the Clubhouse tab, check maintenance dues in Maintenance, or register visitors via Pre-Approve Pass.",
        suggested_actions: ["Open Clubhouse", "Pay Dues"],
        timestamp: "Just now",
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    }
  };

  const handleActionClick = (action: string) => {
    const actLower = action.toLowerCase();
    if (actLower.includes("clubhouse") || actLower.includes("tennis") || actLower.includes("pool")) {
      router.push("/(resident)/amenities");
    } else if (actLower.includes("due") || actLower.includes("pay") || actLower.includes("bill")) {
      router.push("/(resident)/billing");
    } else if (actLower.includes("helpdesk") || actLower.includes("ticket") || actLower.includes("plumb") || actLower.includes("repair")) {
      router.push("/(resident)/helpdesk");
    } else if (actLower.includes("staff") || actLower.includes("maid")) {
      router.push("/(resident)/staff");
    } else {
      handleSend(action);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.aiBadgeCircle}>
          <Text style={styles.aiBadgeEmoji}>✨</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Neighbr AI Assistant</Text>
          <Text style={styles.subtitle}>Instant society queries, rules & operations copilot</Text>
        </View>
      </View>

      {/* Suggested Quick Prompt Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsBar}>
        {PROMPT_CHIPS.map((chip, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.promptChip}
            onPress={() => handleSend(chip)}
          >
            <Text style={styles.promptChipText}>{chip}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Chat Messages Log */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.role === "user" ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                msg.role === "user" ? styles.userText : styles.assistantText,
              ]}
            >
              {msg.content}
            </Text>

            {/* Action Buttons inside Assistant Reply */}
            {msg.suggested_actions && msg.suggested_actions.length > 0 && (
              <View style={styles.actionsBox}>
                {msg.suggested_actions.map((act, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.actionBtn}
                    onPress={() => handleActionClick(act)}
                  >
                    <Text style={styles.actionBtnText}>⚡ {act}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}

        {isThinking && (
          <View style={[styles.messageBubble, styles.assistantBubble]}>
            <Text style={styles.thinkingText}>✨ Thinking & retrieving society guidelines...</Text>
          </View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask about clubhouse, dues, parking, visitors..."
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSend()}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => handleSend()}
            disabled={isThinking}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  aiBadgeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    alignItems: "center",
    justifyContent: "center",
  },
  aiBadgeEmoji: {
    fontSize: 18,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.text,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  chipsBar: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    maxHeight: 50,
  },
  promptChip: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
  },
  promptChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  chatContent: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: "85%",
    borderRadius: 18,
    padding: 14,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 20,
  },
  userText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  assistantText: {
    color: Colors.text,
  },
  thinkingText: {
    fontSize: 12,
    color: "#0284c7",
    fontStyle: "italic",
  },
  actionsBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  actionBtn: {
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0369a1",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.text,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },
  sendButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
});
