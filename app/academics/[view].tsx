import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SectionCard } from "../../src/components/SectionCard";
import { useAuth } from "../../src/context/AuthContext";
import { useChildDashboard } from "../../src/features/children/useChildDashboard";
import { assignmentState, quizState } from "../../src/lib/academics";
import { brandColors } from "../../src/theme/brand";

export default function AcademicListScreen() {
  const { view } = useLocalSearchParams<{ view: "work" | "assessments" | "results" }>();
  const { activeChild } = useAuth(); const { data, loading, errorMessage } = useChildDashboard(activeChild?.id);
  const title = view === "assessments" ? "Quizzes & tests" : view === "results" ? "Marks & feedback" : "School work";
  const subjectName = (id: string | null) => data.subjects.find((subject) => subject.id === id)?.name || "Subject";
  const marked = data.assignments.filter((item) => item.gradeReleased);
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}><Text style={styles.eyebrow}>{activeChild?.fullName || "Learner"}</Text><Text style={styles.title}>{title}</Text>{loading ? <ActivityIndicator color={brandColors.primary} /> : null}{errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
    {view === "work" && <SectionCard title="Assignments and homework" subtitle="Submission status is shown when school records are available."><View style={styles.stack}>{data.assignments.map((item) => <Item key={item.id} title={item.title} meta={`${subjectName(item.subjectId)}${item.dueDate ? ` · Due ${item.dueDate}` : ""}`} status={assignmentState(item)} />)}{data.assignments.length === 0 && <Empty />}</View></SectionCard>}
    {view === "assessments" && <SectionCard title="Quizzes and tests" subtitle="Includes available and completed quizzes."><View style={styles.stack}>{data.quizzes.map((item) => <Item key={item.id} title={item.title} meta={`${subjectName(item.subjectId)}${item.endDate ? ` · Closes ${item.endDate}` : ""}`} status={quizState(item)} detail={item.submissionStatus === "completed" && item.totalPoints ? `${item.score ?? 0}/${item.totalPoints}` : undefined} />)}{data.quizzes.length === 0 && <Empty />}</View></SectionCard>}
    {view === "results" && <><SectionCard title="Marked assignments" subtitle="Only teacher-released marks are shown."><View style={styles.stack}>{marked.map((item) => <Item key={item.id} title={item.title} meta={subjectName(item.subjectId)} status="Marked" detail={item.grade !== null ? String(item.grade) : undefined} />)}{marked.length === 0 && <Empty />}</View></SectionCard><SectionCard title="Gradebook results" subtitle="Recent results by subject."><View style={styles.stack}>{data.grades.map((item) => <Item key={item.id} title={subjectName(item.subjectId)} meta={item.feedback || "Teacher released mark"} status="Result" detail={String(item.score)} />)}{data.grades.length === 0 && <Empty />}</View></SectionCard></>}
  </ScrollView>;
}
function Item({ title, meta, status, detail }: { title: string; meta: string; status: string; detail?: string }) { return <View style={styles.item}><View style={styles.itemText}><Text style={styles.itemTitle}>{title}</Text><Text style={styles.itemMeta}>{meta}</Text></View><View style={styles.itemRight}><Text style={styles.status}>{status}</Text>{detail ? <Text style={styles.detail}>{detail}</Text> : null}</View></View>; }
function Empty() { return <Text style={styles.empty}>Nothing has been shared here yet.</Text>; }
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: brandColors.field }, content: { padding: 16, paddingBottom: 32, gap: 14 }, eyebrow: { color: brandColors.primary, fontSize: 12, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" }, title: { color: brandColors.text, fontSize: 29, fontWeight: "800" }, stack: { gap: 10 }, item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e2e8f0" }, itemText: { flex: 1, paddingRight: 10 }, itemTitle: { color: brandColors.text, fontWeight: "800" }, itemMeta: { color: brandColors.muted, fontSize: 12, marginTop: 3 }, itemRight: { alignItems: "flex-end" }, status: { color: brandColors.primary, fontWeight: "700", fontSize: 12 }, detail: { color: brandColors.text, fontWeight: "900", marginTop: 3 }, empty: { color: brandColors.muted }, error: { color: brandColors.danger } });
