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

      <SectionCard title="Subject list" subtitle="Tap a subject to open the full subject hub with content, homework, quizzes, grades, and teacher updates.">
        {loading ? <ActivityIndicator color="#1d4ed8" /> : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {data.subjects.length === 0 && !loading ? (
          <Text style={styles.body}>No subjects are available for the selected learner yet.</Text>
        ) : (
          <View style={styles.stack}>
            {data.subjects.map((subject) => {
              const assignmentCount = data.assignments.filter((item) => item.subjectId === subject.id).length;
              const gradeCount = data.grades.filter((item) => item.subjectId === subject.id).length;
              return (
                <Link key={subject.id} href={`/subject/${subject.id}`} asChild>
                  <Pressable style={styles.card}>
                    <SectionCard title={subject.name} subtitle={subject.category || subject.gradeTier || "Subject details"}>
                      <Text style={styles.body}>{assignmentCount > 0 ? `${assignmentCount} active work item${assignmentCount === 1 ? "" : "s"}` : "No active assignments yet."}</Text>
                      <Text style={styles.meta}>{gradeCount > 0 ? `${gradeCount} recent grade${gradeCount === 1 ? "" : "s"}` : "Grades will appear here once available."}</Text>
                      <Text style={styles.link}>Open subject hub</Text>
                    </SectionCard>
                  </Pressable>
                </Link>
              );
            })}
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
  card: {
    borderRadius: 24,
    overflow: "hidden",
  },
  body: {
    color: "#334155",
    lineHeight: 20,
    marginBottom: 8,
  },
  meta: {
    color: "#64748b",
    marginBottom: 10,
  },
  link: {
    color: "#1d4ed8",
    fontWeight: "800",
  },
  error: {
    color: "#b91c1c",
    marginBottom: 12,
  },
});
