import React from "react";
import { Tabs } from "expo-router";
import { Colors } from "../../src/theme/colors";

export default function GuardLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: Colors.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Gate Duty",
          tabBarLabel: "Console",
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan QR",
          tabBarLabel: "Scan QR",
        }}
      />
      <Tabs.Screen
        name="walk-in"
        options={{
          title: "Walk-in",
          tabBarLabel: "Walk-in Entry",
        }}
      />
      <Tabs.Screen
        name="inside"
        options={{
          title: "Inside List",
          tabBarLabel: "Inside (18)",
        }}
      />
    </Tabs>
  );
}
