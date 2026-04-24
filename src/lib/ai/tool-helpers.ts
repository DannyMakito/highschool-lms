/**
 * Shared helper functions for AI tutor tools.
 * All queries use the client-side Supabase instance so RLS is enforced automatically.
 */
import supabase from "@/lib/supabase";

// ── Utility helpers ──────────────────────────────────────────────────────

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function textContains(text: string | null | undefined, term: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(term.toLowerCase());
}

export function truncate(text: string, maxLength = 500): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

// ── Row types (snake_case from DB) ───────────────────────────────────────

export interface SubjectRow {
  id: string;
  name: string;
  description: string;
  grade_tier: string;
  category: string | null;
}

export interface TopicRow {
  id: string;
  subject_id: string;
  title: string;
  order: number;
}

export interface LessonRow {
  id: string;
  topic_id: string;
  title: string;
  content: string | null;
  order: number;
}

export interface QuizRow {
  id: string;
  subject_id: string;
  title: string;
  description: string;
  status: string;
  questions: any[];
  settings: any;
  points_possible: number | null;
}

export interface QuizSubmissionRow {
  id: string;
  quiz_id: string;
  student_id: string;
  student_name: string;
  score: number;
  total_points: number;
  accuracy: number;
  time_spent: number;
  status: string;
  completed_at: string;
  answers: Array<{
    questionId: string;
    answer: string | string[];
    isCorrect: boolean;
    pointsEarned: number;
    timeSpent: number;
  }>;
}

export interface AssignmentRow {
  id: string;
  subject_id: string;
  title: string;
  description: string;
  total_marks: number;
  due_date: string;
  status: string;
  available_from: string | null;
  created_at: string;
}

export interface AssignmentSubmissionRow {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  file_type: string;
  status: string;
  submitted_at: string;
  total_grade: number;
  overall_feedback: string;
  is_released: boolean;
  rubric_grades: Record<string, number>;
}

export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export interface StudentRow {
  id: string;
  grade_id: string;
  register_class_id: string;
  administration_number: string;
  gender: string;
  status: string;
}

export interface SubjectClassRow {
  id: string;
  subject_id: string;
  name: string;
  teacher_id: string;
  capacity: number;
  grade_id: string;
}

export interface GradebookScoreRow {
  id: string;
  subject_id: string;
  assignment_group_id: string;
  student_id: string;
  score: number;
  feedback: string | null;
}

export interface AssignmentGroupRow {
  id: string;
  subject_id: string;
  name: string;
  weight_percentage: number;
  max_points: number | null;
  order: number | null;
}

export interface SessionRow {
  user_id: string;
  login_time?: string;
  created_at?: string;
}

// ── Data Fetchers ────────────────────────────────────────────────────────

export async function fetchAllSubjects(): Promise<SubjectRow[]> {
  const { data, error } = await supabase.from("subjects").select("id, name, description, grade_tier, category");
  if (error) console.error("[tool-helpers] fetchAllSubjects error:", error);
  return (data || []) as SubjectRow[];
}

export async function fetchAllTopics(): Promise<TopicRow[]> {
  const { data, error } = await supabase.from("topics").select("id, subject_id, title, order");
  if (error) console.error("[tool-helpers] fetchAllTopics error:", error);
  return (data || []) as TopicRow[];
}

export async function fetchAllLessons(): Promise<LessonRow[]> {
  const { data, error } = await supabase.from("lessons").select("id, topic_id, title, content, order");
  if (error) console.error("[tool-helpers] fetchAllLessons error:", error);
  return (data || []) as LessonRow[];
}

export async function fetchAllQuizzes(): Promise<QuizRow[]> {
  const { data, error } = await supabase.from("quizzes").select("id, subject_id, title, description, status, questions, settings, points_possible");
  if (error) console.error("[tool-helpers] fetchAllQuizzes error:", error);
  return (data || []) as QuizRow[];
}

export async function fetchQuizSubmissions(studentId?: string): Promise<QuizSubmissionRow[]> {
  let query = supabase.from("quiz_submissions").select("*");
  if (studentId) query = query.eq("student_id", studentId);
  const { data, error } = await query;
  if (error) console.error("[tool-helpers] fetchQuizSubmissions error:", error);
  return (data || []) as QuizSubmissionRow[];
}

export async function fetchAllAssignments(): Promise<AssignmentRow[]> {
  const { data, error } = await supabase.from("assignments").select("id, subject_id, title, description, total_marks, due_date, status, available_from, created_at");
  if (error) console.error("[tool-helpers] fetchAllAssignments error:", error);
  return (data || []) as AssignmentRow[];
}

export async function fetchAssignmentSubmissions(studentId?: string): Promise<AssignmentSubmissionRow[]> {
  let query = supabase.from("assignment_submissions").select("id, assignment_id, student_id, content, file_type, status, submitted_at, total_grade, overall_feedback, is_released, rubric_grades");
  if (studentId) query = query.eq("student_id", studentId);
  const { data, error } = await query;
  if (error) console.error("[tool-helpers] fetchAssignmentSubmissions error:", error);
  return (data || []) as AssignmentSubmissionRow[];
}

export async function fetchStudentEnrolledSubjectIds(studentId: string): Promise<string[]> {
  const [directRes, sscRes, scRes] = await Promise.all([
    supabase.from("student_subjects").select("subject_id").eq("student_id", studentId),
    supabase.from("student_subject_classes").select("subject_class_id").eq("student_id", studentId),
    supabase.from("subject_classes").select("id, subject_id"),
  ]);

  const directIds = (directRes.data || []).map((d: any) => d.subject_id);
  const sscClassIds = (sscRes.data || []).map((d: any) => d.subject_class_id);
  const scMap = new Map((scRes.data || []).map((sc: any) => [sc.id, sc.subject_id]));
  const classIds = sscClassIds.map((cid: string) => scMap.get(cid)).filter(Boolean) as string[];

  return Array.from(new Set([...directIds, ...classIds]));
}

export async function fetchGradebookData(studentId: string, subjectIds: string[]): Promise<{
  groups: AssignmentGroupRow[];
  scores: GradebookScoreRow[];
}> {
  if (subjectIds.length === 0) return { groups: [], scores: [] };

  const [groupsRes, scoresRes] = await Promise.all([
    supabase.from("assignment_groups").select("*").in("subject_id", subjectIds).order("order", { ascending: true }),
    supabase.from("student_gradebook_scores").select("*").eq("student_id", studentId).in("subject_id", subjectIds),
  ]);

  return {
    groups: (groupsRes.data || []) as AssignmentGroupRow[],
    scores: (scoresRes.data || []) as GradebookScoreRow[],
  };
}

export async function fetchLessonProgress(studentId: string): Promise<string[]> {
  const { data, error } = await supabase.from("user_lesson_progress").select("lesson_id").eq("user_id", studentId);
  if (error) {
    console.error("[tool-helpers] fetchLessonProgress error:", error);
    return [];
  }
  return (data || []).map((d: any) => d.lesson_id);
}

export async function fetchProfiles(role?: string): Promise<ProfileRow[]> {
  let query = supabase.from("profiles").select("id, full_name, email, role");
  if (role) query = query.eq("role", role);
  const { data, error } = await query;
  if (error) console.error("[tool-helpers] fetchProfiles error:", error);
  return (data || []) as ProfileRow[];
}

export async function fetchTeacherSubjectIds(teacherId: string): Promise<string[]> {
  const { data, error } = await supabase.from("teacher_subjects").select("subject_id").eq("teacher_id", teacherId);
  if (error) console.error("[tool-helpers] fetchTeacherSubjectIds error:", error);
  return (data || []).map((d: any) => d.subject_id);
}

export async function fetchSubjectClasses(teacherId?: string): Promise<SubjectClassRow[]> {
  let query = supabase.from("subject_classes").select("id, subject_id, name, teacher_id, capacity, grade_id");
  if (teacherId) query = query.eq("teacher_id", teacherId);
  const { data, error } = await query;
  if (error) console.error("[tool-helpers] fetchSubjectClasses error:", error);
  return (data || []) as SubjectClassRow[];
}

export async function fetchStudentSubjectClasses(): Promise<Array<{ student_id: string; subject_class_id: string }>> {
  const { data, error } = await supabase.from("student_subject_classes").select("student_id, subject_class_id");
  if (error) console.error("[tool-helpers] fetchStudentSubjectClasses error:", error);
  return (data || []) as Array<{ student_id: string; subject_class_id: string }>;
}

export async function fetchStudents(): Promise<Array<StudentRow & { name: string; email: string }>> {
  const { data, error } = await supabase.from("students").select("*, profiles(full_name, email)");
  if (error) console.error("[tool-helpers] fetchStudents error:", error);
  return (data || []).map((s: any) => ({
    ...s,
    name: s.profiles?.full_name || "",
    email: s.profiles?.email || "",
  }));
}

export async function fetchSessionEvents(sinceIso: string): Promise<SessionRow[]> {
  // Try multiple column name patterns
  const attempts = [
    { select: "user_id, login_time", time: "login_time" },
    { select: "user_id, created_at", time: "created_at" },
    { select: "user_id, login_at", time: "login_at" },
  ];

  for (const attempt of attempts) {
    const { data, error } = await supabase
      .from("user_sessions")
      .select(attempt.select)
      .gte(attempt.time, sinceIso)
      .limit(2000);

    if (!error && data) {
      return data as SessionRow[];
    }
  }

  return [];
}

export async function fetchGrades(): Promise<Array<{ id: string; name: string; level: number }>> {
  const { data, error } = await supabase.from("grades").select("*");
  if (error) console.error("[tool-helpers] fetchGrades error:", error);
  return (data || []).map((g: any) => ({
    id: g.id,
    name: g.name,
    level: g.level ?? g.sort_order ?? (parseInt(String(g.name || "").replace(/\D/g, ""), 10) || 0),
  }));
}

// ── Composite helpers ────────────────────────────────────────────────────

/** Find a subject by partial name match. Returns null if not found. */
export function findSubjectByName(subjects: SubjectRow[], name: string): SubjectRow | null {
  const lower = name.toLowerCase().trim();
  return subjects.find(s => s.name.toLowerCase() === lower)
    || subjects.find(s => s.name.toLowerCase().includes(lower))
    || null;
}

/** Get topics + lessons for a specific subject */
export function getSubjectContent(subjectId: string, topics: TopicRow[], lessons: LessonRow[]) {
  const subjectTopics = topics.filter(t => t.subject_id === subjectId).sort((a, b) => a.order - b.order);
  return subjectTopics.map(topic => ({
    topicId: topic.id,
    topicTitle: topic.title,
    topicOrder: topic.order,
    lessons: lessons
      .filter(l => l.topic_id === topic.id)
      .sort((a, b) => a.order - b.order)
      .map(l => ({
        lessonId: l.id,
        lessonTitle: l.title,
        contentPreview: l.content ? truncate(stripHtml(l.content), 600) : "No content yet",
        hasContent: !!l.content && l.content.length > 10,
      })),
  }));
}

/** Get students enrolled in a teacher's subject classes */
export async function fetchTeacherStudentIds(teacherId: string): Promise<string[]> {
  const classes = await fetchSubjectClasses(teacherId);
  const classIds = classes.map(c => c.id);
  if (classIds.length === 0) return [];

  const { data, error } = await supabase
    .from("student_subject_classes")
    .select("student_id")
    .in("subject_class_id", classIds);

  if (error) console.error("[tool-helpers] fetchTeacherStudentIds error:", error);
  return [...new Set((data || []).map((d: any) => d.student_id))];
}
