import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, CheckCircle2 } from "lucide-react-native";

export function EmptyCheck({ message }: { message: string }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#ecfdf5", alignItems: "center", justifyContent: "center" }}>
        <CheckCircle2 color="#22c55e" size={36} />
      </View>
      <Text style={{ fontSize: 15, fontWeight: "600", color: "#64748b", marginTop: 16, textAlign: "center", paddingHorizontal: 24 }}>{message}</Text>
    </View>
  );
}

export function PlaceholderScreen({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ color?: string; size?: number }>;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <ChevronLeft color="#1e293b" size={20} />
          <Text style={{ fontSize: 14, color: "#1e293b", marginLeft: 4 }}>Back</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Icon color="#0f172a" size={22} />
          <Text style={{ fontSize: 22, fontWeight: "800", color: "#0f172a" }}>{title}</Text>
        </View>
        {subtitle ? <Text style={{ fontSize: 13, color: "#94a3b8", marginTop: 2, marginLeft: 32 }}>{subtitle}</Text> : null}
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, flexGrow: 1 }}>
        {children}
      </ScrollView>
    </View>
  );
}

export function ComingSoon({ icon: Icon, label }: { icon: React.ComponentType<{ color?: string; size?: number }>; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
      <Icon color="#cbd5e1" size={48} />
      <Text style={{ fontSize: 16, fontWeight: "600", color: "#94a3b8", marginTop: 14 }}>{label}</Text>
      <Text style={{ fontSize: 13, color: "#cbd5e1", marginTop: 4, textAlign: "center" }}>This section is coming soon.</Text>
    </View>
  );
}
