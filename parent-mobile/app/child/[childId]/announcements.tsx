import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SectionCard } from "../../../src/components/SectionCard";
import { getChildById } from "../../../src/lib/auth";
import { useAuth } from "../../../src/context/AuthContext";
import { useChildDashboard } from "../../../src/features/children/useChildDashboard";

export default function ChildAnnouncementsScreen() {
  const params = useLocalSearchParams<{ childId: string }>();
  const { children } = useAuth();
  const child = getChildById(children, params.childId);
  const { data, loading, errorMessage } = useChildDashboard(child?.id);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Announcements</Text>
      <Text style={styles.subtitle}>{child?.fullName || "Child"}’s school notices are pulled from the announcements feed.</Text>
      <SectionCard title="Recent announcements">
        {loading ? <Text style={styles.body}>Loading announcements...</Text> : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {data.announcements.length === 0 ? (
          <Text style={styles.body}>No announcements were found yet.</Text>
        ) : (
          <View style={styles.stack}>
            {data.announcements.slice(0, 8).map((announcement) => (
              <View key={announcement.id} style={styles.card}>
                <Text style={styles.metric}>{announcement.title}</Text>
                <Text style={styles.body}>{announcement.content}</Text>
                <Text style={styles.meta}>{announcement.authorName || "School"}{announcement.subjectName ? ` • ${announcement.subjectName}` : ""}</Text>
              </View>
            ))}
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
  card: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  body: { color: "#334155", lineHeight: 20 },
  metric: { color: "#0f172a", fontWeight: "700", marginBottom: 6 },
  meta: { color: "#64748b", marginTop: 8, fontSize: 12 },
  error: { color: "#b91c1c" },
});
