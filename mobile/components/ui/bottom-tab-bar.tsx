import React from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { Home, BookOpen, FileText, Sparkles } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const tabs = [
  { name: "(tabs)", label: "Dashboard", icon: Home },
  { name: "(tabs)/subjects", label: "Subjects", icon: BookOpen },
  { name: "(tabs)/assignments", label: "Assignments", icon: FileText },
  { name: "(tabs)/tutor", label: "AI Tutor", icon: Sparkles },
];

export function BottomTabBar() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  const activeTab = (() => {
    const first = segments[0] || "";
    if (first === "subjects") return "(tabs)/subjects";
    if (first === "(more)") {
      const sub = segments[1] || "";
      if (sub === "discussions") return "(tabs)/subjects";
      return "(tabs)";
    }
    if (first === "(tabs)") {
      const sub = segments[1] || "index";
      if (sub === "subjects") return "(tabs)/subjects";
      if (sub === "assignments") return "(tabs)/assignments";
      if (sub === "tutor") return "(tabs)/tutor";
      return "(tabs)";
    }
    return "(tabs)";
  })();

  return (
    <View style={{ flexDirection: "row", backgroundColor: "#0f172a", borderTopWidth: 1, borderTopColor: "#1e293b", paddingBottom: insets.bottom + 8, paddingTop: 8 }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.name;
        const Icon = tab.icon;
        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => router.push(`/${tab.name}` as any)}
            style={{ flex: 1, alignItems: "center", gap: 4 }}
          >
            <Icon color={isActive ? "#3b82f6" : "#64748b"} size={20} />
            <Text style={{ fontSize: 10, fontWeight: "600", color: isActive ? "#3b82f6" : "#64748b" }}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
