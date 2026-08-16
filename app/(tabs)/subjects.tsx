import { Link } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SectionCard } from "../../src/components/SectionCard";
import { useAuth } from "../../src/context/AuthContext";
import { useChildDashboard } from "../../src/features/children/useChildDashboard";
import { assignmentState, isDueSoon, isPastDue, quizState } from "../../src/lib/academics";
import { brandColors } from "../../src/theme/brand";

const actions = [
  { key: "work", title: "School work", caption: "Assignments and homework", icon: "document-text-outline" as const },
  { key: "assessments", title: "Quizzes & tests", caption: "Available and completed", icon: "help-circle-outline" as const },
  { key: "results", title: "Marks & feedback", caption: "Released results", icon: "ribbon-outline" as const },
];

export default function AcademicsScreen() {
  const { activeChild } = useAuth();
  const { data, loading, errorMessage } = useChildDashboard(activeChild?.id);
  const overdue = data.assignments.filter(isPastDue);
  const dueSoon = data.assignments.filter(isDueSoon);
  const submitted = data.assignments.filter((item) => item.submissionStatus === "submitted" || item.submissionStatus === "graded");
  const completedQuizzes = data.quizzes.filter((item) => item.submissionStatus === "completed");

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>Academics</Text>
    <Text style={styles.title}>{activeChild?.fullName || "Select a learner"}</Text>
    <Text style={styles.subtitle}>A calm, complete view of school work, results, and anything that needs attention.</Text>
    {loading ? <ActivityIndicator color={brandColors.primary} /> : null}
    {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

    <SectionCard title="At a glance" subtitle="Signals help you start the right conversation.">
      <View style={styles.metrics}>
        <Metric label="Needs attention" value={String(overdue.length)} tone={overdue.length ? "danger" : "neutral"} />
        <Metric label="Due soon" value={String(dueSoon.length)} tone={dueSoon.length ? "warning" : "neutral"} />
        <Metric label="Submitted" value={String(submitted.length)} tone="good" />
        <Metric label="Quizzes done" value={String(completedQuizzes.length)} tone="good" />
      </View>
    </SectionCard>

    {overdue.length > 0 && <SectionCard title="Needs a check-in" subtitle="These tasks are past their due date and do not show a submission.">
      <View style={styles.stack}>{overdue.slice(0, 3).map((item) => <Link key={item.id} href={`/academics/work`} asChild><Pressable style={styles.alertRow}><View><Text style={styles.alertTitle}>{item.title}</Text><Text style={styles.alertMeta}>Past due{item.dueDate ? ` · Due ${item.dueDate}` : ""}</Text></View><Ionicons name="chevron-forward" size={18} color={brandColors.danger} /></Pressable></Link>)}</View>
    </SectionCard>}

    <View style={styles.stack}>{actions.map((action) => <Link key={action.key} href={`/academics/${action.key}`} asChild><Pressable><SectionCard title={action.title} subtitle={action.caption}><View style={styles.action}><Ionicons name={action.icon} size={22} color={brandColors.primary} /><Text style={styles.open}>Open</Text><Ionicons name="chevron-forward" size={18} color={brandColors.placeholder} /></View></SectionCard></Pressable></Link>)}</View>

    <SectionCard title="Subjects" subtitle="Open a subject for its work, assessment, and mark history.">
      <View style={styles.stack}>{data.subjects.map((subject) => {
        const subjectWork = data.assignments.filter((item) => item.subjectId === subject.id);
        const status = subjectWork.some(isPastDue) ? "Needs attention" : subjectWork.some(isDueSoon) ? "Due soon" : `${subjectWork.length} work items`;
        return <Link key={subject.id} href={`/subject/${subject.id}`} asChild><Pressable style={styles.subjectRow}><View><Text style={styles.subjectName}>{subject.name}</Text><Text style={styles.subjectMeta}>{status}</Text></View><Ionicons name="chevron-forward" size={18} color={brandColors.placeholder} /></Pressable></Link>;
      })}{data.subjects.length === 0 && !loading ? <Text style={styles.empty}>No subjects are linked to this learner yet.</Text> : null}</View>
    </SectionCard>
  </ScrollView>;
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "danger" | "warning" | "good" | "neutral" }) { return <View style={[styles.metric, tone === "danger" && styles.metricDanger, tone === "warning" && styles.metricWarning, tone === "good" && styles.metricGood]}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: brandColors.field }, content: { padding: 16, paddingBottom: 32, gap: 14 }, eyebrow: { color: brandColors.primary, fontSize: 12, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" }, title: { color: brandColors.text, fontSize: 29, fontWeight: "800" }, subtitle: { color: brandColors.muted, lineHeight: 20, marginBottom: 2 }, metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, metric: { minWidth: "47%", flexGrow: 1, padding: 12, borderRadius: 12, backgroundColor: "#f1f5f9" }, metricDanger: { backgroundColor: "#fef2f2" }, metricWarning: { backgroundColor: "#fffbeb" }, metricGood: { backgroundColor: "#f0fdf4" }, metricValue: { color: brandColors.text, fontWeight: "900", fontSize: 22 }, metricLabel: { color: brandColors.muted, fontSize: 12, marginTop: 2 }, stack: { gap: 10 }, alertRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fef2f2", borderRadius: 12, padding: 12 }, alertTitle: { color: brandColors.text, fontWeight: "800" }, alertMeta: { color: brandColors.danger, fontSize: 12, marginTop: 3 }, action: { flexDirection: "row", alignItems: "center", gap: 10 }, open: { color: brandColors.primary, fontWeight: "800", flex: 1 }, subjectRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e2e8f0" }, subjectName: { color: brandColors.text, fontWeight: "800" }, subjectMeta: { color: brandColors.muted, fontSize: 12, marginTop: 3 }, empty: { color: brandColors.muted }, error: { color: brandColors.danger } });
