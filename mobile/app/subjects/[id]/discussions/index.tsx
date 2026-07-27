import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMessagingContext } from "../../../../src/context/MessagingContext";
import { useAuth } from "../../../../src/context/AuthContext";
import {
  MessageSquare,
  Pin,
  Lock,
  Plus,
  Search,
  MessageCircle,
  ChevronRight,
  Bell,
  CheckCircle2,
  Filter,
} from "lucide-react-native";
import { format, formatDistanceToNow } from "date-fns";

export default function SubjectDiscussionsScreen() {
  const router = useRouter();
  const { id: subjectId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { discussions, replies, loading, getSubjectDiscussions } = useMessagingContext();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const subjectDiscussions = useMemo(() => {
    return getSubjectDiscussions(subjectId);
  }, [getSubjectDiscussions, subjectId, discussions]);

  const getRepliesCount = useCallback(
    (discussionId: string) => {
      return replies.filter((r) => r.discussionId === discussionId).length;
    },
    [replies]
  );

  const getUnreadRepliesCount = useCallback(
    (discussionId: string) => {
      if (!user) return 0;
      return replies.filter(
        (r) => r.discussionId === discussionId && !r.readByUsers.includes(user.id)
      ).length;
    },
    [replies, user]
  );

  const isDiscussionUnread = useCallback(
    (discussionId: string) => {
      if (!user) return false;
      const disc = subjectDiscussions.find((d) => d.id === discussionId);
      if (!disc) return false;
      return !disc.readByUsers?.includes(user.id) || getUnreadRepliesCount(discussionId) > 0;
    },
    [user, subjectDiscussions, getUnreadRepliesCount]
  );

  const filteredDiscussions = useMemo(() => {
    let filtered = subjectDiscussions.filter((d) => !d.isDeleted);

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.content.toLowerCase().includes(q) ||
          d.authorName?.toLowerCase().includes(q)
      );
    }

    if (showUnreadOnly) {
      filtered = filtered.filter((d) => isDiscussionUnread(d.id));
    }

    // Sort: pinned first, then by updatedAt descending
    return [...filtered].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime()
      );
    });
  }, [subjectDiscussions, search, showUnreadOnly, isDiscussionUnread]);

  const pinnedDiscussions = useMemo(
    () => filteredDiscussions.filter((d) => d.isPinned && !d.isClosed),
    [filteredDiscussions]
  );

  const activeDiscussions = useMemo(
    () => filteredDiscussions.filter((d) => !d.isPinned && !d.isClosed),
    [filteredDiscussions]
  );

  const closedDiscussions = useMemo(
    () => filteredDiscussions.filter((d) => d.isClosed),
    [filteredDiscussions]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // MessagingContext handles real-time updates automatically
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ color: "#64748b", marginTop: 12, fontSize: 14 }}>Loading discussions...</Text>
      </View>
    );
  }

  const DiscussionCard = ({ discussion }: { discussion: any }) => {
    const unreadCount = getUnreadRepliesCount(discussion.id);
    const totalReplies = getRepliesCount(discussion.id);
    const isUnread = isDiscussionUnread(discussion.id);

    return (
      <TouchableOpacity
        onPress={() =>
          router.push(`/subjects/${subjectId}/discussions/${discussion.id}`)
        }
        style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: isUnread ? "#bfdbfe" : "#e2e8f0",
          marginBottom: 10,
          padding: 14,
          overflow: "hidden",
        }}
      >
        {/* Badges row */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
          {discussion.isPinned && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Pin color="#f59e0b" size={12} />
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#f59e0b", textTransform: "uppercase" }}>Pinned</Text>
            </View>
          )}
          {discussion.isClosed && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Lock color="#ef4444" size={12} />
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#ef4444", textTransform: "uppercase" }}>Closed</Text>
            </View>
          )}
          {discussion.subjectClassId && (
            <View style={{ backgroundColor: "#f1f5f9", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, fontWeight: "600", color: "#64748b" }}>{discussion.subjectClassId.slice(0, 8)}</Text>
            </View>
          )}
          {discussion.requirePostBeforeView && (
            <View style={{ backgroundColor: "#eff6ff", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, color: "#3b82f6" }}>Post to view</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          {isUnread && (
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#3b82f6", marginTop: 6, marginRight: 8 }} />
          )}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: "#0f172a",
                marginBottom: 4,
              }}
              numberOfLines={2}
            >
              {discussion.title}
            </Text>
          </View>
        </View>

        {/* Content preview */}
        <Text
          style={{ fontSize: 13, color: "#64748b", lineHeight: 18, marginBottom: 8 }}
          numberOfLines={2}
        >
          {discussion.content?.replace(/<[^>]*>/g, "").substring(0, 120)}
        </Text>

        {/* Meta row */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: "#334155" }}>
              {discussion.authorName || "Unknown"}
            </Text>
            <Text style={{ fontSize: 10, color: "#94a3b8" }}>
              {discussion.createdAt
                ? formatDistanceToNow(new Date(discussion.createdAt), { addSuffix: true })
                : ""}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <MessageCircle color={totalReplies > 0 ? "#64748b" : "#cbd5e1"} size={13} />
            <Text style={{ fontSize: 12, color: totalReplies > 0 ? "#64748b" : "#cbd5e1", fontWeight: "600" }}>
              {totalReplies}
            </Text>
            {unreadCount > 0 && (
              <View style={{ backgroundColor: "#3b82f6", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 10, color: "#fff", fontWeight: "700" }}>{unreadCount}</Text>
              </View>
            )}
            {discussion.subscribedUserIds?.includes(user?.id || "") && (
              <Bell color="#f59e0b" size={12} />
            )}
          </View>
        </View>

        {/* Available until warning */}
        {discussion.availableUntil && new Date(discussion.availableUntil) < new Date() && (
          <View style={{ marginTop: 8, backgroundColor: "#fef2f2", borderRadius: 6, padding: 6 }}>
            <Text style={{ fontSize: 11, color: "#ef4444", textAlign: "center" }}>
              Available until {format(new Date(discussion.availableUntil), "MMM d, yyyy")}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSection = (title: string, discussions: any[], color: string) => {
    if (discussions.length === 0) return null;
    return (
      <View style={{ marginBottom: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginBottom: 8,
            paddingHorizontal: 2,
          }}
        >
          <View style={{ width: 3, height: 16, backgroundColor: color, borderRadius: 2 }} />
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: 0.5 }}>
            {title}
          </Text>
          <Text style={{ fontSize: 12, color: "#94a3b8" }}>({discussions.length})</Text>
        </View>
        {discussions.map((d) => (
          <DiscussionCard key={d.id} discussion={d} />
        ))}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: 56,
          paddingHorizontal: 20,
          paddingBottom: 12,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#f1f5f9",
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <ChevronRight color="#1e293b" size={20} style={{ transform: [{ rotate: "180deg" }] }} />
          <Text style={{ fontSize: 14, color: "#1e293b", marginLeft: 4 }}>Back</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <MessageSquare color="#0f172a" size={22} />
          <Text style={{ fontSize: 22, fontWeight: "800", color: "#0f172a" }}>Discussions</Text>
          <Text style={{ fontSize: 13, color: "#94a3b8", marginLeft: 4 }}>
            ({subjectDiscussions.filter((d) => !d.isDeleted).length})
          </Text>
        </View>
      </View>

      {/* Search & Filter */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#fff" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#f1f5f9",
            borderRadius: 10,
            paddingHorizontal: 12,
            height: 40,
          }}
        >
          <Search color="#94a3b8" size={16} />
          <TextInput
            style={{ flex: 1, fontSize: 14, color: "#0f172a", marginLeft: 8 }}
            placeholder="Search discussions..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity
            onPress={() => setShowUnreadOnly(!showUnreadOnly)}
            style={{
              padding: 6,
              borderRadius: 6,
              backgroundColor: showUnreadOnly ? "#dbeafe" : "transparent",
            }}
          >
            <Filter color={showUnreadOnly ? "#3b82f6" : "#94a3b8"} size={16} />
          </TouchableOpacity>
        </View>
        {showUnreadOnly && (
          <Text style={{ fontSize: 11, color: "#3b82f6", marginTop: 4, marginLeft: 4 }}>
            Showing unread discussions only
          </Text>
        )}
      </View>

      {/* Discussion List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
      >
        {filteredDiscussions.length === 0 && !loading ? (
          <View style={{ padding: 60, alignItems: "center" }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "#f1f5f9",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <MessageSquare color="#cbd5e1" size={36} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#94a3b8", marginBottom: 6 }}>
              {search || showUnreadOnly ? "No matching discussions" : "No discussions yet"}
            </Text>
            <Text style={{ fontSize: 13, color: "#cbd5e1", textAlign: "center", lineHeight: 20 }}>
              {search || showUnreadOnly
                ? "Try adjusting your search or filter."
                : "Start a conversation! Create the first discussion for this subject."}
            </Text>
          </View>
        ) : (
          <>
            {renderSection("Pinned", pinnedDiscussions, "#f59e0b")}
            {renderSection("Discussions", activeDiscussions, "#3b82f6")}
            {renderSection("Closed for Comments", closedDiscussions, "#ef4444")}
          </>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() => router.push(`/subjects/${subjectId}/discussions/create`)}
        style={{
          position: "absolute",
          right: 20,
          bottom: 30,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: "#3b82f6",
          alignItems: "center",
          justifyContent: "center",
          elevation: 4,
          shadowColor: "#3b82f6",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
        }}
      >
        <Plus color="#fff" size={24} />
      </TouchableOpacity>
    </View>
  );
}
