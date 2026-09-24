import React from "react";
import { Tabs } from "expo-router";
import { Colors } from "../../src/theme/colors";
import {
  HomeTabIcon,
  GateTabIcon,
  CommunityTabIcon,
  ServicesTabIcon,
  FlatTabIcon,
} from "../../src/components/icons/TabIcons";

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
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, focused }) => (
            <HomeTabIcon color={String(color)} size={22} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="visitors"
        options={{
          title: "My Gate",
          tabBarLabel: "My Gate",
          tabBarIcon: ({ color, focused }) => (
            <GateTabIcon color={String(color)} size={22} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarLabel: "Community",
          tabBarIcon: ({ color, focused }) => (
            <CommunityTabIcon color={String(color)} size={22} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="amenities"
        options={{
          title: "Services",
          tabBarLabel: "Services",
          tabBarIcon: ({ color, focused }) => (
            <ServicesTabIcon color={String(color)} size={22} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: "My Flat",
          tabBarLabel: "My Flat",
          tabBarIcon: ({ color, focused }) => (
            <FlatTabIcon color={String(color)} size={22} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="notices"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="staff"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="create-pass"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="helpdesk"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
