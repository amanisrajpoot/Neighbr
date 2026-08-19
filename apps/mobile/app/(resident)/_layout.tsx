import React from "react";
import { Tabs } from "expo-router";
import { View, Text } from "react-native";
import { Colors } from "../../src/theme/colors";

export default function ResidentLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: Colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
        }}
      />
      <Tabs.Screen
        name="visitors"
        options={{
          title: "Visitors",
          tabBarLabel: "Visitors",
        }}
      />
      <Tabs.Screen
        name="notices"
        options={{
          title: "Notices",
          tabBarLabel: "Notices",
        }}
      />
      <Tabs.Screen
        name="staff"
        options={{
          title: "Daily Help",
          tabBarLabel: "Daily Help",
        }}
      />
      <Tabs.Screen
        name="create-pass"
        options={{
          href: null, // Hidden from tab bar, accessed via quick action
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          href: null, // Hidden from tab bar, accessed via quick action
        }}
      />
      <Tabs.Screen
        name="helpdesk"
        options={{
          href: null, // Hidden from tab bar, accessed via quick action
        }}
      />
      <Tabs.Screen
        name="amenities"
        options={{
          href: null, // Hidden from tab bar, accessed via quick action
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          href: null, // Hidden from tab bar, accessed via quick action
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          href: null, // Hidden from tab bar, accessed via quick action
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          href: null, // Hidden from tab bar, accessed via quick action
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          href: null, // Hidden from tab bar, accessed via quick action
        }}
      />
    </Tabs>
  );
}
