import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SectionCard } from "../../src/components/SectionCard";
import { useAuth } from "../../src/context/AuthContext";
import { useChildDashboard } from "../../src/features/children/useChildDashboard";

export default function NotificationsScreen() {
  const { activeChild } = useAuth();
  const { data, loading, errorMessage } = useChildDashboard(activeChild?.id);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Alerts</Text>
      <Text style={styles.subtitle}>This tab surfaces the newest parent-safe updates for the active learner.</Text>

      <SectionCard title="Recent updates">
        {loading ? <Text style={styles.body}>Loading alerts...</Text> : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <View style={styles.stack}>
          {data.announcements.slice(0, 3).map((announcement) => (
            <View key={announcement.id} style={styles.card}>
              <Text style={styles.metric}>Announcement</Text>
              <Text style={styles.body}>{announcement.title}</Text>
            </View>
          ))}
          {data.assignments.slice(0, 3).map((assignment) => (
            <View key={assignment.id} style={styles.card}>
              <Text style={styles.metric}>Assignment</Text>
              <Text style={styles.body}>{assignment.title}</Text>
            </View>
          ))}
          {data.grades.slice(0, 3).map((grade) => (
            <View key={grade.id} style={styles.card}>
              <Text style={styles.metric}>Grade</Text>
              <Text style={styles.body}>Score {grade.score.toFixed(1)}</Text>
            </View>
          ))}
        </View>
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
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
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
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  metric: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  body: {
    color: "#334155",
    lineHeight: 20,
  },
  error: {
    color: "#b91c1c",
    marginBottom: 8,
  },
});
