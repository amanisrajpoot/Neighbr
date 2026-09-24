import React from "react";
import Svg, { Path, Rect, Circle, G } from "react-native-svg";

interface IconProps {
  color?: string;
  size?: number;
  focused?: boolean;
}

// ---------------- RESIDENT TAB ICONS ----------------

export function HomeTabIcon({ color = "#64748b", size = 22, focused }: IconProps) {
  const c = color || "#64748b";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.182V20a1 1 0 001 1h5v-5a1 1 0 011-1h4a1 1 0 011 1v5h5a1 1 0 001-1v-9.818a1 1 0 00-.39-.793l-7-5.444a1 1 0 00-1.22 0l-7 5.444a1 1 0 00-.39.793z"
        stroke={c}
        strokeWidth={focused ? "2.4" : "1.8"}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={focused ? `${c}18` : "none"}
      />
    </Svg>
  );
}

export function GateTabIcon({ color = "#64748b", size = 22, focused }: IconProps) {
  const c = color || "#64748b";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"
        stroke={c}
        strokeWidth={focused ? "2.4" : "1.8"}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={focused ? `${c}18` : "none"}
      />
      <Path
        d="M9 12l2 2 4-4"
        stroke={c}
        strokeWidth={focused ? "2.4" : "2"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CommunityTabIcon({ color = "#64748b", size = 22, focused }: IconProps) {
  const c = color || "#64748b";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
        stroke={c}
        strokeWidth={focused ? "2.4" : "1.8"}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={focused ? `${c}18` : "none"}
      />
      <Circle cx="8.5" cy="11.5" r="1" fill={c} />
      <Circle cx="12" cy="11.5" r="1" fill={c} />
      <Circle cx="15.5" cy="11.5" r="1" fill={c} />
    </Svg>
  );
}

export function ServicesTabIcon({ color = "#64748b", size = 22, focused }: IconProps) {
  const c = color || "#64748b";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l2.4 7.2h7.6l-6.1 4.5 2.3 7.3-6.2-4.5-6.2 4.5 2.3-7.3-6.1-4.5h7.6L12 2z"
        stroke={c}
        strokeWidth={focused ? "2.4" : "1.8"}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={focused ? `${c}18` : "none"}
      />
    </Svg>
  );
}

export function FlatTabIcon({ color = "#64748b", size = 22, focused }: IconProps) {
  const c = color || "#64748b";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="4"
        y="3"
        width="16"
        height="18"
        rx="2"
        stroke={c}
        strokeWidth={focused ? "2.4" : "1.8"}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={focused ? `${c}18` : "none"}
      />
      <Path
        d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path
        d="M10 21v-3h4v3"
        stroke={c}
        strokeWidth={focused ? "2.4" : "1.8"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ---------------- GUARD TAB ICONS ----------------

export function GuardConsoleIcon({ color = "#64748b", size = 22, focused }: IconProps) {
  const c = color || "#64748b";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="3"
        width="7"
        height="7"
        rx="1.5"
        stroke={c}
        strokeWidth={focused ? "2.4" : "1.8"}
        fill={focused ? c : "none"}
      />
      <Rect
        x="14"
        y="3"
        width="7"
        height="7"
        rx="1.5"
        stroke={c}
        strokeWidth={focused ? "2.4" : "1.8"}
        fill={focused ? c : "none"}
      />
      <Rect
        x="3"
        y="14"
        width="7"
        height="7"
        rx="1.5"
        stroke={c}
        strokeWidth={focused ? "2.4" : "1.8"}
        fill={focused ? c : "none"}
      />
      <Rect
        x="14"
        y="14"
        width="7"
        height="7"
        rx="1.5"
        stroke={c}
        strokeWidth={focused ? "2.4" : "1.8"}
        fill={focused ? c : "none"}
      />
    </Svg>
  );
}

export function GuardScanTabIcon({ color = "#64748b", size = 22, focused }: IconProps) {
  const c = color || "#64748b";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Viewfinder Corners */}
      <Path
        d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M4 16v3a1 1 0 001 1h3M16 20h3a1 1 0 001-1v-3"
        stroke={c}
        strokeWidth={focused ? "2.5" : "2"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* QR Center Mini-Matrix */}
      <Rect x="8" y="8" width="3" height="3" fill={c} rx="0.5" />
      <Rect x="13" y="8" width="3" height="3" fill={c} rx="0.5" />
      <Rect x="8" y="13" width="3" height="3" fill={c} rx="0.5" />
      <Rect x="13" y="13" width="3" height="3" fill={c} rx="0.5" />
    </Svg>
  );
}

export function GuardWalkInIcon({ color = "#64748b", size = 22, focused }: IconProps) {
  const c = color || "#64748b";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
        stroke={c}
        strokeWidth={focused ? "2.4" : "1.8"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx="8.5"
        cy="7"
        r="4"
        stroke={c}
        strokeWidth={focused ? "2.4" : "1.8"}
        fill={focused ? `${c}18` : "none"}
      />
      <Path
        d="M19 8v6M16 11h6"
        stroke={c}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function GuardInsideIcon({ color = "#64748b", size = 22, focused }: IconProps) {
  const c = color || "#64748b";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 21v-2a4 4 0 00-3-3.87M9 21v-2a4 4 0 013-3.87"
        stroke={c}
        strokeWidth={focused ? "2.4" : "1.8"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        stroke={c}
        strokeWidth={focused ? "2.4" : "1.8"}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={focused ? `${c}18` : "none"}
      />
      <Circle cx="17.5" cy="8.5" r="2.5" stroke={c} strokeWidth="1.5" />
    </Svg>
  );
}
