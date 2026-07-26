import { Link, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SectionCard } from "../../src/components/SectionCard";
import { useAuth } from "../../src/context/AuthContext";
import { useSubjectHub } from "../../src/features/subjects/useSubjectHub";
import { brandColors } from "../../src/theme/brand";

function formatDate(value?: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatLongDate(value?: string | null) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function SubjectDetailScreen() {
  const params = useLocalSearchParams<{ subjectId?: string }>();
  const subjectId = Array.isArray(params.subjectId) ? params.subjectId[0] : params.subjectId;
  const { activeChild, children } = useAuth();
  const { data, loading, errorMessage } = useSubjectHub(activeChild?.id, subjectId);

  const subject = data.subject;
  const subjectAssignments = data.assignments;
  const subjectGrades = data.grades;
  const subjectConversations = data.conversations;
  const subjectAnnouncements = data.announcements;
  const topicCount = data.topics.length;
  const lessonCount = data.lessons.length;
  const quizCount = data.quizzes.length;
  const averageScore = subjectGrades.length
    ? Math.round(subjectGrades.reduce((sum, item) => sum + item.score, 0) / subjectGrades.length)
    : null;
  const latestGrade = subjectGrades[0]?.score ?? null;
  const upcomingHomework = [...subjectAssignments]
    .sort((a, b) => {
      const left = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const right = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return left - right;
    })
    .slice(0, 4);
  const groupedLessons = data.topics.map((topic) => ({
    ...topic,
    lessons: data.lessons.filter((lesson) => lesson.topicId === topic.id),
  }));

  const childName = activeChild?.fullName || children[0]?.fullName || "Learner";

  if (!subjectId) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Academics</Text>
        <Text style={styles.title}>Subject hub unavailable</Text>
        <Text style={styles.body}>We could not determine which subject you want to open.</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Link href="/subjects" asChild>
        <Pressable style={styles.backButton}>
          <Text style={styles.backText}>Back to subjects</Text>
        </Pressable>
      </Link>

      <Text style={styles.eyebrow}>{childName}</Text>
      <Text style={styles.title}>{subject?.name || "Subject"}</Text>
      <Text style={styles.subtitle}>
        {subject?.description || "Everything parents need for this subject in one place: content, assignments, quizzes, homework, and updates."}
      </Text>

      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillLabel}>Grade</Text>
            <Text style={styles.heroPillValue}>{subject?.gradeTier || "Pending"}</Text>
          </View>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillLabel}>Category</Text>
            <Text style={styles.heroPillValue}>{subject?.category || "General"}</Text>
          </View>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillLabel}>Lessons</Text>
            <Text style={styles.heroPillValue}>{lessonCount}</Text>
          </View>
        </View>
        <View style={styles.heroRowSecondary}>
          <View style={styles.miniMetric}>
            <Text style={styles.miniMetricValue}>{topicCount}</Text>
            <Text style={styles.miniMetricLabel}>Topics</Text>
          </View>
          <View style={styles.miniMetric}>
            <Text style={styles.miniMetricValue}>{quizCount}</Text>
            <Text style={styles.miniMetricLabel}>Quizzes</Text>
          </View>
          <View style={styles.miniMetric}>
            <Text style={styles.miniMetricValue}>{subjectAssignments.length}</Text>
            <Text style={styles.miniMetricLabel}>Tasks</Text>
          </View>
          <View style={styles.miniMetric}>
            <Text style={styles.miniMetricValue}>{averageScore !== null ? `${averageScore}%` : "N/A"}</Text>
            <Text style={styles.miniMetricLabel}>Avg</Text>
          </View>
        </View>
      </View>

      <SectionCard title="Learning content" subtitle="Topics and lessons the learner can work through.">
        {loading ? <ActivityIndicator color={brandColors.primary} /> : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {!loading && groupedLessons.length === 0 ? (
          <Text style={styles.body}>No lesson content has been published for this subject yet.</Text>
        ) : (
          <View style={styles.stack}>
            {groupedLessons.map((topic, index) => (
              <View key={topic.id} style={styles.topicBlock}>
                <View style={styles.topicHeader}>
                  <Text style={styles.topicIndex}>{index + 1}</Text>
                  <View style={styles.topicHeaderText}>
                    <Text style={styles.topicTitle}>{topic.title}</Text>
                    <Text style={styles.topicMeta}>{topic.lessonCount} lesson{topic.lessonCount === 1 ? "" : "s"}</Text>
                  </View>
                </View>
                <View style={styles.lessonStack}>
                  {topic.lessons.length > 0 ? topic.lessons.map((lesson) => (
                    <View key={lesson.id} style={styles.lessonRow}>
                      <View style={styles.lessonDot} />
                      <View style={styles.lessonTextWrap}>
                        <Text style={styles.lessonTitle}>{lesson.title}</Text>
                        <Text style={styles.lessonPreview}>{lesson.preview || "Lesson content will appear here once the teacher publishes it."}</Text>
                      </View>
                    </View>
                  )) : (
                    <Text style={styles.body}>No lessons in this topic yet.</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Homework" subtitle="Upcoming tasks parents usually want to keep an eye on.">
        {subjectAssignments.length === 0 ? (
          <Text style={styles.body}>No homework has been published for this subject yet.</Text>
        ) : (
          <View style={styles.stack}>
            {upcomingHomework.map((assignment) => (
              <View key={assignment.id} style={styles.workRow}>
                <View style={styles.workIcon}><Text style={styles.workIconText}>HW</Text></View>
                <View style={styles.workBody}>
                  <Text style={styles.workTitle}>{assignment.title}</Text>
                  <Text style={styles.workMeta}>{assignment.status || "Published"} • Due {formatDate(assignment.dueDate)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Assignments" subtitle="Every published task linked to this subject.">
        {subjectAssignments.length === 0 ? (
          <Text style={styles.body}>No assignments are available yet.</Text>
        ) : (
          <View style={styles.stack}>
            {subjectAssignments.map((assignment) => (
              <View key={assignment.id} style={styles.assignmentRow}>
                <View>
                  <Text style={styles.assignmentTitle}>{assignment.title}</Text>
                  <Text style={styles.assignmentMeta}>{assignment.availableFrom ? `Available ${formatLongDate(assignment.availableFrom)}` : "Available now"}</Text>
                </View>
                <Text style={styles.assignmentStatus}>{assignment.dueDate ? `Due ${formatDate(assignment.dueDate)}` : assignment.status || "Open"}</Text>
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Quizzes" subtitle="Published quiz checkpoints and revisions.">
        {quizCount === 0 ? (
          <Text style={styles.body}>No quizzes have been published for this subject yet.</Text>
        ) : (
          <View style={styles.stack}>
            {data.quizzes.map((quiz) => (
              <View key={quiz.id} style={styles.quizRow}>
                <View style={styles.quizBadge}><Text style={styles.quizBadgeText}>{quiz.questionsCount}</Text></View>
                <View style={styles.quizBody}>
                  <Text style={styles.quizTitle}>{quiz.title}</Text>
                  <Text style={styles.quizMeta}>{quiz.description || "Quiz details and instructions"}</Text>
                </View>
                <Text style={styles.quizStatus}>{quiz.pointsPossible ? `${quiz.pointsPossible} pts` : "Quiz"}</Text>
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Performance" subtitle="Grades and feedback by assessment.">
        {subjectGrades.length === 0 ? (
          <Text style={styles.body}>No grades are available yet for this subject.</Text>
        ) : (
          <View style={styles.stack}>
            <View style={styles.metricRow}>
              <Text style={styles.metric}>Average score</Text>
              <Text style={styles.metricValue}>{averageScore !== null ? `${averageScore}%` : "N/A"}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metric}>Latest score</Text>
              <Text style={styles.metricValue}>{latestGrade !== null ? `${latestGrade}%` : "N/A"}</Text>
            </View>
            {subjectGrades.slice(0, 4).map((grade) => (
              <View key={grade.id} style={styles.gradeRow}>
                <View>
                  <Text style={styles.assignmentTitle}>Assessment score</Text>
                  <Text style={styles.assignmentMeta}>{grade.feedback || "No feedback added yet."}</Text>
                </View>
                <Text style={styles.scoreValue}>{grade.score.toFixed(1)}%</Text>
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Teacher conversations" subtitle="Recent subject discussions and replies.">
        {subjectConversations.length === 0 ? (
          <Text style={styles.body}>No conversation threads have started for this subject yet.</Text>
        ) : (
          <View style={styles.stack}>
            {subjectConversations.slice(0, 4).map((thread) => (
              <View key={thread.id} style={styles.threadRow}>
                <View>
                  <Text style={styles.assignmentTitle}>{thread.title}</Text>
                  <Text style={styles.assignmentMeta}>{thread.authorName || "Teacher"} • {thread.replyCount} repl{thread.replyCount === 1 ? "y" : "ies"}</Text>
                </View>
                <Text style={styles.threadPreview}>{thread.preview}</Text>
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Announcements" subtitle="Relevant notices tied to the learner's subject activity.">
        {subjectAnnouncements.length === 0 ? (
          <Text style={styles.body}>No announcements are available yet.</Text>
        ) : (
          <View style={styles.stack}>
            {subjectAnnouncements.slice(0, 4).map((announcement) => (
              <View key={announcement.id} style={styles.announcementRow}>
                <Text style={styles.assignmentTitle}>{announcement.title}</Text>
                <Text style={styles.assignmentMeta}>{announcement.authorName ? `By ${announcement.authorName}` : "School announcement"} • {formatLongDate(announcement.createdAt)}</Text>
                <Text style={styles.threadPreview}>{announcement.content}</Text>
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
    backgroundColor: brandColors.field,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: brandColors.border,
    backgroundColor: brandColors.card,
  },
  backText: {
    color: brandColors.primary,
    fontWeight: "800",
  },
  eyebrow: {
    color: brandColors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    color: brandColors.text,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 34,
  },
  subtitle: {
    color: brandColors.muted,
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 22,
  },
  heroCard: {
    backgroundColor: brandColors.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: brandColors.border,
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  heroRowSecondary: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    flexWrap: "wrap",
  },
  heroPill: {
    flexGrow: 1,
    minWidth: 92,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 18,
  },
  heroPillLabel: {
    color: brandColors.placeholder,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  heroPillValue: {
    color: brandColors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  miniMetric: {
    flex: 1,
    minWidth: 74,
    padding: 12,
    borderRadius: 18,
    backgroundColor: brandColors.primarySoft,
  },
  miniMetricValue: {
    color: brandColors.primaryDark,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 3,
  },
  miniMetricLabel: {
    color: brandColors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
  },
  stack: {
    gap: 12,
  },
  body: {
    color: brandColors.muted,
    lineHeight: 20,
  },
  error: {
    color: brandColors.danger,
    marginBottom: 8,
  },
  topicBlock: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  topicHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  topicIndex: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: brandColors.primary,
    color: brandColors.white,
    textAlign: "center",
    textAlignVertical: "center",
    fontWeight: "900",
    overflow: "hidden",
    lineHeight: 28,
  },
  topicHeaderText: {
    flex: 1,
  },
  topicTitle: {
    color: brandColors.text,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 2,
  },
  topicMeta: {
    color: brandColors.placeholder,
    fontSize: 12,
  },
  lessonStack: {
    gap: 10,
  },
  lessonRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  lessonDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: brandColors.primary,
    marginTop: 5,
  },
  lessonTextWrap: {
    flex: 1,
  },
  lessonTitle: {
    color: brandColors.text,
    fontWeight: "800",
    marginBottom: 2,
  },
  lessonPreview: {
    color: brandColors.muted,
    lineHeight: 19,
  },
  assignmentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brandColors.border,
  },
  assignmentTitle: {
    color: brandColors.text,
    fontWeight: "800",
    marginBottom: 4,
  },
  assignmentMeta: {
    color: brandColors.placeholder,
    lineHeight: 18,
  },
  assignmentStatus: {
    minWidth: 90,
    textAlign: "right",
    color: brandColors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  workRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingVertical: 8,
  },
  workIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: brandColors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  workIconText: {
    color: brandColors.primaryDark,
    fontWeight: "900",
    fontSize: 12,
  },
  workBody: {
    flex: 1,
  },
  workTitle: {
    color: brandColors.text,
    fontWeight: "800",
    marginBottom: 4,
  },
  workMeta: {
    color: brandColors.placeholder,
  },
  quizRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brandColors.border,
  },
  quizBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: brandColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  quizBadgeText: {
    color: brandColors.white,
    fontWeight: "900",
    fontSize: 15,
  },
  quizBody: {
    flex: 1,
  },
  quizTitle: {
    color: brandColors.text,
    fontWeight: "800",
    marginBottom: 4,
  },
  quizMeta: {
    color: brandColors.placeholder,
    lineHeight: 18,
  },
  quizStatus: {
    minWidth: 64,
    textAlign: "right",
    color: brandColors.primaryDark,
    fontWeight: "800",
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  metric: {
    color: brandColors.muted,
    fontWeight: "700",
  },
  metricValue: {
    color: brandColors.text,
    fontWeight: "900",
  },
  gradeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brandColors.border,
  },
  scoreValue: {
    minWidth: 70,
    textAlign: "right",
    color: brandColors.primary,
    fontSize: 18,
    fontWeight: "900",
  },
  threadRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brandColors.border,
  },
  threadPreview: {
    color: brandColors.muted,
    lineHeight: 19,
  },
  announcementRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brandColors.border,
  },
});
