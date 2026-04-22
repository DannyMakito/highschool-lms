import { tool } from "ai";
import { z } from "zod";
import supabase from "@/lib/supabase";

// ── Helpers ───────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function textContains(text: string | null | undefined, term: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(term.toLowerCase());
}

// ── Types ─────────────────────────────────────────────────────────────────

interface SubjectRow {
  id: string;
  name: string;
  description: string;
  grade_tier: string;
  category: string | null;
}

interface TopicRow {
  id: string;
  subject_id: string;
  title: string;
  order: number;
}

interface LessonRow {
  id: string;
  topic_id: string;
  title: string;
  content: string | null;
  order: number;
}

function scoreSubject(
  subject: SubjectRow,
  topics: TopicRow[],
  lessons: LessonRow[],
  searchTerms: string[]
): number {
  let score = 0;
  for (const term of searchTerms) {
    if (textContains(subject.name, term)) score += 100;
    if (textContains(subject.description, term)) score += 50;
    if (textContains(subject.category, term)) score += 30;

    const subjectTopics = topics.filter((t) => t.subject_id === subject.id);
    for (const topic of subjectTopics) {
      if (textContains(topic.title, term)) score += 20;

      const topicLessons = lessons.filter((l) => l.topic_id === topic.id);
      for (const lesson of topicLessons) {
        if (textContains(lesson.title, term)) score += 15;
        const plainContent = lesson.content ? stripHtml(lesson.content) : null;
        if (textContains(plainContent, term)) score += 5;
      }
    }
  }
  return score;
}

// ── Search Tool ───────────────────────────────────────────────────────────

export const searchSubjects = tool({
  description: "Search through all subjects, topics, and lessons by topic, skill, or learning goal.",
  parameters: z.object({
    query: z.string().describe("The topic or skill the user wants to learn about"),
  }),
  execute: async ({ query }: { query: string }) => {
    console.log("[SearchTool] Executing for query:", query);

    // Perform queries using the client-side supabase instance (respects user RLS)
    const [subjectsRes, topicsRes, lessonsRes] = await Promise.all([
      supabase.from("subjects").select("id, name, description, grade_tier, category"),
      supabase.from("topics").select("id, subject_id, title, order"),
      supabase.from("lessons").select("id, topic_id, title, content, order"),
    ]);

    if (subjectsRes.error) console.error("[SearchTool] Subjects error:", subjectsRes.error);
    if (topicsRes.error) console.error("[SearchTool] Topics error:", topicsRes.error);
    if (lessonsRes.error) console.error("[SearchTool] Lessons error:", lessonsRes.error);

    const subjects = (subjectsRes.data || []) as SubjectRow[];
    const topics = (topicsRes.data || []) as TopicRow[];
    const lessons = (lessonsRes.data || []) as LessonRow[];

    const searchTerms = query.toLowerCase().split(/\s+/).filter((term) => term.length > 1);
    if (searchTerms.length === 0) return { found: false, subjects: [] };

    const scored = subjects
      .map((subject) => ({
        subject,
        score: scoreSubject(subject, topics, lessons, searchTerms),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const formatted = scored.map(({ subject }) => {
      const subjectTopics = topics.filter((t) => t.subject_id === subject.id).sort((a, b) => a.order - b.order);
      const topicDetails = subjectTopics.map((topic) => {
        const topicLessons = lessons.filter((l) => l.topic_id === topic.id).sort((a, b) => a.order - b.order);
        return {
          title: topic.title,
          lessons: topicLessons.map((lesson) => ({
            title: lesson.title,
            contentPreview: lesson.content ? stripHtml(lesson.content).substring(0, 500) + "..." : "No content",
            lessonUrl: `/student/subjects/${subject.id}/lessons/${lesson.id}`,
          })),
        };
      });

      return {
        name: subject.name,
        description: subject.description,
        gradeTier: subject.grade_tier,
        url: `/student/subjects/${subject.id}/outline`,
        topics: topicDetails,
      };
    });

    return {
      found: formatted.length > 0,
      message: `Found ${formatted.length} relevant subjects.`,
      subjects: formatted,
    };
  },
});
