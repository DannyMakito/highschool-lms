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
  const progress = data.progress;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ChildDashboardHeader child={child} />

      <SectionCard title="Progress overview" subtitle="A simple summary of the latest available school information.">
        <View style={styles.stack}>
          {data.child ? <Text style={styles.metric}>Admin number: {data.child.administrationNumber || "-"}</Text> : null}
          {data.child ? <Text style={styles.metric}>Status: {data.child.status || "-"}</Text> : null}
          <Text style={styles.metric}>Subjects: {data.subjects.length}</Text>
          {loading ? <ActivityIndicator color="#1d4ed8" /> : null}
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          {!loading ? <Text style={styles.metric}>{progress.averageScore === null ? "No released marks yet" : `Recent average: ${progress.averageScore.toFixed(1)}`}</Text> : null}
          {!loading ? <Text style={styles.metric}>{progress.attendanceRate === null ? "Attendance summary unavailable" : `Attendance: ${Math.round(progress.attendanceRate)}%`}</Text> : null}
          {!loading && progress.overdueCount > 0 ? <Text style={styles.warning}>{progress.overdueCount} overdue assignment{progress.overdueCount === 1 ? "" : "s"} needs attention.</Text> : null}
          <Link href={`/child/${params.childId}/grades`} style={styles.link}>
            View grades
          </Link>
          <Link href={`/child/${params.childId}/attendance`} style={styles.link}>
            View attendance
          </Link>
          <Link href={`/child/${params.childId}/assignments`} style={styles.link}>
            View assignments
          </Link>
          <Link href={`/child/${params.childId}/homework`} style={styles.link}>
            View homework
          </Link>
          <Link href={`/child/${params.childId}/announcements`} style={styles.link}>
            View announcements
          </Link>
          <Link href={`/child/${params.childId}/absence-report`} style={styles.link}>
            Report an absence
          </Link>
        </View>
      </SectionCard>

      <SectionCard title="Subjects" subtitle="Subjects currently linked to this learner.">
        {data.subjects.length === 0 ? (
          <Text style={styles.body}>No linked subjects were found for this learner yet.</Text>
        ) : (
          <View style={styles.stack}>
            {data.subjects.map((subject) => (
              <View key={subject.id} style={styles.subjectRow}>
                <Text style={styles.metric}>{subject.name}</Text>
                <Text style={styles.subjectMeta}>{subject.category || subject.gradeTier || "Subject"}</Text>
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Recent conversations" subtitle="Quick parent-teacher threads and discussion updates.">
        {data.conversations.length === 0 ? (
          <Text style={styles.body}>No recent conversations yet.</Text>
        ) : (
          <View style={styles.stack}>
            {data.conversations.slice(0, 4).map((thread) => (
              <View key={thread.id} style={styles.threadCard}>
                <Text style={styles.threadSubject}>{thread.subjectName || "Subject"}</Text>
                <Text style={styles.threadTitle}>{thread.title}</Text>
                <Text style={styles.body}>{thread.preview}</Text>
                <Text style={styles.subjectMeta}>{thread.replyCount} replies • {thread.authorName || thread.authorRole || "Teacher"}</Text>
              </View>
            ))}
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
  subjectRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  subjectMeta: {
    color: "#64748b",
    marginTop: 2,
    fontSize: 12,
  },
  threadCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  threadSubject: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  threadTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  link: {
    color: "#1d4ed8",
    fontWeight: "700",
  },
  error: {
    color: "#b91c1c",
  },
  warning: {
    color: "#9a3412",
    fontWeight: "700",
  },
});
