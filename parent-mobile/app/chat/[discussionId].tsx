import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SectionCard } from "../../src/components/SectionCard";
import { useAuth } from "../../src/context/AuthContext";
import { supabase } from "../../src/lib/supabase";
import { brandColors } from "../../src/theme/brand";

type Profile = { full_name?: string | null; role?: string | null };
type DiscussionThread = { id: string; title: string; content: string; created_at: string; updated_at: string; subject_id: string | null; author_id: string; profiles?: Profile | Profile[] | null };
type ThreadReply = { id: string; content: string; created_at: string; author_id: string; profiles?: Profile | Profile[] | null };

function profileName(profile?: Profile | Profile[] | null) {
  const item = Array.isArray(profile) ? profile[0] : profile;
  return item?.full_name || item?.role || "Teacher";
}

function formatTime(value?: string | null) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Recently";
}

export default function ThreadChatScreen() {
  const params = useLocalSearchParams<{ discussionId?: string }>();
  const router = useRouter();
  const { parent, activeChild, session } = useAuth();
  const discussionId = useMemo(() => Array.isArray(params.discussionId) ? params.discussionId[0] : params.discussionId, [params.discussionId]);
  const [thread, setThread] = useState<DiscussionThread | null>(null);
  const [replies, setReplies] = useState<ThreadReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!discussionId) { setErrorMessage("Missing conversation."); setLoading(false); return; }
      setLoading(true); setErrorMessage(null);
      const [threadRes, repliesRes] = await Promise.all([
        supabase.from("discussions").select("id, title, content, created_at, updated_at, subject_id, author_id, profiles!author_id(full_name, role)").eq("id", discussionId).maybeSingle(),
        supabase.from("discussion_replies").select("id, content, created_at, author_id, profiles!author_id(full_name, role)").eq("discussion_id", discussionId).order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      if (threadRes.error || !threadRes.data) { setErrorMessage(threadRes.error?.message || "Conversation not found."); setThread(null); setReplies([]); setLoading(false); return; }
      if (repliesRes.error) setErrorMessage(repliesRes.error.message);
      setThread(threadRes.data as DiscussionThread);
      setReplies((repliesRes.data || []) as ThreadReply[]);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [discussionId]);

  const sendReply = async () => {
    const content = draft.trim();
    if (!content || !discussionId || sending || !session?.user?.id) return;
    setSending(true); setErrorMessage(null);
    const { data, error } = await supabase.from("discussion_replies").insert({ discussion_id: discussionId, author_id: session.user.id, content, read_by_users: [session.user.id] }).select("id, content, created_at, author_id, profiles!author_id(full_name, role)").single();
    setSending(false);
    if (error) { setErrorMessage(error.message || "Failed to send message"); return; }
    if (data) { setReplies((current) => [...current, data as ThreadReply]); setDraft(""); }
  };

  const bubble = (id: string, content: string, authorId: string, author: string, createdAt: string) => {
    const own = authorId === session?.user?.id;
    return <View key={id} style={[styles.bubbleWrap, own ? styles.ownWrap : styles.otherWrap]}>
      <View style={[styles.bubble, own ? styles.ownBubble : styles.otherBubble]}><Text style={[styles.bubbleText, own && styles.ownBubbleText]}>{content || "Message unavailable"}</Text></View>
      <Text style={styles.meta}>{own ? "You" : author} · {formatTime(createdAt)}</Text>
    </View>;
  };

  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>Back to messages</Text></Pressable>
      <Text style={styles.eyebrow}>{activeChild?.fullName || parent?.fullName || "Parent"}</Text>
      <Text style={styles.title}>{thread ? profileName(thread.profiles) : "Conversation"}</Text>
      <Text style={styles.subtitle}>Private messages about this learner and subject.</Text>
      {loading ? <SectionCard title="Loading conversation"><ActivityIndicator color={brandColors.primary} /></SectionCard> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {thread ? <Text style={styles.subjectTitle}>{thread.title || "Conversation"}</Text> : null}
      <View style={styles.messageList}>
        {thread ? bubble(`thread-${thread.id}`, thread.content, thread.author_id, profileName(thread.profiles), thread.created_at) : null}
        {thread && replies.length === 0 ? <Text style={styles.empty}>No replies yet. Write a message below to continue the conversation.</Text> : null}
        {replies.map((reply) => bubble(reply.id, reply.content, reply.author_id, profileName(reply.profiles), reply.created_at))}
      </View>
      {thread ? <View style={styles.composer}>
        <TextInput style={styles.input} placeholder="Write a message" placeholderTextColor="#94a3b8" value={draft} onChangeText={setDraft} multiline textAlignVertical="top" />
        <Pressable onPress={() => void sendReply()} disabled={sending || !draft.trim()} style={[styles.sendButton, (sending || !draft.trim()) && styles.sendDisabled]}><Text style={styles.sendText}>{sending ? "Sending…" : "Send"}</Text></Pressable>
      </View> : null}
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: brandColors.field }, content: { padding: 16, paddingBottom: 40 }, backButton: { alignSelf: "flex-start", marginBottom: 14, paddingVertical: 6 }, backText: { color: brandColors.primary, fontWeight: "800" }, eyebrow: { color: brandColors.primary, fontSize: 12, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" }, title: { color: brandColors.text, fontSize: 28, fontWeight: "800", marginTop: 4 }, subtitle: { color: brandColors.muted, marginBottom: 18, marginTop: 6 }, subjectTitle: { color: brandColors.text, fontWeight: "800", marginBottom: 14 }, messageList: { gap: 14 }, bubbleWrap: { maxWidth: "86%" }, ownWrap: { alignSelf: "flex-end", alignItems: "flex-end" }, otherWrap: { alignSelf: "flex-start", alignItems: "flex-start" }, bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11 }, ownBubble: { backgroundColor: brandColors.primary, borderBottomRightRadius: 4 }, otherBubble: { backgroundColor: "#fff", borderColor: "#e2e8f0", borderWidth: 1, borderBottomLeftRadius: 4 }, bubbleText: { color: "#334155", lineHeight: 20 }, ownBubbleText: { color: "#fff" }, meta: { color: "#64748b", fontSize: 11, marginTop: 5 }, empty: { color: "#64748b", fontStyle: "italic", lineHeight: 20 }, composer: { backgroundColor: "#fff", borderColor: "#e2e8f0", borderRadius: 18, borderWidth: 1, marginTop: 22, padding: 10 }, input: { color: brandColors.text, minHeight: 82, paddingHorizontal: 8, paddingVertical: 8 }, sendButton: { alignItems: "center", alignSelf: "flex-end", backgroundColor: brandColors.primary, borderRadius: 999, paddingHorizontal: 19, paddingVertical: 11 }, sendDisabled: { opacity: 0.55 }, sendText: { color: "#fff", fontWeight: "800" }, error: { color: brandColors.danger, marginBottom: 12 },
});
