import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { supabase } from "../../src/lib/supabase";
import { brandColors } from "../../src/theme/brand";

export default function NewChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ subjectClassId?: string; subjectId?: string; teacherName?: string; subjectName?: string }>();
  const { session, activeChild } = useAuth();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const subjectClassId = Array.isArray(params.subjectClassId) ? params.subjectClassId[0] : params.subjectClassId;
  const subjectId = Array.isArray(params.subjectId) ? params.subjectId[0] : params.subjectId;
  const teacherName = Array.isArray(params.teacherName) ? params.teacherName[0] : params.teacherName || "Teacher";
  const subjectName = Array.isArray(params.subjectName) ? params.subjectName[0] : params.subjectName || "Subject";

  const send = async () => {
    const content = message.trim();
    if (!content || !subjectClassId || !subjectId || !session?.user?.id || sending) return;
    setSending(true);
    setErrorMessage(null);
    const { data, error } = await supabase.from("discussions").insert({
      subject_id: subjectId,
      subject_class_id: subjectClassId,
      title: `Message about ${activeChild?.fullName || "learner"}`,
      content,
      author_id: session.user.id,
      is_pinned: false,
      is_closed: false,
      require_post_before_view: false,
      is_group: false,
      allow_threaded_replies: true,
      allow_liking: false,
      read_by_users: [session.user.id],
      subscribed_user_ids: [session.user.id],
    }).select("id").single();
    setSending(false);
    if (error || !data) {
      setErrorMessage(error?.message || "We could not start this conversation. Please try again.");
      return;
    }
    router.replace({ pathname: "/chat/[discussionId]", params: { discussionId: data.id } });
  };

  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <View style={styles.content}>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>Back to messages</Text></Pressable>
      <Text style={styles.eyebrow}>{subjectName}</Text>
      <Text style={styles.title}>{teacherName}</Text>
      <Text style={styles.subtitle}>Start a private conversation about {activeChild?.fullName || "your learner"}.</Text>
      <TextInput value={message} onChangeText={setMessage} placeholder="Write your message" placeholderTextColor="#94a3b8" multiline textAlignVertical="top" style={styles.input} />
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      <Pressable onPress={() => void send()} disabled={sending || !message.trim() || !subjectClassId || !subjectId} style={[styles.send, (sending || !message.trim() || !subjectClassId || !subjectId) && styles.sendDisabled]}>
        {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>Send message</Text>}
      </Pressable>
    </View>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: brandColors.field }, content: { flex: 1, padding: 16 }, back: { color: brandColors.primary, fontWeight: "800", marginBottom: 22 }, eyebrow: { color: brandColors.primary, fontSize: 12, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" }, title: { color: brandColors.text, fontSize: 28, fontWeight: "800", marginTop: 4 }, subtitle: { color: brandColors.muted, lineHeight: 20, marginBottom: 18, marginTop: 6 }, input: { backgroundColor: "#fff", borderColor: "#cbd5e1", borderRadius: 16, borderWidth: 1, color: brandColors.text, minHeight: 150, padding: 14 }, error: { color: brandColors.danger, marginTop: 10 }, send: { alignItems: "center", backgroundColor: brandColors.primary, borderRadius: 14, justifyContent: "center", marginTop: 14, minHeight: 48 }, sendDisabled: { opacity: 0.55 }, sendText: { color: "#fff", fontWeight: "800" } });
