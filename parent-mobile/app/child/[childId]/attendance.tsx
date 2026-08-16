import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SectionCard } from "../../../src/components/SectionCard";
import { getChildById } from "../../../src/lib/auth";
import { useAuth } from "../../../src/context/AuthContext";
import { useChildDashboard } from "../../../src/features/children/useChildDashboard";

export default function ChildAttendanceScreen() {
  const params = useLocalSearchParams<{ childId: string }>();
  const { children } = useAuth();
  const child = getChildById(children, params.childId);
  const { data, loading, errorMessage } = useChildDashboard(child?.id);
  const presentCount = data.attendance.filter((entry) => ["present", "excused"].includes(String(entry.mark).toLowerCase())).length;
  const rate = data.attendance.length ? Math.round((presentCount / data.attendance.length) * 100) : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Attendance</Text>
      <Text style={styles.subtitle}>{child?.fullName || "Child"}’s attendance is pulled from register entries.</Text>
      <SectionCard title="Recent attendance">
        <Text style={styles.summary}>{rate === null ? "No attendance summary is available yet." : `${rate}% attendance across the latest ${data.attendance.length} register entries.`}</Text>
        {loading ? <Text style={styles.body}>Loading attendance...</Text> : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {data.attendance.length === 0 ? (
          <Text style={styles.body}>No attendance entries were found yet.</Text>
        ) : (
          <View style={styles.stack}>
            {data.attendance.slice(0, 10).map((entry) => (
              <View key={entry.id} style={styles.row}>
                <View>
                  <Text style={styles.metric}>{entry.date.slice(0, 10)}</Text>
                  <Text style={styles.body}>{entry.note || entry.className || "Register session"}</Text>
                </View>
                <Text style={styles.status}>{entry.mark}</Text>
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
  status: { color: "#1d4ed8", fontWeight: "800", textTransform: "capitalize" },
  error: { color: "#b91c1c" },
  summary: { color: "#334155", lineHeight: 20, marginBottom: 12 },
});
