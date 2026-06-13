import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SectionCard } from "../../../src/components/SectionCard";
import { getChildById } from "../../../src/lib/auth";
import { useAuth } from "../../../src/context/AuthContext";
import { useChildDashboard } from "../../../src/features/children/useChildDashboard";

export default function ChildAssignmentsScreen() {
  const params = useLocalSearchParams<{ childId: string }>();
  const { children } = useAuth();
  const child = getChildById(children, params.childId);
  const { data, loading, errorMessage } = useChildDashboard(child?.id);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Assignments</Text>
      <Text style={styles.subtitle}>{child?.fullName || "Child"}’s current and upcoming work comes from Supabase.</Text>
      <SectionCard title="Live assignments">
        {loading ? <Text style={styles.body}>Loading assignments...</Text> : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {data.assignments.length === 0 ? (
          <Text style={styles.body}>No published assignments were found for this learner.</Text>
        ) : (
          <View style={styles.stack}>
            {data.assignments.slice(0, 8).map((assignment) => {
              const subjectName = data.subjects.find((subject) => subject.id === assignment.subjectId)?.name || "Subject";
              return (
                <View key={assignment.id} style={styles.row}>
                  <View>
                    <Text style={styles.metric}>{assignment.title}</Text>
                    <Text style={styles.body}>{subjectName}</Text>
                  </View>
                  <Text style={styles.status}>{assignment.dueDate ? `Due ${assignment.dueDate.slice(0, 10)}` : assignment.status || "Published"}</Text>
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
  status: {
    minWidth: 88,
    textAlign: "right",
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: "800",
  },
  error: { color: "#b91c1c" },
});
