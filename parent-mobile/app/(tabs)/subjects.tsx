import { Link } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SectionCard } from "../../src/components/SectionCard";
import { useAuth } from "../../src/context/AuthContext";
import { useChildDashboard } from "../../src/features/children/useChildDashboard";

export default function SubjectsScreen() {
  const { activeChild } = useAuth();
  const { data, loading, errorMessage } = useChildDashboard(activeChild?.id);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Subjects</Text>
      <Text style={styles.subtitle}>{activeChild ? `Subjects for ${activeChild.fullName}` : "Select a learner to view subjects."}</Text>

      <SectionCard title="Subject list" subtitle="Tap a subject to open a focused view of this learner's progress, work, feedback, and teacher updates.">
        {loading ? <ActivityIndicator color="#1d4ed8" /> : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {data.subjects.length === 0 && !loading ? (
          <Text style={styles.body}>No subjects are available for the selected learner yet.</Text>
        ) : (
          <View style={styles.stack}>
            {data.subjects.map((subject) => <Link key={subject.id} href={`/subject/${subject.id}`} asChild>
              <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.subjectInitial}><Text style={styles.subjectInitialText}>{subject.name?.charAt(0)?.toUpperCase() || "S"}</Text></View>
                <View style={styles.cardContent}>
                  <Text style={styles.subjectName}>{subject.name || "Subject"}</Text>
                  <Text style={styles.meta}>{subject.category || subject.gradeTier || "Learner subject"}</Text>
                  <Text style={styles.helper}>View progress, work, results, and teacher updates</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            </Link>)}
          </View>
        )}
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
  card: { alignItems: "center", backgroundColor: "#fff", borderColor: "#e2e8f0", borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 12, padding: 14 },
  cardPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  subjectInitial: { alignItems: "center", backgroundColor: "#dbeafe", borderRadius: 16, height: 46, justifyContent: "center", width: 46 },
  subjectInitialText: { color: "#1d4ed8", fontSize: 19, fontWeight: "900" },
  cardContent: { flex: 1 },
  subjectName: { color: "#0f172a", fontSize: 16, fontWeight: "800" },
  body: {
    color: "#334155",
    lineHeight: 20,
    marginBottom: 8,
  },
  meta: {
    color: "#64748b",
    marginBottom: 10,
  },
  helper: { color: "#475569", fontSize: 12, marginTop: 5 },
  chevron: { color: "#1d4ed8", fontSize: 28, fontWeight: "400" },
  error: {
    color: "#b91c1c",
    marginBottom: 12,
  },
});
