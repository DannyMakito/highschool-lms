import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SectionCard } from "../../src/components/SectionCard";
import { useAuth } from "../../src/context/AuthContext";
import { supabase } from "../../src/lib/supabase";

type DiscussionThread = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  subject_id: string | null;
  profiles?: { full_name?: string | null; role?: string | null } | { full_name?: string | null; role?: string | null }[] | null;
};

type ThreadReply = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  profiles?: { full_name?: string | null; role?: string | null } | { full_name?: string | null; role?: string | null }[] | null;
};

function getProfileName(profile: ThreadReply['profiles'] | DiscussionThread['profiles']) {
  const item = Array.isArray(profile) ? profile[0] : profile;
  return item?.full_name || null;
}

function getProfileRole(profile: ThreadReply['profiles'] | DiscussionThread['profiles']) {
  const item = Array.isArray(profile) ? profile[0] : profile;
  return item?.role || null;
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

    const fetchThread = async () => {
      if (!discussionId) {
        setErrorMessage("Missing chat thread.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      const [threadRes, repliesRes] = await Promise.all([
        supabase
          .from("discussions")
          .select("id, title, content, created_at, updated_at, subject_id, profiles!author_id(full_name, role)")
          .eq("id", discussionId)
          .maybeSingle(),
        supabase
          .from("discussion_replies")
          .select("id, content, created_at, author_id, profiles!author_id(full_name, role)")
          .eq("discussion_id", discussionId)
          .order("created_at", { ascending: true }),
      ]);

      if (cancelled) return;

      if (threadRes.error) {
        setErrorMessage(threadRes.error.message);
        setThread(null);
        setReplies([]);
        setLoading(false);
        return;
      }

      if (!threadRes.data) {
        setErrorMessage("Conversation not found.");
        setThread(null);
        setReplies([]);
        setLoading(false);
        return;
      }

      setThread(threadRes.data as DiscussionThread);
      setReplies((repliesRes.data || []) as ThreadReply[]);
      setLoading(false);
    };

    void fetchThread();

    return () => {
      cancelled = true;
    };
  }, [discussionId]);

  const sendReply = async () => {
    const content = draft.trim();
    if (!content || !discussionId || sending || !session?.user?.id) return;

    setSending(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from("discussion_replies")
        .insert({
          discussion_id: discussionId,
          author_id: session.user.id,
          content,
          read_by_users: [session.user.id],
        })
        .select("id, content, created_at, author_id, profiles!author_id(full_name, role)")
        .single();

      if (error) throw error;

      if (data) {
        setReplies((current) => [...current, data as ThreadReply]);
        setDraft("");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send message";
      setErrorMessage(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>

        <Text style={styles.eyebrow}>{activeChild ? activeChild.fullName : parent?.fullName || "Parent"}</Text>
        <Text style={styles.title}>Message thread</Text>
        <Text style={styles.subtitle}>A private chat with the subject teacher for this learner.</Text>

        {loading ? (
          <SectionCard title="Loading thread">
            <ActivityIndicator color="#2563eb" />
          </SectionCard>
        ) : null}

        {errorMessage ? (
          <SectionCard title="Conversation status">
            <Text style={styles.error}>{errorMessage}</Text>
          </SectionCard>
        ) : null}

        {thread ? (
          <SectionCard title={thread.title} subtitle={`${getProfileName(thread.profiles) || getProfileRole(thread.profiles) || "Teacher"} • ${new Date(thread.updated_at || thread.created_at).toLocaleString()}`}>
            <Text style={styles.threadBody}>{thread.content}</Text>
          </SectionCard>
        ) : null}

        <SectionCard title="Messages" subtitle="Replies from the teacher and parent appear here.">
          {replies.length === 0 ? (
            <Text style={styles.body}>No replies yet. Send the first message below.</Text>
          ) : (
            <View style={styles.stack}>
              {replies.map((reply) => (
                <View key={reply.id} style={styles.replyCard}>
                  <Text style={styles.replyAuthor}>{getProfileName(reply.profiles) || getProfileRole(reply.profiles) || "User"}</Text>
                  <Text style={styles.replyBody}>{reply.content}</Text>
                  <Text style={styles.replyMeta}>{new Date(reply.created_at).toLocaleString()}</Text>
                </View>
              ))}
            </View>
          )}
        </SectionCard>

        <SectionCard title="Send message" subtitle="Keep the thread focused on this learner and subject.">
          <TextInput
            style={styles.input}
            placeholder="Type your message"
            placeholderTextColor="#94a3b8"
            value={draft}
            onChangeText={setDraft}
            multiline
          />

          <Pressable
            onPress={sendReply}
            disabled={sending || !draft.trim()}
            style={({ pressed }) => [
              styles.sendButton,
              (sending || !draft.trim()) && styles.sendButtonDisabled,
              pressed && !sending && draft.trim() ? styles.sendButtonPressed : null,
            ]}
          >
            <Text style={styles.sendButtonText}>{sending ? "Sending..." : "Send"}</Text>
          </Pressable>
        </SectionCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  backButtonText: {
    color: "#2563eb",
    fontWeight: "800",
  },
  eyebrow: {
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    color: "#0f172a",
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    color: "#475569",
    marginTop: 6,
    marginBottom: 16,
  },
  threadBody: {
    color: "#334155",
    lineHeight: 22,
  },
  stack: {
    gap: 10,
  },
  replyCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
  },
  replyAuthor: {
    color: "#0f172a",
    fontWeight: "800",
    marginBottom: 6,
  },
  replyBody: {
    color: "#334155",
    lineHeight: 20,
  },
  replyMeta: {
    color: "#64748b",
    marginTop: 8,
    fontSize: 12,
  },
  body: {
    color: "#334155",
    lineHeight: 20,
  },
  error: {
    color: "#b91c1c",
  },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#0f172a",
    backgroundColor: "#ffffff",
    textAlignVertical: "top",
  },
  sendButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "#2563eb",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  sendButtonDisabled: {
    backgroundColor: "#94a3b8",
  },
  sendButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  sendButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
});