import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../../src/context/AuthContext";
import { useMessagingContext } from "../../../src/context/MessagingContext";
import { ChevronLeft, Send, Pin, Lock, MessageCircle } from "lucide-react-native";

export default function SubjectDiscussionsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { getSubjectDiscussions, addDiscussion, addReply, replies, markAsRead } = useMessagingContext();

  const discussions = useMemo(() => {
    if (!id) return [];
    return getSubjectDiscussions(id);
  }, [id, getSubjectDiscussions, replies]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);

  const toggleExpand = (discussionId: string) => {
    setExpandedId(expandedId === discussionId ? null : discussionId);
    if (user?.id) {
      markAsRead(discussionId, user.id);
    }
  };

  const handleSendReply = async (discussionId: string) => {
    if (!replyText.trim() || !user) return;
    try {
      await addReply({
        discussionId,
        authorId: user.id,
        authorName: user.name,
        content: replyText.trim(),
      });
      setReplyText("");
    } catch (e) {
      console.error("Failed to send reply:", e);
    }
  };

  const handleCreateDiscussion = async () => {
    if (!newTitle.trim() || !newContent.trim() || !user || !id) return;
    try {
      const d = await addDiscussion({
        subjectId: id,
        title: newTitle.trim(),
        content: newContent.trim(),
        authorId: user.id,
        authorName: user.name,
        authorRole: user.role || undefined,
        authorAvatar: user.avatarUrl,
        isPinned: false,
        isClosed: false,
        requirePostBeforeView: false,
        isGroup: false,
        allowThreadedReplies: true,
        allowLiking: false,
        readByUsers: [user.id],
        subscribedUserIds: [user.id],
      });
      setNewTitle("");
      setNewContent("");
      setShowNewForm(false);
      setExpandedId(d.id);
    } catch (e) {
      console.error("Failed to create discussion:", e);
    }
  };

  const sortedDiscussions = useMemo(() => {
    return [...discussions].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
  }, [discussions]);

  const getRepliesForDiscussion = (discussionId: string) => {
    return replies.filter((r) => r.discussionId === discussionId);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#fff" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <ChevronLeft color="#1e293b" size={20} />
          <Text style={{ fontSize: 14, color: "#1e293b", marginLeft: 4 }}>Back</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#0f172a" }}>Discussions</Text>
        <Text style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>
          {discussions.length} discussion{discussions.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {sortedDiscussions.length === 0 && (
          <View style={{ padding: 40, alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0" }}>
            <MessageCircle color="#e2e8f0" size={40} style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#94a3b8" }}>No discussions yet</Text>
            <Text style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>Start a conversation about this subject</Text>
          </View>
        )}

        {sortedDiscussions.map((disc) => {
          const discReplies = getRepliesForDiscussion(disc.id);
          const isExpanded = expandedId === disc.id;

          return (
            <View key={disc.id} style={{ marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, overflow: "hidden" }}>
              {/* Discussion Header */}
              <TouchableOpacity onPress={() => toggleExpand(disc.id)} style={{ padding: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  {disc.isPinned && <Pin color="#f59e0b" size={12} />}
                  {disc.isClosed && <Lock color="#ef4444" size={12} />}
                  {disc.isPinned && (
                    <Text style={{ fontSize: 10, fontWeight: "700", color: "#f59e0b", textTransform: "uppercase" }}>Pinned</Text>
                  )}
                </View>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#0f172a", marginBottom: 4 }}>{disc.title}</Text>
                <Text style={{ fontSize: 12, color: "#64748b" }} numberOfLines={isExpanded ? undefined : 2}>{disc.content}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 12 }}>
                  <Text style={{ fontSize: 11, color: "#94a3b8" }}>{disc.authorName}</Text>
                  <Text style={{ fontSize: 11, color: "#cbd5e1" }}>{new Date(disc.createdAt).toLocaleDateString()}</Text>
                  <Text style={{ fontSize: 11, color: "#94a3b8" }}>{discReplies.length} replies</Text>
                </View>
              </TouchableOpacity>

              {/* Expanded: Replies */}
              {isExpanded && (
                <View style={{ borderTopWidth: 1, borderTopColor: "#f1f5f9" }}>
                  {discReplies.map((reply) => (
                    <View key={reply.id} style={{ padding: 12, paddingLeft: 20, borderBottomWidth: 1, borderBottomColor: "#f8fafc" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#334155" }}>{reply.authorName}</Text>
                        <Text style={{ fontSize: 10, color: "#cbd5e1" }}>{new Date(reply.createdAt).toLocaleDateString()}</Text>
                      </View>
                      <Text style={{ fontSize: 13, color: "#475569", lineHeight: 18 }}>{reply.content}</Text>
                    </View>
                  ))}

                  {/* Reply Input */}
                  {!disc.isClosed && (
                    <View style={{ flexDirection: "row", padding: 12, gap: 8, alignItems: "center" }}>
                      <TextInput
                        value={expandedId === disc.id ? replyText : ""}
                        onChangeText={setReplyText}
                        placeholder="Write a reply..."
                        placeholderTextColor="#94a3b8"
                        style={{ flex: 1, backgroundColor: "#f8fafc", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: "#0f172a", borderWidth: 1, borderColor: "#e2e8f0" }}
                        onFocus={() => setExpandedId(disc.id)}
                      />
                      <TouchableOpacity
                        onPress={() => handleSendReply(disc.id)}
                        disabled={!replyText.trim()}
                        style={{ backgroundColor: replyText.trim() ? "#0f172a" : "#e2e8f0", borderRadius: 8, padding: 10 }}
                      >
                        <Send color={replyText.trim() ? "#fff" : "#94a3b8"} size={16} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* New Discussion FAB */}
      <View style={{ position: "absolute", bottom: 24, right: 20, left: 20 }}>
        {showNewForm ? (
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, borderWidth: 1, borderColor: "#e2e8f0" }}>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Discussion title"
              placeholderTextColor="#94a3b8"
              style={{ backgroundColor: "#f8fafc", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontWeight: "600", color: "#0f172a", borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 8 }}
            />
            <TextInput
              value={newContent}
              onChangeText={setNewContent}
              placeholder="What's on your mind?"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              style={{ backgroundColor: "#f8fafc", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: "#0f172a", borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 12, minHeight: 80, textAlignVertical: "top" }}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity onPress={() => setShowNewForm(false)} style={{ flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center", backgroundColor: "#f1f5f9" }}>
                <Text style={{ color: "#64748b", fontWeight: "600", fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateDiscussion}
                disabled={!newTitle.trim() || !newContent.trim()}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center", backgroundColor: newTitle.trim() && newContent.trim() ? "#0f172a" : "#e2e8f0" }}
              >
                <Text style={{ color: newTitle.trim() && newContent.trim() ? "#fff" : "#94a3b8", fontWeight: "600", fontSize: 13 }}>Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setShowNewForm(true)}
            style={{ backgroundColor: "#0f172a", borderRadius: 16, paddingVertical: 16, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 }}
          >
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>+ New Discussion</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
