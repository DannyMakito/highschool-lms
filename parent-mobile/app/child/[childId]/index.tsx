import { Link, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../../src/context/AuthContext";
import { getChildById } from "../../../src/lib/auth";
import { SectionCard } from "../../../src/components/SectionCard";
import { useChildDashboard } from "../../../src/features/children/useChildDashboard";
import { ChildDashboardHeader } from "../../../src/features/children/ChildDashboardHeader";

export default function ChildOverviewScreen() {
  const params = useLocalSearchParams<{ childId: string }>();
  const { children } = useAuth();
  const child = getChildById(children, params.childId);
  const { data, loading, errorMessage } = useChildDashboard(child?.id);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ChildDashboardHeader child={child} />

      <SectionCard title="Overview">
        <View style={styles.stack}>
          <Text style={styles.body}>This screen is connected to live Supabase data.</Text>
          {loading ? <ActivityIndicator color="#1d4ed8" /> : null}
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          <Text style={styles.metric}>Assignments: {data.assignments.length}</Text>
          <Text style={styles.metric}>Grades: {data.grades.length}</Text>
          <Text style={styles.metric}>Attendance: {data.attendance.length}</Text>
          <Text style={styles.metric}>Announcements: {data.announcements.length}</Text>
          <Link href={`/child/${params.childId}/grades`} style={styles.link}>
            View grades
          </Link>
          <Link href={`/child/${params.childId}/attendance`} style={styles.link}>
            View attendance
          </Link>
          <Link href={`/child/${params.childId}/assignments`} style={styles.link}>
            View assignments
          </Link>
          <Link href={`/child/${params.childId}/announcements`} style={styles.link}>
            View announcements
          </Link>
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
    paddingBottom: 32,
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
    gap: 10,
  },
  body: {
    color: "#334155",
    lineHeight: 20,
  },
  metric: {
    color: "#0f172a",
    fontWeight: "600",
  },
  link: {
    color: "#1d4ed8",
    fontWeight: "700",
  },
  error: {
    color: "#b91c1c",
  },
});
