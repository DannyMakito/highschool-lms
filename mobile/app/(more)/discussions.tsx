import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useMessagingContext } from "../../src/context/MessagingContext";
import { Pin, Lock, MessageCircle } from "lucide-react-native";
import { PlaceholderScreen } from "../../components/ui/placeholder-screen";

export default function GlobalDiscussionsScreen() {
  const router = useRouter();
  const { discussions, getSubjectDiscussions } = useMessagingContext();


  const allDiscussions = useMemo(() => {
    return getSubjectDiscussions();
  }, [getSubjectDiscussions, discussions]);

  const sorted = useMemo(() => {
    return [...allDiscussions].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
  }, [allDiscussions]);

  return (
    <PlaceholderScreen title="Discussions" subtitle={`${sorted.length} discussion${sorted.length !== 1 ? "s" : ""}`} icon={MessageCircle}>
      {sorted.length === 0 ? (
        <View style={{ padding: 40, alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0" }}>
          <MessageCircle color="#e2e8f0" size={40} style={{ marginBottom: 12 }} />
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#94a3b8" }}>No discussions yet</Text>
        </View>
      ) : (
        sorted.map((disc) => {
          return (
            <TouchableOpacity 
              key={disc.id} 
              onPress={() => router.push(`/subjects/${disc.subjectId}/discussions/${disc.id}`)}
              style={{ marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, overflow: "hidden" }}
            >
              <View style={{ padding: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  {disc.isPinned && <Pin color="#f59e0b" size={12} />}
                  {disc.isClosed && <Lock color="#ef4444" size={12} />}
                  {disc.isPinned && <Text style={{ fontSize: 10, fontWeight: "700", color: "#f59e0b", textTransform: "uppercase" }}>Pinned</Text>}
                </View>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#0f172a", marginBottom: 4 }}>{disc.title}</Text>
                <Text style={{ fontSize: 12, color: "#64748b" }} numberOfLines={2}>
                  {disc.content?.replace(/<[^>]*>/g, '').substring(0, 120)}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 12 }}>
                  <Text style={{ fontSize: 11, color: "#94a3b8" }}>{disc.authorName}</Text>
                  <Text style={{ fontSize: 11, color: "#cbd5e1" }}>{new Date(disc.createdAt).toLocaleDateString()}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </PlaceholderScreen>
  );
}
