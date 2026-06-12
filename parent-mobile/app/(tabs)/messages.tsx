import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SectionCard } from "../../src/components/SectionCard";
import { useAuth } from "../../src/context/AuthContext";

const messageScaffold = [
  { id: "math", subject: "Mathematics", teacher: "Subject teacher", preview: "Ask about homework, tests, and class progress." },
  { id: "english", subject: "English", teacher: "Subject teacher", preview: "Subject-specific parent chat will connect here." },
];

export default function MessagesScreen() {
  const { activeChild } = useAuth();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Messages</Text>
      <Text style={styles.subtitle}>{activeChild ? `For ${activeChild.fullName}` : "Learner chats will appear here."}</Text>

      <View style={styles.stack}>
        {messageScaffold.map((thread) => (
          <SectionCard key={thread.id} title={thread.subject} subtitle={thread.teacher}>
            <Text style={styles.body}>{thread.preview}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Teacher chat</Text>
            </View>
          </SectionCard>
        ))}
      </View>
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
  body: {
    color: "#334155",
    lineHeight: 20,
    marginBottom: 12,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#dbeafe",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: "800",
  },
});
