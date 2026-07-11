import { Sparkles } from "lucide-react";
import { TutorChat } from "@/components/tutor/TutorChat";
import { TutorProvider } from "@/components/tutor/TutorContext";

export default function StudentTutorPage() {
  return (
    <TutorProvider>
      {/* Negative margins cancel out the layout's p-4 mt-4 pb-24; 
          the chat fills the entire remaining viewport */}
      <div className="flex flex-col -mx-4 -mt-4 -mb-24 h-[calc(100vh-4rem)] bg-slate-950">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-3 shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white leading-tight">Learning Assistant</h2>
            <p className="text-xs text-cyan-400">AI-powered • Ask me anything</p>
          </div>
        </div>
        {/* Chat fills all remaining space */}
        <div className="min-h-0 flex-1">
          <TutorChat />
        </div>
      </div>
    </TutorProvider>
  );
}
