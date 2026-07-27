import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SectionCard } from "../../src/components/SectionCard";
import { useAuth } from "../../src/context/AuthContext";
import { useChildDashboard } from "../../src/features/children/useChildDashboard";
import { assignmentState, quizState } from "../../src/lib/academics";
import { brandColors } from "../../src/theme/brand";

export default function SubjectDetailScreen() {
  const params = useLocalSearchParams<{ subjectId?: string }>(); const subjectId = Array.isArray(params.subjectId) ? params.subjectId[0] : params.subjectId;
  const { activeChild } = useAuth(); const { data, loading, errorMessage } = useChildDashboard(activeChild?.id);
  const subject = data.subjects.find((item) => item.id === subjectId);
  const work = data.assignments.filter((item) => item.subjectId === subjectId); const quizzes = data.quizzes.filter((item) => item.subjectId === subjectId); const grades = data.grades.filter((item) => item.subjectId === subjectId);
  const average = grades.length ? Math.round(grades.reduce((sum, item) => sum + item.score, 0) / grades.length) : null;
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}><Text style={styles.eyebrow}>{activeChild?.fullName || "Learner"}</Text><Text style={styles.title}>{subject?.name || "Subject"}</Text>{loading ? <ActivityIndicator color={brandColors.primary} /> : null}{errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
    <SectionCard title="Performance" subtitle="Released results from the school record."><View style={styles.performance}><Text style={styles.performanceLabel}>Average mark</Text><Text style={styles.average}>{average === null ? "—" : `${average}%`}</Text><Text style={styles.performanceNote}>{grades.length ? `${grades.length} recorded result${grades.length === 1 ? "" : "s"}` : "No released marks yet"}</Text></View></SectionCard>
    <SectionCard title="School work" subtitle="Assignments and homework for this subject."><View style={styles.stack}>{work.map((item) => <Row key={item.id} title={item.title} meta={item.dueDate ? `Due ${item.dueDate}` : "No due date"} state={assignmentState(item)} />)}{work.length === 0 ? <Text style={styles.empty}>No work has been posted yet.</Text> : null}</View></SectionCard>
    <SectionCard title="Quizzes & tests" subtitle="Availability and completion status."><View style={styles.stack}>{quizzes.map((item) => <Row key={item.id} title={item.title} meta={item.endDate ? `Closes ${item.endDate}` : "Assessment"} state={quizState(item)} />)}{quizzes.length === 0 ? <Text style={styles.empty}>No quizzes or tests have been posted yet.</Text> : null}</View></SectionCard>
    <SectionCard title="Marks & feedback" subtitle="Only released information is displayed."><View style={styles.stack}>{grades.map((item) => <Row key={item.id} title={`Mark: ${item.score}`} meta={item.feedback || "Teacher released result"} state="Released" />)}{grades.length === 0 ? <Text style={styles.empty}>No marks are available yet.</Text> : null}</View></SectionCard>
  </ScrollView>;
}
function Row({ title, meta, state }: { title: string; meta: string; state: string }) { return <View style={styles.row}><View style={styles.rowText}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowMeta}>{meta}</Text></View><Text style={styles.state}>{state}</Text></View>; }
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: brandColors.field }, content: { padding: 16, paddingBottom: 32, gap: 14 }, eyebrow: { color: brandColors.primary, fontSize: 12, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" }, title: { color: brandColors.text, fontSize: 29, fontWeight: "800" }, performance: { alignItems: "center", paddingVertical: 8 }, performanceLabel: { color: brandColors.muted, fontSize: 13 }, average: { color: brandColors.text, fontSize: 34, fontWeight: "900", marginVertical: 4 }, performanceNote: { color: brandColors.muted, fontSize: 12 }, stack: { gap: 10 }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e2e8f0", paddingVertical: 9 }, rowText: { flex: 1, paddingRight: 8 }, rowTitle: { color: brandColors.text, fontWeight: "800" }, rowMeta: { color: brandColors.muted, fontSize: 12, marginTop: 3 }, state: { color: brandColors.primary, fontWeight: "700", fontSize: 12 }, empty: { color: brandColors.muted }, error: { color: brandColors.danger } });
