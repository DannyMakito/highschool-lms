import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createOpenAI } from "https://esm.sh/@ai-sdk/openai@3.0.53";
import { streamText, tool, type CoreMessage, type UIMessage } from "https://esm.sh/ai@6.0.162";
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

// ── Edge Function handler ─────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const { data: profile } = await supabaseAuth
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    const role = profile?.role;
    if (!role || !["student", "teacher", "principal"].includes(role)) {
      return new Response("Forbidden – valid role required", { status: 403, headers: corsHeaders });
    }

    // ── 2. Handle Messages ─────────────────────────────────────────────
    const { messages }: { messages: UIMessage[] } = await req.json();
    
    // Explicit manual mapping to CoreMessage to avoid schema validation errors
    // AI SDK 6 UIMessages are converted to a simpler CoreMessage array.
    const coreMessages: CoreMessage[] = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => {
        // Extract text parts only for simplicity and broad model compatibility
        const textContent = (m.parts || [])
          .filter(p => p.type === 'text')
          .map(p => (p as any).text)
          .join('\n');

        return {
          role: m.role,
          content: textContent || " " // Ensure content is never empty
        } as CoreMessage;
      });

    // ── 3. AI Config ──────────────────────────────────────────────────
    const openrouter = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: Deno.env.get("OPENROUTER_API_KEY") ?? "",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const searchSubjects = tool({
      description: "Search through all subjects, topics, and lessons.",
      parameters: z.object({
        query: z.string().describe("The topic or skill the user wants to learn about"),
      }),
      execute: async ({ query }: { query: string }) => {
        const [subjectsRes, topicsRes, lessonsRes] = await Promise.all([
          supabaseAdmin.from("subjects").select("id, name, description, grade_tier, category"),
          supabaseAdmin.from("topics").select("id, subject_id, title, order"),
          supabaseAdmin.from("lessons").select("id, topic_id, title, content, order"),
        ]);

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
          const subjectTopics = topics.filter((t) => t.subject_id === subject.id);
          return {
            name: subject.name,
            description: subject.description,
            url: `/student/subjects/${subject.id}`,
            topics: subjectTopics.map(t => ({ title: t.title })),
          };
        });

        return { found: true, subjects: formatted };
      },
    });

    // ── 4. Generate Stream ────────────────────────────────────────────
    const result = streamText({
      model: openrouter("openai/gpt-4o-mini"),
      system: `You are a helpful high school learning assistant for our LMS. 
      The user is a ${role}${profile?.full_name ? ` named ${profile.full_name}` : ""}.
      Use the searchSubjects tool to find relevant content in the LMS database. 
      Always provide helpful, educational answers and link to subjects using the URLs provided.`,
      messages: coreMessages,
      tools: { searchSubjects },
      maxSteps: 5,
    });

    return result.toUIMessageStreamResponse({
      headers: corsHeaders
    });

  } catch (error: any) {
    console.error("Chat function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
