import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SectionCard } from "../../src/components/SectionCard";
import { useAuth } from "../../src/context/AuthContext";
import { useChildDashboard } from "../../src/features/children/useChildDashboard";

export default function MessagesScreen() {
  const router = useRouter();
  const { activeChild } = useAuth();
  const { data, loading, errorMessage } = useChildDashboard(activeChild?.id);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Messages</Text>
      <Text style={styles.subtitle}>{activeChild ? `Chat with subject teachers for ${activeChild.fullName}` : "Learner chats will appear here."}</Text>

      <SectionCard title="Conversations" subtitle="Recent discussion threads tied to the selected learner.">
        {loading ? <Text style={styles.body}>Loading conversations...</Text> : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {data.conversations.length === 0 ? (
          <Text style={styles.body}>No conversations yet.</Text>
        ) : (
          <View style={styles.stack}>
            {data.conversations.slice(0, 6).map((thread) => (
              <Pressable
                key={thread.id}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => router.push({ pathname: "/chat/[discussionId]", params: { discussionId: thread.id } })}
              >
                <Text style={styles.subject}>{thread.subjectName || "Subject"}</Text>
                <Text style={styles.threadTitle}>{thread.title}</Text>
                <Text style={styles.body}>{thread.preview}</Text>
                <Text style={styles.meta}>{thread.replyCount} replies • {thread.authorName || thread.authorRole || "Teacher"}</Text>
                <Text style={styles.cta}>Open chat</Text>
              </Pressable>
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard title="In-app notifications" subtitle="New grades, work, and discussions should surface here too.">
        <Text style={styles.body}>This tab can later subscribe to realtime updates from the same discussion and announcement feed.</Text>
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: "#475569",
    marginTop: 6,
    marginBottom: 16,
  },
  stack: {
    gap: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  subject: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  threadTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  body: {
    color: "#334155",
    lineHeight: 20,
    marginBottom: 12,
  },
  meta: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 8,
  },
  cta: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 10,
  },
  error: {
    color: "#b91c1c",
    marginBottom: 8,
  },
});
