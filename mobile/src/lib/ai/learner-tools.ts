import { tool } from "ai";
import { z } from "zod";
import {
  fetchAllSubjects, fetchAllTopics, fetchAllLessons, fetchAllQuizzes,
  fetchQuizSubmissions, fetchAllAssignments, fetchAssignmentSubmissions,
  fetchStudentEnrolledSubjectIds, fetchGradebookData, fetchLessonProgress,
  findSubjectByName, getSubjectContent, stripHtml, truncate,
  type SubjectRow, type TopicRow, type LessonRow,
} from "./tool-helpers";

// ── analyzeMyProgress ────────────────────────────────────────────────────

export const analyzeMyProgress = tool({
  description: "Analyze the current learner's academic progress across all enrolled subjects including quiz scores, assignment grades, lesson completion, and gradebook data.",
  parameters: z.object({
    subjectName: z.string().optional().describe("Optional: filter to a specific subject by name"),
  }),
  execute: async ({ subjectName }: { subjectName?: string }, { toolCallId }: any) => {
    const userId = (globalThis as any).__aiTutorUserId;
    if (!userId) return { found: false, reason: "not_authenticated", message: "User not authenticated." };

    const [subjects, topics, lessons, quizzes, quizSubs, assignments, assignSubs, enrolledIds, completedLessonIds] = await Promise.all([
      fetchAllSubjects(), fetchAllTopics(), fetchAllLessons(), fetchAllQuizzes(),
      fetchQuizSubmissions(userId), fetchAllAssignments(), fetchAssignmentSubmissions(userId),
      fetchStudentEnrolledSubjectIds(userId), fetchLessonProgress(userId),
    ]);

    let targetSubjects = subjects.filter(s => enrolledIds.includes(s.id));
    if (subjectName) {
      const match = findSubjectByName(targetSubjects, subjectName);
      if (match) targetSubjects = [match];
      else return { found: false, reason: "subject_not_found", enrolledSubjects: targetSubjects.map(s => s.name), message: `Subject "${subjectName}" not found in your enrollments.` };
    }

    if (targetSubjects.length === 0) {
      return { found: false, reason: "no_enrolled_subjects", message: "You are not enrolled in any subjects yet. Contact your admin.", availableSubjects: subjects.map(s => s.name) };
    }

    const { groups, scores } = await fetchGradebookData(userId, targetSubjects.map(s => s.id));

    const subjectProgress = targetSubjects.map(subject => {
      const subjectTopicIds = topics.filter(t => t.subject_id === subject.id).map(t => t.id);
      const subjectLessons = lessons.filter(l => subjectTopicIds.includes(l.topic_id));
      const completedCount = subjectLessons.filter(l => completedLessonIds.includes(l.id)).length;

      const subjectQuizSubs = quizSubs.filter(qs => {
        const quiz = quizzes.find(q => q.id === qs.quiz_id);
        return quiz && quiz.subject_id === subject.id;
      });
      const avgQuizAccuracy = subjectQuizSubs.length > 0
        ? Math.round(subjectQuizSubs.reduce((sum, s) => sum + s.accuracy, 0) / subjectQuizSubs.length)
        : null;

      const subjectAssignments = assignments.filter(a => a.subject_id === subject.id && a.status === "published");
      const subjectAssignSubs = assignSubs.filter(as => subjectAssignments.some(a => a.id === as.assignment_id));
      const gradedSubs = subjectAssignSubs.filter(s => s.status === "graded" && s.is_released);
      const avgAssignGrade = gradedSubs.length > 0
        ? Math.round(gradedSubs.reduce((sum, s) => {
            const assignment = subjectAssignments.find(a => a.id === s.assignment_id);
            return sum + (assignment ? (s.total_grade / assignment.total_marks) * 100 : 0);
          }, 0) / gradedSubs.length)
        : null;

      const subjectGroups = groups.filter(g => g.subject_id === subject.id);
      const yearMark = subjectGroups.reduce((sum, group) => {
        const maxPts = (group.max_points && group.max_points > 0) ? group.max_points : 5;
        const score = scores.find(s => s.assignment_group_id === group.id)?.score ?? 0;
        return sum + (score / maxPts) * group.weight_percentage;
      }, 0);

      return {
        subjectName: subject.name,
        gradeTier: subject.grade_tier,
        lessonProgress: { completed: completedCount, total: subjectLessons.length, percentage: subjectLessons.length > 0 ? Math.round((completedCount / subjectLessons.length) * 100) : 0 },
        quizPerformance: { attempted: subjectQuizSubs.length, avgAccuracy: avgQuizAccuracy },
        assignmentPerformance: { submitted: subjectAssignSubs.length, total: subjectAssignments.length, graded: gradedSubs.length, avgGradePercentage: avgAssignGrade },
        yearMark: Math.round(yearMark * 10) / 10,
        url: `/student/subjects/${subject.id}/outline`,
      };
    });

    return { found: true, message: `Progress analysis for ${subjectProgress.length} subject(s).`, subjects: subjectProgress };
  },
});

// ── findMyWeaknesses ─────────────────────────────────────────────────────

export const findMyWeaknesses = tool({
  description: "Identify specific topics and question areas where the learner struggles, based on incorrect quiz answers and low assignment grades.",
  parameters: z.object({
    subjectName: z.string().optional().describe("Optional: narrow analysis to one subject"),
  }),
  execute: async ({ subjectName }: { subjectName?: string }) => {
    const userId = (globalThis as any).__aiTutorUserId;
    if (!userId) return { found: false, reason: "not_authenticated", message: "User not authenticated." };

    const [subjects, topics, lessons, quizzes, quizSubs, enrolledIds] = await Promise.all([
      fetchAllSubjects(), fetchAllTopics(), fetchAllLessons(), fetchAllQuizzes(),
      fetchQuizSubmissions(userId), fetchStudentEnrolledSubjectIds(userId),
    ]);

    let targetSubjects = subjects.filter(s => enrolledIds.includes(s.id));
    if (subjectName) {
      const match = findSubjectByName(targetSubjects, subjectName);
      if (match) targetSubjects = [match];
      else return { found: false, reason: "subject_not_found", enrolledSubjects: targetSubjects.map(s => s.name), message: `Subject "${subjectName}" not found.` };
    }

    if (quizSubs.length === 0) {
      return { found: false, reason: "no_submissions", message: "You haven't taken any quizzes yet. Take some quizzes first so I can analyze your weak areas!", enrolledSubjects: targetSubjects.map(s => s.name) };
    }

    const weakAreas: Array<{ subjectName: string; quizTitle: string; questionText: string; yourAnswer: string; correctAnswer: string; topicTitle: string; lessonUrl: string }> = [];

    for (const subject of targetSubjects) {
      const subjectQuizzes = quizzes.filter(q => q.subject_id === subject.id);
      for (const quiz of subjectQuizzes) {
        const submissions = quizSubs.filter(s => s.quiz_id === quiz.id);
        for (const sub of submissions) {
          for (const ans of (sub.answers || [])) {
            if (ans.isCorrect) continue;
            const question = (quiz.questions || []).find((q: any) => q.id === ans.questionId);
            if (!question) continue;

            let correctAnswer = "";
            if (question.type === "fill-in-the-blank") {
              correctAnswer = question.correctAnswer || "";
            } else {
              correctAnswer = (question.options || []).filter((o: any) => o.isCorrect).map((o: any) => o.text).join(", ");
            }

            weakAreas.push({
              subjectName: subject.name,
              quizTitle: quiz.title,
              questionText: question.text,
              yourAnswer: Array.isArray(ans.answer) ? ans.answer.join(", ") : String(ans.answer),
              correctAnswer,
              topicTitle: quiz.title,
              lessonUrl: `/student/subjects/${subject.id}/outline`,
            });
          }
        }
      }
    }

    // Aggregate by subject
    const bySubject: Record<string, number> = {};
    for (const area of weakAreas) {
      bySubject[area.subjectName] = (bySubject[area.subjectName] || 0) + 1;
    }

    return {
      found: weakAreas.length > 0,
      totalWeakAreas: weakAreas.length,
      summary: Object.entries(bySubject).map(([name, count]) => ({ subject: name, incorrectAnswers: count })),
      details: weakAreas.slice(0, 15),
      message: weakAreas.length > 0 ? `Found ${weakAreas.length} areas where you struggled.` : "Great job! No weak areas found in your recent quizzes.",
    };
  },
});

// ── generateStudyPlan ────────────────────────────────────────────────────

export const generateStudyPlan = tool({
  description: "Generate a personalized study plan for the learner based on their progress, weaknesses, and upcoming deadlines.",
  parameters: z.object({
    focusArea: z.string().optional().describe("Specific subject or topic to focus on"),
    availableHours: z.number().optional().describe("Weekly study hours available (default 10)"),
  }),
  execute: async ({ focusArea, availableHours = 10 }: { focusArea?: string; availableHours?: number }) => {
    const userId = (globalThis as any).__aiTutorUserId;
    if (!userId) return { found: false, reason: "not_authenticated", message: "User not authenticated." };

    const [subjects, topics, lessons, quizzes, quizSubs, assignments, assignSubs, enrolledIds, completedLessonIds] = await Promise.all([
      fetchAllSubjects(), fetchAllTopics(), fetchAllLessons(), fetchAllQuizzes(),
      fetchQuizSubmissions(userId), fetchAllAssignments(), fetchAssignmentSubmissions(userId),
      fetchStudentEnrolledSubjectIds(userId), fetchLessonProgress(userId),
    ]);

    const enrolledSubjects = subjects.filter(s => enrolledIds.includes(s.id));
    if (enrolledSubjects.length === 0) {
      return { found: false, reason: "no_enrolled_subjects", message: "You're not enrolled in any subjects yet." };
    }

    // Upcoming deadlines
    const now = Date.now();
    const upcomingAssignments = assignments
      .filter(a => a.status === "published" && enrolledIds.includes(a.subject_id) && new Date(a.due_date).getTime() > now)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 10)
      .map(a => {
        const submitted = assignSubs.some(s => s.assignment_id === a.id);
        return { title: a.title, subject: subjects.find(s => s.id === a.subject_id)?.name || "", dueDate: a.due_date, submitted, daysUntilDue: Math.ceil((new Date(a.due_date).getTime() - now) / 86400000) };
      });

    const upcomingQuizzes = quizzes
      .filter(q => q.status === "published" && enrolledIds.includes(q.subject_id) && q.settings?.availability?.endDate && new Date(q.settings.availability.endDate).getTime() > now)
      .map(q => {
        const taken = quizSubs.some(s => s.quiz_id === q.id);
        return { title: q.title, subject: subjects.find(s => s.id === q.subject_id)?.name || "", dueDate: q.settings.availability.endDate, taken };
      });

    // Per-subject analysis
    const subjectAnalysis = enrolledSubjects.map(subject => {
      const subTopicIds = topics.filter(t => t.subject_id === subject.id).map(t => t.id);
      const subLessons = lessons.filter(l => subTopicIds.includes(l.topic_id));
      const completed = subLessons.filter(l => completedLessonIds.includes(l.id)).length;
      const progress = subLessons.length > 0 ? Math.round((completed / subLessons.length) * 100) : 0;

      const subQuizSubs = quizSubs.filter(qs => quizzes.find(q => q.id === qs.quiz_id)?.subject_id === subject.id);
      const avgAccuracy = subQuizSubs.length > 0 ? Math.round(subQuizSubs.reduce((s, q) => s + q.accuracy, 0) / subQuizSubs.length) : null;
      const urgency = (100 - progress) + (avgAccuracy !== null ? (100 - avgAccuracy) : 50);

      return { subjectName: subject.name, progress, avgQuizAccuracy: avgAccuracy, incompleteLessons: subLessons.length - completed, urgencyScore: urgency, url: `/student/subjects/${subject.id}/outline` };
    }).sort((a, b) => b.urgencyScore - a.urgencyScore);

    return {
      found: true,
      availableHoursPerWeek: availableHours,
      upcomingDeadlines: { assignments: upcomingAssignments, quizzes: upcomingQuizzes },
      subjectPriorities: subjectAnalysis,
      focusArea: focusArea || null,
      message: `Study plan generated for ${enrolledSubjects.length} subjects with ${availableHours}h/week budget.`,
    };
  },
});

// ── practiceQuestionGenerator ────────────────────────────────────────────

export const practiceQuestionGenerator = tool({
  description: "Fetch lesson content for the AI to generate practice questions from. Provide the raw material so the AI can craft questions in its response.",
  parameters: z.object({
    topic: z.string().describe("Topic or lesson name to generate questions for"),
    difficulty: z.enum(["easy", "medium", "hard"]).optional().describe("Difficulty level"),
    count: z.number().optional().describe("Number of questions to generate (default 5)"),
  }),
  execute: async ({ topic, difficulty = "medium", count = 5 }: { topic: string; difficulty?: string; count?: number }) => {
    const [subjects, topics, lessons] = await Promise.all([fetchAllSubjects(), fetchAllTopics(), fetchAllLessons()]);

    const searchTerms = topic.toLowerCase().split(/\s+/).filter(t => t.length > 1);
    const matchingLessons = lessons.filter(l => searchTerms.some(term =>
      (l.title && l.title.toLowerCase().includes(term)) || (l.content && stripHtml(l.content).toLowerCase().includes(term))
    )).slice(0, 3);

    if (matchingLessons.length === 0) {
      return { found: false, reason: "no_matching_content", availableSubjects: subjects.map(s => s.name), message: `No lessons found matching "${topic}". Try a different topic name.` };
    }

    const content = matchingLessons.map(l => {
      const t = topics.find(tp => tp.id === l.topic_id);
      const s = t ? subjects.find(sub => sub.id === t.subject_id) : null;
      return { lessonTitle: l.title, topicTitle: t?.title || "", subjectName: s?.name || "", content: l.content ? truncate(stripHtml(l.content), 1500) : "No content" };
    });

    return {
      found: true,
      lessonContent: content,
      difficulty,
      requestedCount: count,
      instruction: `Generate ${count} ${difficulty}-level practice questions based on the lesson content above. Include answers and brief explanations.`,
      message: `Found ${content.length} relevant lesson(s) for practice questions.`,
    };
  },
});

// ── studySessionPlanner ──────────────────────────────────────────────────

export const studySessionPlanner = tool({
  description: "Plan a focused study session with Pomodoro-style scheduling, weighted by subject urgency and upcoming deadlines.",
  parameters: z.object({
    sessionDuration: z.number().describe("Total minutes available for this study session"),
    subjects: z.array(z.string()).optional().describe("Optional: specific subjects to cover"),
  }),
  execute: async ({ sessionDuration, subjects: requestedSubjects }: { sessionDuration: number; subjects?: string[] }) => {
    const userId = (globalThis as any).__aiTutorUserId;
    if (!userId) return { found: false, reason: "not_authenticated", message: "User not authenticated." };

    const [allSubjects, topics, lessons, assignments, enrolledIds, completedLessonIds] = await Promise.all([
      fetchAllSubjects(), fetchAllTopics(), fetchAllLessons(),
      fetchAllAssignments(), fetchStudentEnrolledSubjectIds(userId), fetchLessonProgress(userId),
    ]);

    let targetSubjects = allSubjects.filter(s => enrolledIds.includes(s.id));
    if (requestedSubjects && requestedSubjects.length > 0) {
      const matched = requestedSubjects.map(name => findSubjectByName(targetSubjects, name)).filter(Boolean) as SubjectRow[];
      if (matched.length > 0) targetSubjects = matched;
    }

    if (targetSubjects.length === 0) {
      return { found: false, reason: "no_subjects", message: "No enrolled subjects found." };
    }

    const now = Date.now();
    const subjectBlocks = targetSubjects.map(subject => {
      const subTopicIds = topics.filter(t => t.subject_id === subject.id).map(t => t.id);
      const subLessons = lessons.filter(l => subTopicIds.includes(l.topic_id));
      const incomplete = subLessons.filter(l => !completedLessonIds.includes(l.id));
      const upcomingDeadlines = assignments.filter(a => a.subject_id === subject.id && a.status === "published" && new Date(a.due_date).getTime() > now).length;
      const urgency = incomplete.length + (upcomingDeadlines * 3);

      return {
        subjectName: subject.name, urgency,
        nextLessons: incomplete.slice(0, 3).map(l => ({ title: l.title, url: `/student/subjects/${subject.id}/lessons/${l.id}` })),
        upcomingDeadlines,
      };
    }).sort((a, b) => b.urgency - a.urgency);

    const totalUrgency = subjectBlocks.reduce((s, b) => s + b.urgency, 0) || 1;
    const pomodoroMinutes = 25;
    const breakMinutes = 5;
    const totalBlocks = Math.floor(sessionDuration / (pomodoroMinutes + breakMinutes));

    const schedule = subjectBlocks.map(block => {
      const allocated = Math.max(1, Math.round((block.urgency / totalUrgency) * totalBlocks));
      return { ...block, allocatedBlocks: allocated, allocatedMinutes: allocated * pomodoroMinutes };
    });

    return {
      found: true,
      sessionDuration, pomodoroMinutes, breakMinutes, totalBlocks,
      schedule,
      message: `Planned ${totalBlocks} Pomodoro blocks across ${schedule.length} subjects for a ${sessionDuration}-minute session.`,
    };
  },
});

// ── explainConcept ───────────────────────────────────────────────────────

export const explainConcept = tool({
  description: "Fetch lesson content about a specific concept so the AI can explain it in simpler terms. The AI should break down the concept for the student.",
  parameters: z.object({
    concept: z.string().describe("The concept or topic the student wants explained"),
  }),
  execute: async ({ concept }: { concept: string }) => {
    const [subjects, topics, lessons] = await Promise.all([fetchAllSubjects(), fetchAllTopics(), fetchAllLessons()]);

    const searchTerms = concept.toLowerCase().split(/\s+/).filter(t => t.length > 1);
    const scoredLessons = lessons.map(l => {
      let score = 0;
      for (const term of searchTerms) {
        if (l.title?.toLowerCase().includes(term)) score += 10;
        if (l.content && stripHtml(l.content).toLowerCase().includes(term)) score += 3;
      }
      return { lesson: l, score };
    }).filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 2);

    if (scoredLessons.length === 0) {
      return { found: false, reason: "no_matching_content", availableSubjects: subjects.map(s => s.name), message: `No lessons found matching "${concept}". The AI will use its general knowledge to explain.`, useGeneralKnowledge: true };
    }

    const content = scoredLessons.map(({ lesson: l }) => {
      const t = topics.find(tp => tp.id === l.topic_id);
      const s = t ? subjects.find(sub => sub.id === t.subject_id) : null;
      return {
        lessonTitle: l.title, topicTitle: t?.title || "", subjectName: s?.name || "",
        fullContent: l.content ? truncate(stripHtml(l.content), 2000) : "No content",
        lessonUrl: s ? `/student/subjects/${s.id}/lessons/${l.id}` : "",
      };
    });

    return {
      found: true, concept, lessonContent: content,
      instruction: "Explain the concept in simpler terms using the lesson content. Use analogies, examples, and step-by-step breakdowns appropriate for a high school student.",
      message: `Found ${content.length} relevant lesson(s) about "${concept}".`,
    };
  },
});

// ── flashcardGenerator ───────────────────────────────────────────────────

export const flashcardGenerator = tool({
  description: "Fetch lesson content so the AI can generate flashcard-style Q&A pairs for revision and memorization.",
  parameters: z.object({
    topic: z.string().describe("Topic or lesson to generate flashcards for"),
    count: z.number().optional().describe("Number of flashcards to generate (default 10)"),
  }),
  execute: async ({ topic, count = 10 }: { topic: string; count?: number }) => {
    const [subjects, topics, lessons] = await Promise.all([fetchAllSubjects(), fetchAllTopics(), fetchAllLessons()]);

    const searchTerms = topic.toLowerCase().split(/\s+/).filter(t => t.length > 1);
    const matchingLessons = lessons.filter(l => searchTerms.some(term =>
      (l.title?.toLowerCase().includes(term)) || (l.content && stripHtml(l.content).toLowerCase().includes(term))
    )).slice(0, 3);

    if (matchingLessons.length === 0) {
      return { found: false, reason: "no_matching_content", availableSubjects: subjects.map(s => s.name), message: `No lessons found for "${topic}".` };
    }

    const content = matchingLessons.map(l => {
      const t = topics.find(tp => tp.id === l.topic_id);
      const s = t ? subjects.find(sub => sub.id === t.subject_id) : null;
      return { lessonTitle: l.title, subjectName: s?.name || "", content: l.content ? truncate(stripHtml(l.content), 1500) : "No content" };
    });

    return {
      found: true, lessonContent: content, requestedCount: count,
      instruction: `Generate ${count} flashcard-style Q&A pairs from the lesson content. Format each as: **Q:** [question] → **A:** [concise answer]. Cover key definitions, concepts, and facts.`,
      message: `Found ${content.length} lesson(s) to generate ${count} flashcards from.`,
    };
  },
});

// ── Export all learner tools ─────────────────────────────────────────────

export const learnerTools = {
  analyzeMyProgress,
  findMyWeaknesses,
  generateStudyPlan,
  practiceQuestionGenerator,
  studySessionPlanner,
  explainConcept,
  flashcardGenerator,
};
