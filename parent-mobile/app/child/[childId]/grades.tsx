import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SectionCard } from "../../../src/components/SectionCard";
import { getChildById } from "../../../src/lib/auth";
import { useAuth } from "../../../src/context/AuthContext";
import { useChildDashboard } from "../../../src/features/children/useChildDashboard";

export default function ChildGradesScreen() {
  const params = useLocalSearchParams<{ childId: string }>();
  const { children } = useAuth();
  const child = getChildById(children, params.childId);
  const { data, loading, errorMessage } = useChildDashboard(child?.id);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Grades</Text>
      <Text style={styles.subtitle}>{child?.fullName || "Child"}’s marks and feedback are pulled from Supabase.</Text>
      <SectionCard title="Recent scores">
        {loading ? <Text style={styles.body}>Loading grades...</Text> : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {data.grades.length === 0 ? (
          <Text style={styles.body}>No gradebook scores were returned yet.</Text>
        ) : (
          <View style={styles.stack}>
            {data.grades.slice(0, 8).map((grade) => {
              const subjectName = data.subjects.find((subject) => subject.id === grade.subjectId)?.name || "Subject";
              return (
                <View key={grade.id} style={styles.row}>
                  <View>
                    <Text style={styles.metric}>{subjectName}</Text>
                    <Text style={styles.body}>{grade.feedback || "No feedback yet"}</Text>
                  </View>
                  <Text style={styles.score}>{grade.score.toFixed(1)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16 },
  title: { fontSize: 28, fontWeight: "800", color: "#0f172a" },
  subtitle: { color: "#475569", marginTop: 6, marginBottom: 16 },
  stack: { gap: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  body: { color: "#334155", lineHeight: 20 },
  metric: { color: "#0f172a", fontWeight: "700" },
  score: {
    minWidth: 56,
    textAlign: "right",
    color: "#1d4ed8",
    fontSize: 18,
    fontWeight: "800",
  },
  error: { color: "#b91c1c" },
});
