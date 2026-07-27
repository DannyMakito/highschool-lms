import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMessagingContext } from "../../../../src/context/MessagingContext";
import { useAuth } from "../../../../src/context/AuthContext";
import {
  ChevronLeft,
  Save,
  MessageSquare,
  Eye,
  Heart,
  MessageCircle,
} from "lucide-react-native";

export default function CreateDiscussionScreen() {
  const router = useRouter();
  const { id: subjectId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { addDiscussion } = useMessagingContext();
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [availableFrom, setAvailableFrom] = useState(new Date().toISOString().split("T")[0]);
  const [availableUntil, setAvailableUntil] = useState("");
  const [requirePostBeforeView, setRequirePostBeforeView] = useState(false);
  const [allowThreadedReplies, setAllowThreadedReplies] = useState(true);
  const [allowLiking, setAllowLiking] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Validation", "Please enter a discussion title.");
      return;
    }
    if (!content.trim()) {
      Alert.alert("Validation", "Please enter discussion content.");
      return;
    }
    if (!user?.id) {
      Alert.alert("Error", "You must be logged in to create a discussion.");
      return;
    }

    setSaving(true);
    try {
      await addDiscussion({
        subjectId: subjectId || "",
        title: title.trim(),
        content: content.trim(),
        authorId: user.id,
        authorName: user.name || "Student",
        authorAvatar: user.avatarUrl,
        isPinned: false,
        isClosed: false,
        requirePostBeforeView,
        allowThreadedReplies,
        allowLiking,
        teacherOnly: false,
        isGroup: false,
        availableFrom: new Date(availableFrom).toISOString(),
        availableUntil: availableUntil ? new Date(availableUntil).toISOString() : undefined,
      });
      Alert.alert("Success", "Discussion created successfully!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to create discussion. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const ToggleRow = ({
    label,
    description,
    value,
    onValueChange,
    icon: Icon,
  }: {
    label: string;
    description: string;
    value: boolean;
    onValueChange: (val: boolean) => void;
    icon: React.ComponentType<{ color?: string; size?: number }>;
  }) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 10 }}>
        <Icon color="#64748b" size={18} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#0f172a" }}>{label}</Text>
          <Text style={{ fontSize: 12, color: "#94a3b8", marginTop: 1 }}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#e2e8f0", true: "#bfdbfe" }}
        thumbColor={value ? "#3b82f6" : "#cbd5e1"}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f8fafc" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
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
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center" }}>
            <ChevronLeft color="#1e293b" size={20} />
            <Text style={{ fontSize: 14, color: "#1e293b", marginLeft: 4 }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#0f172a" }}>New Discussion</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: saving ? "#93c5fd" : "#3b82f6",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Save color="#fff" size={14} />
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff", marginLeft: 4 }}>Post</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Title */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
            Title
          </Text>
          <TextInput
            style={{
              backgroundColor: "#fff",
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#e2e8f0",
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 16,
              fontWeight: "600",
              color: "#0f172a",
            }}
            placeholder="What's your discussion about?"
            placeholderTextColor="#94a3b8"
            value={title}
            onChangeText={setTitle}
            maxLength={200}
          />
        </View>

        {/* Content */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
            Content
          </Text>
          <TextInput
            style={{
              backgroundColor: "#fff",
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#e2e8f0",
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 14,
              color: "#0f172a",
              minHeight: 160,
              textAlignVertical: "top",
              lineHeight: 22,
            }}
            placeholder="Write your discussion content... (Markdown supported)"
            placeholderTextColor="#94a3b8"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
          <Text style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, marginLeft: 2 }}>
            You can use **bold**, *italic*, `code`, and other Markdown formatting.
          </Text>
        </View>

        {/* Settings Section */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            Settings
          </Text>
          <View style={{ backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: "#e2e8f0" }}>
            <ToggleRow
              label="Require Post Before Viewing"
              description="Others must reply before seeing replies"
              value={requirePostBeforeView}
              onValueChange={setRequirePostBeforeView}
              icon={Eye}
            />
            <ToggleRow
              label="Allow Threaded Replies"
              description="Replies can be nested as conversations"
              value={allowThreadedReplies}
              onValueChange={setAllowThreadedReplies}
              icon={MessageCircle}
            />
            <ToggleRow
              label="Allow Liking"
              description="Users can like individual replies"
              value={allowLiking}
              onValueChange={setAllowLiking}
              icon={Heart}
            />
          </View>
        </View>

        {/* Scheduling Section */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            Availability
          </Text>
          <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#e2e8f0" }}>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 4 }}>Available From</Text>
              <TextInput
                style={{
                  backgroundColor: "#f8fafc",
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: "#0f172a",
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
                value={availableFrom}
                onChangeText={setAvailableFrom}
              />
            </View>
            <View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 4 }}>Until (optional)</Text>
              <TextInput
                style={{
                  backgroundColor: "#f8fafc",
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: "#0f172a",
                }}
                placeholder="YYYY-MM-DD (leave empty for no end date)"
                placeholderTextColor="#94a3b8"
                value={availableUntil}
                onChangeText={setAvailableUntil}
              />
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
