import React from "react";
import { Tabs } from "expo-router";
import { Colors } from "../../src/theme/colors";
import {
  GuardConsoleIcon,
  GuardScanTabIcon,
  GuardWalkInIcon,
  GuardInsideIcon,
} from "../../src/components/icons/TabIcons";

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
          tabBarIcon: ({ color, focused }) => (
            <GuardConsoleIcon color={String(color)} size={22} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan QR",
          tabBarLabel: "Scan QR",
          tabBarIcon: ({ color, focused }) => (
            <GuardScanTabIcon color={String(color)} size={22} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="walk-in"
        options={{
          title: "Walk-in",
          tabBarLabel: "Walk-in Entry",
          tabBarIcon: ({ color, focused }) => (
            <GuardWalkInIcon color={String(color)} size={22} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="inside"
        options={{
          title: "Inside List",
          tabBarLabel: "Inside Registry",
          tabBarIcon: ({ color, focused }) => (
            <GuardInsideIcon color={String(color)} size={22} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
