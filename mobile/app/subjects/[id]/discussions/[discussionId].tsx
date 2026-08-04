import React, { useState, useMemo, useEffect, useCallback, useRef, memo } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMessagingContext } from "../../../../src/context/MessagingContext";
import { useAuth } from "../../../../src/context/AuthContext";
import {
  ChevronLeft,
  MessageSquare,
  Pin,
  Lock,
  ThumbsUp,
  MessageCircle,
  Bell,
  BellOff,
  Send,
} from "lucide-react-native";
import { format, formatDistanceToNow } from "date-fns";
import HtmlRenderer from "../../../../src/components/HtmlRenderer";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ReplyItemProps {
  reply: any;
  depth: number;
  discussionReplies: any[];
  user: any;
  onToggleLike: (replyId: string) => void;
  onReplyClick: (replyId: string) => void;
}

const ReplyItem = memo(function ReplyItem({
  reply,
  depth,
  discussionReplies,
  user,
  onToggleLike,
  onReplyClick,
}: ReplyItemProps) {
  const childReplies = discussionReplies.filter((r) => r.parentId === reply.id);
  const hasLiked = user && reply.likes?.includes(user.id);
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <View style={{ marginLeft: depth * 36, paddingVertical: 12, paddingHorizontal: 16 }}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: "#262626",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748b" }}>
            {(reply.authorName || "?").charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#0f172a" }}>
            {reply.authorName || "Unknown"}
            <Text style={{ fontSize: 12, fontWeight: "400", color: "#64748b" }}>
              {"  "}
              {reply.createdAt
                ? formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })
                : ""}
            </Text>
          </Text>

          <View style={{ marginTop: 4 }}>
            <HtmlRenderer
              html={reply.content}
              baseTextStyle={{ color: "#334155", fontSize: 14, lineHeight: 20 }}
            />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginTop: 10 }}>
            <TouchableOpacity
              onPress={() => onToggleLike(reply.id)}
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <ThumbsUp
                color={hasLiked ? "#ef4444" : "#64748b"}
                size={14}
                fill={hasLiked ? "#ef4444" : "transparent"}
              />
              <Text style={{ fontSize: 12, color: hasLiked ? "#ef4444" : "#64748b" }}>
                {reply.likes?.length || 0}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => onReplyClick(reply.id)}>
              <Text style={{ fontSize: 12, color: "#64748b", fontWeight: "600" }}>Reply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {childReplies.length > 0 && (
        <View>
          {isExpanded ? (
            <>
              {childReplies.map((child) => (
                <ReplyItem
                  key={child.id}
                  reply={child}
                  depth={depth + 1}
                  discussionReplies={discussionReplies}
                  user={user}
                  onToggleLike={onToggleLike}
                  onReplyClick={onReplyClick}
                />
              ))}
              <TouchableOpacity
                onPress={() => setIsExpanded(false)}
                style={{ marginLeft: depth * 36 + 44, paddingVertical: 4 }}
              >
                <Text style={{ fontSize: 12, color: "#64748b", fontWeight: "500" }}>
                  Hide replies
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              onPress={() => setIsExpanded(true)}
              style={{
                marginLeft: depth * 36 + 44,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingVertical: 8,
              }}
            >
              <View style={{ width: 24, height: 1, backgroundColor: "#e2e8f0" }} />
              <Text style={{ fontSize: 12, color: "#64748b", fontWeight: "500" }}>
                {childReplies.length} {childReplies.length === 1 ? "reply" : "replies"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
});

export default function DiscussionDetailScreen() {
  const router = useRouter();
  const { id: subjectId, discussionId } = useLocalSearchParams<{ id: string; discussionId: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const {
    discussions,
    replies,
    loading,
    addReply,
    toggleLike,
    markAsRead,
    toggleSubscription,
  } = useMessagingContext();

  const [replyContent, setReplyContent] = useState("");
  const [parentReplyId, setParentReplyId] = useState<string | null>(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const replyInputRef = useRef<TextInput>(null);

  const discussion = useMemo(
    () => discussions.find((d) => d.id === discussionId),
    [discussions, discussionId]
  );

  const discussionReplies = useMemo(
    () => replies.filter((r) => r.discussionId === discussionId),
    [replies, discussionId]
  );

  const hasPosted = useMemo(() => {
    if (!user) return false;
    return discussionReplies.some((r) => r.authorId === user.id);
  }, [user, discussionReplies]);

  const showReplies = !discussion?.requirePostBeforeView || hasPosted;

  const rootReplies = useMemo(
    () => discussionReplies.filter((r) => !r.parentId),
    [discussionReplies]
  );

  useEffect(() => {
    if (user?.id && discussionId) {
      markAsRead(discussionId, user.id);
    }
  }, [discussionId, user?.id]);

  useEffect(() => {
    if (discussion && user) {
      setIsSubscribed(discussion.subscribedUserIds?.includes(user.id) || false);
    }
  }, [discussion, user]);

  const handlePostReply = useCallback(
    async () => {
      const content = replyContent;
      if (!content?.trim()) {
        Alert.alert("Error", "Please write something to reply.");
        return;
      }
      if (!user?.id) {
        Alert.alert("Error", "You must be logged in to reply.");
        return;
      }

      setSendingReply(true);
      try {
        await addReply({
          discussionId: discussionId || "",
          parentId: parentReplyId,
          content: content.trim(),
          authorId: user.id,
          authorName: user.name || "Student",
          authorAvatar: user.avatarUrl,
          readByUsers: [],
        });
        setReplyContent("");
        setParentReplyId(null);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
      } catch (error: any) {
        Alert.alert("Error", error?.message || "Failed to post reply.");
      } finally {
        setSendingReply(false);
      }
    },
    [replyContent, discussionId, user, addReply, parentReplyId]
  );

  const handleToggleLike = useCallback(
    async (replyId: string) => {
      if (!user?.id) {
        Alert.alert("Error", "Please log in to like.");
        return;
      }
      try {
        await toggleLike(replyId, user.id);
      } catch (error: any) {
        Alert.alert("Error", error?.message || "Failed to toggle like.");
      }
    },
    [toggleLike, user]
  );

  const handleToggleSubscription = useCallback(async () => {
    if (!user?.id || !discussionId) return;
    try {
      await toggleSubscription(discussionId, user.id);
      setIsSubscribed(!isSubscribed);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to update subscription.");
    }
  }, [toggleSubscription, discussionId, user, isSubscribed]);

  const handleReplyClick = useCallback((replyId: string) => {
    const reply = discussionReplies.find((r) => r.id === replyId);
    if (!reply) return;
    setParentReplyId(replyId);
    setReplyContent(`@${reply.authorName} `);
    replyInputRef.current?.focus();
  }, [discussionReplies]);

  const renderDiscussionPost = () => {
    if (!discussion) return null;

    return (
      <View style={{ paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#f1f5f9",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#64748b" }}>
              {(discussion.authorName || "?").charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#0f172a" }}>
              {discussion.authorName || "Unknown"}
              <Text style={{ fontSize: 12, fontWeight: "400", color: "#64748b" }}>
                {"  "}
                {discussion.createdAt
                  ? format(new Date(discussion.createdAt), "MMM d, yyyy")
                  : ""}
              </Text>
            </Text>

            <Text style={{ fontSize: 16, fontWeight: "700", color: "#0f172a", marginTop: 8, marginBottom: 6 }}>
              {discussion.title}
            </Text>

            <View style={{ marginBottom: 4 }}>
              <HtmlRenderer
                html={discussion.content}
                baseTextStyle={{ color: "#334155", fontSize: 14, lineHeight: 20 }}
              />
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <MessageSquare color="#64748b" size={14} />
                <Text style={{ fontSize: 12, color: "#64748b" }}>
                  {discussionReplies.length} {discussionReplies.length === 1 ? "reply" : "replies"}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleToggleSubscription}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                {isSubscribed ? (
                  <BellOff color="#f59e0b" size={14} />
                ) : (
                  <Bell color="#64748b" size={14} />
                )}
                <Text style={{ fontSize: 12, color: isSubscribed ? "#f59e0b" : "#64748b" }}>
                  {isSubscribed ? "Subscribed" : "Notify"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {discussion.isPinned && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#fef3c7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                  <Pin color="#f59e0b" size={10} />
                  <Text style={{ fontSize: 10, fontWeight: "600", color: "#f59e0b" }}>Pinned</Text>
                </View>
              )}
              {discussion.isClosed && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#fee2e2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                  <Lock color="#ef4444" size={10} />
                  <Text style={{ fontSize: 10, fontWeight: "600", color: "#ef4444" }}>Closed</Text>
                </View>
              )}
              {discussion.requirePostBeforeView && (
                <View style={{ backgroundColor: "#eff6ff", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                  <Text style={{ fontSize: 10, color: "#3b82f6" }}>Post to view</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderReplyItem = ({ item }: { item: any }) => (
    <ReplyItem
      reply={item}
      depth={0}
      discussionReplies={discussionReplies}
      user={user}
      onToggleLike={handleToggleLike}
      onReplyClick={handleReplyClick}
    />
  );

  const keyExtractor = (item: any) => item.id;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!discussion) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" }}>
        <MessageSquare color="#94a3b8" size={48} />
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#64748b", marginTop: 12 }}>
          Discussion not found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 16, backgroundColor: "#f1f5f9", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
        >
          <Text style={{ fontSize: 14, color: "#0f172a", fontWeight: "600" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#e2e8f0",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center" }}>
            <ChevronLeft color="#0f172a" size={24} />
            <Text style={{ fontSize: 16, color: "#0f172a", marginLeft: 4, fontWeight: "500" }}>Back</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#0f172a" }}>Discussion</Text>
          <View style={{ width: 60 }} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 44 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={rootReplies}
          renderItem={renderReplyItem}
          keyExtractor={keyExtractor}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={renderDiscussionPost}
          ListEmptyComponent={
            showReplies ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <Text style={{ fontSize: 14, color: "#64748b" }}>No replies yet. Be the first to respond!</Text>
              </View>
            ) : (
              <View style={{ padding: 40, alignItems: "center" }}>
                <MessageSquare color="#94a3b8" size={32} />
                <Text style={{ fontSize: 14, color: "#64748b", marginTop: 12, textAlign: "center" }}>
                  Replies are hidden until you post your own response.
                </Text>
              </View>
            )
          }
        />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 16,
            paddingVertical: 10,
            paddingBottom: insets.bottom + 10,
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderTopColor: "#e2e8f0",
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "#f1f5f9",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748b" }}>
              {(user?.name || "U").charAt(0).toUpperCase()}
            </Text>
          </View>

          <TextInput
            ref={replyInputRef}
            style={{
              flex: 1,
              backgroundColor: "#f8fafc",
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "#e2e8f0",
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 14,
              color: "#0f172a",
              maxHeight: 100,
            }}
            placeholder="Add a comment..."
            placeholderTextColor="#94a3b8"
            value={replyContent}
            onChangeText={setReplyContent}
            multiline
          />

          <TouchableOpacity
            onPress={() => handlePostReply()}
            disabled={sendingReply || !replyContent.trim()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: replyContent.trim() ? "#3b82f6" : "#f1f5f9",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {sendingReply ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send color={replyContent.trim() ? "#fff" : "#94a3b8"} size={16} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}