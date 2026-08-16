import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { Megaphone } from "lucide-react-native";
import { useMessagingContext } from "../../src/context/MessagingContext";
import { PlaceholderScreen, EmptyCheck } from "../../components/ui/placeholder-screen";

export default function AnnouncementsScreen() {
  const { announcements } = useMessagingContext();

  const sorted = useMemo(() => {
    return [...announcements].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [announcements]);

  return (
    <PlaceholderScreen title="Announcements" subtitle={`${sorted.length} announcement${sorted.length !== 1 ? "s" : ""}`} icon={Megaphone}>
      {sorted.length === 0 ? (
        <EmptyCheck message="No announcement available" />
      ) : (
        sorted.map((a) => (
          <View key={a.id} style={{ marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 16, backgroundColor: "#fffdf5" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Megaphone color="#f59e0b" size={16} />
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#0f172a", flex: 1 }}>{a.title}</Text>
            </View>
            <Text style={{ fontSize: 13, color: "#475569", lineHeight: 19 }}>{a.content}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 12 }}>
              <Text style={{ fontSize: 11, color: "#94a3b8" }}>{a.authorName}</Text>
              <Text style={{ fontSize: 11, color: "#cbd5e1" }}>{new Date(a.createdAt).toLocaleDateString()}</Text>
            </View>
          </View>
        ))
      )}
    </PlaceholderScreen>
  );
}
