import { useChat } from "@ai-sdk/react";
import { streamText, convertToModelMessages, DirectChatTransport, ToolLoopAgent } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { useRef, useEffect, useState, type FormEvent } from "react";
import { Send, Loader2 } from "lucide-react";
import { TutorMessages } from "./TutorMessages";
import { searchSubjects } from "@/lib/ai/tutor-tools";
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

  const { messages, sendMessage, status, error } = useChat({
    // In AI SDK v6, using DirectChatTransport is the official way 
    // to handle generation directly on the client.
    transport: new DirectChatTransport({
      agent: new ToolLoopAgent({
        model: createOpenRouter({
          apiKey: import.meta.env.VITE_OPENROUTER_API_KEY || "",
        })("openai/gpt-oss-120b"),
        instructions: `You are a helpful high school learning assistant for our LMS. 
The user is a ${role || "student"}${user?.name ? ` named ${user.name}` : ""}.
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

Example:
- Check out this lesson: [Introduction to Business](/student/subjects/e1caa676-8310-4ca6-b29b-541dacc45cad/lessons/abc123)
- Full subject overview: [Business Studies](/student/subjects/e1caa676-8310-4ca6-b29b-541dacc45cad/outline)

## CONTENT RULES:
- Quote or paraphrase lesson content when answering questions
- Always recommend specific lessons for deeper learning using URLs from search results
- Format URLs exactly as provided - NEVER modify paths or invent URLs
- NEVER add "http://", "https://", or domain names to URLs

You are a tutor who knows our curriculum well and helps everyone learn!`,
        tools: { searchSubjects },
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
          Powered by AI • Learning assistant
        </p>
      </div>
    </div>
  );
}
