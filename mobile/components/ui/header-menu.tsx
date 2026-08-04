import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, StatusBar } from "react-native";
import { Link } from "expo-router";
import { MoreVertical, ClipboardList, UserPlus, Bell, MessageCircle, Megaphone, Settings } from "lucide-react-native";

const MENU_ITEMS = [
  { key: "quiz", label: "Quiz", icon: ClipboardList, route: "/quiz" },
  { key: "register", label: "Register", icon: UserPlus, route: "/register" },
  { key: "notification", label: "Notification", icon: Bell, route: "/notifications" },
  { key: "discussions", label: "Discussions", icon: MessageCircle, route: "/discussions" },
  { key: "announcements", label: "Announcements", icon: Megaphone, route: "/announcements" },
  { key: "settings", label: "Settings", icon: Settings, route: "/settings" },
];

export function HeaderMenu() {
  const [visible, setVisible] = useState(false);

  const top = (StatusBar.currentHeight || 0) + 50;

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={{ marginRight: 16, padding: 4 }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MoreVertical color="#fff" size={22} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.35)" }}>
            <View
              style={{
                position: "absolute",
                top,
                right: 12,
                backgroundColor: "#fff",
                borderRadius: 14,
                paddingVertical: 6,
                minWidth: 190,
                shadowColor: "#000",
                shadowOpacity: 0.22,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
                elevation: 10,
              }}
            >
              {MENU_ITEMS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Link key={item.key} href={item.route} asChild>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setVisible(false)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderTopWidth: idx === 0 ? 0 : 1,
                        borderTopColor: "#f1f5f9",
                      }}
                    >
                      <Icon color="#475569" size={18} />
                      <Text style={{ fontSize: 14, color: "#1e293b", fontWeight: "500" }}>{item.label}</Text>
                    </TouchableOpacity>
                  </Link>
                );
              })}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}
