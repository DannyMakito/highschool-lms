import { tool } from "ai";
import { z } from "zod";
import {
  fetchAllSubjects, fetchAllTopics, fetchAllLessons, fetchAllQuizzes,
  fetchQuizSubmissions, fetchAllAssignments, fetchAssignmentSubmissions,
  fetchTeacherSubjectIds, fetchSubjectClasses, fetchTeacherStudentIds,
  fetchProfiles, fetchGradebookData, findSubjectByName, getSubjectContent,
  stripHtml, truncate,
} from "./tool-helpers";

// ── generateQuiz ─────────────────────────────────────────────────────────

export const generateQuiz = tool({
  description: "Fetch lesson content so the AI can generate quiz questions matching the LMS quiz format (multiple-choice, fill-in-the-blank, true-or-false).",
  parameters: z.object({
    subjectName: z.string().describe("Subject to generate quiz for"),
    topicTitle: z.string().optional().describe("Specific topic within the subject"),
    questionCount: z.number().optional().describe("Number of questions (default 10)"),
    questionTypes: z.array(z.string()).optional().describe("Types: multiple-choice, fill-in-the-blank, true-or-false"),
  }),
  execute: async ({ subjectName, topicTitle, questionCount = 10, questionTypes }: { subjectName: string; topicTitle?: string; questionCount?: number; questionTypes?: string[] }) => {
    const [subjects, topics, lessons] = await Promise.all([fetchAllSubjects(), fetchAllTopics(), fetchAllLessons()]);
    const subject = findSubjectByName(subjects, subjectName);

    if (!subject) {
      return { found: false, reason: "subject_not_found", availableSubjects: subjects.map(s => s.name), message: `Subject "${subjectName}" not found.`, createSubjectUrl: "/teacher/subjects" };
    }

    const content = getSubjectContent(subject.id, topics, lessons);
    let targetContent = content;
    if (topicTitle) {
      const matched = content.filter(c => c.topicTitle.toLowerCase().includes(topicTitle.toLowerCase()));
      if (matched.length > 0) targetContent = matched;
    }

    const hasContent = targetContent.some(t => t.lessons.some(l => l.hasContent));
    if (!hasContent) {
      return {
        found: false, reason: "no_lesson_content", subjectName: subject.name,
        existingTopics: content.map(c => c.topicTitle),
        message: `${subject.name} has topics but no lesson content yet. Create lessons first, then I can generate quizzes from them.`,
        createLessonUrl: `/teacher/subjects`,
      };
    }

    const lessonTexts = targetContent.flatMap(t =>
      t.lessons.filter(l => l.hasContent).map(l => ({
        topicTitle: t.topicTitle, lessonTitle: l.lessonTitle, content: l.contentPreview,
      }))
    ).slice(0, 5);

    const types = questionTypes || ["multiple-choice", "fill-in-the-blank", "true-or-false"];

    return {
      found: true, subjectName: subject.name, gradeTier: subject.grade_tier,
      lessonContent: lessonTexts, questionCount, questionTypes: types,
      instruction: `Generate ${questionCount} quiz questions from the lesson content. Use these types: ${types.join(", ")}. Format each question with: text, type, options (for MC with isCorrect flags), correctAnswer (for fill-in-the-blank), and points value. Match the LMS Question schema.`,
      message: `Found ${lessonTexts.length} lessons to generate ${questionCount} questions from.`,
    };
  },
});

// ── reviewStudentWork ────────────────────────────────────────────────────

export const reviewStudentWork = tool({
  description: "Fetch student submission data so the AI can provide feedback suggestions. Can review a specific student or provide an overview of all submissions for an assessment.",
  parameters: z.object({
    studentName: z.string().optional().describe("Optional: specific student name to review"),
    assessmentTitle: z.string().optional().describe("Optional: specific quiz or assignment title"),
  }),
  execute: async ({ studentName, assessmentTitle }: { studentName?: string; assessmentTitle?: string }) => {
    const teacherId = (globalThis as any).__aiTutorUserId;
    if (!teacherId) return { found: false, reason: "not_authenticated", message: "User not authenticated." };

    const [subjects, quizzes, quizSubs, assignments, assignSubs, teacherSubjectIds] = await Promise.all([
      fetchAllSubjects(), fetchAllQuizzes(), fetchQuizSubmissions(),
      fetchAllAssignments(), fetchAssignmentSubmissions(), fetchTeacherSubjectIds(teacherId),
    ]);

    const teacherSubjects = subjects.filter(s => teacherSubjectIds.includes(s.id));

    // Filter by student if specified
    let targetQuizSubs = quizSubs.filter(s => quizzes.some(q => q.subject_id && teacherSubjectIds.includes(q.subject_id) && q.id === s.quiz_id));
    let targetAssignSubs = assignSubs.filter(s => assignments.some(a => a.subject_id && teacherSubjectIds.includes(a.subject_id) && a.id === s.assignment_id));

    if (studentName) {
      const profiles = await fetchProfiles("student");
      const matchedStudents = profiles.filter(p => p.full_name.toLowerCase().includes(studentName.toLowerCase()));
      if (matchedStudents.length === 0) {
        return { found: false, reason: "student_not_found", message: `No student found matching "${studentName}".` };
      }
      const studentIds = matchedStudents.map(p => p.id);
      targetQuizSubs = targetQuizSubs.filter(s => studentIds.includes(s.student_id));
      targetAssignSubs = targetAssignSubs.filter(s => studentIds.includes(s.student_id));
    }

    if (assessmentTitle) {
      const titleLower = assessmentTitle.toLowerCase();
      const matchedQuizIds = quizzes.filter(q => q.title.toLowerCase().includes(titleLower)).map(q => q.id);
      const matchedAssignIds = assignments.filter(a => a.title.toLowerCase().includes(titleLower)).map(a => a.id);
      targetQuizSubs = targetQuizSubs.filter(s => matchedQuizIds.includes(s.quiz_id));
      targetAssignSubs = targetAssignSubs.filter(s => matchedAssignIds.includes(s.assignment_id));
    }

    const quizReviews = targetQuizSubs.slice(0, 10).map(sub => {
      const quiz = quizzes.find(q => q.id === sub.quiz_id);
      return {
        type: "quiz", studentName: sub.student_name, quizTitle: quiz?.title || "Unknown",
        score: sub.score, totalPoints: sub.total_points, accuracy: sub.accuracy,
        incorrectAnswers: (sub.answers || []).filter(a => !a.isCorrect).map(a => {
          const q = (quiz?.questions || []).find((qq: any) => qq.id === a.questionId);
          return { question: q?.text || "", studentAnswer: Array.isArray(a.answer) ? a.answer.join(", ") : a.answer };
        }).slice(0, 5),
      };
    });

    const assignReviews = targetAssignSubs.slice(0, 10).map(sub => {
      const assignment = assignments.find(a => a.id === sub.assignment_id);
      return {
        type: "assignment", studentId: sub.student_id, assignmentTitle: assignment?.title || "Unknown",
        status: sub.status, grade: sub.total_grade, totalMarks: assignment?.total_marks || 0,
        feedback: sub.overall_feedback, contentPreview: sub.content ? truncate(stripHtml(sub.content), 500) : "No content",
      };
    });

    if (quizReviews.length === 0 && assignReviews.length === 0) {
      return { found: false, reason: "no_submissions", teacherSubjects: teacherSubjects.map(s => s.name), message: "No student submissions found for your subjects." };
    }

    return {
      found: true, quizSubmissions: quizReviews, assignmentSubmissions: assignReviews,
      instruction: "Review the student submissions and provide constructive feedback. For incorrect quiz answers, explain the correct concepts. For assignments, suggest improvements.",
      message: `Found ${quizReviews.length} quiz and ${assignReviews.length} assignment submissions to review.`,
    };
  },
});

// ── classroomAnalytics ───────────────────────────────────────────────────

export const classroomAnalytics = tool({
  description: "Provide classroom-level analytics: completion rates, average scores, submission timing, and engagement patterns for the teacher's subjects.",
  parameters: z.object({
    subjectName: z.string().optional().describe("Optional: filter to a specific subject"),
  }),
  execute: async ({ subjectName }: { subjectName?: string }) => {
    const teacherId = (globalThis as any).__aiTutorUserId;
    if (!teacherId) return { found: false, reason: "not_authenticated", message: "User not authenticated." };

    const [subjects, quizzes, quizSubs, assignments, assignSubs, teacherSubjectIds] = await Promise.all([
      fetchAllSubjects(), fetchAllQuizzes(), fetchQuizSubmissions(),
      fetchAllAssignments(), fetchAssignmentSubmissions(), fetchTeacherSubjectIds(teacherId),
    ]);

    let targetSubjects = subjects.filter(s => teacherSubjectIds.includes(s.id));
    if (subjectName) {
      const match = findSubjectByName(targetSubjects, subjectName);
      if (match) targetSubjects = [match];
    }

    if (targetSubjects.length === 0) {
      return { found: false, reason: "no_subjects", message: "No subjects assigned to you." };
    }

    const analytics = targetSubjects.map(subject => {
      const subQuizzes = quizzes.filter(q => q.subject_id === subject.id && q.status === "published");
      const subQuizSubs = quizSubs.filter(s => subQuizzes.some(q => q.id === s.quiz_id));
      const subAssignments = assignments.filter(a => a.subject_id === subject.id && a.status === "published");
      const subAssignSubs = assignSubs.filter(s => subAssignments.some(a => a.id === s.assignment_id));

      const avgQuizAccuracy = subQuizSubs.length > 0
        ? Math.round(subQuizSubs.reduce((s, q) => s + q.accuracy, 0) / subQuizSubs.length) : null;

      const gradedAssignments = subAssignSubs.filter(s => s.status === "graded");
      const avgAssignGrade = gradedAssignments.length > 0
        ? Math.round(gradedAssignments.reduce((sum, s) => {
            const a = subAssignments.find(a => a.id === s.assignment_id);
            return sum + (a ? (s.total_grade / a.total_marks) * 100 : 0);
          }, 0) / gradedAssignments.length) : null;

      return {
        subjectName: subject.name, gradeTier: subject.grade_tier,
        quizStats: { totalQuizzes: subQuizzes.length, totalSubmissions: subQuizSubs.length, avgAccuracy: avgQuizAccuracy, uniqueStudents: new Set(subQuizSubs.map(s => s.student_id)).size },
        assignmentStats: { totalAssignments: subAssignments.length, totalSubmissions: subAssignSubs.length, graded: gradedAssignments.length, pending: subAssignSubs.filter(s => s.status === "submitted").length, avgGrade: avgAssignGrade },
      };
    });

    return { found: true, subjects: analytics, message: `Analytics for ${analytics.length} subject(s).` };
  },
});

// ── findStruggleAreas ────────────────────────────────────────────────────

export const findStruggleAreas = tool({
  description: "Identify quiz questions and topics where the majority of students struggle, and find underperforming students. Suggest targeted improvement strategies.",
  parameters: z.object({
    subjectName: z.string().optional().describe("Optional: filter to a specific subject"),
    threshold: z.number().optional().describe("Accuracy threshold below which a question is flagged (default 50%)"),
  }),
  execute: async ({ subjectName, threshold = 50 }: { subjectName?: string; threshold?: number }) => {
    const teacherId = (globalThis as any).__aiTutorUserId;
    if (!teacherId) return { found: false, reason: "not_authenticated", message: "User not authenticated." };

    const [subjects, quizzes, quizSubs, teacherSubjectIds] = await Promise.all([
      fetchAllSubjects(), fetchAllQuizzes(), fetchQuizSubmissions(), fetchTeacherSubjectIds(teacherId),
    ]);

    let targetSubjects = subjects.filter(s => teacherSubjectIds.includes(s.id));
    if (subjectName) {
      const match = findSubjectByName(targetSubjects, subjectName);
      if (match) targetSubjects = [match];
    }

    const struggleQuestions: Array<{ subjectName: string; quizTitle: string; questionText: string; accuracy: number; totalAttempts: number }> = [];
    const studentPerformance: Record<string, { name: string; totalCorrect: number; totalAttempts: number }> = {};

    for (const subject of targetSubjects) {
      const subQuizzes = quizzes.filter(q => q.subject_id === subject.id && q.status === "published");
      for (const quiz of subQuizzes) {
        const subs = quizSubs.filter(s => s.quiz_id === quiz.id);
        if (subs.length === 0) continue;

        for (const question of (quiz.questions || [])) {
          const attempts = subs.length;
          const correct = subs.filter(s => (s.answers || []).find(a => a.questionId === question.id)?.isCorrect).length;
          const accuracy = Math.round((correct / attempts) * 100);

          if (accuracy < threshold) {
            struggleQuestions.push({ subjectName: subject.name, quizTitle: quiz.title, questionText: question.text, accuracy, totalAttempts: attempts });
          }
        }

        for (const sub of subs) {
          if (!studentPerformance[sub.student_id]) {
            studentPerformance[sub.student_id] = { name: sub.student_name, totalCorrect: 0, totalAttempts: 0 };
          }
          const correctInSub = (sub.answers || []).filter(a => a.isCorrect).length;
          studentPerformance[sub.student_id].totalCorrect += correctInSub;
          studentPerformance[sub.student_id].totalAttempts += (sub.answers || []).length;
        }
      }
    }

    const underperformingStudents = Object.entries(studentPerformance)
      .map(([id, data]) => ({ studentId: id, name: data.name, overallAccuracy: data.totalAttempts > 0 ? Math.round((data.totalCorrect / data.totalAttempts) * 100) : 0 }))
      .filter(s => s.overallAccuracy < threshold)
      .sort((a, b) => a.overallAccuracy - b.overallAccuracy);

    if (struggleQuestions.length === 0 && underperformingStudents.length === 0) {
      return { found: false, reason: "no_struggles", message: `No questions below ${threshold}% accuracy and no underperforming students found. Great work!` };
    }

    return {
      found: true, threshold,
      struggleQuestions: struggleQuestions.sort((a, b) => a.accuracy - b.accuracy).slice(0, 15),
      underperformingStudents: underperformingStudents.slice(0, 10),
      instruction: "Analyze the struggle areas and suggest specific strategies: re-teaching approaches, additional resources, or one-on-one support recommendations.",
      message: `Found ${struggleQuestions.length} low-accuracy questions and ${underperformingStudents.length} underperforming students.`,
    };
  },
});

// ── atRiskStudentFinder (teacher-scoped) ─────────────────────────────────

export const teacherAtRiskStudentFinder = tool({
  description: "Find students at risk of falling behind across all subjects/classes assigned to this teacher. Checks quiz scores, assignment submissions, and grade trends.",
  parameters: z.object({
    threshold: z.number().optional().describe("Grade percentage below which a student is at risk (default 40%)"),
  }),
  execute: async ({ threshold = 40 }: { threshold?: number }) => {
    const teacherId = (globalThis as any).__aiTutorUserId;
    if (!teacherId) return { found: false, reason: "not_authenticated", message: "User not authenticated." };

    const [subjects, quizzes, quizSubs, assignments, assignSubs, teacherSubjectIds, teacherStudentIds] = await Promise.all([
      fetchAllSubjects(), fetchAllQuizzes(), fetchQuizSubmissions(),
      fetchAllAssignments(), fetchAssignmentSubmissions(),
      fetchTeacherSubjectIds(teacherId), fetchTeacherStudentIds(teacherId),
    ]);

    if (teacherStudentIds.length === 0) {
      return { found: false, reason: "no_students", message: "No students found in your classes." };
    }

    const profiles = await fetchProfiles("student");
    const profileMap = new Map(profiles.map(p => [p.id, p.full_name]));

    const atRiskStudents: Array<{
      studentName: string; overallAccuracy: number | null; missingAssignments: number;
      subjects: Array<{ name: string; quizAccuracy: number | null; assignmentsSubmitted: number; assignmentsTotal: number }>;
      riskFactors: string[];
    }> = [];

    for (const studentId of teacherStudentIds) {
      const studentName = profileMap.get(studentId) || studentId;
      const riskFactors: string[] = [];
      const subjectDetails: Array<{ name: string; quizAccuracy: number | null; assignmentsSubmitted: number; assignmentsTotal: number }> = [];

      let totalAccuracySum = 0;
      let accuracyCount = 0;
      let totalMissing = 0;

      for (const subjectId of teacherSubjectIds) {
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) continue;

        const subQuizzes = quizzes.filter(q => q.subject_id === subjectId && q.status === "published");
        const studentQuizSubs = quizSubs.filter(s => s.student_id === studentId && subQuizzes.some(q => q.id === s.quiz_id));
        const avgAcc = studentQuizSubs.length > 0 ? Math.round(studentQuizSubs.reduce((s, q) => s + q.accuracy, 0) / studentQuizSubs.length) : null;

        const subAssignments = assignments.filter(a => a.subject_id === subjectId && a.status === "published");
        const studentAssignSubs = assignSubs.filter(s => s.student_id === studentId && subAssignments.some(a => a.id === s.assignment_id));
        const missing = subAssignments.length - studentAssignSubs.length;

        subjectDetails.push({ name: subject.name, quizAccuracy: avgAcc, assignmentsSubmitted: studentAssignSubs.length, assignmentsTotal: subAssignments.length });

        if (avgAcc !== null) { totalAccuracySum += avgAcc; accuracyCount++; }
        totalMissing += Math.max(0, missing);

        if (avgAcc !== null && avgAcc < threshold) riskFactors.push(`Low quiz accuracy in ${subject.name} (${avgAcc}%)`);
        if (missing > 1) riskFactors.push(`${missing} missing assignments in ${subject.name}`);
      }

      const overallAccuracy = accuracyCount > 0 ? Math.round(totalAccuracySum / accuracyCount) : null;
      if (riskFactors.length > 0 || (overallAccuracy !== null && overallAccuracy < threshold) || totalMissing > 2) {
        atRiskStudents.push({ studentName, overallAccuracy, missingAssignments: totalMissing, subjects: subjectDetails, riskFactors });
      }
    }

    atRiskStudents.sort((a, b) => (a.overallAccuracy ?? 0) - (b.overallAccuracy ?? 0));

    if (atRiskStudents.length === 0) {
      return { found: false, reason: "no_at_risk", threshold, message: `No at-risk students found below ${threshold}% threshold. Your students are doing well!` };
    }

    return {
      found: true, threshold, totalStudentsChecked: teacherStudentIds.length,
      atRiskStudents: atRiskStudents.slice(0, 15),
      instruction: "For each at-risk student, suggest specific interventions: extra practice, one-on-one sessions, or simplified materials for their weak areas.",
      message: `Found ${atRiskStudents.length} at-risk students out of ${teacherStudentIds.length} total.`,
    };
  },
});

// ── lessonPlanAssistant ──────────────────────────────────────────────────

export const lessonPlanAssistant = tool({
  description: "Help a teacher plan lessons for a subject. Fetches existing subject structure so the AI can suggest what topics and lessons to add next.",
  parameters: z.object({
    subjectName: z.string().describe("The subject to plan lessons for"),
    gradeLevel: z.string().optional().describe("Grade level (8-12)"),
  }),
  execute: async ({ subjectName, gradeLevel }: { subjectName: string; gradeLevel?: string }) => {
    const [subjects, topics, lessons] = await Promise.all([fetchAllSubjects(), fetchAllTopics(), fetchAllLessons()]);
    const subject = findSubjectByName(subjects, subjectName);

    if (!subject) {
      return {
        found: false, reason: "subject_not_found", availableSubjects: subjects.map(s => ({ name: s.name, grade: s.grade_tier })),
        message: `Subject "${subjectName}" not found. Create it first in Subject Management.`, createSubjectUrl: "/teacher/subjects",
      };
    }

    const content = getSubjectContent(subject.id, topics, lessons);
    const isEmpty = content.length === 0 || content.every(t => t.lessons.length === 0);

    return {
      found: true, subject: { name: subject.name, grade: subject.grade_tier, description: subject.description },
      existingContent: content, isEmpty,
      instruction: isEmpty
        ? `This subject has no content yet. Use your knowledge of the ${gradeLevel || subject.grade_tier} grade curriculum to suggest a complete topic outline with lesson titles. Structure it as numbered topics with bullet-point lessons under each.`
        : `This subject has existing content. Review what's there and suggest what topics or lessons should be added next to complete the curriculum. Identify gaps.`,
      message: isEmpty ? `${subject.name} has no content. Ready to plan from scratch.` : `${subject.name} has ${content.length} topics with ${content.reduce((s, t) => s + t.lessons.length, 0)} lessons.`,
    };
  },
});

// ── lessonContentGenerator ───────────────────────────────────────────────

export const lessonContentGenerator = tool({
  description: "Generate detailed lesson content for a specific topic. Provides existing context so the AI can create comprehensive lesson material the teacher can use.",
  parameters: z.object({
    subjectName: z.string().describe("Subject the lesson belongs to"),
    topicTitle: z.string().describe("Topic to generate lesson content for"),
    lessonTitle: z.string().describe("Title of the lesson to generate"),
    style: z.enum(["detailed", "summary", "interactive"]).optional().describe("Content style"),
  }),
  execute: async ({ subjectName, topicTitle, lessonTitle, style = "detailed" }: { subjectName: string; topicTitle: string; lessonTitle: string; style?: string }) => {
    const [subjects, topics, lessons] = await Promise.all([fetchAllSubjects(), fetchAllTopics(), fetchAllLessons()]);
    const subject = findSubjectByName(subjects, subjectName);

    if (!subject) {
      return { found: false, reason: "subject_not_found", availableSubjects: subjects.map(s => s.name), message: `Subject "${subjectName}" not found.` };
    }

    const existingContent = getSubjectContent(subject.id, topics, lessons);
    const existingTopicTitles = existingContent.map(c => c.topicTitle);

    return {
      found: true,
      subject: { name: subject.name, grade: subject.grade_tier },
      topicTitle, lessonTitle, style,
      existingTopics: existingTopicTitles,
      instruction: `Generate comprehensive lesson content for "${lessonTitle}" under the topic "${topicTitle}" in ${subject.name} (Grade ${subject.grade_tier}). Style: ${style}. Include: introduction, key concepts with explanations, examples, and a summary. Format with clear headings and paragraphs suitable for a rich text editor.`,
      message: `Ready to generate ${style} content for "${lessonTitle}".`,
    };
  },
});

// ── Export all teacher tools ─────────────────────────────────────────────

export const teacherTools = {
  generateQuiz,
  reviewStudentWork,
  classroomAnalytics,
  findStruggleAreas,
  teacherAtRiskStudentFinder,
  lessonPlanAssistant,
  lessonContentGenerator,
};
