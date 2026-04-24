import { tool } from "ai";
import { z } from "zod";
import {
  fetchAllSubjects, fetchAllTopics, fetchAllLessons, fetchAllQuizzes,
  fetchQuizSubmissions, fetchAllAssignments, fetchAssignmentSubmissions,
  fetchProfiles, fetchSubjectClasses, fetchStudentSubjectClasses,
  fetchStudents, fetchSessionEvents, fetchGrades, fetchTeacherSubjectIds,
  findSubjectByName,
} from "./tool-helpers";

// ── schoolPerformanceDashboard ───────────────────────────────────────────

export const schoolPerformanceDashboard = tool({
  description: "Provide school-wide KPIs: total students, teachers, subjects, average quiz accuracy, assignment completion rates, and active user counts.",
  parameters: z.object({
    gradeTier: z.string().optional().describe("Filter by grade level (e.g. '10', 'Grade 10')"),
    period: z.enum(["today", "week", "month", "term"]).optional().describe("Time period for activity metrics"),
  }),
  execute: async ({ gradeTier, period = "month" }: { gradeTier?: string; period?: string }) => {
    const [subjects, quizzes, quizSubs, assignments, assignSubs, teachers, students, grades] = await Promise.all([
      fetchAllSubjects(), fetchAllQuizzes(), fetchQuizSubmissions(),
      fetchAllAssignments(), fetchAssignmentSubmissions(),
      fetchProfiles("teacher"), fetchStudents(), fetchGrades(),
    ]);

    let targetSubjects = subjects;
    if (gradeTier) {
      const normalised = gradeTier.replace(/\D/g, "");
      targetSubjects = subjects.filter(s => s.grade_tier?.replace(/\D/g, "") === normalised);
    }

    const targetSubjectIds = targetSubjects.map(s => s.id);
    const filteredQuizSubs = quizSubs.filter(s => quizzes.some(q => q.id === s.quiz_id && targetSubjectIds.includes(q.subject_id)));
    const filteredAssignSubs = assignSubs.filter(s => assignments.some(a => a.id === s.assignment_id && targetSubjectIds.includes(a.subject_id)));

    const avgQuizAccuracy = filteredQuizSubs.length > 0
      ? Math.round(filteredQuizSubs.reduce((s, q) => s + q.accuracy, 0) / filteredQuizSubs.length) : null;

    const publishedAssignments = assignments.filter(a => a.status === "published" && targetSubjectIds.includes(a.subject_id));
    const uniqueStudentSubmissions = new Set(filteredAssignSubs.map(s => `${s.student_id}-${s.assignment_id}`)).size;

    // Session activity
    const periodDays = { today: 1, week: 7, month: 30, term: 90 }[period] || 30;
    const since = new Date(Date.now() - periodDays * 86400000).toISOString();
    const sessions = await fetchSessionEvents(since);
    const activeUserIds = new Set(sessions.map(s => s.user_id));

    // Per-subject breakdown
    const subjectBreakdown = targetSubjects.map(subject => {
      const sQuizSubs = filteredQuizSubs.filter(s => quizzes.some(q => q.id === s.quiz_id && q.subject_id === subject.id));
      const sAssignSubs = filteredAssignSubs.filter(s => assignments.some(a => a.id === s.assignment_id && a.subject_id === subject.id));
      return {
        name: subject.name, grade: subject.grade_tier,
        quizSubmissions: sQuizSubs.length,
        avgAccuracy: sQuizSubs.length > 0 ? Math.round(sQuizSubs.reduce((s, q) => s + q.accuracy, 0) / sQuizSubs.length) : null,
        assignmentSubmissions: sAssignSubs.length,
      };
    }).sort((a, b) => (a.avgAccuracy ?? 0) - (b.avgAccuracy ?? 0));

    return {
      found: true,
      overview: {
        totalStudents: students.length, totalTeachers: teachers.length, totalSubjects: targetSubjects.length,
        totalQuizzes: quizzes.filter(q => targetSubjectIds.includes(q.subject_id)).length,
        totalAssignments: publishedAssignments.length,
        avgQuizAccuracy, totalQuizSubmissions: filteredQuizSubs.length,
        totalAssignmentSubmissions: filteredAssignSubs.length,
        activeUsersInPeriod: activeUserIds.size, period,
      },
      subjectBreakdown: subjectBreakdown.slice(0, 15),
      message: `School dashboard: ${students.length} students, ${teachers.length} teachers, ${targetSubjects.length} subjects.`,
    };
  },
});

// ── teacherEffectiveness ─────────────────────────────────────────────────

export const teacherEffectiveness = tool({
  description: "Analyze teacher activity and student outcomes per teacher: lessons created, assignments published, quizzes created, and student performance in their subjects.",
  parameters: z.object({
    teacherName: z.string().optional().describe("Optional: specific teacher to analyze"),
  }),
  execute: async ({ teacherName }: { teacherName?: string }) => {
    const [subjects, topics, lessons, quizzes, quizSubs, assignments, assignSubs, teacherProfiles] = await Promise.all([
      fetchAllSubjects(), fetchAllTopics(), fetchAllLessons(), fetchAllQuizzes(),
      fetchQuizSubmissions(), fetchAllAssignments(), fetchAssignmentSubmissions(), fetchProfiles("teacher"),
    ]);

    let targetTeachers = teacherProfiles;
    if (teacherName) {
      targetTeachers = teacherProfiles.filter(t => t.full_name.toLowerCase().includes(teacherName.toLowerCase()));
      if (targetTeachers.length === 0) {
        return { found: false, reason: "teacher_not_found", availableTeachers: teacherProfiles.map(t => t.full_name), message: `No teacher found matching "${teacherName}".` };
      }
    }

    const allClasses = await fetchSubjectClasses();

    const teacherAnalysis = await Promise.all(targetTeachers.map(async teacher => {
      const teacherSubjectIds = await fetchTeacherSubjectIds(teacher.id);
      const teacherClasses = allClasses.filter(c => c.teacher_id === teacher.id);
      const teacherSubjects = subjects.filter(s => teacherSubjectIds.includes(s.id));

      const teacherTopicIds = topics.filter(t => teacherSubjectIds.includes(t.subject_id)).map(t => t.id);
      const lessonCount = lessons.filter(l => teacherTopicIds.includes(l.topic_id)).length;
      const quizCount = quizzes.filter(q => teacherSubjectIds.includes(q.subject_id)).length;
      const assignmentCount = assignments.filter(a => teacherSubjectIds.includes(a.subject_id)).length;

      const teacherQuizSubs = quizSubs.filter(s => quizzes.some(q => q.id === s.quiz_id && teacherSubjectIds.includes(q.subject_id)));
      const avgStudentAccuracy = teacherQuizSubs.length > 0
        ? Math.round(teacherQuizSubs.reduce((s, q) => s + q.accuracy, 0) / teacherQuizSubs.length) : null;

      return {
        name: teacher.full_name, email: teacher.email,
        subjectsCount: teacherSubjects.length, classesCount: teacherClasses.length,
        contentCreated: { lessons: lessonCount, quizzes: quizCount, assignments: assignmentCount },
        studentOutcomes: { totalQuizSubmissions: teacherQuizSubs.length, avgStudentAccuracy },
        subjects: teacherSubjects.map(s => s.name),
      };
    }));

    return {
      found: true, teachers: teacherAnalysis.slice(0, 20),
      message: `Effectiveness report for ${teacherAnalysis.length} teacher(s).`,
    };
  },
});

// ── atRiskStudentFinder (school-wide) ────────────────────────────────────

export const atRiskStudentFinder = tool({
  description: "Find students school-wide who may be at risk of falling behind, based on quiz scores, missing assignments, and declining performance.",
  parameters: z.object({
    threshold: z.number().optional().describe("Grade percentage below which a student is at risk (default 40%)"),
    gradeTier: z.string().optional().describe("Optional: filter by grade level"),
  }),
  execute: async ({ threshold = 40, gradeTier }: { threshold?: number; gradeTier?: string }) => {
    const [subjects, quizzes, quizSubs, assignments, assignSubs, students, grades] = await Promise.all([
      fetchAllSubjects(), fetchAllQuizzes(), fetchQuizSubmissions(),
      fetchAllAssignments(), fetchAssignmentSubmissions(), fetchStudents(), fetchGrades(),
    ]);

    let targetStudents = students;
    if (gradeTier) {
      const normalised = gradeTier.replace(/\D/g, "");
      const gradeIds = grades.filter(g => String(g.level) === normalised || g.name.replace(/\D/g, "") === normalised).map(g => g.id);
      targetStudents = students.filter(s => gradeIds.includes(s.grade_id));
    }

    const atRiskList: Array<{
      studentName: string; grade: string; overallAccuracy: number | null;
      missingAssignments: number; riskFactors: string[];
    }> = [];

    for (const student of targetStudents) {
      const studentQuizSubs = quizSubs.filter(s => s.student_id === student.id);
      const avgAccuracy = studentQuizSubs.length > 0
        ? Math.round(studentQuizSubs.reduce((s, q) => s + q.accuracy, 0) / studentQuizSubs.length) : null;

      const publishedAssignments = assignments.filter(a => a.status === "published");
      const studentAssignSubs = assignSubs.filter(s => s.student_id === student.id);
      const submittedAssignIds = new Set(studentAssignSubs.map(s => s.assignment_id));
      const missing = publishedAssignments.filter(a => !submittedAssignIds.has(a.id)).length;

      const riskFactors: string[] = [];
      if (avgAccuracy !== null && avgAccuracy < threshold) riskFactors.push(`Low quiz accuracy: ${avgAccuracy}%`);
      if (missing > 3) riskFactors.push(`${missing} missing assignments`);
      if (studentQuizSubs.length === 0 && publishedAssignments.length > 0) riskFactors.push("No quiz activity");

      const gradeName = grades.find(g => g.id === student.grade_id)?.name || "";

      if (riskFactors.length > 0) {
        atRiskList.push({ studentName: student.name, grade: gradeName, overallAccuracy: avgAccuracy, missingAssignments: missing, riskFactors });
      }
    }

    atRiskList.sort((a, b) => (a.overallAccuracy ?? 0) - (b.overallAccuracy ?? 0));

    if (atRiskList.length === 0) {
      return { found: false, reason: "no_at_risk", threshold, message: `No at-risk students found below ${threshold}% threshold.` };
    }

    return {
      found: true, threshold, totalStudentsChecked: targetStudents.length,
      atRiskStudents: atRiskList.slice(0, 25),
      message: `Found ${atRiskList.length} at-risk students out of ${targetStudents.length} checked.`,
    };
  },
});

// ── departmentComparison ─────────────────────────────────────────────────

export const departmentComparison = tool({
  description: "Compare performance across subject departments/categories school-wide: average quiz accuracy, assignment completion, and content volume per department.",
  parameters: z.object({}),
  execute: async () => {
    const [subjects, topics, lessons, quizzes, quizSubs, assignments, assignSubs] = await Promise.all([
      fetchAllSubjects(), fetchAllTopics(), fetchAllLessons(), fetchAllQuizzes(),
      fetchQuizSubmissions(), fetchAllAssignments(), fetchAssignmentSubmissions(),
    ]);

    // Group by category or grade_tier
    const departments = new Map<string, { subjects: string[]; quizAccuracies: number[]; assignmentCounts: number; lessonCounts: number; submissionCounts: number }>();

    for (const subject of subjects) {
      const dept = subject.category || subject.grade_tier || "Uncategorized";
      if (!departments.has(dept)) {
        departments.set(dept, { subjects: [], quizAccuracies: [], assignmentCounts: 0, lessonCounts: 0, submissionCounts: 0 });
      }
      const d = departments.get(dept)!;
      d.subjects.push(subject.name);

      const subTopicIds = topics.filter(t => t.subject_id === subject.id).map(t => t.id);
      d.lessonCounts += lessons.filter(l => subTopicIds.includes(l.topic_id)).length;

      const subQuizzes = quizzes.filter(q => q.subject_id === subject.id);
      const subQuizSubs = quizSubs.filter(s => subQuizzes.some(q => q.id === s.quiz_id));
      subQuizSubs.forEach(s => d.quizAccuracies.push(s.accuracy));

      d.assignmentCounts += assignments.filter(a => a.subject_id === subject.id).length;
      d.submissionCounts += assignSubs.filter(s => assignments.some(a => a.id === s.assignment_id && a.subject_id === subject.id)).length;
    }

    const comparison = Array.from(departments.entries()).map(([dept, data]) => ({
      department: dept, subjectCount: data.subjects.length, subjects: data.subjects,
      totalLessons: data.lessonCounts, totalAssignments: data.assignmentCounts,
      totalSubmissions: data.submissionCounts,
      avgQuizAccuracy: data.quizAccuracies.length > 0 ? Math.round(data.quizAccuracies.reduce((s, a) => s + a, 0) / data.quizAccuracies.length) : null,
    })).sort((a, b) => (a.avgQuizAccuracy ?? 0) - (b.avgQuizAccuracy ?? 0));

    return { found: true, departments: comparison, message: `Compared ${comparison.length} departments.` };
  },
});

// ── attendanceTrends ─────────────────────────────────────────────────────

export const attendanceTrends = tool({
  description: "Analyze login/session data for attendance and engagement patterns. Shows daily active users, peak usage times, and students with low engagement.",
  parameters: z.object({
    period: z.enum(["week", "month", "term"]).optional().describe("Time period to analyze"),
  }),
  execute: async ({ period = "month" }: { period?: string }) => {
    const periodDays = { week: 7, month: 30, term: 90 }[period] || 30;
    const since = new Date(Date.now() - periodDays * 86400000).toISOString();

    const [sessions, students, teacherProfiles] = await Promise.all([
      fetchSessionEvents(since), fetchStudents(), fetchProfiles("teacher"),
    ]);

    if (sessions.length === 0) {
      return { found: false, reason: "no_session_data", message: "No session data available. The user_sessions table may not be populated." };
    }

    // Daily active users
    const dailyCounts: Record<string, Set<string>> = {};
    for (const session of sessions) {
      const date = (session.login_time || session.created_at || "").substring(0, 10);
      if (!date) continue;
      if (!dailyCounts[date]) dailyCounts[date] = new Set();
      dailyCounts[date].add(session.user_id);
    }

    const dailyActiveUsers = Object.entries(dailyCounts)
      .map(([date, users]) => ({ date, activeUsers: users.size }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Engagement by user
    const userSessionCounts: Record<string, number> = {};
    for (const session of sessions) {
      userSessionCounts[session.user_id] = (userSessionCounts[session.user_id] || 0) + 1;
    }

    const studentIds = new Set(students.map(s => s.id));
    const inactiveStudents = students.filter(s => !(s.id in userSessionCounts)).map(s => s.name);
    const lowEngagement = students
      .filter(s => (userSessionCounts[s.id] || 0) > 0 && (userSessionCounts[s.id] || 0) < 3)
      .map(s => ({ name: s.name, sessions: userSessionCounts[s.id] || 0 }));

    return {
      found: true, period,
      dailyActiveUsers: dailyActiveUsers.slice(-14),
      totalSessions: sessions.length,
      uniqueActiveUsers: Object.keys(userSessionCounts).length,
      inactiveStudents: inactiveStudents.slice(0, 15),
      lowEngagementStudents: lowEngagement.slice(0, 15),
      message: `Attendance trends for the last ${periodDays} days: ${sessions.length} sessions from ${Object.keys(userSessionCounts).length} unique users.`,
    };
  },
});

// ── resourceAllocation ───────────────────────────────────────────────────

export const resourceAllocation = tool({
  description: "Identify subjects and grades that need more teaching resources based on student outcomes, teacher workload, and content availability.",
  parameters: z.object({}),
  execute: async () => {
    const [subjects, topics, lessons, quizzes, quizSubs, assignments, teacherProfiles] = await Promise.all([
      fetchAllSubjects(), fetchAllTopics(), fetchAllLessons(), fetchAllQuizzes(),
      fetchQuizSubmissions(), fetchAllAssignments(), fetchProfiles("teacher"),
    ]);

    const allClasses = await fetchSubjectClasses();
    const ssc = await fetchStudentSubjectClasses();

    const subjectAnalysis = subjects.map(subject => {
      const subTopicIds = topics.filter(t => t.subject_id === subject.id).map(t => t.id);
      const lessonCount = lessons.filter(l => subTopicIds.includes(l.topic_id)).length;
      const quizCount = quizzes.filter(q => q.subject_id === subject.id).length;
      const assignmentCount = assignments.filter(a => a.subject_id === subject.id).length;

      const subClasses = allClasses.filter(c => c.subject_id === subject.id);
      const teacherIds = [...new Set(subClasses.map(c => c.teacher_id).filter(Boolean))];
      const studentCount = new Set(ssc.filter(s => subClasses.some(c => c.id === s.subject_class_id)).map(s => s.student_id)).size;

      const subQuizSubs = quizSubs.filter(s => quizzes.some(q => q.id === s.quiz_id && q.subject_id === subject.id));
      const avgAccuracy = subQuizSubs.length > 0 ? Math.round(subQuizSubs.reduce((s, q) => s + q.accuracy, 0) / subQuizSubs.length) : null;

      const studentTeacherRatio = teacherIds.length > 0 ? Math.round(studentCount / teacherIds.length) : studentCount;

      const needsAttention: string[] = [];
      if (lessonCount === 0) needsAttention.push("No lesson content");
      if (quizCount === 0) needsAttention.push("No quizzes");
      if (assignmentCount === 0) needsAttention.push("No assignments");
      if (avgAccuracy !== null && avgAccuracy < 40) needsAttention.push(`Low student performance (${avgAccuracy}%)`);
      if (studentTeacherRatio > 40) needsAttention.push(`High student-teacher ratio (${studentTeacherRatio}:1)`);
      if (teacherIds.length === 0) needsAttention.push("No teacher assigned");

      return {
        subjectName: subject.name, gradeTier: subject.grade_tier,
        teachers: teacherIds.length, students: studentCount,
        content: { lessons: lessonCount, quizzes: quizCount, assignments: assignmentCount },
        avgStudentAccuracy: avgAccuracy, studentTeacherRatio,
        needsAttention, urgency: needsAttention.length,
      };
    }).sort((a, b) => b.urgency - a.urgency);

    return {
      found: true,
      subjects: subjectAnalysis,
      criticalSubjects: subjectAnalysis.filter(s => s.urgency >= 2),
      message: `Resource analysis for ${subjectAnalysis.length} subjects. ${subjectAnalysis.filter(s => s.urgency >= 2).length} need attention.`,
    };
  },
});

// ── Export all principal tools ────────────────────────────────────────────

export const principalTools = {
  schoolPerformanceDashboard,
  teacherEffectiveness,
  atRiskStudentFinder,
  departmentComparison,
  attendanceTrends,
  resourceAllocation,
};
