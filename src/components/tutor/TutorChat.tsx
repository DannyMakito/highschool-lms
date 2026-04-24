import { useChat } from "@ai-sdk/react";
import { streamText, convertToModelMessages, DirectChatTransport, ToolLoopAgent } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { useRef, useEffect, useState, useMemo, type FormEvent } from "react";
import { Send, Loader2 } from "lucide-react";
import { TutorMessages } from "./TutorMessages";
import { searchSubjects } from "@/lib/ai/tutor-tools";
import { learnerTools } from "@/lib/ai/learner-tools";
import { teacherTools } from "@/lib/ai/teacher-tools";
import { principalTools } from "@/lib/ai/principal-tools";
import { useAuth } from "@/context/AuthContext";

// Custom scrollbar styling
const scrollbarStyle = `
  .tutor-chat-scroll::-webkit-scrollbar {
    width: 8px;
  }
  
  .tutor-chat-scroll::-webkit-scrollbar-track {
    background: rgba(30, 41, 59, 0.5);
    border-radius: 4px;
  }
  
  .tutor-chat-scroll::-webkit-scrollbar-thumb {
    background: rgba(34, 211, 238, 0.4);
    border-radius: 4px;
    transition: background 0.3s ease;
  }
  
  .tutor-chat-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(34, 211, 238, 0.6);
  }
  
  .tutor-chat-scroll {
    scrollbar-color: rgba(34, 211, 238, 0.4) rgba(30, 41, 59, 0.5);
    scrollbar-width: thin;
  }
`;

// ── Role-specific system prompt sections ──────────────────────────────────

function buildSystemPrompt(role: string | undefined, userName: string | undefined): string {
  const roleLabel = role || "student";
  const nameStr = userName ? ` named ${userName}` : "";

  const basePrompt = `You are a helpful high school learning assistant for our LMS. 
The user is a ${roleLabel}${nameStr}.
Use the searchSubjects tool to find relevant content in the LMS database.
Always provide helpful, educational answers based on our lesson material.

## RESPONSE FORMAT (CRITICAL - FOLLOW EXACTLY):
Your response MUST be structured exactly like ChatGPT with:
- Clear paragraphs separated by blank lines
- Numbered lists (1., 2., 3., etc.) for sequential ideas
- Bullet points (•) for related items within topics
- Markdown headings (## Title) for major sections
- NEVER use pipes (||), colons before links, or inline separators

## MARKDOWN LINK FORMAT (REQUIRED):
Always use this exact markdown format for ALL links:
[Link Text Here](/student/subjects/subjectId/outline)
[Lesson Name](/student/subjects/subjectId/lessons/lessonId)

## CONTENT RULES:
- Quote or paraphrase lesson content when answering questions
- Always recommend specific lessons for deeper learning using URLs from search results
- Format URLs exactly as provided - NEVER modify paths or invent URLs
- NEVER add "http://", "https://", or domain names to URLs

## HANDLING EMPTY TOOL RESULTS:
When a tool returns found: false, NEVER just say "no data found". Instead:
- Use the "reason" field to understand WHY there's no data
- Use any "context", "availableSubjects", or "suggestions" fields to guide the user
- Suggest next steps, encourage the user, or offer to try a different approach`;

  const roleSpecific: Record<string, string> = {
    learner: `
## YOUR ROLE-SPECIFIC TOOLS (LEARNER):
You have access to these learner-focused tools:
- **analyzeMyProgress**: Get a full progress snapshot (quiz scores, assignments, lesson completion)
- **findMyWeaknesses**: Identify topics where the student struggles
- **generateStudyPlan**: Create a personalized study plan based on deadlines and weaknesses
- **practiceQuestionGenerator**: Generate practice questions from lesson content
- **studySessionPlanner**: Plan focused study sessions with Pomodoro-style scheduling
- **explainConcept**: Get lesson content to explain concepts in simpler terms
- **flashcardGenerator**: Create flashcard Q&A pairs for revision

Use these tools proactively when the student asks about their grades, progress, study tips, or needs help understanding something. Be encouraging and supportive!`,

    teacher: `
## YOUR ROLE-SPECIFIC TOOLS (TEACHER):
You have access to these teacher-focused tools:
- **generateQuiz**: Generate quiz questions from lesson content
- **reviewStudentWork**: Review student submissions and provide feedback suggestions
- **classroomAnalytics**: Get engagement and performance analytics for your classes
- **findStruggleAreas**: Identify topics where students struggle and find underperforming students
- **teacherAtRiskStudentFinder**: Find at-risk students across your assigned subjects
- **lessonPlanAssistant**: Help plan lesson topics and structure for a subject
- **lessonContentGenerator**: Generate detailed lesson content for a specific topic

Use these tools when the teacher asks about student performance, needs help creating content, or wants analytics. Be professional and data-driven.`,

    principal: `
## YOUR ROLE-SPECIFIC TOOLS (PRINCIPAL/ADMIN):
You have access to these administrative tools:
- **schoolPerformanceDashboard**: School-wide KPIs and performance metrics
- **teacherEffectiveness**: Analyze teacher activity and student outcomes per teacher
- **atRiskStudentFinder**: Find at-risk students school-wide
- **departmentComparison**: Compare performance across subject departments
- **attendanceTrends**: Analyze login/session data for engagement patterns
- **resourceAllocation**: Identify subjects needing more resources

Use these tools when the principal asks about school performance, teacher effectiveness, or needs strategic insights. Present data clearly with actionable recommendations.`,
  };

  return basePrompt + (roleSpecific[roleLabel] || roleSpecific.learner || "") + `

You are a tutor who knows our curriculum well and helps everyone learn!`;
}

export function TutorChat() {
  const [inputValue, setInputValue] = useState("");
  const { user, role } = useAuth();

  // Inject scrollbar styles on mount
  useEffect(() => {
    if (!document.querySelector('style[data-tutor-scrollbar]')) {
      const style = document.createElement('style');
      style.setAttribute('data-tutor-scrollbar', 'true');
      style.textContent = scrollbarStyle;
      document.head.appendChild(style);
    }
  }, []);

  // Inject user ID for tools to access (they run outside React context)
  useEffect(() => {
    (globalThis as any).__aiTutorUserId = user?.id || null;
    return () => { (globalThis as any).__aiTutorUserId = null; };
  }, [user?.id]);

  // Build role-based tools object
  const tools = useMemo(() => {
    const base: Record<string, any> = { searchSubjects };

    if (role === "learner") return { ...base, ...learnerTools };
    if (role === "teacher") return { ...base, ...teacherTools };
    if (role === "principal") return { ...base, ...principalTools };

    // Default: give learner tools for unknown roles
    return { ...base, ...learnerTools };
  }, [role]);

  const systemPrompt = useMemo(() => buildSystemPrompt(role, user?.name), [role, user?.name]);

  const { messages, sendMessage, status, error } = useChat({
    // In AI SDK v6, using DirectChatTransport is the official way 
    // to handle generation directly on the client.
    transport: new DirectChatTransport({
      agent: new ToolLoopAgent({
        model: createOpenRouter({
          apiKey: import.meta.env.VITE_OPENROUTER_API_KEY || "",
        })("openai/gpt-oss-120b"),
        instructions: systemPrompt,
        tools,
        // maxSteps: 5 is handled implicitly by ToolLoopAgent 
      })
    }),
    messages: [
      {
        id: "welcome",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "Hey! 👋 I'm your AI learning assistant. Ask me about any subject, topic, or lesson and I'll help you find what you need.",
          },
        ],
      },
    ],
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    console.log("[TutorChat] handleSubmit called with:", inputValue);

    try {
      await sendMessage({ text: inputValue });
      console.log("[TutorChat] sendMessage completed successfully");
    } catch (err) {
      console.error("[TutorChat] sendMessage threw an error:", err);
    }

    setInputValue("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container - Scrollable */}
      <div className="tutor-chat-scroll flex-1 overflow-y-auto px-6 py-6 space-y-5">
        <TutorMessages messages={messages} isLoading={isLoading} />
        {status === "error" && (
          <div className="text-red-400 bg-red-500/10 p-4 rounded-xl text-sm border border-red-500/20">
            Error: {error?.message || "Failed to reach AI tutor. Please try again."}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="shrink-0 p-6 border-t border-cyan-500/20 bg-slate-900/80 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="What would you like to learn?"
            disabled={isLoading}
            className="
              w-full
              px-5 py-4 pr-14
              bg-white/5
              border border-cyan-500/20
              rounded-xl
              text-white text-base
              placeholder:text-slate-500
              focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all
            "
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="
              absolute right-3 top-1/2 -translate-y-1/2
              p-2.5
              bg-gradient-to-r from-cyan-500 to-blue-600
              hover:from-cyan-400 hover:to-blue-500
              disabled:from-slate-600 disabled:to-slate-700
              disabled:cursor-not-allowed
              rounded-lg
              transition-all duration-200
              group
            "
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Send className="w-5 h-5 text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            )}
          </button>
        </form>
        <p className="mt-3 text-sm text-slate-500 text-center">
          Powered by Afrinexel • Learning assistant
        </p>
      </div>
    </div>
  );
}
