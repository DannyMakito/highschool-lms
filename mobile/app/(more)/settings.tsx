import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import {
  ChevronLeft,
  MoreVertical,
  User,
  Settings,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const menuItems = [
    { icon: User, label: "Edit Profile", onPress: () => {} },
    { icon: Settings, label: "Account Settings", onPress: () => {} },
    { icon: Bell, label: "Notification Preferences", onPress: () => {} },
    { icon: Shield, label: "Privacy & Security", onPress: () => {} },
    { icon: HelpCircle, label: "Help & Support", onPress: () => {} },
  ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft color="#0f172a" size={24} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#0f172a" }}>Profile</Text>
        <TouchableOpacity>
          <MoreVertical color="#0f172a" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        <View style={{ alignItems: "center", paddingTop: 24, paddingBottom: 32 }}>
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: "#f1f5f9",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              overflow: "hidden",
            }}
          >
            {user?.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={{ width: 100, height: 100, borderRadius: 50 }}
              />
            ) : (
              <Text style={{ fontSize: 40, fontWeight: "600", color: "#94a3b8" }}>
                {(user?.name || "U").charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={{ fontSize: 22, fontWeight: "700", color: "#0f172a", marginBottom: 4 }}>
            {user?.name || "User"}
          </Text>
          <Text style={{ fontSize: 14, color: "#64748b" }}>
            {user?.email || "No email"}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={item.onPress}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#f1f5f9",
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "#f8fafc",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 14,
                }}
              >
                <item.icon color="#475569" size={18} />
              </View>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: "#0f172a" }}>
                {item.label}
              </Text>
              <ChevronRight color="#cbd5e1" size={18} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 16,
              borderTopWidth: 1,
              borderTopColor: "#f1f5f9",
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#fef2f2",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <LogOut color="#ef4444" size={18} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "500", color: "#ef4444" }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
